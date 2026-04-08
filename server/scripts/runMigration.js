/**
 * DTU Hostel Management — Database Migration & Seed Runner
 * 
 * Executes the SQL schema migration against the Neon PostgreSQL instance,
 * then seeds system users (Chief Warden, Officer In-charge, 15 Hostel Wardens).
 * 
 * Usage: node server/scripts/runMigration.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================================
// SEED DATA
// ============================================================

// System-wide personnel (super_admin)
const systemUsers = [
  {
    fullName: 'Prof. Raj Kumar Singh',
    email: 'rajkumarsingh@dce.ac.in',
    designation: 'Chief Warden',
    roleName: 'super_admin',
    hostelName: null, // System-wide
  },
  {
    fullName: 'Dr. Sanjay Patidar',
    email: 'sanjaypatidar@dtu.ac.in',
    designation: 'Officer In-charge, Hostel Office',
    roleName: 'super_admin',
    hostelName: null, // System-wide
  },
];

// Hostel wardens (nodal_officer, mapped to their hostel)
const wardenUsers = [
  { fullName: 'Dr. Sanjay Kumar',               email: 'sanjaykumar@dtu.ac.in',            hostelName: 'Aryabhatt Boys Hostel' },
  { fullName: 'Dr. D.C. Meena',                 email: 'dcmeena@dce.ac.in',                hostelName: 'HJB Boys Hostel' },
  { fullName: 'Dr. Prem Prakash',                email: 'ppyadav1974@gmail.com',            hostelName: 'Ramanujan Boys Hostel' },
  { fullName: 'Dr. Raghvendra Gautam',           email: 'raghvendrag80@yahoo.com',          hostelName: 'CVR Boys Hostel' },
  { fullName: 'Dr. Sanjay Patidar',              email: 'sanjaypatidar@dtu.ac.in',          hostelName: 'VMH Boys Hostel' },  // Also Officer In-charge (dual role)
  { fullName: 'Dr. Prashant G Shambharkar',      email: 'prashant.shambharkar@dtu.ac.in',   hostelName: 'BCH Boys Hostel' },
  { fullName: 'Dr. Deshraj Meena',               email: 'deshrajmeena@dtu.ac.in',           hostelName: 'APJ Boys Hostel' },
  { fullName: 'Dr. Rohit Kumar',                 email: 'rohitkumar@dtu.ac.in',             hostelName: 'JCB Boys Hostel' },
  { fullName: 'Dr. Krishna Dutt',                email: 'krishna@dtu.ac.in',                hostelName: 'Type-II' },
  { fullName: 'Dr. Dhirendra Kumar',             email: 'dhirendrakumar@dtu.ac.in',         hostelName: 'VVS Boys Hostel' },
  { fullName: 'Sh. Shreyansh Upadhyaya',         email: 'shreyansh@dtu.ac.in',              hostelName: 'North Delhi PG (Rented)' },
  { fullName: 'Dr. Abhilasha Sharma',            email: 'abhilasha_sharma87@yahoo.com',     hostelName: 'SNH Girls Hostel' },
  { fullName: 'Dr. Anamika Chauhan',             email: 'letter4ana@gmail.com',              hostelName: 'VLB Block 1 Girls Hostel' },
  { fullName: 'Dr. Sonika Dahiya',               email: 'sonika.dahiya@dtu.ac.in',          hostelName: 'VLB Block 2 Girls Hostel' },
  { fullName: 'Dr. Sonal Singh',                 email: 'sonalsingh@dtu.ac.in',             hostelName: 'KCH Girls Hostel' },
];

// Default password for seeded accounts (they should change on first login)
const DEFAULT_PASSWORD = 'DtuHostel@2026';

// ============================================================
// EXECUTION
// ============================================================

const runMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to Neon PostgreSQL.');
    console.log('');

    // ---- STEP 1: Execute SQL Schema ----
    console.log('📦 STEP 1: Executing schema migration...');
    const sqlPath = path.resolve(__dirname, 'migrate_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await client.query(sql);
    console.log('   ✅ Schema created successfully.');
    console.log('   ✅ 15 hostels seeded.');
    console.log('');

    // ---- STEP 2: Fetch role IDs ----
    console.log('📦 STEP 2: Fetching role IDs...');
    const rolesRes = await client.query('SELECT role_id, role_name FROM roles');
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.role_name] = r.role_id; });
    console.log('   Roles:', JSON.stringify(roleMap));

    // ---- STEP 3: Fetch hostel IDs ----
    const hostelsRes = await client.query('SELECT hostel_id, name FROM hostels');
    const hostelMap = {};
    hostelsRes.rows.forEach(h => { hostelMap[h.name] = h.hostel_id; });
    console.log(`   Hostels: ${Object.keys(hostelMap).length} loaded.`);
    console.log('');

    // ---- STEP 4: Hash default password ----
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

    // ---- STEP 5: Seed system users (super_admin) ----
    console.log('📦 STEP 3: Seeding system-wide users...');
    for (const sysUser of systemUsers) {
      // Check if user already exists
      const existing = await client.query('SELECT user_id FROM users WHERE email = $1', [sysUser.email]);
      
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].user_id;
        // Update designation if not set
        await client.query(
          'UPDATE users SET designation = $1 WHERE user_id = $2 AND designation IS NULL',
          [sysUser.designation, userId]
        );
        console.log(`   ⏩ User exists: ${sysUser.email} — updating designation.`);
      } else {
        const userRes = await client.query(
          `INSERT INTO users (full_name, email, password_hash, designation, is_verified, is_active, roll_number, admission_year, branch_code) 
           VALUES ($1, $2, $3, $4, TRUE, TRUE, 'N/A', 0, 'N/A') RETURNING user_id`,
          [sysUser.fullName, sysUser.email, passwordHash, sysUser.designation]
        );
        userId = userRes.rows[0].user_id;
        console.log(`   ✅ Created: ${sysUser.fullName} (${sysUser.email})`);
      }

      // Assign super_admin role
      const roleId = roleMap[sysUser.roleName];
      await client.query(
        `INSERT INTO user_hostel_roles (user_id, hostel_id, role_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT DO NOTHING`,
        [userId, null, roleId]
      );
    }
    console.log('');

    // ---- STEP 6: Seed hostel wardens (nodal_officer) ----
    console.log('📦 STEP 4: Seeding hostel wardens...');
    const nodalOfficerRoleId = roleMap['nodal_officer'];

    for (const warden of wardenUsers) {
      const hostelId = hostelMap[warden.hostelName];
      if (!hostelId) {
        console.log(`   ⚠️ Hostel not found: "${warden.hostelName}" — skipping ${warden.email}`);
        continue;
      }

      // Check if user already exists (Dr. Sanjay Patidar has dual roles)
      const existing = await client.query('SELECT user_id FROM users WHERE email = $1', [warden.email]);
      
      let userId;
      if (existing.rows.length > 0) {
        userId = existing.rows[0].user_id;
        console.log(`   ⏩ User exists: ${warden.email} — adding warden role for ${warden.hostelName}.`);
      } else {
        const userRes = await client.query(
          `INSERT INTO users (full_name, email, password_hash, designation, is_verified, is_active, roll_number, admission_year, branch_code) 
           VALUES ($1, $2, $3, 'Warden', TRUE, TRUE, 'N/A', 0, 'N/A') RETURNING user_id`,
          [warden.fullName, warden.email, passwordHash]
        );
        userId = userRes.rows[0].user_id;
        console.log(`   ✅ Created: ${warden.fullName} → ${warden.hostelName}`);
      }

      // Assign nodal_officer role for this hostel
      await client.query(
        `INSERT INTO user_hostel_roles (user_id, hostel_id, role_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT DO NOTHING`,
        [userId, hostelId, nodalOfficerRoleId]
      );
    }
    console.log('');

    // ---- STEP 7: Verify ----
    console.log('📦 STEP 5: Verification...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('   Tables created:', tableCheck.rows.map(r => r.table_name).join(', '));

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const hostelCount = await client.query('SELECT COUNT(*) FROM hostels');
    const roleAssignments = await client.query('SELECT COUNT(*) FROM user_hostel_roles');

    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Hostels: ${hostelCount.rows[0].count}`);
    console.log(`   Role assignments: ${roleAssignments.rows[0].count}`);
    console.log('');
    console.log('🎉 Migration complete! Database is ready.');
    console.log(`🔑 Default password for all seeded accounts: ${DEFAULT_PASSWORD}`);

  } catch (err) {
    console.error('');
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
};

runMigration();
