const pool = require('../db');

const checkGrievanceAccess = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const user = req.user;

        // 1. ROBUST QUERY: Use LEFT JOIN so unassigned tickets are still visible
        const grievanceRes = await pool.query(
            `SELECT 
                g.*, 
                d.name as department_name, 
                ga.department_id,
                u.full_name as submitted_by_name
             FROM grievances g
             LEFT JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
             LEFT JOIN departments d ON ga.department_id = d.department_id
             LEFT JOIN users u ON g.submitted_by_id = u.user_id
             WHERE g.ticket_id = $1`,
            [ticketId]
        );

        if (grievanceRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Grievance not found' });
        }

        const grievance = grievanceRes.rows[0];

        // 1. Define roles and ownership
        const isOwner = grievance.submitted_by_id === user.id;
        const userRoles = user.roles || [];
        const isSuperAdmin = userRoles.some(r => r.role_name === 'super_admin');
        const isAssignedOfficer = userRoles.some(r => 
            (r.role_name === 'nodal_officer' || r.role_name === 'department_head') && 
            r.department_id === grievance.department_id
        );

        // 2. Check if the user is a follower
        const followerRes = await pool.query(
            "SELECT 1 FROM grievance_followers WHERE grievance_id = $1 AND user_id = $2",
            [grievance.grievance_id, user.id]
        );
        const isFollower = followerRes.rows.length > 0;

        // 3. NEW: Public Access Logic
        // Allow access if it's a Community Issue (upvotes > 0) AND is not a private status
        const isPublicIssue = grievance.upvotes > 0 && !['Rejected', 'Closed'].includes(grievance.status);

        if (!isOwner && !isFollower && !isSuperAdmin && !isAssignedOfficer && !isPublicIssue) {
            return res.status(403).json({ msg: 'Access Denied: This is a private grievance.' });
        }

        // 4. Attach grievance and follower status to request for downstream use
        req.grievance = grievance;
        req.isFollower = isFollower; // Pass this to the route
        next();


        

    } catch (err) {
        console.error("Middleware Error:", err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = checkGrievanceAccess;