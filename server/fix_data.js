require('dotenv').config();
const pool = require('./db');

async function fixData() {
    try {
        console.log("Fixing missing hostel assignments for testing...");
        const client = await pool.connect();
        
        // 1. Get Ramanujan Boys Hostel ID
        const res = await client.query("SELECT hostel_id FROM hostels WHERE name ILIKE '%Raman%' LIMIT 1");
        const hostelId = res.rows.length ? res.rows[0].hostel_id : (await client.query("SELECT hostel_id FROM hostels LIMIT 1")).rows[0].hostel_id;
        
        // 2. Assign any unassigned students to this hostel
        await client.query(`
            UPDATE user_hostel_roles uhr
            SET hostel_id = $1
            FROM roles r
            WHERE uhr.role_id = r.role_id AND r.role_name = 'student' AND uhr.hostel_id IS NULL
        `, [hostelId]);

        // 3. Assign any unassigned grievances to this hostel
        await client.query(`
            UPDATE grievances
            SET hostel_id = $1
            WHERE hostel_id IS NULL
        `, [hostelId]);

        // 4. Also create assignment mapping if missing
        await client.query(`
            INSERT INTO grievance_assignments (grievance_id, hostel_id)
            SELECT grievance_id, hostel_id 
            FROM grievances 
            WHERE grievance_id NOT IN (SELECT grievance_id FROM grievance_assignments)
        `);

        console.log("Data fixed! Unassigned entities mapped to hostel ID:", hostelId);
        client.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
fixData();
