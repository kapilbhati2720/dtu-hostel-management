const cron = require('node-cron');
const pool = require('../db');

const startCleanupJob = () => {
    // Run every day at midnight ('0 0 * * *')
    cron.schedule('0 0 * * *', async () => {
        console.log('🧹 Running daily cleanup of unverified users...');
        try {
            const result = await pool.query(
                "DELETE FROM users WHERE is_verified = FALSE AND created_at < NOW() - INTERVAL '24 HOURS'"
            );
            console.log(`✅ Cleanup complete. Deleted ${result.rowCount} ghost users.`);
        } catch (err) {
            console.error('❌ Cleanup failed:', err.message);
        }
    });
};

module.exports = startCleanupJob;