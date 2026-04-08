/**
 * DTU Hostel Management — Create Super Admin (Chief Warden)
 * 
 * Creates the Chief Warden account with super_admin role.
 * 
 * Usage: npm run create-admin (from server/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../db');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'rajkumarsingh@dce.ac.in';
const ADMIN_PASSWORD = 'DtuHostel@2026';
const ADMIN_NAME = 'Prof. Raj Kumar Singh';
const ADMIN_DESIGNATION = 'Chief Warden';

const createSuperAdmin = async () => {
  const client = await pool.connect();
  try {
    console.log('Checking for existing Chief Warden...');
    
    // Check if a super_admin already exists
    const existingAdmin = await client.query(`
      SELECT u.user_id, u.email 
      FROM users u
      JOIN user_hostel_roles uhr ON u.user_id = uhr.user_id
      JOIN roles r ON uhr.role_id = r.role_id
      WHERE r.role_name = 'super_admin'
      LIMIT 1
    `);

    if (existingAdmin.rows.length > 0) {
      console.log(`A Chief Warden already exists: ${existingAdmin.rows[0].email}`);
      return;
    }

    console.log('Creating Chief Warden account...');
    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    const userRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, designation, is_verified, is_active, roll_number, admission_year, branch_code)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, 'N/A', 0, 'N/A') RETURNING user_id`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash, ADMIN_DESIGNATION]
    );

    const userId = userRes.rows[0].user_id;
    const roleRes = await client.query("SELECT role_id FROM roles WHERE role_name = 'super_admin'");
    const roleId = roleRes.rows[0].role_id;

    await client.query(
      `INSERT INTO user_hostel_roles (user_id, hostel_id, role_id) VALUES ($1, $2, $3)`,
      [userId, null, roleId]
    );

    await client.query('COMMIT');
    console.log(`✅ Successfully created Chief Warden: ${ADMIN_NAME} (${ADMIN_EMAIL})`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating super admin:', err.message);
  } finally {
    client.release();
    pool.end();
  }
};

createSuperAdmin();