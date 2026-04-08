require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seedTestUsers() {
  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    
    console.log("Creating/updating test users...");

    // Create Super Admin (Chief Warden)
    let res = await pool.query("INSERT INTO users (roll_number, full_name, email, password_hash, is_verified, is_active, designation) VALUES ('ADMIN001', 'Test Chief Warden', 'admin@test.com', $1, true, true, 'Chief Warden') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING user_id", [passwordHash]);
    const adminId = res.rows[0].user_id;

    // Create Nodal Officer (Hostel Staff)
    res = await pool.query("INSERT INTO users (roll_number, full_name, email, password_hash, is_verified, is_active, designation) VALUES ('STAFF001', 'Test Hostel Staff', 'staff@test.com', $1, true, true, 'Warden') ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING user_id", [passwordHash]);
    const staffId = res.rows[0].user_id;

    // Create Student (Resident)
    res = await pool.query("INSERT INTO users (roll_number, full_name, email, password_hash, is_verified, is_active) VALUES ('STUD001', 'Test Student Resident', 'student@test.com', $1, true, true) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING user_id", [passwordHash]);
    const studentId = res.rows[0].user_id;

    console.log("Users created. Assigning roles...");

    // Get Roles
    const roleSuperAdmin = await pool.query("SELECT role_id FROM roles WHERE role_name = 'super_admin'");
    const roleNodal = await pool.query("SELECT role_id FROM roles WHERE role_name = 'nodal_officer'");
    const roleStudent = await pool.query("SELECT role_id FROM roles WHERE role_name = 'student'");

    // Clean old roles
    await pool.query("DELETE FROM user_hostel_roles WHERE user_id IN ($1, $2, $3)", [adminId, staffId, studentId]);

    // Assign Super Admin
    await pool.query("INSERT INTO user_hostel_roles (user_id, role_id) VALUES ($1, $2)", [adminId, roleSuperAdmin.rows[0].role_id]);

    // Get CV Raman Hostel ID
    const hostelRes = await pool.query("SELECT hostel_id FROM hostels WHERE name ILIKE '%Raman%' LIMIT 1");
    // If not found, just grab the first one
    const hostelId = hostelRes.rows.length ? hostelRes.rows[0].hostel_id : (await pool.query("SELECT hostel_id FROM hostels LIMIT 1")).rows[0].hostel_id;

    // Assign Hostel Staff
    await pool.query("INSERT INTO user_hostel_roles (user_id, role_id, hostel_id) VALUES ($1, $2, $3)", [staffId, roleNodal.rows[0].role_id, hostelId]);

    // Assign Student
    await pool.query("INSERT INTO user_hostel_roles (user_id, role_id) VALUES ($1, $2)", [studentId, roleStudent.rows[0].role_id]);

    console.log(`Setup complete! 
      Admin: admin@test.com
      Staff: staff@test.com
      Student: student@test.com
      Password for all: password123`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedTestUsers();
