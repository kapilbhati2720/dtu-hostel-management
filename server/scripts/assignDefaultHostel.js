/**
 * DTU Hostel Management — Assign Default Hostel
 *
 * Assigns "JCB Boys Hostel" to every student user who has
 * NO hostel assigned yet. Skips super_admin, nodal_officer,
 * and any user who already has a hostel.
 *
 * Usage (from server/ directory):
 *   node scripts/assignDefaultHostel.js
 *
 * Run with --dry-run to preview without making changes:
 *   node scripts/assignDefaultHostel.js --dry-run
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../db');

const DEFAULT_HOSTEL_NAME = 'JCB Boys Hostel';
const EXCLUDED_ROLES = ['super_admin', 'nodal_officer'];
const DRY_RUN = process.argv.includes('--dry-run');

const assignDefaultHostel = async () => {
    const client = await pool.connect();

    try {
        console.log(DRY_RUN ? '🔍 DRY RUN MODE — no changes will be made.\n' : '');

        // 1. Find the hostel_id for JCB Boys Hostel
        const hostelRes = await client.query(
            `SELECT hostel_id, name FROM hostels WHERE name = $1`,
            [DEFAULT_HOSTEL_NAME]
        );

        if (hostelRes.rows.length === 0) {
            console.error(`❌ Hostel "${DEFAULT_HOSTEL_NAME}" not found in the database. Aborting.`);
            return;
        }

        const { hostel_id, name: hostelName } = hostelRes.rows[0];
        console.log(`✅ Found hostel: "${hostelName}" (ID: ${hostel_id})\n`);

        // 2. Find the student role_id
        const studentRoleRes = await client.query(
            `SELECT role_id FROM roles WHERE role_name = 'student'`
        );

        if (studentRoleRes.rows.length === 0) {
            console.error(`❌ 'student' role not found. Aborting.`);
            return;
        }
        const studentRoleId = studentRoleRes.rows[0].role_id;

        // 3. Find all users who:
        //    - Are NOT a super_admin or nodal_officer
        //    - Have NO hostel assignment at all (hostel_id IS NULL for all their roles)
        const unassignedRes = await client.query(`
            SELECT DISTINCT u.user_id, u.full_name, u.email
            FROM users u
            WHERE u.is_active = TRUE
              -- Exclude admins and staff
              AND NOT EXISTS (
                  SELECT 1 FROM user_hostel_roles uhr
                  JOIN roles r ON uhr.role_id = r.role_id
                  WHERE uhr.user_id = u.user_id
                    AND r.role_name = ANY($1::text[])
              )
              -- Exclude users who already have a hostel assigned
              AND NOT EXISTS (
                  SELECT 1 FROM user_hostel_roles uhr
                  WHERE uhr.user_id = u.user_id
                    AND uhr.hostel_id IS NOT NULL
              )
            ORDER BY u.full_name
        `, [EXCLUDED_ROLES]);

        const usersToAssign = unassignedRes.rows;

        if (usersToAssign.length === 0) {
            console.log('ℹ️  No unassigned students found. All users already have a hostel.');
            return;
        }

        console.log(`📋 Found ${usersToAssign.length} student(s) without a hostel:\n`);
        usersToAssign.forEach(u => console.log(`   - ${u.full_name} (${u.email})`));
        console.log('');

        if (DRY_RUN) {
            console.log(`🔍 DRY RUN: Would assign "${hostelName}" to the ${usersToAssign.length} user(s) above.`);
            return;
        }

        // 4. Assign JCB Hostel to each unassigned student
        await client.query('BEGIN');

        let successCount = 0;
        for (const user of usersToAssign) {
            // Check if a student role row exists for this user (without a hostel)
            const existingRole = await client.query(
                `SELECT uhr_id FROM user_hostel_roles
                 WHERE user_id = $1 AND role_id = $2 AND hostel_id IS NULL`,
                [user.user_id, studentRoleId]
            );

            if (existingRole.rows.length > 0) {
                // Update existing null-hostel student row
                await client.query(
                    `UPDATE user_hostel_roles SET hostel_id = $1
                     WHERE uhr_id = $2`,
                    [hostel_id, existingRole.rows[0].uhr_id]
                );
            } else {
                // Insert a new student role with the hostel
                await client.query(
                    `INSERT INTO user_hostel_roles (user_id, hostel_id, role_id)
                     VALUES ($1, $2, $3)`,
                    [user.user_id, hostel_id, studentRoleId]
                );
            }
            successCount++;
            console.log(`   ✅ Assigned "${hostelName}" → ${user.full_name} (${user.email})`);
        }

        await client.query('COMMIT');
        console.log(`\n🎉 Done! Assigned "${hostelName}" to ${successCount} student(s).`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error during assignment:', err.message);
    } finally {
        client.release();
        pool.end();
    }
};

assignDefaultHostel();
