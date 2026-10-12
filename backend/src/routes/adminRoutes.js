
import express from 'express';
import pool from '../config/db.js';
import {
    authenticate,
    requireAdmin,
} from '../middleware/auth.js';
const router = express.Router();

// GET /api/admin/overview
router.get('/overview', async (_req, res) => {
    try {
        const [leadResult] = await pool.query(
            'SELECT COUNT(*) AS total FROM leads'
        );

        const [memberResult] = await pool.query(
            'SELECT COUNT(*) AS total FROM members'
        );

        const [serviceResult] = await pool.query(
            'SELECT COUNT(*) AS total FROM service_types'
        );

        res.json({
            success: true,
            data: {
                totalLeads: leadResult[0].total,
                totalMembers: memberResult[0].total,
                totalServices: serviceResult[0].total,
            },
        });
    } catch (error) {
        console.error('Admin overview failed:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to load admin overview.',
        });
    }
});


/**
 * GET /api/admin/leads
 * Fetch leads for the admin dashboard.
 */
router.get(
    '/leads',
    authenticate,
    requireAdmin,
    async (req, res) => {
    try {
        const { status, search } = req.query;

        let sql = `

SELECT
  l.id,
  l.lead_code,
  l.customer_name,
  l.customer_phone,
  l.customer_email,
  l.hospital_or_location,
  l.pickup_location,
  l.destination,
  l.scheduled_at,
  l.status,
  l.created_at,
  l.updated_at,

  s.name AS service_name,

  submitter.full_name AS submitted_by_name,
  submitter.role AS submitted_by_role,

  agent.full_name AS assigned_agent_name

FROM leads AS l

LEFT JOIN service_types AS s
  ON s.id = l.service_type_id

LEFT JOIN members AS submitter
  ON submitter.id = l.submitted_by

LEFT JOIN members AS agent
  ON agent.id = l.assigned_agent_id

WHERE 1 = 1

    `;

        const params = [];

        if (status && status !== 'all') {
            sql += ' AND l.status = ?';
            params.push(status);
        }

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;

            sql += `
        AND (
          l.lead_code LIKE ?
          OR l.customer_name LIKE ?
          OR l.customer_phone LIKE ?
          OR l.customer_email LIKE ?
          OR l.hospital_or_location LIKE ?
        )
      `;

            params.push(term, term, term, term, term);
        }

        sql += ' ORDER BY l.created_at DESC LIMIT 100';

        const [rows] = await pool.query(sql, params);

        res.json({
            success: true,
            count: rows.length,
            data: rows,
        });
    } catch (error) {
        console.error('Admin leads API failed:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to load leads.',
        });
    }
});


router.post('/leads', async (req, res) => {
    try {
        const {
            customer_name,
            customer_phone,
            customer_email,
            service_type_id,
            submitted_by,
            hospital_or_location,
            pickup_location,
            destination,
            scheduled_at,
            notes,
        } = req.body;

        // Validate required fields
        if (
            typeof customer_name !== 'string' ||
            !customer_name.trim() ||
            !customer_phone ||
            !Number.isInteger(Number(service_type_id)) ||
            !Number.isInteger(Number(submitted_by))
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Customer name, phone, service type, and submitting member are required.',
            });
        }

        // Confirm the service exists and is active
        const [services] = await pool.query(
            `SELECT id FROM service_types
       WHERE id = ? AND is_active = 1`,
            [Number(service_type_id)]
        );

        if (services.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or inactive service type.',
            });
        }

        // Confirm the submitting member is active
        const [members] = await pool.query(
            `SELECT id FROM members
       WHERE id = ? AND account_status = 'active'`,
            [Number(submitted_by)]
        );

        if (members.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or inactive submitting member.',
            });
        }

        const [result] = await pool.query(
            `INSERT INTO leads (
        lead_code,
        customer_name,
        customer_phone,
        customer_email,
        service_type_id,
        submitted_by,
        hospital_or_location,
        pickup_location,
        destination,
        scheduled_at,
        notes,
        status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new'
      )`,
            [
                `LD-${Date.now()}`,
                customer_name.trim(),
                customer_phone.trim(),
                customer_email || null,
                Number(service_type_id),
                Number(submitted_by),
                hospital_or_location || null,
                pickup_location || null,
                destination || null,
                scheduled_at || null,
                notes || null,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Lead created successfully.',
            data: {
                id: result.insertId,
                status: 'new',
            },
        });
    } catch (error) {
        console.error('Create lead failed:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to create lead.',
        });
    }
});


/**
 * GET /api/admin/leads/:id
 * Fetch one lead with its service, members, and status history.
 */
router.get('/leads/:id', authenticate, async (req, res) => {
    try {
        const leadId = Number(req.params.id);

        if (!Number.isSafeInteger(leadId) || leadId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lead ID.',
            });
        }

        const [leads] = await pool.query(
            `
      SELECT
        l.id,
        l.lead_code,
        l.customer_name,
        l.customer_phone,
        l.customer_email,
        l.hospital_or_location,
        l.pickup_location,
        l.destination,
        l.scheduled_at,
        l.notes,
        l.status,
        l.submitted_by,
        l.assigned_agent_id,
        l.created_at,
        l.updated_at,
        s.name AS service_name,
        submitter.full_name AS submitted_by_name,
        submitter.role AS submitted_by_role,
        agent.full_name AS assigned_agent_name
      FROM leads AS l
      LEFT JOIN service_types AS s
        ON s.id = l.service_type_id
      LEFT JOIN members AS submitter
        ON submitter.id = l.submitted_by
      LEFT JOIN members AS agent
        ON agent.id = l.assigned_agent_id
      WHERE l.id = ?
      LIMIT 1
      `,
            [leadId]
        );

        if (leads.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found.',
            });
        }

        const isAdmin = req.user.role === 'admin';

        const isAssignedCallingAgent =
            req.user.role === 'calling_agent' &&
            Number(leads[0].assigned_agent_id) === req.user.id;

        if (!isAdmin && !isAssignedCallingAgent) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to view this lead.',
            });
        }

        const [history] = await pool.query(
            `
      SELECT
        h.id,
        h.old_status,
        h.new_status,
        h.notes,
        h.changed_at,
        h.changed_by,
        m.full_name AS changed_by_name
      FROM lead_status_history AS h
      LEFT JOIN members AS m
        ON m.id = h.changed_by
      WHERE h.lead_id = ?
      ORDER BY h.changed_at DESC, h.id DESC
      `,
            [leadId]
        );

        return res.json({
            success: true,
            data: {
                lead: leads[0],
                statusHistory: history,
            },
        });
    } catch (error) {
        console.error('Lead details API failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to load lead details.',
        });
    }
});


const VALID_STATUSES = [
    'new',
    'under_review',
    'contacted',
    'follow_up',
    'service_confirmed',
    'completed',
    'cancelled',
];

router.patch(
    '/leads/:id/status',
    authenticate,
    async (req, res) => {
        let connection;

        try {
            const leadId = Number(req.params.id);
            const { status, notes } = req.body;
            const user = req.user;

            if (!Number.isSafeInteger(leadId) || leadId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lead ID.',
                });
            }

            if (
                typeof status !== 'string' ||
                !VALID_STATUSES.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lead status.',
                    allowedStatuses: VALID_STATUSES,
                });
            }

            if (
                notes !== undefined &&
                notes !== null &&
                typeof notes !== 'string'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Notes must be text.',
                });
            }

            if (typeof notes === 'string' && notes.length > 5000) {
                return res.status(400).json({
                    success: false,
                    message: 'Notes cannot exceed 5000 characters.',
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Lock the lead while validating and changing its status.
            const [leads] = await connection.query(
                `SELECT id, status, assigned_agent_id
         FROM leads
         WHERE id = ?
         FOR UPDATE`,
                [leadId]
            );

            if (leads.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Lead not found.',
                });
            }

            const lead = leads[0];

            // Admins can update any lead.
            // Calling agents can update only leads assigned to them.
            const isAdmin = user.role === 'admin';

            const isAssignedCallingAgent =
                user.role === 'calling_agent' &&
                Number(lead.assigned_agent_id) === user.id;

            if (!isAdmin && !isAssignedCallingAgent) {
                await connection.rollback();

                return res.status(403).json({
                    success: false,
                    message:
                        'Only an admin or the assigned calling agent can update this lead.',
                });
            }

            // Do not create duplicate history entries.
            if (lead.status === status) {
                await connection.rollback();

                return res.json({
                    success: true,
                    message: 'Lead already has this status.',
                    data: {
                        id: leadId,
                        status: lead.status,
                        unchanged: true,
                    },
                });
            }

            const oldStatus = lead.status;

            await connection.query(
                `UPDATE leads
         SET status = ?
         WHERE id = ?`,
                [status, leadId]
            );

            await connection.query(
                `INSERT INTO lead_status_history
          (lead_id, old_status, new_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    leadId,
                    oldStatus,
                    status,
                    user.id,
                    notes?.trim() || null,
                ]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: 'Lead status updated successfully.',
                data: {
                    id: leadId,
                    oldStatus,
                    status,
                    changedBy: user.id,
                },
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Lead status update failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to update lead status.',
            });
        } finally {
            connection?.release();
        }
    }
);



export default router;
