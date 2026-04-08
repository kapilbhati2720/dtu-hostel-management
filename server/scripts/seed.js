/**
 * DTU Hostel Management — Database Seeder
 * 
 * Seeds hostels and warden accounts. This is a lighter alternative to 
 * runMigration.js — use it to re-seed data without re-creating schema.
 * 
 * Usage: npm run db:seed (from server/)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../db');
const bcrypt = require('bcryptjs');

// All hostels from the DTU hostel directory
const hostelsData = [
  // Boys Hostels
  { name: 'Aryabhatt Boys Hostel',     type: 'Boys',  wardenName: 'Dr. Sanjay Kumar',               wardenContact: '9968558596' },
  { name: 'HJB Boys Hostel',           type: 'Boys',  wardenName: 'Dr. D.C. Meena',                 wardenContact: '9868584955' },
  { name: 'Ramanujan Boys Hostel',     type: 'Boys',  wardenName: 'Dr. Prem Prakash',               wardenContact: '9868054036' },
  { name: 'CVR Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Raghvendra Gautam',          wardenContact: '9891709954' },
  { name: 'VMH Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Sanjay Patidar',             wardenContact: '9993402879' },
  { name: 'BCH Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Prashant G Shambharkar',     wardenContact: '9999300458' },
  { name: 'APJ Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Deshraj Meena',              wardenContact: '9873760434' },
  { name: 'JCB Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Rohit Kumar',                wardenContact: '8285885750' },
  { name: 'Type-II',                   type: 'Boys',  wardenName: 'Dr. Krishna Dutt',               wardenContact: '8052183484' },
  { name: 'VVS Boys Hostel',           type: 'Boys',  wardenName: 'Dr. Dhirendra Kumar',            wardenContact: '8826916336' },
  { name: 'North Delhi PG (Rented)',   type: 'Boys',  wardenName: 'Sh. Shreyansh Upadhyaya',        wardenContact: '7895451024' },
  // Girls Hostels
  { name: 'SNH Girls Hostel',           type: 'Girls', wardenName: 'Dr. Abhilasha Sharma',          wardenContact: '9818833482' },
  { name: 'VLB Block 1 Girls Hostel',   type: 'Girls', wardenName: 'Dr. Anamika Chauhan',           wardenContact: '9310807652' },
  { name: 'VLB Block 2 Girls Hostel',   type: 'Girls', wardenName: 'Dr. Sonika Dahiya',             wardenContact: '8586998146' },
  { name: 'KCH Girls Hostel',           type: 'Girls', wardenName: 'Dr. Sonal Singh',               wardenContact: '9717610058' },
];

// Warden accounts mapped to their hostels
const wardensData = [
  { fullName: 'Dr. Sanjay Kumar',               email: 'sanjaykumar@dtu.ac.in',            hostel: 'Aryabhatt Boys Hostel' },
  { fullName: 'Dr. D.C. Meena',                 email: 'dcmeena@dce.ac.in',                hostel: 'HJB Boys Hostel' },
  { fullName: 'Dr. Prem Prakash',                email: 'ppyadav1974@gmail.com',            hostel: 'Ramanujan Boys Hostel' },
  { fullName: 'Dr. Raghvendra Gautam',           email: 'raghvendrag80@yahoo.com',          hostel: 'CVR Boys Hostel' },
  { fullName: 'Dr. Sanjay Patidar',              email: 'sanjaypatidar@dtu.ac.in',          hostel: 'VMH Boys Hostel' },
  { fullName: 'Dr. Prashant G Shambharkar',      email: 'prashant.shambharkar@dtu.ac.in',   hostel: 'BCH Boys Hostel' },
  { fullName: 'Dr. Deshraj Meena',               email: 'deshrajmeena@dtu.ac.in',           hostel: 'APJ Boys Hostel' },
  { fullName: 'Dr. Rohit Kumar',                 email: 'rohitkumar@dtu.ac.in',             hostel: 'JCB Boys Hostel' },
  { fullName: 'Dr. Krishna Dutt',                email: 'krishna@dtu.ac.in',                hostel: 'Type-II' },
  { fullName: 'Dr. Dhirendra Kumar',             email: 'dhirendrakumar@dtu.ac.in',         hostel: 'VVS Boys Hostel' },
  { fullName: 'Sh. Shreyansh Upadhyaya',         email: 'shreyansh@dtu.ac.in',              hostel: 'North Delhi PG (Rented)' },
  { fullName: 'Dr. Abhilasha Sharma',            email: 'abhilasha_sharma87@yahoo.com',     hostel: 'SNH Girls Hostel' },
  { fullName: 'Dr. Anamika Chauhan',             email: 'letter4ana@gmail.com',              hostel: 'VLB Block 1 Girls Hostel' },
  { fullName: 'Dr. Sonika Dahiya',               email: 'sonika.dahiya@dtu.ac.in',          hostel: 'VLB Block 2 Girls Hostel' },
  { fullName: 'Dr. Sonal Singh',                 email: 'sonalsingh@dtu.ac.in',             hostel: 'KCH Girls Hostel' },
];

const seedDatabase = async () => {
  try {
    console.log('Starting the seeding process...');

    // 1. Seed Hostels
    for (const hostel of hostelsData) {
      const existing = await pool.query("SELECT * FROM hostels WHERE name = $1", [hostel.name]);
      if (existing.rows.length === 0) {
        await pool.query(
          "INSERT INTO hostels (name, type, warden_name, warden_contact) VALUES ($1, $2, $3, $4)",
          [hostel.name, hostel.type, hostel.wardenName, hostel.wardenContact]
        );
        console.log(`  Added hostel: ${hostel.name}`);
      }
    }

    // Build hostel name → ID map
    const allHostels = await pool.query("SELECT * FROM hostels");
    const hostelMap = new Map(allHostels.rows.map(h => [h.name, h.hostel_id]));
    console.log('Hostels are in sync.');

    // 2. Seed Wardens
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('DtuHostel@2026', salt);
    const nodalOfficerRole = await pool.query("SELECT role_id FROM roles WHERE role_name = 'nodal_officer'");
    const roleId = nodalOfficerRole.rows[0].role_id;

    for (const warden of wardensData) {
      const existing = await pool.query("SELECT user_id FROM users WHERE email = $1", [warden.email]);
      const hostelId = hostelMap.get(warden.hostel);

      if (!hostelId) {
        console.warn(`  Skipping warden ${warden.email}: Hostel "${warden.hostel}" not found.`);
        continue;
      }

      let userId;
      if (existing.rows.length === 0) {
        const res = await pool.query(
          `INSERT INTO users (full_name, email, password_hash, designation, is_verified, is_active, roll_number, admission_year, branch_code)
           VALUES ($1, $2, $3, 'Warden', TRUE, TRUE, 'N/A', 0, 'N/A') RETURNING user_id`,
          [warden.fullName, warden.email, passwordHash]
        );
        userId = res.rows[0].user_id;
        console.log(`  Added warden: ${warden.email}`);
      } else {
        userId = existing.rows[0].user_id;
      }

      // Assign role
      await pool.query(
        `INSERT INTO user_hostel_roles (user_id, hostel_id, role_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, hostelId, roleId]
      );
    }

    console.log('Seeding process completed!');
  } catch (err) {
    console.error('Error during seeding:', err);
  } finally {
    pool.end();
  }
};

seedDatabase();