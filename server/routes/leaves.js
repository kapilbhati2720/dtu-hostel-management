// server/routes/leaves.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Middleware: Check if user is an officer (nodal_officer or super_admin)
const isOfficer = (req, res, next) => {
    const hasOfficerRole = req.user.roles.some(r => 
        r.role_name === 'nodal_officer' || r.role_name === 'super_admin'
    );
    if (hasOfficerRole) return next();
    return res.status(403).json({ msg: 'Access denied. Staff role required.' });
};

// Middleware: Check if user can approve leaves (Warden or Attendant only, not Council Member)
const canApproveLeaves = (req, res, next) => {
    const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
    const designation = req.user.designation;
    const allowedDesignations = ['Warden', 'Chief Warden', 'Officer In-charge, Hostel Office', 'Attendant'];

    if (isSuperAdmin || allowedDesignations.includes(designation)) {
        return next();
    }
    return res.status(403).json({ msg: 'Only Wardens and Attendants can approve or reject leaves.' });
};

module.exports = function(io, onlineUsers) {

    // ================================================================
    // RESIDENT ROUTES
    // ================================================================

    // @route   POST /api/leaves
    // @desc    Resident applies for a leave
    // @access  Private (any authenticated user)
    router.post('/', auth, async (req, res) => {
        const { hostelId, leaveType, startDate, endDate, reason } = req.body;

        if (!hostelId || !leaveType || !startDate || !endDate) {
            return res.status(400).json({ msg: 'Please provide hostel, leave type, start date, and end date.' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            return res.status(400).json({ msg: 'End date must be after start date.' });
        }

        try {
            const result = await pool.query(
                `INSERT INTO hostel_leaves (user_id, hostel_id, leave_type, start_date, end_date, reason)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [req.user.id, hostelId, leaveType, startDate, endDate, reason || null]
            );

            const newLeave = result.rows[0];

            // Notify hostel officers about new leave request
            try {
                const officersRes = await pool.query(
                    `SELECT user_id FROM user_hostel_roles 
                     WHERE hostel_id = $1 AND role_id IN (SELECT role_id FROM roles WHERE role_name = 'nodal_officer')`,
                    [hostelId]
                );
                for (const officer of officersRes.rows) {
                    await pool.query(
                        `INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`,
                        [officer.user_id, `New leave request from ${req.user.name}.`, `/staff/leaves`]
                    );
                    const socketId = onlineUsers[officer.user_id];
                    if (socketId) io.to(socketId).emit('new_notification');
                }
            } catch (notifErr) {
                console.error("Leave notification error (non-critical):", notifErr.message);
            }

            res.status(201).json({ msg: 'Leave application submitted successfully.', leave: newLeave });
        } catch (err) {
            console.error("Leave creation error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/leaves/my
    // @desc    Get all leaves for the logged-in user
    // @access  Private
    router.get('/my', auth, async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT l.*, h.name as hostel_name, 
                        rv.full_name as reviewed_by_name
                 FROM hostel_leaves l
                 JOIN hostels h ON l.hostel_id = h.hostel_id
                 LEFT JOIN users rv ON l.reviewed_by = rv.user_id
                 WHERE l.user_id = $1
                 ORDER BY l.created_at DESC`,
                [req.user.id]
            );
            res.json(result.rows);
        } catch (err) {
            console.error("My leaves error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // ================================================================
    // STAFF ROUTES
    // ================================================================

    // @route   GET /api/leaves/all
    // @desc    Get all leave requests across all hostels (Chief Warden / super_admin only)
    // @access  Private (super_admin)
    router.get('/all', auth, async (req, res) => {
        const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
        if (!isSuperAdmin) {
            return res.status(403).json({ msg: 'Access denied. Chief Warden role required.' });
        }

        try {
            const result = await pool.query(`
                SELECT l.*,
                       u.full_name  AS applicant_name,
                       u.roll_number,
                       u.email      AS applicant_email,
                       h.name       AS hostel_name,
                       rv.full_name AS reviewed_by_name
                FROM hostel_leaves l
                JOIN users  u  ON l.user_id    = u.user_id
                JOIN hostels h ON l.hostel_id  = h.hostel_id
                LEFT JOIN users rv ON l.reviewed_by = rv.user_id
                ORDER BY l.created_at DESC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('All-leaves error:', err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/leaves/hostel/:hostelId
    // @desc    Get all leave requests for a specific hostel
    // @access  Private (Officer / Admin)
    router.get('/hostel/:hostelId', [auth, isOfficer], async (req, res) => {
        const { hostelId } = req.params;
        const { status } = req.query; // Optional filter: ?status=Pending

        try {
            let query = `
                SELECT l.*, 
                       u.full_name as applicant_name, 
                       u.roll_number,
                       u.email as applicant_email,
                       h.name as hostel_name,
                       rv.full_name as reviewed_by_name
                FROM hostel_leaves l
                JOIN users u ON l.user_id = u.user_id
                JOIN hostels h ON l.hostel_id = h.hostel_id
                LEFT JOIN users rv ON l.reviewed_by = rv.user_id
                WHERE l.hostel_id = $1
            `;
            const params = [hostelId];

            if (status) {
                query += ` AND l.status = $2`;
                params.push(status);
            }

            query += ` ORDER BY l.created_at DESC`;

            const result = await pool.query(query, params);
            res.json(result.rows);
        } catch (err) {
            console.error("Hostel leaves error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/leaves/stats/:hostelId
    // @desc    Get leave statistics for a hostel
    // @access  Private (Officer / Admin)
    router.get('/stats/:hostelId', [auth, isOfficer], async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'Pending') as pending,
                    COUNT(*) FILTER (WHERE status = 'Approved') as approved,
                    COUNT(*) FILTER (WHERE status = 'Rejected') as rejected
                FROM hostel_leaves
                WHERE hostel_id = $1
            `, [req.params.hostelId]);

            res.json(result.rows[0]);
        } catch (err) {
            console.error("Leave stats error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   PUT /api/leaves/:leaveId/status
    // @desc    Approve or reject a leave request (Warden / Attendant only)
    // @access  Private (Officer with appropriate designation)
    router.put('/:leaveId/status', [auth, isOfficer, canApproveLeaves], async (req, res) => {
        const { leaveId } = req.params;
        const { status, reviewNote } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ msg: 'Status must be either "Approved" or "Rejected".' });
        }

        try {
            // Update the leave
            const result = await pool.query(
                `UPDATE hostel_leaves 
                 SET status = $1, reviewed_by = $2, review_note = $3, updated_at = NOW()
                 WHERE leave_id = $4
                 RETURNING *`,
                [status, req.user.id, reviewNote || null, leaveId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ msg: 'Leave request not found.' });
            }

            const leave = result.rows[0];

            // Notify the student about the decision
            const statusEmoji = status === 'Approved' ? '✅' : '❌';
            const message = `${statusEmoji} Your leave request (${leave.leave_type}) has been ${status.toLowerCase()}.`;
            
            await pool.query(
                `INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`,
                [leave.user_id, message, '/my-leaves']
            );

            const studentSocketId = onlineUsers[leave.user_id];
            if (studentSocketId) io.to(studentSocketId).emit('new_notification');

            res.json({ msg: `Leave ${status.toLowerCase()} successfully.`, leave: result.rows[0] });
        } catch (err) {
            console.error("Leave status update error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   PUT /api/leaves/hostel/:hostelId/approve-all
    // @desc    Approve ALL pending leave requests for a given hostel (bulk action for festivals/long weekends)
    // @access  Private (Officer with appropriate designation)
    router.put('/hostel/:hostelId/approve-all', [auth, isOfficer, canApproveLeaves], async (req, res) => {
        const { hostelId } = req.params;
        const reviewNote = "Bulk approved automatically.";

        try {
            // First, find all pending leaves to notify the students after
            const pendingLeavesRes = await pool.query(
                `SELECT leave_id, user_id, leave_type FROM hostel_leaves WHERE hostel_id = $1 AND status = 'Pending'`,
                [hostelId]
            );

            if (pendingLeavesRes.rows.length === 0) {
                return res.status(404).json({ msg: 'No pending leave applications found for this hostel.' });
            }

            // Update the leaves
            await pool.query(
                `UPDATE hostel_leaves 
                 SET status = 'Approved', reviewed_by = $1, review_note = $2, updated_at = NOW()
                 WHERE hostel_id = $3 AND status = 'Pending'`,
                [req.user.id, reviewNote, hostelId]
            );

            // Notify all affected students
            for (const leave of pendingLeavesRes.rows) {
                const message = `✅ Your leave request (${leave.leave_type}) has been approved in bulk.`;
                await pool.query(
                    `INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`,
                    [leave.user_id, message, '/my-leaves']
                );

                const studentSocketId = onlineUsers[leave.user_id];
                if (studentSocketId) io.to(studentSocketId).emit('new_notification');
            }

            res.json({ msg: `Successfully bulk approved ${pendingLeavesRes.rows.length} pending leave(s).`});
        } catch (err) {
            console.error("Bulk leave approval error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
