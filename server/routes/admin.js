const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { generateGrievance, triageGrievance } = require('../services/aiService');
const sendEmail = require('../utils/sendemail');


// Middleware to check if user is a super_admin
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

// @route   GET /api/admin/departments
// @desc    Get all available departments
// @access  Private (Admin)
router.get('/departments', [auth, isAdmin], async (req, res) => {
    try {
        const departments = await pool.query("SELECT * FROM departments ORDER BY name");
        res.json(departments.rows);
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
          COALESCE(
              json_agg(DISTINCT jsonb_build_object(
              'role_name', r.role_name,
              'department_name', d.name
              )) 
              FILTER (WHERE r.role_id IS NOT NULL), 
              '[]'
          ) as roles
      FROM users u
      LEFT JOIN user_department_roles udr ON u.user_id = udr.user_id
      LEFT JOIN roles r ON udr.role_id = r.role_id
      LEFT JOIN departments d ON udr.department_id = d.department_id
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
// @desc    Sync a user's roles (Handles multiple departments gracefully using a Transaction)
// @access  Private (Admin)
router.put('/users/:userId/roles', [auth, isAdmin], async (req, res) => {
  const { userId } = req.params;
  const { assignments } = req.body; 
  // 'assignments' expects an array: [{ roleId: 1, departmentId: 5 }, { roleId: 2, departmentId: null }]

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({ msg: 'Please provide an array of role assignments.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start ACID Transaction

    // 1. Wipe the user's old roles (Safe because we replace their ENTIRE state)
    await client.query("DELETE FROM user_department_roles WHERE user_id = $1", [userId]);

    // 2. Loop through the array and insert every role/dept combination
    for (const assignment of assignments) {
      if (assignment.departmentId) {
        await client.query(
          "INSERT INTO user_department_roles (user_id, role_id, department_id) VALUES ($1, $2, $3)",
          [userId, assignment.roleId, assignment.departmentId]
        );
      } else {
        // For Students or Super Admins who don't belong to a specific department
        await client.query(
          "INSERT INTO user_department_roles (user_id, role_id) VALUES ($1, $2)",
          [userId, assignment.roleId]
        );
      }
    }

    await client.query('COMMIT'); // Lock it all in
    res.json({ msg: 'User roles synced successfully!' });
  } catch (err) {
    await client.query('ROLLBACK'); // Cancel everything if even one insert fails
    console.error("Role Sync Error:", err.message);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// @route   POST /api/admin/create-user
// @desc    Admin creates a new user (e.g., an officer) and sends setup email
// @access  Private (Admin)
router.post('/create-user', [auth, isAdmin], async (req, res) => {
  const { fullName, email, roleId, departmentId } = req.body;

  if (!fullName || !email || !roleId || !departmentId) {
    return res.status(400).json({ msg: 'Please provide full name, email, role, and department.' });
  }

  const client = await pool.connect();
  try {
    const existingUser = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ msg: 'A user with this email already exists.' });
    }

    const setupToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 3600000 * 24); // Token valid for 24 hours

    await client.query('BEGIN');

    const newUserRes = await client.query(
      `INSERT INTO users (full_name, email, is_verified, verification_token, verification_token_expires)
       VALUES ($1, $2, false, $3, $4) RETURNING user_id`,
      [fullName, email, setupToken, tokenExpires]
    );
    const newUserId = newUserRes.rows[0].user_id;

    await client.query(
      `INSERT INTO user_department_roles (user_id, role_id, department_id) VALUES ($1, $2, $3)`,
      [newUserId, roleId, departmentId]
    );

    const setupUrl = `${process.env.CLIENT_URL}/set-password/${setupToken}`;
    const emailMessage = `
      <h2>Welcome to the DTU Grievance Portal!</h2>
      <p>An administrator has created an account for you.</p>
      <p>Please click the link below to set your password and activate your account. This link is valid for 24 hours.</p>
      <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
    `;

    await sendEmail({ to: email, subject: 'Activate Your DTU Grievance Portal Account', html: emailMessage });

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

  // @route   GET /api/admin/analytics
  // @desc    Get analytics data for the admin dashboard
  // @access  Private (Super Admin only)
  router.get('/analytics', [auth, isAdmin], async (req, res) => {
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

      const [statusCountsRes, categoryCountsRes, statusDistributionRes] = await Promise.all([
        pool.query(statusCountsQuery),
        pool.query(categoryCountsQuery),
        pool.query(statusDistributionQuery)
      ]);

      const analyticsData = {
        kpis: statusCountsRes.rows[0],
        byCategory: categoryCountsRes.rows,
        byStatus: statusDistributionRes.rows
      };

      res.json(analyticsData);

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
              <h2>Welcome to the DTU Grievance Portal!</h2>
              <p>An administrator has created or re-sent an invite for your account.</p>
              <p>Please click the link below to set your password. This link is valid for 24 hours.</p>
              <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Set Your Password</a>
          `;
          await sendEmail({ to: email, subject: 'Activate Your DTU Grievance Portal Account', html: emailMessage });
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

    // 1. DYNAMIC QUERY CONSTRUCTION
    // FIX: Using 'submitted_by_id' based on your schema screenshot
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
    } else {
        const allowedFilterTypes = ['category', 'status'];
        if (!allowedFilterTypes.includes(type)) {
            return res.status(400).json({ msg: 'Invalid filter type.' });
        }
        finalQuery = `${baseQuery} WHERE g.${type} = $1 ORDER BY g.created_at DESC`;
        queryParams = [value];
    }
    
    try {
        const filteredGrievances = await pool.query(finalQuery, queryParams);
        res.json(filteredGrievances.rows);
    } catch (err) {
        // 2. ENHANCED ERROR LOGGING
        console.error("----------- SQL ERROR -----------");
        console.error("Query Failed:", finalQuery);
        console.error("Error Message:", err.message);
        console.error("---------------------------------");
        
        res.status(500).send('Server Error fetching filtered grievances');
    }
});

module.exports = router;