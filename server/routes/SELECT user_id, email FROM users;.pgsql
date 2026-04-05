SELECT user_id, email FROM users;

-- Assign the Super Admin role (we'll assign them to the 'Administration' department, ID 3)
INSERT INTO user_department_roles (user_id, department_id, role_id)
VALUES ('7af18ad2-4c91-4c16-a9e0-82fe3bbf984b', 3, 4);

-- Assign the Nodal Officer role (to the 'Hostel Affairs' department, ID 2)
INSERT INTO user_department_roles (user_id, department_id, role_id)
VALUES ('0a4fde57-8506-4d96-832b-679fcbd0e8f1', 2, 2);


SELECT
    u.user_id,
    u.full_name,
    u.email,
    r.role_name
FROM
    users AS u
JOIN
    user_department_roles AS udr ON u.user_id = udr.user_id
JOIN
    roles AS r ON udr.role_id = r.role_id
WHERE
    u.email = 'admin@dtu.ac.in';



-- Add verification token columns to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

-- ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
-- ALTER TABLE users ALTER COLUMN roll_number DROP NOT NULL;
-- ALTER TABLE users ALTER COLUMN branch_code DROP NOT NULL;
-- ALTER TABLE users ALTER COLUMN admission_year DROP NOT NULL;

-- INSERT INTO departments (name) VALUES
-- ('Electronics & Communication Engineering (ECE)'),
-- ('Computer Science & Engineering (CSE)'),
-- ('Mechanical Engineering (ME)'),
-- ('Electrical Engineering (EE)'),
-- ('Production & Industrial Engineering (PIE)'),
-- ('Civil Engineering (CE)'),
-- ('Environmental Engineering (ENE)'),
-- ('Chemical Engineering (CH)'),
-- ('Information Technology (IT)'),
-- ('Bio-Technology (BT)'),
-- ('Software Engineering (SE)'),
-- ('Mechanical Engineering with specialization in Automotive Engineering (MAM)'),
-- ('Engineering Physics (EP)'),
-- ('Mathematics and Computing (MC)');

-- INSERT INTO departments (name) VALUES
-- ('Delhi School Of Management'),
-- ('Humanities'),
-- ('Applied Chemistry'),
-- ('Training & Placement'),
-- ('Department of Design'),
-- ('USME'),
-- ('B.Tech (Continuing Education)'),
-- ('Computer Centre')
-- ON CONFLICT (name) DO NOTHING; -- This prevents errors if a department already exists

-- INSERT INTO users (full_name, email) VALUES
-- ('Prof. Manoj Kumar', 'mkumarg@dce.ac.in'),
-- ('Prof. Dinesh K. Vishwakarma', 'dinesh@dtu.ac.in'),
-- ('Prof. Ruchika Malhotra', 'ruchikamalhotra@dtu.ac.in'),
-- ('Prof. Neeta Pandey', 'neetapandey@dce.ac.in'),
-- ('Prof. B B Arora', 'bbarora@dtu.ac.in'), -- Assuming a generic email
-- ('Dr Saurabh Agrawal', 'saurabh.agrawal@dtu.ac.in'),
-- ('Prof. Rachna Garg', 'rachnagarg@dtu.ac.in'),
-- ('Prof. K C Tiwari', 'hod.ce@dtu.ac.in'),
-- ('Anil Kumar Haritash', 'akharitash@dce.ac.in'),
-- ('Prof. Yasha Hasija', 'yashahasija@dtu.ac.in'),
-- ('Prof. Vinod Singh', 'vinodsingh@dtu.ac.in'),
-- ('Prof. R. Srivastava', 'rsrivastava@dce.ac.in'),
-- ('Ms. Saroj Bala', 'sarojbala@dce.ac.in'),
-- ('Dr. Anil Kumar', 'anil_kumar@dce.ac.in'),
-- ('Prof. Anil Parihar', 'placements@dtu.ac.in'),
-- ('Prof R C Singh', 'rcsingh@dce.ac.in'),
-- ('Dr. Amit Mookerjee', 'amookerjee@dtu.ac.in'),
-- ('Prof. Ram Bhagat', 'rambhagat@dtu.ac.in'),
-- ('Prof. Shailender Kumar', 'shailenderkumar@dce.ac.in')
-- ON CONFLICT (email) DO NOTHING; -- This prevents errors if a user already exists


-- INSERT INTO user_department_roles (user_id, role_id, department_id)
-- SELECT
--     u.user_id,
--     (SELECT role_id FROM roles WHERE role_name = 'department_head'),
--     d.department_id
-- FROM (
--     VALUES
--         ('mkumarg@dce.ac.in', 'Computer Science & Engineering (CSE)'),
--         ('dinesh@dtu.ac.in', 'Information Technology (IT)'),
--         ('ruchikamalhotra@dtu.ac.in', 'Software Engineering (SE)'),
--         ('neetapandey@dce.ac.in', 'Electronics & Communication Engineering (ECE)'),
--         ('bbarora@dtu.ac.in', 'Mechanical Engineering (ME)'),
--         ('bbarora@dtu.ac.in', 'Production & Industrial Engineering (PIE)'),
--         ('saurabh.agrawal@dtu.ac.in', 'Delhi School Of Management'),
--         ('rachnagarg@dtu.ac.in', 'Electrical Engineering (EE)'),
--         ('hod.ce@dtu.ac.in', 'Civil Engineering (CE)'),
--         ('akharitash@dce.ac.in', 'Environmental Engineering (ENE)'),
--         ('yashahasija@dtu.ac.in', 'Bio-Technology (BT)'),
--         ('vinodsingh@dtu.ac.in', 'Engineering Physics (EP)'),
--         ('rsrivastava@dce.ac.in', 'Mathematics and Computing (MC)'),
--         ('sarojbala@dce.ac.in', 'Humanities'),
--         ('anil_kumar@dce.ac.in', 'Applied Chemistry'),
--         ('placements@dtu.ac.in', 'Training & Placement'),
--         ('rcsingh@dce.ac.in', 'Department of Design'),
--         ('amookerjee@dtu.ac.in', 'USME'),
--         ('rambhagat@dtu.ac.in', 'B.Tech (Continuing Education)'),
--         ('shailenderkumar@dce.ac.in', 'Computer Centre')
-- ) AS assignments (email, department_name)
-- JOIN users u ON u.email = assignments.email
-- JOIN departments d ON d.name = assignments.department_name
-- ON CONFLICT (user_id, role_id, department_id) DO NOTHING;

-- UPDATE grievances
-- SET category = 'Hostel Affairs'
-- WHERE category = 'Hostel';

-- SELECT
--     *
-- FROM users
-- WHERE email = 'neetapandey@dce.ac.in';


-- ALTER TABLE grievances 
-- ADD COLUMN is_escalated BOOLEAN DEFAULT FALSE;

-- Add embedding and upvotes columns to grievances table
-- ALTER TABLE grievances ADD COLUMN embedding float8[];
-- ALTER TABLE grievances ADD COLUMN upvotes INT DEFAULT 0;