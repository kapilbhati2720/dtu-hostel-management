const pool = require('../db');
const bcrypt = require('bcryptjs');

// The list of all departments you want in the system
const departmentsData = [
  { name: 'Academic' }, { name: 'Hostel Affairs' },
  { name: 'Administration' }, { name: 'Library' }, { name: 'Accounts' },
];

// The list of all officers you want to add or ensure exist
const officersData = [
  { 
    fullName: 'Dr. Ramesh Kumar', 
    email: 'dean.academic@dtu.ac.in',
    department: 'Academic',
  },
  { 
    fullName: 'Prof. Sunita Sharma', 
    email: 'chief.warden@dce.ac.in',
    department: 'Hostel Affairs',
  },
  // You can paste your entire list of officers here
];

const seedDatabase = async () => {
  try {
    console.log('Starting the seeding process...');

    // 1. Seed Departments intelligently
    for (const dept of departmentsData) {
      const existing = await pool.query("SELECT * FROM departments WHERE name = $1", [dept.name]);
      if (existing.rows.length === 0) {
        await pool.query("INSERT INTO departments (name) VALUES ($1)", [dept.name]);
        console.log(`Added department: ${dept.name}`);
      }
    }

    // Fetch all departments to create a name-to-ID map
    const allDepts = await pool.query("SELECT * FROM departments");
    const departmentMap = new Map(allDepts.rows.map(d => [d.name, d.department_id]));
    console.log('Departments are in sync.');

    // 2. Seed Officers intelligently
    for (const officer of officersData) {
      const existing = await pool.query("SELECT * FROM users WHERE email = $1", [officer.email]);

      if (existing.rows.length === 0) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('defaultpassword123', salt); // Set a secure default password
        const departmentId = departmentMap.get(officer.department);

        if (!departmentId) {
          console.warn(`Skipping officer ${officer.email}: Department "${officer.department}" not found.`);
          continue;
        }

        await pool.query(
          `INSERT INTO users (full_name, email, password_hash, role, department_id, is_verified, roll_number, admission_year, branch_code)
           VALUES ($1, $2, $3, 'nodal_officer', $4, TRUE, 'N/A', 0, 'N/A')`,
          [officer.fullName, officer.email, passwordHash, departmentId]
        );
        console.log(`Added officer: ${officer.email}`);
      }
    }

    console.log('Seeding process completed!');
  } catch (err) {
    console.error('Error during seeding process:', err);
  } finally {
    pool.end();
  }
};

seedDatabase();