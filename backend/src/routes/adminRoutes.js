
import express from 'express';
import pool from '../config/db.js';
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
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
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
