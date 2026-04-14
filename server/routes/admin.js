const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { generateGrievance, triageGrievance } = require('../services/aiService');
const sendEmail = require('../utils/sendemail');


// Middleware to check if user is a super_admin (Chief Warden)
const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles.some(r => r.role_name === 'super_admin')) {
    next();
  } else {
    return res.status(403).json({ msg: 'Admin access required.' });
  }
};

// @route   GET /api/admin/roles
// @desc    Get all available roles
// @access  Private (Admin)
router.get('/roles', [auth, isAdmin], async (req, res) => {
    try {
        const roles = await pool.query("SELECT * FROM roles ORDER BY role_name");
        res.json(roles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/admin/hostels
// @desc    Get all available hostels
// @access  Private (Admin)
router.get('/hostels', [auth, isAdmin], async (req, res) => {
    try {
        const hostels = await pool.query("SELECT * FROM hostels ORDER BY name");
        res.json(hostels.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with their roles and status
// @access  Private (Super Admin only)
router.get('/users', [auth, isAdmin], async (req, res) => {
  try {
    const users = await pool.query(`
      SELECT 
          u.user_id, 
          u.full_name, 
          u.email, 
          u.is_active,
          u.is_verified,
          u.designation,
          COALESCE(
              json_agg(DISTINCT jsonb_build_object(
              'role_name', r.role_name,
              'hostel_name', h.name
              )) 
              FILTER (WHERE r.role_id IS NOT NULL), 
              '[]'
          ) as roles
      FROM users u
      LEFT JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
      LEFT JOIN roles r ON uhr.role_id = r.role_id
      LEFT JOIN hostels h ON uhr.hostel_id = h.hostel_id
      GROUP BY u.user_id
      ORDER BY u.created_at DESC;
    `);
    res.json(users.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/admin/users/:userId/roles
// @desc    Sync a user's roles (Handles multiple hostels gracefully using a Transaction)
// @access  Private (Admin)
router.put('/users/:userId/roles', [auth, isAdmin], async (req, res) => {
  const { userId } = req.params;
  const { assignments } = req.body; 
  // 'assignments' expects an array: [{ roleId: 1, hostelId: 5 }, { roleId: 2, hostelId: null }]

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ msg: 'Please provide an array of role assignments.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Wipe the user's old roles
    await client.query("DELETE FROM user_hostel_roles WHERE user_id = $1", [userId]);

    // 2. Insert every role/hostel combination
    for (const assignment of assignments) {
      if (assignment.hostelId) {
        await client.query(
          "INSERT INTO user_hostel_roles (user_id, role_id, hostel_id) VALUES ($1, $2, $3)",
          [userId, assignment.roleId, assignment.hostelId]
        );
      } else {
        // For Students or Super Admins who don't belong to a specific hostel
        await client.query(
          "INSERT INTO user_hostel_roles (user_id, role_id) VALUES ($1, $2)",
          [userId, assignment.roleId]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ msg: 'User roles synced successfully!' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Role Sync Error:", err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// @route   PUT /api/admin/users/:userId/designation
// @desc    Update a user's designation (cosmetic title)
// @access  Private (Admin)
router.put('/users/:userId/designation', [auth, isAdmin], async (req, res) => {
  const { userId } = req.params;
  const { designation } = req.body;

  try {
    await pool.query(
      "UPDATE users SET designation = $1 WHERE user_id = $2",
      [designation, userId]
    );
    res.json({ msg: `Designation updated to "${designation}".` });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/admin/create-user
// @desc    Admin creates a new user (e.g., an officer/warden) and sends setup email
// @access  Private (Admin)
router.post('/create-user', [auth, isAdmin], async (req, res) => {
  const { fullName, email, roleId, hostelId, designation } = req.body;

  if (!fullName || !email || !roleId) {
    return res.status(400).json({ msg: 'Please provide full name, email, and role.' });
  }

  const client = await pool.connect();
  try {
    const existingUser = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ msg: 'A user with this email already exists.' });
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 3600000 * 24);

    await client.query('BEGIN');

    const newUserRes = await client.query(
      `INSERT INTO users (full_name, email, designation, is_verified, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, false, $4, $5) RETURNING user_id`,
      [fullName, email, designation || null, setupToken, tokenExpires]
    );
    const newUserId = newUserRes.rows[0].user_id;

    if (hostelId) {
      await client.query(
        `INSERT INTO user_hostel_roles (user_id, role_id, hostel_id) VALUES ($1, $2, $3)`,
        [newUserId, roleId, hostelId]
      );
    } else {
      await client.query(
        `INSERT INTO user_hostel_roles (user_id, role_id) VALUES ($1, $2)`,
        [newUserId, roleId]
      );
    }

    const setupUrl = `${process.env.CLIENT_URL}/set-password/${setupToken}`;
    const emailMessage = `
      <h2>Welcome to the DTU Hostel Management Portal!</h2>
      <p>An administrator has created an account for you.</p>
      <p>Please click the link below to set your password and activate your account. This link is valid for 24 hours.</p>
      <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
    `;

    await sendEmail({ to: email, subject: 'Activate Your DTU Hostel Management Account', html: emailMessage });

    await client.query('COMMIT');

    res.status(201).json({ msg: `User account for ${fullName} created. A password setup email has been sent.` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// @route   PUT /api/admin/users/:userId/deactivate
// @desc    Deactivate a user (soft delete)
// @access  Private (Super Admin only)
router.put('/users/:userId/deactivate', [auth, isAdmin], async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user.id) {
      return res.status(400).json({ msg: 'You cannot deactivate your own account.' });
    }

    const result = await pool.query(
      "UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id, is_active",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'User not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/admin/generate-grievance
router.post('/generate-grievance', [auth, isAdmin], async (req, res) => {
  const { scenario } = req.body;
  if (!scenario) {
    return res.status(400).json({ msg: 'Scenario is required' });
  }
  try {
    const grievanceText = await generateGrievance(scenario);
    res.json({ generatedText: grievanceText });
  } catch (err) {
    console.error("AI generation error:", err);
    res.status(500).send('Error generating grievance');
  }
});

// @route   POST /api/admin/triage-grievance
router.post('/triage-grievance', [auth, isAdmin], async (req, res) => {
  const { grievanceText } = req.body;
  if (!grievanceText) {
    return res.status(400).json({ msg: 'grievanceText is required' });
  }
  try {
    const analysis = await triageGrievance(grievanceText);
    res.json(analysis);
  } catch (err) {
    console.error("AI triage error:", err);
    res.status(500).send('Error analyzing grievance');
  }
});

  // @route   PUT /api/admin/users/:userId/reactivate
  // @desc    Re-activate a user (undo soft delete)
  // @access  Private (Super Admin only)
  router.put('/users/:userId/reactivate', [auth, isAdmin], async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await pool.query(
        "UPDATE users SET is_active = true WHERE user_id = $1 RETURNING user_id, is_active",
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ msg: 'User not found.' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   GET /api/admin/analytics/global
  // @desc    Get global analytics data for the Chief Warden dashboard
  // @access  Private (Super Admin only)
  router.get('/analytics/global', [auth, isAdmin], async (req, res) => {
    try {
      const statusCountsQuery = `
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated')) AS pending,
          COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved,
          COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed', 'Rejected')) AS completed_work
        FROM grievances;
      `;
      
      const categoryCountsQuery = `SELECT category, COUNT(*) FROM grievances GROUP BY category;`;
      const statusDistributionQuery = `SELECT status, COUNT(*) FROM grievances GROUP BY status;`;
      const hostelDistributionQuery = `
        SELECT h.name as hostel_name, COUNT(g.grievance_id) 
        FROM hostels h 
        LEFT JOIN grievances g ON h.hostel_id = g.hostel_id 
        GROUP BY h.name;
      `;

      const leavesQuery = `SELECT COUNT(*) AS pending_leaves FROM hostel_leaves WHERE status = 'Pending';`;
      const announcementsQuery = `SELECT COUNT(*) AS total_announcements FROM announcements;`;

      const [statusCountsRes, categoryCountsRes, statusDistributionRes, hostelDistributionRes, leavesRes, announcementsRes] = await Promise.all([
        pool.query(statusCountsQuery),
        pool.query(categoryCountsQuery),
        pool.query(statusDistributionQuery),
        pool.query(hostelDistributionQuery),
        pool.query(leavesQuery),
        pool.query(announcementsQuery)
      ]);

      res.json({
        kpis: { 
          ...statusCountsRes.rows[0], 
          pending_leaves: leavesRes.rows[0].pending_leaves, 
          total_announcements: announcementsRes.rows[0].total_announcements 
        },
        byCategory: categoryCountsRes.rows,
        byStatus: statusDistributionRes.rows,
        byHostel: hostelDistributionRes.rows
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   GET /api/admin/hostels/summary
  // @desc    Get summary of all hostels for the global view cards
  // @access  Private (Super Admin only)
  router.get('/hostels/summary', [auth, isAdmin], async (req, res) => {
    try {
      const query = `
        SELECT 
          h.hostel_id, h.name, h.type, h.warden_name, h.warden_contact,
          COUNT(g.grievance_id) AS total_grievances,
          COUNT(g.grievance_id) FILTER (WHERE g.status IN ('Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated')) AS pending_grievances,
          COUNT(g.grievance_id) FILTER (WHERE g.status IN ('Resolved', 'Closed', 'Rejected')) AS resolved_grievances
        FROM hostels h
        LEFT JOIN grievances g ON h.hostel_id = g.hostel_id
        GROUP BY h.hostel_id
        ORDER BY h.name;
      `;
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   GET /api/admin/analytics/hostel/:hostelId
  // @desc    Get analytics data for a specific hostel
  // @access  Private (Super Admin only)
  router.get('/analytics/hostel/:hostelId', [auth, isAdmin], async (req, res) => {
    const { hostelId } = req.params;
    try {
      // Basic stats
      const statusCountsQuery = `
        SELECT 
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status IN ('Submitted', 'Open', 'In Progress', 'Awaiting Clarification', 'Escalated')) AS pending,
          COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) AS resolved,
          COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed', 'Rejected')) AS completed_work,
          COUNT(*) FILTER (WHERE is_escalated = true OR status = 'Escalated') AS escalated
        FROM grievances WHERE hostel_id = $1;
      `;
      
      const statusDistributionQuery = `SELECT status, COUNT(*) FROM grievances WHERE hostel_id = $1 GROUP BY status;`;
      
      // Leaves
      const leavesQuery = `SELECT COUNT(*) AS pending_leaves FROM hostel_leaves WHERE hostel_id = $1 AND status = 'Pending';`;
      
      // Recent leaves
      const recentLeavesQuery = `
        SELECT hl.*, u.full_name, u.roll_number 
        FROM hostel_leaves hl
        JOIN users u ON hl.user_id = u.user_id
        WHERE hl.hostel_id = $1
        ORDER BY hl.created_at DESC
        LIMIT 5;
      `;

      // Staff directory
      const staffQuery = `
        SELECT u.user_id, u.full_name, u.email, u.designation, r.role_name
        FROM users u
        JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
        JOIN roles r ON uhr.role_id = r.role_id
        WHERE uhr.hostel_id = $1 AND (r.role_name = 'nodal_officer' OR (r.role_name = 'student' AND u.designation IS NOT NULL AND u.designation != ''))
        ORDER BY 
          CASE WHEN r.role_name = 'nodal_officer' THEN 1 ELSE 2 END,
          u.designation, u.full_name;
      `;

      // Recent tickets
      const recentTicketsQuery = `
        SELECT g.ticket_id, g.title, g.status, g.category, g.created_at, u.full_name AS submitted_by_name
        FROM grievances g
        LEFT JOIN users u ON g.submitted_by_id = u.user_id
        WHERE g.hostel_id = $1
        ORDER BY g.created_at DESC
        LIMIT 10;
      `;

      const hostelDetailsQuery = `SELECT * FROM hostels WHERE hostel_id = $1`;

      const [statusCountsRes, statusDistributionRes, leavesRes, recentLeavesRes, staffRes, recentTicketsRes, hostelRes] = await Promise.all([
        pool.query(statusCountsQuery, [hostelId]),
        pool.query(statusDistributionQuery, [hostelId]),
        pool.query(leavesQuery, [hostelId]),
        pool.query(recentLeavesQuery, [hostelId]),
        pool.query(staffQuery, [hostelId]),
        pool.query(recentTicketsQuery, [hostelId]),
        pool.query(hostelDetailsQuery, [hostelId])
      ]);

      res.json({
        hostel: hostelRes.rows[0],
        kpis: { ...statusCountsRes.rows[0], pending_leaves: leavesRes.rows[0].pending_leaves },
        byStatus: statusDistributionRes.rows,
        recentLeaves: recentLeavesRes.rows,
        staffDirectory: staffRes.rows,
        recentTickets: recentTicketsRes.rows
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST /api/admin/resend-invite
  // @desc    Resend the "Set Password" invite email to a user
  // @access  Private (Admin)
  router.post('/resend-invite', [auth, isAdmin], async (req, res) => {
      const { userId, email, fullName } = req.body;

      try {
          const setupToken = crypto.randomBytes(32).toString('hex');
          const tokenExpires = new Date(Date.now() + 3600000 * 24);

          await pool.query(
              "UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE user_id = $3",
              [setupToken, tokenExpires, userId]
          );
          const setupUrl = `${process.env.CLIENT_URL}/set-password/${setupToken}`;
          const emailMessage = `
              <h2>Welcome to the DTU Hostel Management Portal!</h2>
              <p>An administrator has created or re-sent an invite for your account.</p>
              <p>Please click the link below to set your password. This link is valid for 24 hours.</p>
              <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
          `;
          await sendEmail({ to: email, subject: 'Activate Your DTU Hostel Management Account', html: emailMessage });
          res.json({ msg: `Invite resent successfully to ${fullName}.` });

      } catch (err) {
          console.error(err.message);
          res.status(500).send('Server Error');
      }
  });

// @route   GET /api/admin/grievances/filter
// @desc    Get grievances filtered by type (category, status, etc.)
// @access  Private (Admin)
router.get('/grievances/filter', [auth, isAdmin], async (req, res) => {
    const { type, value } = req.query; 

    const baseQuery = `
        SELECT 
            g.grievance_id, 
            g.ticket_id, 
            g.title, 
            g.status, 
            g.category, 
            g.created_at,
            u.full_name AS submitted_by_name
        FROM grievances g
        LEFT JOIN users u ON g.submitted_by_id = u.user_id 
    `;

    let finalQuery;
    let queryParams = [];

    if (type === 'all') {
        finalQuery = `${baseQuery} ORDER BY g.created_at DESC`;
    } else if (type === 'category') {
        finalQuery = `${baseQuery} WHERE g.category = $1 ORDER BY g.created_at DESC`;
        queryParams = [value];
    } else if (type === 'status') {
        finalQuery = `${baseQuery} WHERE g.status = $1 ORDER BY g.created_at DESC`;
        queryParams = [value];
    } else {
        return res.status(400).json({ msg: 'Invalid filter type.' });
    }
    
    try {
        const filteredGrievances = await pool.query(finalQuery, queryParams);
        res.json(filteredGrievances.rows);
    } catch (err) {
        console.error("----------- SQL ERROR -----------");
        console.error("Query Failed:", finalQuery);
        console.error("Error Message:", err.message);
        console.error("---------------------------------");
        
        res.status(500).send('Server Error fetching filtered grievances');
    }
});

// @route   POST /api/admin/backfill-embeddings
// @desc    Generate and store Gemini vector embeddings for all grievances that are missing them.
//          Safe to run multiple times — only processes grievances with NULL embedding.
// @access  Private (Super Admin only)
router.post('/backfill-embeddings', [auth, isAdmin], async (req, res) => {
    const { generateEmbedding } = require('../services/aiService');

    try {
        // Fetch all grievances missing an embedding
        const missing = await pool.query(`
            SELECT grievance_id, ticket_id, title, description
            FROM grievances
            WHERE embedding IS NULL
            ORDER BY created_at ASC
        `);

        const total = missing.rows.length;

        if (total === 0) {
            return res.json({ msg: '✅ All grievances already have embeddings. Nothing to do.' });
        }

        // Stream response is not possible here — return immediately and process in background
        res.json({
            msg: `🚀 Backfill started for ${total} grievance(s). Check server logs for progress.`,
            total
        });

        // Process asynchronously AFTER responding (non-blocking)
        (async () => {
            let success = 0;
            let failed = 0;

            for (const g of missing.rows) {
                try {
                    const text = `${g.title}: ${g.description}`;
                    const embedding = await generateEmbedding(text);

                    if (embedding) {
                        await pool.query(
                            `UPDATE grievances SET embedding = $1 WHERE grievance_id = $2`,
                            [embedding, g.grievance_id]
                        );
                        success++;
                        console.log(`[Backfill] ✅ ${g.ticket_id} (${success}/${total})`);
                    } else {
                        failed++;
                        console.warn(`[Backfill] ⚠️  ${g.ticket_id} — embedding returned null`);
                    }
                } catch (err) {
                    failed++;
                    console.error(`[Backfill] ❌ ${g.ticket_id} — ${err.message}`);
                }

                // Rate-limit: 500ms between Gemini API calls to avoid quota exhaustion
                await new Promise(r => setTimeout(r, 500));
            }

            console.log(`[Backfill] 🎉 Complete — ${success} succeeded, ${failed} failed out of ${total} total.`);
        })();

    } catch (err) {
        console.error('Backfill error:', err.message);
        if (!res.headersSent) {
            res.status(500).send('Server Error');
        }
    }
});

module.exports = router;