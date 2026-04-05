// server/routes/officer.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Middleware to check if the user has ANY officer-level role
const isOfficer = (req, res, next) => {
    const isOfficerRole = req.user.roles.some(r => 
        r.role_name === 'nodal_officer' || 
        r.role_name === 'department_head' || 
        r.role_name === 'super_admin'
    );
    if (isOfficerRole) {
        next();
    } else {
        return res.status(403).json({ msg: 'Access denied. Officer role required.' });
    }
};

// @route   GET /api/officer/dashboard-data
// @desc    Get comprehensive dashboard data (Smart Stats + Ticket List)
router.get('/dashboard-data', [auth, isOfficer], async (req, res) => {
    try {
        const client = await pool.connect();
        try {
            // --- NEW: Identify if the requester is a Super Admin ---
            const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');

            let departmentIds = req.user.roles
                .filter(r => r.role_name === 'nodal_officer' || r.role_name === 'department_head')
                .map(r => r.department_id);

            let grievanceQuery;
            let queryParams = [];
            let deptClause = "";

            // 1. Build the Logic based on Role (Super Admin vs Dept Officer)
            if (isSuperAdmin) {
                // Super Admin sees ALL, no WHERE clause needed for department
                deptClause = "1=1"; 
            } else if (departmentIds.length > 0) {
                // Officer sees only their department(s)
                deptClause = "ga.department_id = ANY($1::int[])";
                queryParams = [departmentIds];
            } else {
                return res.json({ 
                    stats: { cards: [], archive_count: 0 }, 
                    grievances: [],
                    trending: [] 
                });
            }

            // 2. Fetch The List (Grievances)
            const listQuery = `
                SELECT g.*, u.full_name as submitted_by_name 
                FROM grievances g
                JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
                JOIN users u ON g.submitted_by_id = u.user_id
                WHERE ${deptClause}
                ORDER BY 
                    CASE WHEN g.is_escalated = TRUE THEN 0 ELSE 1 END, 
                    g.created_at DESC
            `;

            // 3. Fetch The Smart Stats
            const statsQuery = `
                SELECT 
                    COUNT(CASE 
                        WHEN g.status IN ('Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated') 
                        THEN 1 END) as pending_work,
                    COUNT(CASE 
                        WHEN g.created_at < NOW() - INTERVAL '7 days' 
                        AND g.status NOT IN ('Resolved', 'Closed', 'Rejected') 
                        THEN 1 END) as sla_breach,
                    COUNT(CASE 
                        WHEN (g.is_escalated = TRUE OR g.status = 'Escalated')
                        AND g.status NOT IN ('Resolved', 'Closed', 'Rejected') 
                        THEN 1 END) as escalated_active,
                    COUNT(CASE 
                        WHEN g.created_at >= CURRENT_DATE 
                        THEN 1 END) as received_today,
                    COUNT(CASE 
                        WHEN g.status IN ('Resolved', 'Closed', 'Rejected') 
                        THEN 1 END) as history_archive
                FROM grievances g
                JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
                WHERE ${deptClause}
            `;
            
            // 4. Fetch Trending Issues for the Community Feed
            const trendingQuery = `
                SELECT 
                    g.ticket_id, g.title, g.category, g.status, g.created_at, g.is_anonymous,
                    u.full_name as author_name,
                    (SELECT COUNT(*)::int FROM grievance_followers WHERE grievance_id = g.grievance_id) as upvotes
                FROM grievances g
                JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
                JOIN users u ON g.submitted_by_id = u.user_id
                WHERE ${deptClause} 
                  AND g.upvotes > 0 
                  AND g.status NOT IN ('Rejected', 'Resolved', 'Closed')
                ORDER BY upvotes DESC, g.created_at DESC
                LIMIT 3
            `;

            const [listRes, statsRes, trendingRes] = await Promise.all([
                client.query(listQuery, queryParams),
                client.query(statsQuery, queryParams),
                client.query(trendingQuery, queryParams)
            ]);

            const row = statsRes.rows[0];

            // --- NEW: THE DTO DATA MASKING LAYER ---
            // We scrub the identity of the student if they requested anonymity, UNLESS a Super Admin is viewing.
            const maskIdentity = (ticket) => {
                if (ticket.is_anonymous && !isSuperAdmin) {
                    return {
                        ...ticket,
                        submitted_by_name: 'Anonymous Student',
                        author_name: 'Anonymous Student'
                    };
                }
                return ticket;
            };

            // Apply the mask to both arrays
            const securedGrievances = listRes.rows.map(maskIdentity);
            const securedTrending = trendingRes.rows.map(maskIdentity);

            // 5. Format the Response
            res.json({
                grievances: securedGrievances,
                trending: securedTrending, 
                stats: {
                    cards: [
                        { label: 'Actionable Queue', value: parseInt(row.pending_work) || 0, type: 'primary', desc: 'Tickets requiring attention' },
                        { label: 'SLA Breaches', value: parseInt(row.sla_breach) || 0, type: 'danger', desc: 'Overdue (>7 days)' },
                        { label: 'Escalations', value: parseInt(row.escalated_active) || 0, type: 'warning', desc: 'Higher authority triggers' },
                        { label: 'Received Today', value: parseInt(row.received_today) || 0, type: 'info', desc: 'New inflow' }
                    ],
                    archive_count: parseInt(row.history_archive) || 0
                }
            });

        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = function(io, onlineUsers) {
    return router;
};