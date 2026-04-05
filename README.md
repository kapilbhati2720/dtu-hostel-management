# DTU Grievance Redressal Management (GRM) Portal 🏛️

An enterprise-grade, centralized platform built for Delhi Technological University (DTU) to streamline, track, and resolve campus issues. Designed to replace fragmented email chains and paper trails with a transparent, accountable, and SLA-driven ecosystem.

## 🚀 The Core Problem & Our Solution

Historically, campus issues (from broken hostel infrastructure to severe disciplinary matters) vanished into administrative "black holes."

**DTU GRM** solves this by introducing:

1. **Strict Accountability:** Automated Service Level Agreements (SLAs) ensure tickets are escalated if ignored.
2. **Transparency:** Students can track the exact status, assignee, and timeline of their reports.
3. **Data Security:** Highly sensitive complaints (ICC/EOC) are air-gapped from public feeds and AI processing to protect student identities.

---

## ✨ Enterprise Features

### 🛡️ Air-Gapped Anonymous Reporting (Data Privacy)

* **Contextual Routing:** Sensitive issues are routed exclusively to the Equal Opportunity Cell (EOC) or Internal Complaints Committee (ICC).
* **DTO Masking:** Backend Data Transfer Objects (DTOs) dynamically scrub student identities (`"Anonymous Student"`) before payloads reach the frontend.
* **AI Bypass:** Secure tickets bypass the AI embedding generation pipeline to comply with strict data privacy standards.

### 🧠 AI-Powered Smart Deduplication

* Prevents portal spam by using Vector Embeddings to semantically match new grievances against existing open tickets.
* Promotes a **Community Upvote/Petition** system, allowing multiple students to follow a single high-impact issue rather than creating duplicates.

### ⏱️ SLA & Automated Cron Engine

* Background worker processes automatically flag tickets that breach their 48-72 hour SLAs.
* Automated cleanup workers purge unverified, abandoned user accounts to maintain database health.

### ⚡ Real-Time Operations

* **WebSockets (Socket.io):** Instant browser notifications for status changes, comments, and escalations.
* **Role-Based Access Control (RBAC):** Strict contextual roles mapping Super Admins, Departmental Nodal Officers, and Students to their authorized domains.

---

## 🛠️ System Architecture & Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS, Lucide Icons (Responsive, State-Driven Themed UI).
* **Backend:** Node.js, Express.js (REST API + WebSocket layer).
* **Database:** PostgreSQL (Relational schema enforcing strict constraints and contextual RBAC).
* **Storage:** Cloudinary (For optimized evidence/attachment hosting).
* **AI Services:** Vector Embedding Generation for semantic search.
* **Background Jobs:** Node-Cron for SLA monitoring.

---

## 🚀 Local Development Setup

### 1. Prerequisites

* Node.js (v18+)
* PostgreSQL running locally or via cloud (e.g., Supabase/Neon).
* Cloudinary Account (for file uploads).

### 2. Installation

Clone the repository and install dependencies for both client and server:

```bash
git clone https://github.com/kapilbhati2720/dtu-grm-portal.git
cd dtu-grm-portal

# Install Backend dependencies
cd server
npm install

# Install Frontend dependencies
cd ../client
npm install
```

### 3. Environment Variables

Create a `.env` file in the `/server` directory:

```env
# Database & Auth
DATABASE_URL=postgresql://user:password@localhost:5432/dtu_grm
JWT_SECRET=your_super_secret_jwt_key

# Email SMTP (e.g., Mailtrap for testing)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_pass

# Media Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI Embedding Service
AI_API_KEY=your_ai_service_key
```

### 4. Running the Application

From the root directory, start both the React frontend and Node backend concurrently:

```bash
npm run dev
```

---

## 🗺️ Roadmap (Current Sprint)

* [x] Epic 1: Core Ticketing & Auth
* [x] Epic 2: Real-time Notifications & File Uploads
* [x] Epic 3: AI Deduplication & Community Upvoting
* [x] Epic 4: Verified Anonymous Reporting (Air-gapped)
* [ ] **Epic 5: Super Admin Analytics & Secure Provisioning (In Progress)**
  * God-view analytical dashboard (OLAP queries).
  * Secure invitation workflow for provisioning new faculty accounts.
  * CSV/Excel export for compliance reporting.

---

*Built for Delhi Technological University.*

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/kapilbhati2720/dtu-grm-portal)
