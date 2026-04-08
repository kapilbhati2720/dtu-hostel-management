// server/routes/hostels.js

const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth'); // Only requires user to be logged in

// @route   GET /api/hostels
// @desc    Get all hostels (for dropdowns, selectors, etc.)
// @access  Private (any logged-in user)
router.get('/', auth, async (req, res) => {
    try {
        const hostels = await pool.query(
            "SELECT hostel_id, name, type, warden_name, warden_contact FROM hostels ORDER BY type, name"
        );
        res.json(hostels.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
