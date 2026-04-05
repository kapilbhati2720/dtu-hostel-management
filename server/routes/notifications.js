// Import required packages
const express = require('express');
const router = express.Router();
const pool = require('../db'); // Our database connection pool
const auth = require('../middleware/auth'); // Our authentication middleware to protect routes

// @route   GET /api/notifications
// @desc    Get all notifications for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // req.user.id is made available by the 'auth' middleware after it decodes the JWT.
    // We fetch the 15 most recent notifications for the user for performance.
    const notifications = await pool.query(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15",
      [req.user.id]
    );

    // Send the list of notifications back to the client as a JSON array.
    res.json(notifications.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/notifications/mark-read
// @desc    Mark all of a user's unread notifications as read
// @access  Private
router.put('/mark-read', auth, async (req, res) => {
  try {
    // Update the 'is_read' flag to TRUE for all notifications
    // belonging to the logged-in user where the flag is currently FALSE.
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
      [req.user.id]
    );

    // Send a 204 "No Content" response, as we don't need to send any data back.
    // This simply confirms to the client that the operation was successful.
    res.status(204).send();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// Export the router so it can be used in our main index.js file
module.exports = router;