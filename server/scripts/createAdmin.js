const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../db');
const bcrypt = require('bcryptjs');

const ADMIN_EMAIL = 'admin@dtu.ac.in';
const ADMIN_PASSWORD = 'supersecretpassword123';

const createSuperAdmin = async () => {
  try {
    console.log('Checking for existing super admin...');
    const existingAdmin = await pool.query("SELECT * FROM users WHERE role = 'super_admin'");
    if (existingAdmin.rows.length > 0) {
      console.log('A Super Admin user already exists.');
      return;
    }

    console.log('Creating Super Admin account...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_verified, roll_number, admission_year, branch_code)
       VALUES ('Super Admin', $1, $2, 'super_admin', TRUE, 'N/A', 0, 'N/A')`,
      [ADMIN_EMAIL, passwordHash]
    );

    console.log(`Successfully created Super Admin with email: ${ADMIN_EMAIL}`);

  } catch (err) {
    console.error('Error creating super admin:', err.message);
  } finally {
    pool.end();
  }
};

createSuperAdmin();