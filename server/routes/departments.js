// server/routes/departments.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth'); // Only requires user to be logged in

// @route   GET /api/departments
// @desc    Get all departments (for dropdowns)
// @access  Private (any logged-in user)
router.get('/', auth, async (req, res) => {
    try {
        const departments = await pool.query("SELECT department_id, name FROM departments ORDER BY name");
        res.json(departments.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;