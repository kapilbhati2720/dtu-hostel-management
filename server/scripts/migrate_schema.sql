-- ============================================================
-- DTU HOSTEL MANAGEMENT SYSTEM — Full Schema Migration
-- Target: Blank Neon PostgreSQL instance
-- Run via: node server/scripts/runMigration.js
-- ============================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CORE TABLES
-- ============================================================

-- 1.1 Users
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    roll_number VARCHAR(50),
    admission_year INT,
    branch_code VARCHAR(20),
    designation VARCHAR(100) DEFAULT NULL,   -- Cosmetic tier: 'Warden', 'Attendant', 'Council Member', 'Chief Warden', 'Officer In-charge'
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Roles (3-tier RBAC)
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (role_name) VALUES 
    ('student'), 
    ('nodal_officer'), 
    ('super_admin')
ON CONFLICT (role_name) DO NOTHING;

-- 1.3 Hostels (replaces departments)
CREATE TABLE IF NOT EXISTS hostels (
    hostel_id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) DEFAULT 'Boys',          -- Boys / Girls
    warden_name VARCHAR(255),
    warden_contact VARCHAR(20),
    sla_hours INT DEFAULT 72,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 User-Hostel-Role mapping (replaces user_department_roles)
CREATE TABLE IF NOT EXISTS user_hostel_roles (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    hostel_id INT REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE
);

-- Unique index that handles NULL hostel_id (for super_admin / student without hostel)
CREATE UNIQUE INDEX IF NOT EXISTS uhr_unique 
    ON user_hostel_roles (user_id, COALESCE(hostel_id, 0), role_id);

-- ============================================================
-- 2. GRIEVANCE TABLES
-- ============================================================

-- 2.1 Grievances
CREATE TABLE IF NOT EXISTS grievances (
    grievance_id SERIAL PRIMARY KEY,
    ticket_id VARCHAR(50) UNIQUE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),                     -- Electrical, Civil, Horticulture, Computer Center, Cleanliness, Mess, Other
    status VARCHAR(50) DEFAULT 'Submitted',    -- Submitted, Open, In Progress, Awaiting Clarification, Escalated, Resolved, Closed, Rejected
    submitted_by_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    hostel_id INT REFERENCES hostels(hostel_id) ON DELETE SET NULL,
    embedding float8[],
    upvotes INT DEFAULT 0,
    is_escalated BOOLEAN DEFAULT FALSE,
    escalation_level INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Grievance-Hostel assignments
CREATE TABLE IF NOT EXISTS grievance_assignments (
    grievance_id INT NOT NULL REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    hostel_id INT NOT NULL REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    PRIMARY KEY (grievance_id, hostel_id)
);

-- 2.3 Grievance updates / timeline
CREATE TABLE IF NOT EXISTS grievance_updates (
    update_id SERIAL PRIMARY KEY,
    grievance_id INT NOT NULL REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    updated_by_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    update_type VARCHAR(50) DEFAULT 'Comment',  -- Comment, StatusChange
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Grievance followers (upvote / subscribe)
CREATE TABLE IF NOT EXISTS grievance_followers (
    grievance_id INT NOT NULL REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    followed_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (grievance_id, user_id)
);

-- 2.5 Attachments
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id SERIAL PRIMARY KEY,
    grievance_id INT NOT NULL REFERENCES grievances(grievance_id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. NOTIFICATION TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. NEW MODULE: HOSTEL LEAVES
-- ============================================================

CREATE TABLE IF NOT EXISTS hostel_leaves (
    leave_id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    hostel_id INT NOT NULL REFERENCES hostels(hostel_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,            -- 'Home Visit', 'Medical', 'Emergency', 'Other'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending',       -- Pending, Approved, Rejected
    reviewed_by UUID REFERENCES users(user_id),
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. NEW MODULE: ANNOUNCEMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
    announcement_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id) ON DELETE CASCADE,  -- NULL = global announcement
    posted_by UUID NOT NULL REFERENCES users(user_id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal',      -- Normal, Urgent
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. SEED HOSTEL DATA
-- ============================================================

-- Boys Hostels (11)
INSERT INTO hostels (name, type, warden_name, warden_contact) VALUES
    ('Aryabhatt Boys Hostel',     'Boys',  'Dr. Sanjay Kumar',               '9968558596'),
    ('HJB Boys Hostel',           'Boys',  'Dr. D.C. Meena',                 '9868584955'),
    ('Ramanujan Boys Hostel',     'Boys',  'Dr. Prem Prakash',               '9868054036'),
    ('CVR Boys Hostel',           'Boys',  'Dr. Raghvendra Gautam',          '9891709954'),
    ('VMH Boys Hostel',           'Boys',  'Dr. Sanjay Patidar',             '9993402879'),
    ('BCH Boys Hostel',           'Boys',  'Dr. Prashant G Shambharkar',     '9999300458'),
    ('APJ Boys Hostel',           'Boys',  'Dr. Deshraj Meena',              '9873760434'),
    ('JCB Boys Hostel',           'Boys',  'Dr. Rohit Kumar',                '8285885750'),
    ('Type-II',                   'Boys',  'Dr. Krishna Dutt',               '8052183484'),
    ('VVS Boys Hostel',           'Boys',  'Dr. Dhirendra Kumar',            '8826916336'),
    ('North Delhi PG (Rented)',   'Boys',  'Sh. Shreyansh Upadhyaya',        '7895451024')
ON CONFLICT (name) DO NOTHING;

-- Girls Hostels (4)
INSERT INTO hostels (name, type, warden_name, warden_contact) VALUES
    ('SNH Girls Hostel',           'Girls', 'Dr. Abhilasha Sharma',          '9818833482'),
    ('VLB Block 1 Girls Hostel',   'Girls', 'Dr. Anamika Chauhan',           '9310807652'),
    ('VLB Block 2 Girls Hostel',   'Girls', 'Dr. Sonika Dahiya',             '8586998146'),
    ('KCH Girls Hostel',           'Girls', 'Dr. Sonal Singh',               '9717610058')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_grievances_hostel_id ON grievances(hostel_id);
CREATE INDEX IF NOT EXISTS idx_grievances_submitted_by ON grievances(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievance_assignments_hostel ON grievance_assignments(hostel_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_hostel_leaves_user ON hostel_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_hostel_leaves_hostel ON hostel_leaves(hostel_id);
CREATE INDEX IF NOT EXISTS idx_announcements_hostel ON announcements(hostel_id);
CREATE INDEX IF NOT EXISTS idx_user_hostel_roles_user ON user_hostel_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hostel_roles_hostel ON user_hostel_roles(hostel_id);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
