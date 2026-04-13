/**
 * DTU Hostel Management — Bulk Assign Default Hostel
 *
 * Assigns a specified hostel (default: JCB Hostel) to all student users
 * who currently have NO hostel allotment in user_hostel_roles.
 *
 * Skips: super_admin, nodal_officer — only targets regular students.
 *
 * Usage (from server/ directory):
 *   node scripts/assignDefaultHostel.js
 *   node scripts/assignDefaultHostel.js "JCB Hostel"   ← custom hostel name
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../db');

const HOSTEL_NAME = process.argv[2] || 'JCB Hostel';

const run = async () => {
    const client = await pool.connect();
    try {
        console.log(`\n🔍 Looking up hostel: "${HOSTEL_NAME}"...`);

        // 1. Get hostel ID
        const hostelRes = await client.query(
            `SELECT hostel_id, name FROM hostels WHERE name ILIKE $1 LIMIT 1`,
            [HOSTEL_NAME]
        );

        if (hostelRes.rows.length === 0) {
            console.error(`❌ Hostel "${HOSTEL_NAME}" not found in the database.`);
            console.log('   Available hostels:');
            const all = await client.query('SELECT name FROM hostels ORDER BY name');
            all.rows.forEach(h => console.log(`     - ${h.name}`));
            return;
        }

        const { hostel_id, name: foundHostelName } = hostelRes.rows[0];
        console.log(`✅ Found hostel: "${foundHostelName}" (ID: ${hostel_id})`);

        // 2. Get student role ID
        const roleRes = await client.query(
            `SELECT role_id FROM roles WHERE role_name = 'student' LIMIT 1`
        );
        if (roleRes.rows.length === 0) {
            console.error('❌ "student" role not found in the roles table.');
            return;
        }
        const studentRoleId = roleRes.rows[0].role_id;

        // 3. Find all students with NO hostel assignment
        const unallottedRes = await client.query(`
            SELECT DISTINCT u.user_id, u.full_name, u.email
            FROM users u
            JOIN user_hostel_roles uhr ON uhr.user_id = u.user_id AND uhr.role_id = $1
            WHERE NOT EXISTS (
                SELECT 1 FROM user_hostel_roles uhr2
                WHERE uhr2.user_id = u.user_id
                  AND uhr2.hostel_id IS NOT NULL
                  AND uhr2.role_id = $1
            )
            AND u.is_active = TRUE
        `, [studentRoleId]);

        if (unallottedRes.rows.length === 0) {
            console.log('\n🎉 No unallotted students found. Everyone already has a hostel!');
            return;
        }

        console.log(`\n📋 Found ${unallottedRes.rows.length} student(s) without a hostel:`);
        unallottedRes.rows.forEach(u => {
            console.log(`   - ${u.full_name} (${u.email})`);
        });

        console.log(`\n⚙️  Assigning "${foundHostelName}" to all of them...`);

        await client.query('BEGIN');

        let count = 0;
        for (const u of unallottedRes.rows) {
            // Update the existing student role row to add the hostel
            await client.query(
                `UPDATE user_hostel_roles 
                 SET hostel_id = $1 
                 WHERE user_id = $2 AND role_id = $3 AND hostel_id IS NULL`,
                [hostel_id, u.user_id, studentRoleId]
            );
            count++;
        }

        await client.query('COMMIT');
        console.log(`\n✅ Done! Successfully assigned "${foundHostelName}" to ${count} student(s).`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during assignment:', err.message);
    } finally {
        client.release();
        pool.end();
    }
};

run();
