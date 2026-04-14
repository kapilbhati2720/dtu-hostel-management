require('dotenv').config();
const pool = require('./db');

async function cleanWardens() {
    try {
        const client = await pool.connect();

        // 1. Get JCB ID
        const jcbRes = await client.query("SELECT hostel_id FROM hostels WHERE name ILIKE '%JCB%' LIMIT 1");
        const jcbId = jcbRes.rows[0].hostel_id;

        // 2. See who has nodal_officer for JCB
        const roleRes = await client.query("SELECT role_id FROM roles WHERE role_name = 'nodal_officer'");
        const noRoleId = roleRes.rows[0].role_id;

        const uRes = await client.query(`
            SELECT u.user_id, u.full_name 
            FROM users u
            JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
            WHERE uhr.hostel_id = $1 AND uhr.role_id = $2
        `, [jcbId, noRoleId]);

        // If Rohit Kumar is in there, keep him. Else keep just one, or maybe 'Test Hostel Staff' (which is the one we created).
        // Let's delete all EXCEPT Rohit Kumar, OR if Rohit isn't there, delete all EXCEPT "Dr. Rohit Kumar" or "Test Hostel Staff".
        // Actually, let's just make sure "Dr. Rohit Kumar" exists.

        // Is there a Rohit Kumar user?
        let rohitRes = await client.query("SELECT user_id FROM users WHERE full_name ILIKE '%Rohit%' LIMIT 1");
        let rohitId;
        if (rohitRes.rows.length === 0) {
            // Create Rohit Kumar!
            const bcrypt = require('bcryptjs');
            const defaultPassword = process.env.DEFAULT_SEED_PASSWORD || 'CHANGE_ME_BEFORE_DEPLOY';
            const pwdHash = await bcrypt.hash(defaultPassword, 10);
            const inst = await client.query(`
                INSERT INTO users (full_name, email, password_hash, is_verified, is_active, designation)
                VALUES ('Dr. Rohit Kumar', 'rohit.kumar@jcb.dtu.ac.in', $1, true, true, 'Warden')
                RETURNING user_id
            `, [pwdHash]);
            rohitId = inst.rows[0].user_id;
        } else {
            rohitId = rohitRes.rows[0].user_id;
        }

        // Delete all NO assignments for JCB
        await client.query("DELETE FROM user_hostel_roles WHERE hostel_id = $1 AND role_id = $2", [jcbId, noRoleId]);

        // Insert Rohit Kumar as the ONLY warden for JCB
        await client.query("INSERT INTO user_hostel_roles (user_id, role_id, hostel_id) VALUES ($1, $2, $3)", [rohitId, noRoleId, jcbId]);

        console.log("JCB Warden list cleaned up! Only Dr. Rohit Kumar is assigned.");
        client.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

cleanWardens();
