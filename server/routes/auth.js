const auth = require('../middleware/auth');
const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Built-in Node.js module
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parseUserDataFromEmail } = require('../utils/helpers');
const sendEmail = require('../utils/sendemail');

// @route   POST /api/auth/register
// @desc    Register a new user and send verification email
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  
  // We use a specific client from the pool for transactions
  const client = await pool.connect();

  try {
    // 1. Validations (No changes here)
    if (!email.endsWith('@dtu.ac.in') && !email.endsWith('@dce.ac.in')) {
        return res.status(400).json({ msg: 'Please use a valid DTU email address.' });
    }
    
    // 2. Start the Transaction
    await client.query('BEGIN');

    // Check existing user (using the client)
    const userCheck = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK'); // Clean up before exiting
      return res.status(400).json({ msg: 'User already exists' });
    }

    const { fullName, rollNumber, admissionYear, branchCode } = parseUserDataFromEmail(email);
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 3600000 * 24);

    // 3. Insert User (Pending Commit)
    await pool.query(
        `INSERT INTO users (full_name, email, password_hash, roll_number, admission_year, branch_code, verification_token, verification_token_expires) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [fullName, email, passwordHash, rollNumber, admissionYear, branchCode, verificationToken, tokenExpires]
    );

    // 4. Send Email
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const emailMessage = `
        <p>Please click the link below to verify your email address and activate your account.</p>
        <a href="${verificationUrl}">Verify Email</a>
    `;

    // If this fails, it goes to 'catch', and the user INSERT is undone
    await sendEmail({
      to: email,
      subject: 'DTU Hostel Management - Email Verification',
      html: emailMessage,
    });

    // 5. Commit: Save everything permanently only if we reached this point
    await client.query('COMMIT');
    res.status(201).json({ msg: 'Registration successful. Please check your email.' });

  } catch (err) {
    // 6. Rollback: Undo the user insert if ANY error occurred above
    await client.query('ROLLBACK');
    console.error("Registration Error:", err.message);
    res.status(500).json({ msg: 'Registration failed. Please try again.' });
  } finally {
    // Always release the client back to the pool
    client.release();
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify user's email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Find user with matching token
        const user = await pool.query(
            "SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()", 
            [token]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid or expired verification token.' });
        }

        // Verify user and clear token
        await pool.query(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1",
            [token]
        );

        res.json({ msg: 'Email verified successfully! You can now log in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Bcrypt 72-byte truncation limit defense
    if (password.length > 72) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 1. Find the user by email
    let userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ msg: 'Invalid Credentials' });

    const user = userRes.rows[0];

    // 2. Check if the account is active (Admin Ban Check)
    if (!user.is_active) {
      return res.status(403).json({ msg: 'Your account has been deactivated. Please contact an administrator.' });
    }

    // 3. Check if the email is verified 🛑
    if (!user.is_verified) { 
      return res.status(403).json({ msg: 'Please verify your DTU email address before logging in. Check your inbox.' });
    }

    // 4. If active and verified, proceed with the normal password check
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Fetch roles from the hostel roles table
    const rolesRes = await pool.query(`
      SELECT r.role_name, h.name as hostel_name, uhr.hostel_id
      FROM user_hostel_roles uhr
      JOIN roles r ON uhr.role_id = r.role_id
      LEFT JOIN hostels h ON uhr.hostel_id = h.hostel_id
      WHERE uhr.user_id = $1`, [user.user_id]
    );

    const userPayload = {
      id: user.user_id,
      name: user.full_name,
      email: user.email,
      designation: user.designation,
      roles: rolesRes.rows,
    };

    const payload = { user: userPayload };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth
// @desc    Get logged in user data (for page reloads)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        // 1. Fetch basic user details from the 'users' table
        const userRes = await pool.query(
            "SELECT user_id, full_name, email, roll_number, branch_code, admission_year, designation FROM users WHERE user_id = $1", 
            [req.user.id]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        let user = userRes.rows[0];

        // 2. Fetch all roles and hostels for that user
        const rolesRes = await pool.query(
            `SELECT r.role_name, uhr.hostel_id, h.name as hostel_name 
             FROM user_hostel_roles uhr
             JOIN roles r ON uhr.role_id = r.role_id
             LEFT JOIN hostels h ON uhr.hostel_id = h.hostel_id
             WHERE uhr.user_id = $1`, 
            [req.user.id]
        );

        // 3. Attach the fetched roles to the user object
        user.roles = rolesRes.rows;

        res.json(user);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/set-password
// @desc    Set a user's password using a token
// @access  Public
router.post('/set-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        // 1. Find the user with the matching token that has not expired
        const userRes = await pool.query(
            "SELECT * FROM users WHERE verification_token = $1",
            [token]
        );

        if (userRes.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid or expired token. Please request a new invite.' });
        }

        // 2. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Update the user's account
        await pool.query(
            `UPDATE users 
             SET password_hash = $1, is_verified = true, verification_token = NULL, verification_token_expires = NULL 
             WHERE user_id = $2`,
            [passwordHash, userRes.rows[0].user_id]
        );

        res.json({ msg: 'Password set successfully! You can now log in.' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Send a password reset email
// @access  Public
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        // We send a success message even if the user isn't found.
        // This is a security best practice to prevent "email enumeration,"
        // which is when attackers guess emails to see which are registered.
        if (userRes.rows.length === 0) {
            return res.json({ msg: 'If an account with this email exists, a password reset link has been sent.' });
        }
        
        const user = userRes.rows[0];

        // Create reset token (valid for 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpires = new Date(Date.now() + 3600000); 

        await pool.query(
            "UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE user_id = $3",
            [resetToken, tokenExpires, user.user_id]
        );

        // Send the email
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        const emailMessage = `
            <h2>Password Reset Request</h2>
            <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
            <p>Please click the link below to set a new password. This link is valid for 1 hour.</p>
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Your Password</a>
        `;

        await sendEmail({ 
            to: user.email, 
            subject: 'DTU Hostel Management - Password Reset', 
            html: emailMessage 
        });

        res.json({ msg: 'If an account with this email exists, a password reset link has been sent.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset a user's password using a token
// @access  Public
router.post('/reset-password', async (req, res) => {
    // This logic is identical to your /set-password route.
    const { token, password } = req.body;
    try {
        const userRes = await pool.query("SELECT * FROM users WHERE verification_token = $1 AND verification_token_expires > NOW()", [token]);
        if (userRes.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid or expired token.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        await pool.query(
            "UPDATE users SET password_hash = $1, is_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE user_id = $2",
            [passwordHash, userRes.rows[0].user_id]
        );

        res.json({ msg: 'Password has been reset successfully. You can now log in.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;