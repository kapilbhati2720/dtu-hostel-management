const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const checkGrievanceAccess = require('../middleware/grievanceAuth'); 
const sendEmail = require('../utils/sendemail');
const upload = require('../config/cloudinary'); 
// Import AI services
const { generateEmbedding, findSimilarGrievances } = require('../services/aiService');

module.exports = function(io, onlineUsers) {
    
    // Helper function to generate a ticket ID
    const generateTicketId = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `GRM${year}${month}${day}${randomNum}`;
    };

    // @route   POST /api/grievances/check-duplicate
    // @desc    Check for similar existing grievances before submission
    // NEW ROUTE FOR SMART DE-DUPLICATION
    router.post('/check-duplicate', auth, async (req, res) => {
        const { title, description } = req.body;
        try {
            // Combine title and description for search context
            const queryText = `${title}: ${description}`;
            const matches = await findSimilarGrievances(queryText);
            res.json({ matches });
        } catch (err) {
            console.error("Duplicate check failed:", err.message);
            // Don't block the user if AI fails, just return empty matches
            res.json({ matches: [] }); 
        }
    });

    // @route   PUT /api/grievances/:ticketId/follow
    // @desc    Follow an existing grievance (Subscribes user to updates)
    router.put('/:ticketId/upvote', auth, async (req, res) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get the internal grievance_id
            const gRes = await client.query("SELECT grievance_id FROM grievances WHERE ticket_id = $1", [req.params.ticketId]);
            if (gRes.rows.length === 0) return res.status(404).json({ msg: 'Grievance not found' });
            const grievance_id = gRes.rows[0].grievance_id;

            // 2. Check if already following (to avoid errors)
            const followCheck = await client.query(
                "SELECT * FROM grievance_followers WHERE grievance_id = $1 AND user_id = $2",
                [grievance_id, req.user.id]
            );

            if (followCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ msg: 'You are already following this grievance.' });
            }

            // 3. Add to followers table
            await client.query(
                "INSERT INTO grievance_followers (grievance_id, user_id) VALUES ($1, $2)",
                [grievance_id, req.user.id]
            );

            // 4. Increment the count for quick display
            await client.query(
                "UPDATE grievances SET upvotes = COALESCE(upvotes, 0) + 1 WHERE grievance_id = $1", 
                [grievance_id]
            );

            await client.query('COMMIT');
            res.json({ msg: 'Successfully followed the grievance' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err.message);
            res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    });

    // @route   POST /api/grievances
    // @desc    Submit a new grievance (With AI Embedding & EOC Anonymity Support)
    router.post('/', [auth, upload.array('attachments')], async (req, res) => {
        // --- Destructure isAnonymous from the payload ---
        const { title, description, category, isAnonymous } = req.body;
        
        // Defensively parse the boolean (handles both 'true' string from FormData and true boolean)
        const anonymousFlag = isAnonymous === 'true' || isAnonymous === true;

        const client = await pool.connect();
        try {
            // 1. DYNAMIC DEPARTMENT ASSIGNMENT
            const deptRes = await client.query("SELECT department_id FROM departments WHERE name ILIKE $1", [category]);
            if (deptRes.rows.length === 0) {
                return res.status(400).json({ msg: 'Invalid grievance category provided.' });
            }
            const assigned_to_dept_id = deptRes.rows[0].department_id;

            // 2. GENERATE AI EMBEDDING
            let vector = null;

            // --- Security Air-Gap ---
            if (!anonymousFlag) {
                try {
                    // Only generate embeddings for public, non-sensitive issues
                    vector = await generateEmbedding(`${title}: ${description}`);
                } catch (aiError) {
                    console.error("Embedding generation failed, continuing without AI data:", aiError.message);
                }
            } else {
                console.log("🔒 Sensitive ticket detected. Bypassing AI Embedding for privacy.");
            }

            await client.query('BEGIN');
            
            // 3. INSERT GRIEVANCE 
            // --- NEW: Added is_anonymous to the schema and $7 to the parameters ---
            const newGrievanceRes = await client.query(
                `INSERT INTO grievances (ticket_id, title, description, category, submitted_by_id, embedding, is_anonymous) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING grievance_id`,
                [generateTicketId(), title, description, category, req.user.id, vector, anonymousFlag]
            );
            const newGrievanceId = newGrievanceRes.rows[0].grievance_id;
            
            await client.query(
                `INSERT INTO grievance_assignments (grievance_id, department_id) VALUES ($1, $2)`,
                [newGrievanceId, assigned_to_dept_id]
            );
            await client.query('COMMIT');
            
            // 4. INSERT ATTACHMENTS
            const files = req.files; 
            if (files && files.length > 0) {
                for (const file of files) {
                    await client.query(
                        `INSERT INTO attachments (grievance_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4)`,
                        [newGrievanceId, file.path, file.originalname, file.mimetype]
                    );
                }
            }
            res.status(201).json({ grievance_id: newGrievanceId, msg: "Grievance submitted successfully." });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err.message);
            res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    });

    // @route   GET /api/grievances/my-grievances
    // @desc    Get authored AND followed grievances for the logged-in student
    router.get('/my-grievances', auth, async (req, res) => {
        try {
            const grievances = await pool.query(`
                SELECT g.* FROM grievances g
                WHERE g.submitted_by_id = $1
                OR g.grievance_id IN (SELECT grievance_id FROM grievance_followers WHERE user_id = $1)
                ORDER BY g.updated_at DESC
            `, [req.user.id]);
            
            res.json(grievances.rows);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
    // @route   GET /api/grievances/stats
    // @desc    Get dashboard statistics for STUDENTS
    // NOTE: Officers use /api/officer/dashboard-data instead
    router.get('/stats', auth, async (req, res) => {
        try {
            const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status IN ('Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated') THEN 1 END) as pending,
                    COUNT(CASE WHEN status IN ('Resolved', 'Closed', 'Rejected') THEN 1 END) as resolved
                FROM grievances 
                WHERE submitted_by_id = $1
            `;
            
            const result = await pool.query(statsQuery, [req.user.id]);
            
            const stats = {
                role: 'student',
                total: parseInt(result.rows[0].total) || 0,
                pending: parseInt(result.rows[0].pending) || 0,
                resolved: parseInt(result.rows[0].resolved) || 0
            };

            res.json(stats);
        } catch (err) {
            console.error("Stats Error:", err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/grievances/public/trending
    // @desc    Get grievances followed by multiple students (Community Issues)
    router.get('/public/trending', auth, async (req, res) => {
        try {
            const trendingGrievances = await pool.query(`
                SELECT 
                    g.ticket_id, g.title, g.category, g.status, g.created_at,
                    (SELECT full_name FROM users WHERE user_id = g.submitted_by_id) as author_name,
                    (SELECT COUNT(*)::int FROM grievance_followers WHERE grievance_id = g.grievance_id) as upvotes
                FROM grievances g
                WHERE g.upvotes > 0 
                  AND g.status NOT IN ('Rejected', 'Resolved', 'Closed')
                  -- --- COMPLETELY EXCLUDE SECURE TICKETS FROM THE PUBLIC FEED ---
                  AND g.is_anonymous = FALSE 
                ORDER BY upvotes DESC, g.created_at DESC
                LIMIT 10
            `);
            res.json(trendingGrievances.rows);
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   GET /api/grievances/:ticketId
    // @desc    Get details of a specific grievance (Shared by Student & Officer)
    router.get('/:ticketId', [auth, checkGrievanceAccess], async (req, res) => {
        try {
            const updatesRes = await pool.query(
                `SELECT u.comment, u.update_type, u.created_at, us.full_name AS author_name, COALESCE(r.role_name, 'student') AS role, u.updated_by_id
                FROM grievance_updates u 
                JOIN users us ON u.updated_by_id = us.user_id
                LEFT JOIN user_department_roles udr ON us.user_id = udr.user_id
                LEFT JOIN roles r ON udr.role_id = r.role_id
                WHERE u.grievance_id = $1 ORDER BY u.created_at ASC`,
                [req.grievance.grievance_id]
            );

            const attachmentsRes = await pool.query(
                "SELECT * FROM attachments WHERE grievance_id = $1",
                [req.grievance.grievance_id]
            );

            const followersRes = await pool.query(
                `SELECT u.full_name, u.email, f.followed_at 
                 FROM users u
                 JOIN grievance_followers f ON u.user_id = f.user_id
                 WHERE f.grievance_id = $1
                 ORDER BY f.followed_at ASC`,
                [req.grievance.grievance_id]
            );

            // --- DTO MASKING LAYER FOR SHARED ENDPOINT ---
            const isSuperAdmin = req.user.roles.some(r => r.role_name === 'super_admin');
            
            // Create a mutable copy of the grievance from the middleware
            let secureGrievance = { ...req.grievance };
            let secureUpdates = [...updatesRes.rows];

            // If it's an anonymous ticket AND the viewer is not a Super Admin
            // AND the viewer is not the student who created it (students can see their own name)
            if (secureGrievance.is_anonymous && !isSuperAdmin && req.user.id !== secureGrievance.submitted_by_id) {
                
                // 1. Mask the main ticket creator
                secureGrievance.author_name = 'Anonymous Student';
                secureGrievance.full_name = 'Anonymous Student';
                secureGrievance.submitted_by_name = 'Anonymous Student';

                // 2. Mask the author of any comments made by the student
                secureUpdates = secureUpdates.map(update => {
                    if (update.updated_by_id === secureGrievance.submitted_by_id) {
                        return { ...update, author_name: 'Anonymous Student' };
                    }
                    return update;
                });
            }

            res.json({ 
                grievance: secureGrievance, 
                updates: secureUpdates, 
                attachments: attachmentsRes.rows,
                isFollowing: req.isFollower, 
                followers: followersRes.rows 
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

    // @route   POST /api/grievances/:ticketId/comments
    // @desc    Add a comment to a grievance
    router.post('/:ticketId/comments', [auth, checkGrievanceAccess, upload.array('attachments')], async (req, res) => {
      const { comment } = req.body;
      const user = req.user;
      const grievance = req.grievance; 
      const client = await pool.connect();
      
        try {
            // SPAM PROTECTION: Check Total Files
            if (req.files && req.files.length > 0) {
                const fileCountRes = await client.query("SELECT COUNT(*) FROM attachments WHERE grievance_id = $1", [grievance.grievance_id]);
                const currentTotal = parseInt(fileCountRes.rows[0].count);
                const MAX_FILES = 5; 
                if (currentTotal + req.files.length > MAX_FILES) {
                    return res.status(400).json({ msg: `Upload limit reached. Max ${MAX_FILES} files allowed.` });
                }
            }

            await client.query('BEGIN');
            
            const newComment = await client.query(
                `INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'Comment', $3) RETURNING *`,
                [grievance.grievance_id, user.id, comment]
            );

            // Insert files
            const files = req.files;
            if (files && files.length > 0) {
                for (const file of files) {
                    await client.query(
                        `INSERT INTO attachments (grievance_id, file_url, file_name, file_type) VALUES ($1, $2, $3, $4)`,
                        [grievance.grievance_id, file.path, file.originalname, file.mimetype]
                    );
                }
            }

            const isStudent = !user.roles.some(r => ['nodal_officer', 'department_head', 'super_admin'].includes(r.role_name));

            // Auto-update status if a student replies to clarification
            if (isStudent && grievance.status === 'Awaiting Clarification') {
                await client.query("UPDATE grievances SET status = 'Submitted', updated_at = NOW() WHERE grievance_id = $1", [grievance.grievance_id]);
                await client.query(`INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'StatusChange', 'Status updated to Submitted')`, [grievance.grievance_id, user.id]);
            }

            // --- THE FIX: SEPARATE DB SAVES FROM ALERTS ---
            let socketsToNotify = [];
            let emailsToSend = [];

            // Notification DB Logic
            if (isStudent) {
                const officersRes = await client.query(
                    `SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id IN (SELECT role_id FROM roles WHERE role_name IN ('nodal_officer', 'department_head'))`,
                    [grievance.department_id]
                );
                for (const officer of officersRes.rows) {
                    const message = `Student replied on grievance #${grievance.ticket_id}.`;
                    const link = `/grievance/${grievance.ticket_id}`;
                    await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [officer.user_id, message, link]);
                    socketsToNotify.push(onlineUsers[officer.user_id]);
                }
            } else {
                const message = `An officer commented on grievance #${grievance.ticket_id}.`;
                const link = `/grievance/${grievance.ticket_id}`;
                
                // Gather all affected user IDs (Author + Followers)
                const followersRes = await client.query("SELECT user_id FROM grievance_followers WHERE grievance_id = $1", [grievance.grievance_id]);
                const recipientIds = new Set([grievance.submitted_by_id, ...followersRes.rows.map(f => f.user_id)]);

                for (const userId of recipientIds) {
                    await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [userId, message, link]);
                    socketsToNotify.push(onlineUsers[userId]); // Store socket ID for later
                    
                    const userRes = await client.query("SELECT email FROM users WHERE user_id = $1", [userId]);
                    if (userRes.rows.length > 0) {
                        emailsToSend.push(userRes.rows[0].email); // Store email for later
                    }
                }
            }

            // 1. COMMIT TRANSACTION FIRST (Locks the data into the database)
            await client.query('COMMIT');
            
            // Send the success response to the Officer immediately so their UI doesn't lag
            res.status(201).json(newComment.rows[0]);

            // 2. NOW FIRE REAL-TIME SOCKETS
            socketsToNotify.forEach(socketId => {
                if (socketId) io.to(socketId).emit('new_notification');
            });

            // 3. NOW SEND EMAILS (The Sandbox Batching Method)
            if (emailsToSend.length > 0) {
                try {
                    // For the Mailtrap Free Tier, we just put EVERYONE in the 'TO' field.
                    const allRecipients = emailsToSend.join(','); 

                    await sendEmail({
                        to: allRecipients,
                        subject: `New Comment: Grievance #${grievance.ticket_id}`,
                        html: `<p>An officer has posted a new update on a campus issue you are tracking.</p>
                               <p><strong>Comment:</strong> "${comment}"</p>`
                    });
                    
                    console.log(`Successfully batch-sent email to: ${allRecipients}`);
                } catch (e) {
                    console.error(`Batch email failed:`, e.message);
                }
            }

        } catch (err) {
            await client.query('ROLLBACK');
            // Check if headers were already sent before trying to send a 500 error
            if (!res.headersSent) {
                console.error(err.message);
                res.status(500).send('Server Error');
            }
        } finally {
            client.release();
        }
    });

    // @route   POST /api/grievances/:ticketId/appeal
    // @desc    Appeal/Reopen a resolved grievance
    router.post('/:ticketId/appeal', [auth, checkGrievanceAccess], async (req, res) => {
        const { reason } = req.body;
        const grievance = req.grievance;
        const user = req.user;
        const client = await pool.connect();

        try {
            if (!['Resolved', 'Rejected'].includes(grievance.status)) {
                return res.status(400).json({ msg: 'Grievance is currently active. You cannot appeal.' });
            }

            await client.query('BEGIN');
            await client.query(`UPDATE grievances SET status = 'In Progress', is_escalated = TRUE, updated_at = NOW() WHERE grievance_id = $1`, [grievance.grievance_id]);
            await client.query(`INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, 'StatusChange', $3)`, [grievance.grievance_id, user.id, `🛑 APPEAL RAISED: ${reason}`]);

            const officersRes = await client.query(
                `SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id IN (SELECT role_id FROM roles WHERE role_name IN ('nodal_officer', 'department_head'))`,
                [grievance.department_id]
            );

            for (const officer of officersRes.rows) {
                const message = `🚨 APPEAL: Grievance #${grievance.ticket_id} has been re-opened by student.`;
                const link = `/grievance/${grievance.ticket_id}`;
                await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [officer.user_id, message, link]);
                const officerSocketId = onlineUsers[officer.user_id];
                if (officerSocketId) io.to(officerSocketId).emit('new_notification');
            }

            await client.query('COMMIT');
            res.json({ msg: 'Grievance appealed successfully' });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err.message);
            res.status(500).send('Server Error');
        } finally {
            client.release();
        }
    });
    
    // @route   PUT /api/grievances/:ticketId/status
    // @desc    Update the status of a grievance
    router.put('/:ticketId/status', [auth, checkGrievanceAccess], async (req, res) => {
        const { status, reason } = req.body; 
        const user = req.user;
        const grievance = req.grievance; 
        const client = await pool.connect();

        try {
            const isSuperAdmin = user.roles.some(r => r.role_name === 'super_admin');
            const isAssignedOfficer = user.roles.some(r => r.role_name === 'nodal_officer' && r.department_id === grievance.department_id);
            const isTicketOwner = grievance.submitted_by_id === user.id;

            let isAuthorized = false;
            if (isSuperAdmin || isAssignedOfficer) isAuthorized = true;
            else if (isTicketOwner && status === 'Closed') isAuthorized = true;

            if (!isAuthorized) return res.status(403).json({ msg: 'Not authorized to change status.' });
            if (grievance.status === status) return res.status(400).json({ msg: `Grievance is already marked as "${status}".` });
            if (status === 'Rejected' && !reason) return res.status(400).json({ msg: 'A reason is required when rejecting a grievance.' });
            if (status === 'Awaiting Clarification' && !reason) return res.status(400).json({ msg: 'A comment is required when requesting more information.' });
            if (status === 'Resolved' && !reason && !isTicketOwner) return res.status(400).json({ msg: 'Please provide a resolution note.' });

            await client.query('BEGIN');
            await client.query("UPDATE grievances SET status = $1, updated_at = NOW() WHERE grievance_id = $2", [status, grievance.grievance_id]);
            
            let updateComment = `Status changed to ${status}`;
            let updateType = 'StatusChange';

            if (status === 'Rejected') updateComment = `Status changed to Rejected. Reason: ${reason}`;
            else if (status === 'Awaiting Clarification') { updateComment = `Request for Information: ${reason}`; updateType = 'Comment'; }
            else if (status === 'Resolved') updateComment = `Status changed to Resolved. Note: ${reason}`;
            else if (status === 'Closed') updateComment = isTicketOwner ? "Ticket closed by student (Satisfied)." : "Ticket closed.";

            await client.query(`INSERT INTO grievance_updates (grievance_id, updated_by_id, update_type, comment) VALUES ($1, $2, $3, $4)`, [grievance.grievance_id, user.id, updateType, updateComment]);
            
            // --- THE FIX: SEPARATE DB SAVES FROM ALERTS ---
            let socketsToNotify = [];
            let emailsToSend = [];
            let message = `Your grievance #${grievance.ticket_id} is now ${status}.`;
            let link = `/grievance/${grievance.ticket_id}`;

            if (status === 'Escalated') {
                 // Notify Admins
                 const admins = await client.query(`SELECT user_id FROM user_department_roles WHERE role_id = (SELECT role_id FROM roles WHERE role_name = 'super_admin')`);
                 for(const admin of admins.rows) {
                     await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [admin.user_id, `Grievance #${grievance.ticket_id} escalated.`, link]);
                     socketsToNotify.push(onlineUsers[admin.user_id]);
                 }
            } else if (isTicketOwner) {
                 // Notify Officers (Student closed it)
                 const officers = await client.query(`SELECT user_id FROM user_department_roles WHERE department_id = $1 AND role_id IN (SELECT role_id FROM roles WHERE role_name = 'nodal_officer')`, [grievance.department_id]);
                 for(const officer of officers.rows) {
                     await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [officer.user_id, `Student closed grievance #${grievance.ticket_id}.`, link]);
                     socketsToNotify.push(onlineUsers[officer.user_id]);
                 }
            } else {
                 // Status Changed -> BLAST NOTIFY AUTHOR AND FOLLOWERS
                 const followersRes = await client.query("SELECT user_id FROM grievance_followers WHERE grievance_id = $1", [grievance.grievance_id]);
                 const recipientIds = new Set([grievance.submitted_by_id, ...followersRes.rows.map(f => f.user_id)]);

                 for (const userId of recipientIds) {
                     await client.query(`INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`, [userId, message, link]);
                     socketsToNotify.push(onlineUsers[userId]);

                     const userRes = await client.query("SELECT email FROM users WHERE user_id = $1", [userId]);
                     if (userRes.rows.length > 0) {
                         emailsToSend.push(userRes.rows[0].email);
                     }
                 }
            }

            // 1. COMMIT TRANSACTION FIRST
            await client.query('COMMIT');
            res.json({ msg: `Grievance status updated to ${status}` });

            // 2. FIRE REAL-TIME SOCKETS
            socketsToNotify.forEach(socketId => {
                if (socketId) io.to(socketId).emit('new_notification');
            });

            // 3. SEND BATCH EMAIL
            if (emailsToSend.length > 0) {
                try {
                    const allRecipients = emailsToSend.join(','); 
                    await sendEmail({
                        to: allRecipients,
                        subject: `Status Update: Grievance #${grievance.ticket_id}`,
                        html: `<p>A campus issue you are tracking has been updated.</p>
                               <p>New Status: <strong>${status}</strong></p>
                               <p>${reason ? `Note: ${reason}` : ''}</p>`
                    });
                    console.log(`Successfully batch-sent status update to: ${allRecipients}`);
                } catch (e) {
                    console.error(`Batch email failed:`, e.message);
                }
            }

        } catch (err) {
            await client.query('ROLLBACK');
            if (!res.headersSent) {
                console.error(err.message);
                res.status(500).send('Server Error');
            }
        } finally {
            client.release();
        }
    });

      return router;
};