/* -- Step 1: Create a dedicated table for Roles
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

-- Step 2: Pre-populate the Roles table
INSERT INTO roles (role_name) VALUES ('student'), ('nodal_officer'), ('department_head'), ('super_admin');

-- Step 3: Make the Departments table hierarchical
ALTER TABLE departments
ADD COLUMN parent_department_id INT,
ADD CONSTRAINT fk_parent_department
    FOREIGN KEY(parent_department_id) 
    REFERENCES departments(department_id);

-- Step 4: Create the User-Department-Role mapping table
CREATE TABLE user_department_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id, role_id)
);

-- Step 5: Create the Grievance-Department assignment table
CREATE TABLE grievance_assignments (
    grievance_id INT NOT NULL REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(department_id) ON DELETE CASCADE,
    PRIMARY KEY (grievance_id, department_id)
);

-- Step 6: Drop the old, now redundant columns
ALTER TABLE users DROP COLUMN role;
ALTER TABLE users DROP COLUMN department_id;
ALTER TABLE grievances DROP COLUMN assigned_to_dept_id; */

SELECT
    email,
    verification_token_expires,
    NOW() AS current_db_time
FROM users
WHERE email = 'vinodsingh@dtu.ac.in';