
import express from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import {
    authenticate,
    requireAdmin,
} from '../middleware/auth.js';
const router = express.Router();

// GET /api/admin/overview
router.get('/overview', authenticate, requireAdmin, async (_req, res) => {
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


// GET /api/admin/members

router.get('/members', authenticate, requireAdmin, async (req, res) => {
    try {
        const [members] = await pool.execute(
            `SELECT
        id,
        full_name,
        email,
        phone,
        role,
        account_status,
        parent_member_id,
        created_at
       FROM members
       ORDER BY created_at DESC`
        );

        // Group associates under their linked Team Member.
        const teamMembers = members
            .filter((member) => member.role === 'team_member')
            .map((member) => ({
                ...member,
                associates: members.filter(
                    (associate) =>
                        associate.role === 'associate' &&
                        associate.parent_member_id != null &&
                        Number(associate.parent_member_id) === Number(member.id)
                )
            }));

        // Associates without a parent remain independent.
        const independentAssociates = members.filter(
            (member) =>
                member.role === 'associate' &&
                member.parent_member_id === null
        );

        // Admins and calling agents remain separate entries.
        const otherMembers = members.filter(
            (member) =>
                member.role === 'admin' ||
                member.role === 'calling_agent'
        );

        return res.status(200).json({
            success: true,
            data: {
                teamMembers,
                independentAssociates,
                otherMembers
            }
        });
    } catch (error) {
        console.error('Fetch members error:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch members.'
        });
    }
});

/**
 * GET /api/admin/members/:id
 * Fetch a member profile and submitted-lead summary.
 */
router.get('/members/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const memberId = Number(req.params.id);

        if (!Number.isSafeInteger(memberId) || memberId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid member ID.',
            });
        }

        // Fetch the member and their parent Team Member, if any.
        const [members] = await pool.query(
            `SELECT
                m.id,
                m.full_name,
                m.email,
                m.phone,
                m.role,
                m.account_status,
                m.parent_member_id,
                m.created_at,
                parent.full_name AS parent_member_name,
                parent.email AS parent_member_email
             FROM members AS m
             LEFT JOIN members AS parent
                ON parent.id = m.parent_member_id
             WHERE m.id = ?
             LIMIT 1`,
            [memberId]
        );

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found.',
            });
        }

        const member = members[0];

        // Count Associates linked to this Team Member.
        let associateCount = 0;

        if (member.role === 'team_member') {
            const [counts] = await pool.query(
                `SELECT COUNT(*) AS total
                 FROM members
                 WHERE parent_member_id = ?
                   AND role = 'associate'`,
                [memberId]
            );

            associateCount = Number(counts[0].total);
        }

        // Count only leads submitted by this member.
        const [leadSummary] = await pool.query(
            `SELECT
                COUNT(*) AS total,
                SUM(status = 'completed') AS completed,
                SUM(status = 'cancelled') AS cancelled,
                SUM(status NOT IN ('completed', 'cancelled')) AS in_progress
             FROM leads
             WHERE submitted_by = ?`,
            [memberId]
        );

        return res.status(200).json({
            success: true,
            data: {
                member,
                associateCount,
                leadSummary: {
                    total: Number(leadSummary[0].total || 0),
                    completed: Number(leadSummary[0].completed || 0),
                    cancelled: Number(leadSummary[0].cancelled || 0),
                    inProgress: Number(leadSummary[0].in_progress || 0),
                },
            },
        });
    } catch (error) {
        console.error('Fetch member details failed:', error);

        return res.status(500).json({
            success: false,
            message: 'Unable to fetch member details.',
        });
    }
});

/**
 * GET /api/admin/members/:id/associates
 * Fetch all Associates linked to a Team Member.
 */
router.get(
    '/members/:id/associates',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const teamMemberId = Number(req.params.id);

            if (!Number.isSafeInteger(teamMemberId) || teamMemberId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Team Member ID.',
                });
            }

            const [teamMembers] = await pool.query(
                `SELECT id, role
                 FROM members
                 WHERE id = ?
                 LIMIT 1`,
                [teamMemberId]
            );

            if (teamMembers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member not found.',
                });
            }

            if (teamMembers[0].role !== 'team_member') {
                return res.status(400).json({
                    success: false,
                    message: 'The requested member is not a Team Member.',
                });
            }


            const [associates] = await pool.query(
                `SELECT
        m.id,
        m.full_name,
        m.email,
        m.phone,
        m.role,
        m.account_status,
        m.parent_member_id,
        m.created_at,

        COUNT(l.id) AS total_leads,

        COALESCE(
            SUM(l.status = 'completed'),
            0
        ) AS completed_leads,

        COALESCE(
            SUM(l.status = 'cancelled'),
            0
        ) AS cancelled_leads,

        COALESCE(
            SUM(
                l.id IS NOT NULL
                AND l.status NOT IN ('completed', 'cancelled')
            ),
            0
        ) AS in_progress_leads

     FROM members AS m

     LEFT JOIN leads AS l
        ON l.submitted_by = m.id

     WHERE m.parent_member_id = ?
       AND m.role = 'associate'

     GROUP BY
        m.id,
        m.full_name,
        m.email,
        m.phone,
        m.role,
        m.account_status,
        m.parent_member_id,
        m.created_at

     ORDER BY m.created_at DESC`,
                [teamMemberId]
            );


            return res.status(200).json({
                success: true,
                count: associates.length,
                data: associates,
            });
        } catch (error) {
            console.error('Fetch Team Member associates failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch Associates.',
            });
        }
    }
);


/**
 * GET /api/admin/members/:id/leads
 * Fetch leads submitted directly by a member.
 */
router.get(
    '/members/:id/leads',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const memberId = Number(req.params.id);

            if (!Number.isSafeInteger(memberId) || memberId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid member ID.',
                });
            }

            const [members] = await pool.query(
                `SELECT id, full_name, role
                 FROM members
                 WHERE id = ?
                 LIMIT 1`,
                [memberId]
            );

            if (members.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Member not found.',
                });
            }

            const [leads] = await pool.query(
                `SELECT
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
                    l.service_amount,
                    l.created_at,
                    l.updated_at,
                    s.name AS service_name
                 FROM leads AS l
                 LEFT JOIN service_types AS s
                    ON s.id = l.service_type_id
                 WHERE l.submitted_by = ?
                 ORDER BY l.created_at DESC`,
                [memberId]
            );

            return res.status(200).json({
                success: true,
                member: members[0],
                count: leads.length,
                data: leads,
            });
        } catch (error) {
            console.error('Fetch member leads failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch member leads.',
            });
        }
    }
);


/**
 * PATCH /api/admin/members/:id/associate
 * Link an Associate to a Team Member or remove the relationship.
 */
router.patch(
    '/members/:id/associate',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const associateId = Number(req.params.id);
            const { parent_member_id } = req.body;

            if (!Number.isSafeInteger(associateId) || associateId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid Associate ID.',
                });
            }

            const removeRelationship =
                parent_member_id === null;

            const parentId = removeRelationship
                ? null
                : Number(parent_member_id);

            if (
                !removeRelationship &&
                (!Number.isSafeInteger(parentId) || parentId <= 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'A valid Team Member ID or null is required.',
                });
            }

            const [associates] = await pool.query(
                `SELECT id, role
         FROM members
         WHERE id = ?
         LIMIT 1`,
                [associateId]
            );

            if (
                associates.length === 0 ||
                associates[0].role !== 'associate'
            ) {
                return res.status(404).json({
                    success: false,
                    message: 'Associate not found.',
                });
            }

            if (parentId !== null) {
                const [teamMembers] = await pool.query(
                    `SELECT id
           FROM members
           WHERE id = ?
             AND role = 'team_member'
             AND account_status = 'active'
           LIMIT 1`,
                    [parentId]
                );

                if (teamMembers.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'The selected parent must be an active Team Member.',
                    });
                }

                if (parentId === associateId) {
                    return res.status(400).json({
                        success: false,
                        message: 'An Associate cannot be their own parent.',
                    });
                }
            }

            await pool.query(
                `UPDATE members
         SET parent_member_id = ?
         WHERE id = ?`,
                [parentId, associateId]
            );

            return res.status(200).json({
                success: true,
                message: parentId === null
                    ? 'Associate relationship removed.'
                    : 'Associate linked to Team Member successfully.',
                data: {
                    associate_id: associateId,
                    parent_member_id: parentId,
                },
            });
        } catch (error) {
            console.error('Associate relationship update failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to update Associate relationship.',
            });
        }
    }
);


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



router.post('/leads', authenticate, async (req, res) => {
    try {
        // Only admins, team members, and associates can submit leads.
        const allowedRoles = ['admin', 'team_member', 'associate'];

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not allowed to create leads.',
            });
        }

        const {
            customer_name,
            customer_phone,
            customer_email,
            service_type_id,
            hospital_or_location,
            pickup_location,
            destination,
            scheduled_at,
            notes,
            service_amount,
        } = req.body;

        // Validate required fields.
        if (
            typeof customer_name !== 'string' ||
            !customer_name.trim() ||
            typeof customer_phone !== 'string' ||
            !customer_phone.trim() ||
            !Number.isInteger(Number(service_type_id)) ||
            Number(service_type_id) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Customer name, phone, and a valid service type are required.',
            });
        }

        if (
            service_amount !== undefined &&
            service_amount !== null &&
            !isValidServiceAmount(service_amount)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'service_amount must be a valid amount greater than zero.',
            });
        }

        const serviceAmount =
            service_amount === undefined || service_amount === null
                ? null
                : Number(service_amount);

        // Confirm the service exists and is active.
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

        // The authenticated identity comes from the verified JWT.
        // Never trust submitted_by from the request body.
        const submittingMemberId = req.user.id;

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
                service_amount,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
            [
                `LD-${Date.now()}`,
                customer_name.trim(),
                customer_phone.trim(),
                customer_email || null,
                Number(service_type_id),
                submittingMemberId,
                hospital_or_location || null,
                pickup_location || null,
                destination || null,
                scheduled_at || null,
                notes || null,
                serviceAmount,
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Lead created successfully.',
            data: {
                id: result.insertId,
                status: 'new',
                service_amount: serviceAmount,
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
        l.service_amount,
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

function isValidServiceAmount(value) {
    const amount = Number(value);

    return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        Number.isFinite(amount) &&
        amount > 0 &&
        Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7 &&
        amount <= 99999999.99
    );
}



router.patch(
    '/leads/:id/status',
    authenticate,
    async (req, res) => {
        let connection;

        try {
            const leadId = Number(req.params.id);
            const { status, notes, service_amount } = req.body;
            const user = req.user;

            if (!Number.isSafeInteger(leadId) || leadId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lead ID.'
                });
            }

            if (
                typeof status !== 'string' ||
                !VALID_STATUSES.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid lead status.',
                    allowedStatuses: VALID_STATUSES
                });
            }

            if (
                notes !== undefined &&
                notes !== null &&
                typeof notes !== 'string'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Notes must be text.'
                });
            }

            if (typeof notes === 'string' && notes.length > 5000) {
                return res.status(400).json({
                    success: false,
                    message: 'Notes cannot exceed 5000 characters.'
                });
            }

            // Only admins can complete a lead and set its final charge.
            if (status === 'completed' && user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Only an admin can complete a lead.'
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Lock the lead during the status and commission operation.
            const [leads] = await connection.query(
                `SELECT
           id,
           status,
           assigned_agent_id,
           submitted_by,
           service_type_id,
           service_amount
         FROM leads
         WHERE id = ?
         FOR UPDATE`,
                [leadId]
            );

            if (leads.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Lead not found.'
                });
            }

            const lead = leads[0];

            const isAdmin = user.role === 'admin';

            const isAssignedCallingAgent =
                user.role === 'calling_agent' &&
                Number(lead.assigned_agent_id) === Number(user.id);

            if (!isAdmin && !isAssignedCallingAgent) {
                await connection.rollback();

                return res.status(403).json({
                    success: false,
                    message:
                        'Only an admin or the assigned calling agent can update this lead.'
                });
            }

            // Completed leads cannot be reopened or have their status changed.
            if (lead.status === 'completed' && status !== 'completed') {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: 'A completed lead cannot be reopened.'
                });
            }

            if (lead.status === status) {
                await connection.rollback();

                return res.json({
                    success: true,
                    message: 'Lead already has this status.',
                    data: {
                        id: leadId,
                        status: lead.status,
                        unchanged: true
                    }
                });
            }

            const finalServiceAmount =
                service_amount === undefined || service_amount === null
                    ? lead.service_amount
                    : service_amount;

            if (
                status === 'completed' &&
                !isValidServiceAmount(finalServiceAmount)
            ) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message:
                        'A valid service_amount greater than zero is required to complete a lead.'
                });
            }

            const oldStatus = lead.status;

            let commissionCreated = false;
            let commissionAmount = null;
            let commissionPercentage = null;
            let serviceAmount = null;

            if (status === 'completed') {
                // Read the current rate for this service.
                const [services] = await connection.query(
                    `SELECT commission_percentage
           FROM service_types
           WHERE id = ?
           LIMIT 1`,
                    [lead.service_type_id]
                );

                if (services.length === 0) {
                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message: 'The lead service type was not found.'
                    });
                }

                commissionPercentage = Number(
                    services[0].commission_percentage
                );

                serviceAmount = Number(finalServiceAmount);

                commissionAmount = Number(
                    (
                        serviceAmount *
                        commissionPercentage /
                        100
                    ).toFixed(2)
                );

                // The lead submitter is the only eligible member.
                if (!lead.submitted_by) {
                    await connection.rollback();

                    return res.status(400).json({
                        success: false,
                        message: 'This lead has no eligible submitting member.'
                    });
                }

                // Store the final charge and complete the lead.
                await connection.query(
                    `UPDATE leads
           SET status = ?, service_amount = ?
           WHERE id = ?`,
                    [status, serviceAmount, leadId]
                );

                // The unique lead_id constraint prevents duplicate commissions.
                await connection.query(
                    `INSERT INTO commissions
             (
               lead_id,
               eligible_member_id,
               commission_amount,
               commission_percentage,
               status
             )
           VALUES (?, ?, ?, ?, 'pending')`,
                    [
                        leadId,
                        lead.submitted_by,
                        commissionAmount,
                        commissionPercentage
                    ]
                );

                commissionCreated = true;
            } else {
                await connection.query(
                    `UPDATE leads
           SET status = ?
           WHERE id = ?`,
                    [status, leadId]
                );
            }

            // Keep the existing status history behavior.
            await connection.query(
                `INSERT INTO lead_status_history
           (lead_id, old_status, new_status, changed_by, notes)
         VALUES (?, ?, ?, ?, ?)`,
                [
                    leadId,
                    oldStatus,
                    status,
                    user.id,
                    notes?.trim() || null
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
                    commissionCreated,
                    ...(commissionCreated
                        ? {
                            serviceAmount,
                            commissionPercentage,
                            commissionAmount,
                            commissionStatus: 'pending'
                        }
                        : {})
                }
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Lead status update failed:', error.message);

            // A unique lead_id violation should never create a second commission.
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message:
                        'A commission already exists for this lead. Please check the commission record.'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Unable to update lead status.'
            });
        } finally {
            connection?.release();
        }
    }
);




/**
 * SERVICE TYPES APIs
 */

// GET /api/admin/service-types
// List service types with optional search and active-status filtering.
router.get(
    '/service-types',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const { search, status } = req.query;

            let sql = `
               SELECT id, name, description, commission_percentage,
       is_active, created_at, updated_at
FROM service_types
                WHERE 1 = 1
            `;

            const params = [];

            if (search !== undefined) {
                if (typeof search !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: 'Search must be text.',
                    });
                }

                if (search.trim()) {
                    sql += ' AND name LIKE ?';
                    params.push(`%${search.trim()}%`);
                }
            }

            if (status !== undefined && status !== 'all') {
                if (!['active', 'inactive'].includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Status must be active, inactive, or all.',
                    });
                }

                sql += ' AND is_active = ?';
                params.push(status === 'active' ? 1 : 0);
            }

            sql += ' ORDER BY created_at DESC, id DESC';

            const [services] = await pool.query(sql, params);

            return res.json({
                success: true,
                count: services.length,
                data: services,
            });
        } catch (error) {
            console.error('Fetch service types failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch service types.',
            });
        }
    }
);


// GET /api/admin/service-types/:id
// Fetch one service type.
router.get(
    '/service-types/:id',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const serviceId = Number(req.params.id);

            if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid service type ID.',
                });
            }

            const [services] = await pool.query(
                `SELECT id, name, description, commission_percentage,
       is_active, created_at, updated_at
FROM service_types
                 WHERE id = ?
                 LIMIT 1`,
                [serviceId]
            );

            if (services.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Service type not found.',
                });
            }

            return res.json({
                success: true,
                data: services[0],
            });
        } catch (error) {
            console.error('Fetch service type failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch service type.',
            });
        }
    }
);


// POST /api/admin/service-types
// Create a service type.

router.post(
    '/service-types',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const {
                name,
                description = null,
                commission_percentage = 0,
            } = req.body;

            // Validate service name.
            if (
                typeof name !== 'string' ||
                !name.trim() ||
                name.trim().length > 150
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Name is required and must be at most 150 characters.',
                });
            }

            // Validate description.
            if (
                description !== null &&
                typeof description !== 'string'
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Description must be text or null.',
                });
            }

            // Accept a percentage from 0 to 100, with up to 2 decimals.
            const rate = Number(commission_percentage);

            if (
                commission_percentage === null ||
                commission_percentage === '' ||
                !Number.isFinite(rate) ||
                rate < 0 ||
                rate > 100 ||
                Math.round(rate * 100) !== rate * 100
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Commission percentage must be between 0 and 100, with up to 2 decimal places.',
                });
            }

            // Prevent duplicate service names.
            const [existing] = await pool.query(
                'SELECT id FROM service_types WHERE name = ? LIMIT 1',
                [name.trim()]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'A service type with this name already exists.',
                });
            }

            // Save the service and its commission percentage.
            const [result] = await pool.query(
                `INSERT INTO service_types
                    (name, description, commission_percentage)
                 VALUES (?, ?, ?)`,
                [
                    name.trim(),
                    description?.trim() || null,
                    rate,
                ]
            );

            // Return the newly created service.
            const [services] = await pool.query(
                `SELECT
                    id,
                    name,
                    description,
                    commission_percentage,
                    is_active,
                    created_at,
                    updated_at
                 FROM service_types
                 WHERE id = ?`,
                [result.insertId]
            );

            return res.status(201).json({
                success: true,
                message: 'Service type created successfully.',
                data: services[0],
            });
        } catch (error) {
            console.error('Create service type failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to create service type.',
            });
        }
    }
);



// PUT /api/admin/service-types/:id
// Update a service type. Omitted fields remain unchanged.

router.put('/service-types/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description = null,
            commission_percentage = 0
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                message: 'Service type name is required'
            });
        }

        const percentage = Number(commission_percentage);

        if (
            !Number.isFinite(percentage) ||
            percentage < 0 ||
            percentage > 100 ||
            !/^\d+(\.\d{1,2})?$/.test(String(commission_percentage))
        ) {
            return res.status(400).json({
                message: 'Commission percentage must be between 0 and 100, with up to 2 decimal places'
            });
        }

        const [existing] = await pool.query(
            'SELECT id FROM service_types WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: 'Service type not found'
            });
        }

        const [duplicate] = await pool.query(
            'SELECT id FROM service_types WHERE name = ? AND id != ?',
            [name.trim(), id]
        );

        if (duplicate.length > 0) {
            return res.status(409).json({
                message: 'A service type with this name already exists'
            });
        }

        await pool.query(
            `UPDATE service_types
       SET name = ?,
           description = ?,
           commission_percentage = ?
       WHERE id = ?`,
            [name.trim(), description, percentage, id]
        );

        const [updated] = await pool.query(
            `SELECT id, name, description, commission_percentage,
              is_active, created_at, updated_at
       FROM service_types
       WHERE id = ?`,
            [id]
        );

        return res.json({
            message: 'Service type updated successfully',
            serviceType: updated[0]
        });
    } catch (error) {
        console.error('Update service type error:', error);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
});



// PATCH /api/admin/service-types/:id/status
// Activate or deactivate a service type.
router.patch(
    '/service-types/:id/status',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const serviceId = Number(req.params.id);
            const { is_active } = req.body;

            if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid service type ID.',
                });
            }

            if (![0, 1, true, false].includes(is_active)) {
                return res.status(400).json({
                    success: false,
                    message: 'is_active must be true, false, 1, or 0.',
                });
            }

            const [result] = await pool.query(
                `UPDATE service_types
                 SET is_active = ?
                 WHERE id = ?`,
                [Number(Boolean(is_active)), serviceId]
            );

            if (result.affectedRows === 0) {
                const [existing] = await pool.query(
                    'SELECT id FROM service_types WHERE id = ?',
                    [serviceId]
                );

                if (existing.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Service type not found.',
                    });
                }
            }

            const [services] = await pool.query(
                `SELECT
                    id,
                    name,
                    description,
                    commission_percentage,
                    is_active,
                    created_at,
                    updated_at
                 FROM service_types
                 WHERE id = ?`,
                [serviceId]
            );

            return res.json({
                success: true,
                message: `Service type ${Number(services[0].is_active) === 1 ? 'activated' : 'deactivated'} successfully.`,
                data: services[0],
            });
        } catch (error) {
            console.error('Change service type status failed:', error.message);

            return res.status(500).json({
                success: false,
                message: 'Unable to change service type status.',
            });
        }
    }
);


/**
 * GET /api/admin/commissions
 * List commissions with optional filters.
 */
router.get(
    '/commissions',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const { status, member_id, search } = req.query;

            const validStatuses = [
                'pending',
                'approved',
                'paid',
                'rejected'
            ];

            let sql = `
        SELECT
          c.id,
          c.lead_id,
          c.eligible_member_id,
          c.commission_amount,
          c.commission_percentage,
          c.status,
        c.approved_by,
c.approved_at,
c.paid_by,
c.paid_at,
          c.rejection_reason,
          c.created_at,
          c.updated_at,

          l.lead_code,
          l.customer_name,
          l.customer_phone,
          l.service_amount,
          l.status AS lead_status,

          s.name AS service_name,

          m.full_name AS eligible_member_name,
          m.email AS eligible_member_email,
          m.role AS eligible_member_role,

          approver.full_name AS approved_by_name,

          paid_by.full_name AS paid_by_name

        FROM commissions AS c

        INNER JOIN leads AS l
          ON l.id = c.lead_id

        LEFT JOIN service_types AS s
          ON s.id = l.service_type_id

        INNER JOIN members AS m
          ON m.id = c.eligible_member_id

        LEFT JOIN members AS approver
          ON approver.id = c.approved_by

          LEFT JOIN members AS paid_by
  ON paid_by.id = c.paid_by

        WHERE 1 = 1
      `;

            const params = [];

            // Filter by commission status.
            if (status !== undefined && status !== 'all') {
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message:
                            'Status must be pending, approved, paid, rejected, or all.'
                    });
                }

                sql += ' AND c.status = ?';
                params.push(status);
            }

            // Filter by the member who earned the commission.
            if (member_id !== undefined) {
                const memberId = Number(member_id);

                if (
                    !Number.isSafeInteger(memberId) ||
                    memberId <= 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid member ID.'
                    });
                }

                sql += ' AND c.eligible_member_id = ?';
                params.push(memberId);
            }

            // Search by lead code, customer, or member name.
            if (search !== undefined) {
                if (typeof search !== 'string') {
                    return res.status(400).json({
                        success: false,
                        message: 'Search must be text.'
                    });
                }

                if (search.trim()) {
                    const term = `%${search.trim()}%`;

                    sql += `
            AND (
              l.lead_code LIKE ?
              OR l.customer_name LIKE ?
              OR m.full_name LIKE ?
            )
          `;

                    params.push(term, term, term);
                }
            }

            sql += ' ORDER BY c.created_at DESC, c.id DESC LIMIT 100';

            const [commissions] = await pool.query(sql, params);

            return res.status(200).json({
                success: true,
                count: commissions.length,
                data: commissions
            });
        } catch (error) {
            console.error('Fetch commissions failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch commissions.'
            });
        }
    }
);



/**
 * GET /api/admin/commissions/:id
 * Fetch details of one commission.
 */
router.get(
    '/commissions/:id',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const commissionId = Number(req.params.id);

            if (
                !Number.isSafeInteger(commissionId) ||
                commissionId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid commission ID.'
                });
            }

            const [rows] = await pool.query(
                `SELECT
           c.id AS commission_id,
           c.lead_id,
           c.eligible_member_id,
           c.commission_amount,
           c.commission_percentage,
           c.status AS commission_status,
          c.approved_by,
c.approved_at,
c.paid_by,
c.paid_at,
           c.rejection_reason,
           c.created_at AS commission_created_at,
           c.updated_at AS commission_updated_at,

           l.lead_code,
           l.customer_name,
           l.customer_phone,
           l.customer_email,
           l.hospital_or_location,
           l.pickup_location,
           l.destination,
           l.scheduled_at,
           l.service_amount,
           l.status AS lead_status,

           s.id AS service_type_id,
           s.name AS service_name,

           m.full_name AS eligible_member_name,
           m.email AS eligible_member_email,
           m.phone AS eligible_member_phone,
           m.role AS eligible_member_role,

           approver.full_name AS approved_by_name,


           paid_by.full_name AS paid_by_name

         FROM commissions AS c

         INNER JOIN leads AS l
           ON l.id = c.lead_id

         LEFT JOIN service_types AS s
           ON s.id = l.service_type_id

         INNER JOIN members AS m
           ON m.id = c.eligible_member_id

         LEFT JOIN members AS approver
           ON approver.id = c.approved_by

           LEFT JOIN members AS paid_by
  ON paid_by.id = c.paid_by

         WHERE c.id = ?
         LIMIT 1`,
                [commissionId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Commission not found.'
                });
            }

            return res.status(200).json({
                success: true,
                data: rows[0]
            });
        } catch (error) {
            console.error('Fetch commission details failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to fetch commission details.'
            });
        }
    }
);


/**
 * PATCH /api/admin/commissions/:id/approve
 * Approve a pending commission.
 */
router.patch(
    '/commissions/:id/approve',
    authenticate,
    requireAdmin,
    async (req, res) => {
        let connection;

        try {
            const commissionId = Number(req.params.id);

            if (
                !Number.isSafeInteger(commissionId) ||
                commissionId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid commission ID.'
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [commissions] = await connection.query(
                `SELECT id, status
         FROM commissions
         WHERE id = ?
         FOR UPDATE`,
                [commissionId]
            );

            if (commissions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Commission not found.'
                });
            }

            if (commissions[0].status !== 'pending') {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message: `Only pending commissions can be approved. Current status: ${commissions[0].status}.`
                });
            }

            await connection.query(
                `UPDATE commissions
         SET status = 'approved',
             approved_by = ?,
             approved_at = NOW(),
             rejection_reason = NULL
         WHERE id = ?`,
                [req.user.id, commissionId]
            );

            await connection.commit();

            return res.status(200).json({
                success: true,
                message: 'Commission approved successfully.',
                data: {
                    id: commissionId,
                    status: 'approved',
                    approved_by: req.user.id
                }
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Approve commission failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to approve commission.'
            });
        } finally {
            connection?.release();
        }
    }
);

/**
 * PATCH /api/admin/commissions/:id/reject
 * Reject a pending commission. Admin only.
 */
router.patch(
    '/commissions/:id/reject',
    authenticate,
    requireAdmin,
    async (req, res) => {
        let connection;

        try {
            const commissionId = Number(req.params.id);
            const { rejection_reason } = req.body;

            if (
                !Number.isSafeInteger(commissionId) ||
                commissionId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid commission ID.'
                });
            }

            if (
                typeof rejection_reason !== 'string' ||
                !rejection_reason.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'A rejection reason is required.'
                });
            }

            if (rejection_reason.trim().length > 5000) {
                return res.status(400).json({
                    success: false,
                    message: 'Rejection reason cannot exceed 5000 characters.'
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [commissions] = await connection.query(
                `SELECT id, status
         FROM commissions
         WHERE id = ?
         FOR UPDATE`,
                [commissionId]
            );

            if (commissions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Commission not found.'
                });
            }

            if (commissions[0].status !== 'pending') {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        `Only pending commissions can be rejected. Current status: ${commissions[0].status}.`
                });
            }

            await connection.query(
                `UPDATE commissions
         SET status = 'rejected',
             rejection_reason = ?
         WHERE id = ?`,
                [rejection_reason.trim(), commissionId]
            );

            await connection.commit();

            return res.status(200).json({
                success: true,
                message: 'Commission rejected successfully.',
                data: {
                    id: commissionId,
                    status: 'rejected',
                    rejection_reason: rejection_reason.trim()
                }
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Reject commission failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to reject commission.'
            });
        } finally {
            connection?.release();
        }
    }
);


/**
 * PATCH /api/admin/commissions/:id/pay
 * Mark an approved commission as paid. Admin only.
 */
router.patch(
    '/commissions/:id/pay',
    authenticate,
    requireAdmin,
    async (req, res) => {
        let connection;

        try {
            const commissionId = Number(req.params.id);

            if (
                !Number.isSafeInteger(commissionId) ||
                commissionId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid commission ID.'
                });
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [commissions] = await connection.query(
                `SELECT id, status
         FROM commissions
         WHERE id = ?
         FOR UPDATE`,
                [commissionId]
            );

            if (commissions.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Commission not found.'
                });
            }

            if (commissions[0].status !== 'approved') {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        'Only approved commissions can be marked as paid.'
                });
            }

            await connection.query(
                `UPDATE commissions
         SET status = 'paid',
             paid_by = ?,
             paid_at = NOW()
         WHERE id = ?`,
                [req.user.id, commissionId]
            );

            await connection.commit();

            const [adminRows] = await connection.query(
                `SELECT full_name
   FROM members
   WHERE id = ?`,
                [req.user.id]
            );


            return res.status(200).json({
                success: true,
                message: 'Commission marked as paid successfully.',
                data: {
                    id: commissionId,
                    status: 'paid',
                    paid_by: req.user.id,
                    paid_by_name: adminRows[0]?.full_name || 'Admin'
                }
            });
        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Mark commission as paid failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to mark commission as paid.'
            });
        } finally {
            connection?.release();
        }
    }
);


router.delete(
    '/service-types/:id',
    authenticate,
    requireAdmin,
    async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const serviceId = Number(req.params.id);
            const { password } = req.body;

            if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid service type ID.',
                });
            }

            if (typeof password !== 'string' || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Admin password is required.',
                });
            }

            // Verify the password of the currently authenticated admin.
            const [members] = await connection.query(
                `SELECT id, password_hash, role, account_status
                 FROM members
                 WHERE id = ?
                 LIMIT 1`,
                [req.user.id]
            );

            if (
                members.length === 0 ||
                members[0].role !== 'admin' ||
                members[0].account_status !== 'active'
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'An active admin account is required.',
                });
            }

            const passwordMatches = await bcrypt.compare(
                password,
                members[0].password_hash
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    message: 'Incorrect admin password.',
                });
            }

            await connection.beginTransaction();

            // Lock the service row while checking whether it can be deleted.
            const [services] = await connection.query(
                `SELECT id, name
                 FROM service_types
                 WHERE id = ?
                 FOR UPDATE`,
                [serviceId]
            );

            if (services.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: 'Service type not found.',
                });
            }

            // Preserve historical lead and commission records.
            const [leads] = await connection.query(
                `SELECT id
                 FROM leads
                 WHERE service_type_id = ?
                 LIMIT 1`,
                [serviceId]
            );

            if (leads.length > 0) {
                await connection.rollback();

                return res.status(409).json({
                    success: false,
                    message:
                        'This service is linked to existing leads and cannot be deleted. Deactivate it instead.',
                });
            }

            await connection.query(
                `DELETE FROM service_types
                 WHERE id = ?`,
                [serviceId]
            );

            await connection.commit();

            return res.json({
                success: true,
                message: 'Service type deleted successfully.',
                data: {
                    id: serviceId,
                    name: services[0].name,
                },
            });
        } catch (error) {
            await connection.rollback().catch(() => { });

            // Foreign-key constraints may protect other related records too.
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({
                    success: false,
                    message:
                        'This service is linked to existing records and cannot be deleted. Deactivate it instead.',
                });
            }

            console.error('Delete service type failed:', error);

            return res.status(500).json({
                success: false,
                message: 'Unable to delete service type.',
            });
        } finally {
            connection.release();
        }
    }
);

/**
 * POST /api/admin/team-registration-codes
 * Generate a secure registration code for a new Team Member.
 */
router.post(
    '/team-registration-codes',
    authenticate,
    requireAdmin,
    async (req, res) => {
        try {
            const { expiresInHours = 72 } = req.body ?? {};

            // Validate the expiry period: 1 hour to 30 days.
            if (
                !Number.isInteger(expiresInHours) ||
                expiresInHours < 1 ||
                expiresInHours > 720
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'expiresInHours must be an integer between 1 and 720.'
                });
            }

            // Generate a cryptographically secure random code.
            const registrationCode =
                `TM-${crypto.randomBytes(24).toString('hex')}`;

            // Store only the SHA-256 hash, never the plain-text code.
            const codeHash = crypto
                .createHash('sha256')
                .update(registrationCode)
                .digest('hex');

            const expiresAt = new Date(
                Date.now() + expiresInHours * 60 * 60 * 1000
            );

            // req.user.id comes from the authenticated admin's JWT.
            const [result] = await pool.execute(
                `INSERT INTO team_registration_codes
                    (code_hash, created_by, expires_at)
                 VALUES (?, ?, ?)`,
                [codeHash, req.user.id, expiresAt]
            );

            // The plain-text code is returned only at creation time.
            return res.status(201).json({
                success: true,
                message: 'Team Member registration code created successfully.',
                data: {
                    id: result.insertId,
                    code: registrationCode,
                    expiresAt: expiresAt.toISOString(),
                    expiresInHours
                }
            });
        } catch (error) {
            console.error(
                'Create Team Member registration code failed:',
                error.message
            );

            return res.status(500).json({
                success: false,
                message: 'Unable to create registration code.'
            });
        }
    }
);



export default router;
