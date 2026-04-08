require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

const councilMembers = [
    { name: "Arpit Pandey", roll: "2K22/EE/58", role: "President", room: "424", phone: "9305612733" },
    { name: "Krish Pandey", roll: "23/ME/367", role: "Vice-President", room: "409", phone: "8822440949" },
    { name: "Ayush Yadav", roll: "23/EP/28", role: "General Secretary", room: "333", phone: "7651973669" },
    { name: "Keshav Tibriwala", roll: "23/EE/319", role: "Cultural and soft skill Secretary", room: "403", phone: "9434661779" },
    { name: "Arpit Lohan", roll: "24/EP/23", role: "Hostel mess secretary", room: "129", phone: "8708142300" },
    { name: "Anuj", roll: "24/CSE/80", role: "Sports secretary", room: "123", phone: "9729580554" },
    { name: "Harshit Sharma", roll: "24/GTE/10", role: "Academic and career secretary", room: "111", phone: "6204600432" },
    { name: "Rishi Keshav", roll: "23/EP/81", role: "Technical event secretary", room: "416", phone: "6209961294" },
    { name: "Nishant Yadav", roll: "23/EN/44", role: "Environment and sustainability secretary", room: "415", phone: "8738985054" },
    { name: "Akshat Garg", roll: "24/SE/21", role: "Social,Publicity and communication secretary", room: "119", phone: "9350334570" },
    { name: "Vishnu Kumar", roll: "2K22/AE/75", role: "Floor manager(Ground Floor)", room: "103", phone: "7017453718" },
    { name: "Vikram Singh", roll: "2K22/CO/497", role: "Floor manager(1st floor)", room: "205", phone: "9499178883" },
    { name: "Trilokendra", roll: "23/EN/115", role: "Floor manager(2nd floor)", room: "331", phone: "8302234744" },
    { name: "Siddharth", roll: "23/IT/204", role: "Floor manager(3rd floor)", room: "412", phone: "9530096173" }
];

async function seedJCB() {
    try {
        const client = await pool.connect();
        const pwdHash = await bcrypt.hash('password123', 10);

        // 1. Get JCB ID (ID: 8)
        const jcbRes = await client.query("SELECT hostel_id FROM hostels WHERE name ILIKE '%JCB%' LIMIT 1");
        const jcbId = jcbRes.rows[0].hostel_id;
        console.log("JCB Hostel ID:", jcbId);

        // 2. Set all test users to JCB instead
        await client.query("UPDATE user_hostel_roles SET hostel_id = $1", [jcbId]);
        await client.query("UPDATE grievances SET hostel_id = $1", [jcbId]);
        await client.query("UPDATE grievance_assignments SET hostel_id = $1", [jcbId]);

        // 3. Seed student council
        const roleRes = await client.query("SELECT role_id FROM roles WHERE role_name = 'student'");
        const studentRoleId = roleRes.rows[0].role_id;

        for (const m of councilMembers) {
            // Generate email from name
            const email = m.name.toLowerCase().replace(/ /g, '.') + '@jcb.dtu.ac.in';
            const userRes = await client.query(
                `INSERT INTO users (roll_number, full_name, email, password_hash, is_verified, is_active, designation) 
                 VALUES ($1, $2, $3, $4, true, true, $5)
                 ON CONFLICT (email) DO UPDATE SET designation = EXCLUDED.designation
                 RETURNING user_id`,
                [m.roll, m.name, email, pwdHash, m.role]
            );
            const userId = userRes.rows[0].user_id;

            // map role to JCB
            await client.query(`DELETE FROM user_hostel_roles WHERE user_id = $1`, [userId]);
            await client.query(`INSERT INTO user_hostel_roles (user_id, role_id, hostel_id) VALUES ($1, $2, $3)`, [userId, studentRoleId, jcbId]);
        }

        console.log("JCB completely populated and made the active default!");
        client.release();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seedJCB();
