// server/cron/cleanupWorker.js
const cron = require('node-cron');
const pool = require('../db');

const startCleanupWorker = () => {
  console.log("🧹 Cleanup Worker Initialized...");

  // Run this job every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running cleanup job for unverified users...');
    try {
      // Find and delete users who are not verified AND were created more than 15 minutes ago.
      const result = await pool.query(
        `DELETE FROM users 
         WHERE is_verified = FALSE AND created_at < NOW() - INTERVAL '15 minutes'
         RETURNING email`
      );

      if (result.rowCount > 0) {
        console.log(`✅ Cleanup successful. Deleted ${result.rowCount} unverified users.`);
        console.log('Deleted emails:', result.rows.map(u => u.email));
      } else {
        console.log('No expired unverified users to delete.');
      }
    } catch (err) {
      console.error('❌ Error during user cleanup job:', err.message);
    }
  });
};

module.exports = startCleanupWorker;