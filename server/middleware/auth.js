const jwt = require('jsonwebtoken');
const pool = require('../db');

module.exports = async function (req, res, next) {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // The decoded token now contains the full user object from the login query
    req.user = decoded.user;

    // Check if the user is still active in the database
    const userRes = await pool.query(
        "SELECT is_active FROM users WHERE user_id = $1", 
        [decoded.user.id]
    );

    // If user is not found or is inactive, reject the token
    if (userRes.rows.length === 0 || !userRes.rows[0].is_active) {
        return res.status(401).json({ msg: 'User is deactivated, token is no longer valid.' });
    }

    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};