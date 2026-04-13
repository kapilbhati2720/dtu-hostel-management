// server/routes/announcements.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Middleware: Check if user is an officer
const isOfficer = (req, res, next) => {
    const hasOfficerRole = req.user.roles.some(r => 
        r.role_name === 'nodal_officer' || r.role_name === 'super_admin'
    );
    if (hasOfficerRole) return next();
    return res.status(403).json({ msg: 'Access denied. Staff role required.' });
};

// Middleware: Check if user can post announcements (Warden, Attendant, Council Member — ALL can)
const canPostAnnouncement = (req, res, next) => {
    const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
    const isNodalOfficer = req.user.roles.some(r => r.role_name === 'nodal_officer');
    
    // All officer-level roles can post announcements
    if (isSuperAdmin || isNodalOfficer) {
        return next();
    }
    return res.status(403).json({ msg: 'Only hostel staff can create announcements.' });
};

module.exports = function(io, onlineUsers) {

    // ================================================================
    // CREATE
    // ================================================================

    // @route   POST /api/announcements
    // @desc    Post a new announcement (Staff: Warden, Attendant, Council Member)
    // @access  Private (Officers)
    router.post('/', [auth, canPostAnnouncement], async (req, res) => {
        const { hostelId, title, body, priority, isPinned } = req.body;

        if (!title || !body) {
            return res.status(400).json({ msg: 'Title and body are required.' });
        }

        try {
            // Check if user is super admin
            const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
            
            // If they are not super admin, they MUST select a hostel, and it MUST be one they are assigned to
            if (!isSuperAdmin) {
                if (!hostelId) {
                    return res.status(403).json({ msg: 'Wardens must select a specific hostel to post to. Global announcements are restricted.' });
                }
                
                const allowedHostelIds = req.user.roles
                    .filter(r => r.role_name === 'nodal_officer')
                    .map(r => r.hostel_id);
                
                if (!allowedHostelIds.includes(parseInt(hostelId))) {
                    return res.status(403).json({ msg: 'You do not have permission to post announcements for this hostel.' });
                }
            }

            const result = await pool.query(
                `INSERT INTO announcements (hostel_id, posted_by, title, body, priority, is_pinned)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
                [hostelId || null, req.user.id, title, body, priority || 'Normal', isPinned || false]
            );

            const announcement = result.rows[0];

            // Fetch poster info for the response
            const posterRes = await pool.query(
                "SELECT full_name, designation FROM users WHERE user_id = $1",
                [req.user.id]
            );
            announcement.posted_by_name = posterRes.rows[0]?.full_name;
            announcement.posted_by_designation = posterRes.rows[0]?.designation;

            // Emit WebSocket event to the hostel room
            if (hostelId) {
                // Notify specific hostel residents
                io.to(`hostel_${hostelId}`).emit('new_announcement', {
                    announcement_id: announcement.announcement_id,
                    title: announcement.title,
                    priority: announcement.priority
                });

                // Also create notifications for hostel residents
                try {
                    const residentsRes = await pool.query(
                        `SELECT uhr.user_id FROM user_hostel_roles uhr
                         JOIN roles r ON uhr.role_id = r.role_id
                         WHERE uhr.hostel_id = $1 AND r.role_name = 'student'`,
                        [hostelId]
                    );
                    
                    const hostelRes = await pool.query("SELECT name FROM hostels WHERE hostel_id = $1", [hostelId]);
                    const hostelName = hostelRes.rows[0]?.name || 'your hostel';

                    for (const resident of residentsRes.rows) {
                        await pool.query(
                            `INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`,
                            [resident.user_id, `📢 New announcement in ${hostelName}: "${title}"`, '/announcements']
                        );
                        const socketId = onlineUsers[resident.user_id];
                        if (socketId) io.to(socketId).emit('new_notification');
                    }
                } catch (notifErr) {
                    console.error("Announcement notification error (non-critical):", notifErr.message);
                }
            } else {
                // Global announcement — notify everyone
                io.emit('new_announcement', {
                    announcement_id: announcement.announcement_id,
                    title: announcement.title,
                    priority: announcement.priority,
                    global: true
                });
            }

            res.status(201).json({ msg: 'Announcement posted successfully.', announcement });
        } catch (err) {
            console.error("Announcement creation error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // ================================================================
    // READ
    // ================================================================

    // @route   GET /api/announcements/hostel/:hostelId
    // @desc    Get announcements for a specific hostel (includes global ones)
    // @access  Private
    router.get('/hostel/:hostelId', auth, async (req, res) => {
        const { hostelId } = req.params;

        try {
            const result = await pool.query(
                `SELECT a.*, 
                        u.full_name as posted_by_name, 
                        u.designation as posted_by_designation
                 FROM announcements a
                 JOIN users u ON a.posted_by = u.user_id
                 WHERE a.hostel_id = $1 OR a.hostel_id IS NULL
                 ORDER BY a.is_pinned DESC, a.created_at DESC`,
                [hostelId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error("Get announcements error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/announcements/all
    // @desc    Get ALL announcements across all hostels (Chief Warden view)
    // @access  Private (Admin)
    router.get('/all', auth, async (req, res) => {
        const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
        if (!isSuperAdmin) {
            return res.status(403).json({ msg: 'Admin access required.' });
        }

        try {
            const result = await pool.query(
                `SELECT a.*, 
                        u.full_name as posted_by_name,
                        u.designation as posted_by_designation,
                        h.name as hostel_name
                 FROM announcements a
                 JOIN users u ON a.posted_by = u.user_id
                 LEFT JOIN hostels h ON a.hostel_id = h.hostel_id
                 ORDER BY a.created_at DESC
                 LIMIT 50`
            );
            res.json(result.rows);
        } catch (err) {
            console.error("Get all announcements error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/announcements/my
    // @desc    Get announcements relevant to the logged-in user's hostel
    // @access  Private
    router.get('/my', auth, async (req, res) => {
        try {
            // Find user's hostel(s)
            const userHostels = await pool.query(
                `SELECT DISTINCT hostel_id FROM user_hostel_roles WHERE user_id = $1 AND hostel_id IS NOT NULL`,
                [req.user.id]
            );

            const hostelIds = userHostels.rows.map(r => r.hostel_id);

            let result;
            if (hostelIds.length > 0) {
                result = await pool.query(
                    `SELECT a.*, 
                            u.full_name as posted_by_name,
                            u.designation as posted_by_designation,
                            h.name as hostel_name
                     FROM announcements a
                     JOIN users u ON a.posted_by = u.user_id
                     LEFT JOIN hostels h ON a.hostel_id = h.hostel_id
                     WHERE a.hostel_id = ANY($1::int[]) OR a.hostel_id IS NULL
                     ORDER BY a.is_pinned DESC, a.created_at DESC
                     LIMIT 30`,
                    [hostelIds]
                );
            } else {
                // No hostel assigned — show only global announcements
                result = await pool.query(
                    `SELECT a.*, 
                            u.full_name as posted_by_name,
                            u.designation as posted_by_designation
                     FROM announcements a
                     JOIN users u ON a.posted_by = u.user_id
                     WHERE a.hostel_id IS NULL
                     ORDER BY a.is_pinned DESC, a.created_at DESC
                     LIMIT 30`
                );
            }

            res.json(result.rows);
        } catch (err) {
            console.error("My announcements error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // ================================================================
    // DELETE
    // ================================================================

    // @route   DELETE /api/announcements/:id
    // @desc    Delete an announcement (poster or admin)
    // @access  Private
    router.delete('/:id', auth, async (req, res) => {
        const { id } = req.params;

        try {
            // Check ownership or admin
            const announcement = await pool.query(
                "SELECT * FROM announcements WHERE announcement_id = $1",
                [id]
            );

            if (announcement.rows.length === 0) {
                return res.status(404).json({ msg: 'Announcement not found.' });
            }

            const isPoster = announcement.rows[0].posted_by === req.user.id;
            const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');

            if (!isPoster && !isSuperAdmin) {
                return res.status(403).json({ msg: 'You can only delete your own announcements.' });
            }

            await pool.query("DELETE FROM announcements WHERE announcement_id = $1", [id]);
            res.json({ msg: 'Announcement deleted successfully.' });
        } catch (err) {
            console.error("Announcement deletion error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    return router;
};
