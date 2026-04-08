# DTU Hostel Management System

A comprehensive, full-stack progressive web application (PWA) designed to streamline hostel administration, student grievances, leave applications, and real-time announcements at Delhi Technological University (DTU).

## 🚀 Key Features

* **Role-Based Access Control (RBAC):** Three distinct tiers:
  * **Chief Warden (Super Admin):** Global analytics, cross-hostel visibility, and ultimate moderation.
  * **Hostel Staff (Warden / Attendant / Council):** Hostel-scoped dashboard to manage local grievances, approve leaves, and post announcements.
  * **Resident (Student):** User-friendly portal to file complaints, apply for leaves, and view hostel notices.
* **Smart Grievance Support:** Integrated with Google Gemini AI to detect duplicate complaints and streamline the reporting process.
* **Leave Management:** End-to-end gate pass application system with bulk-approval capabilities for staff.
* **Real-Time Announcements:** Live notice board powered by Socket.io, featuring urgent alerts and pinned circulars.
* **Progressive Web App (PWA):** Fully mobile-optimized. Students can install the portal directly to their iOS/Android home screens.
* **Advanced Analytics:** Comprehensive Chief Warden dashboard with Recharts-powered data visualization for SLA tracking and efficiency metrics.

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS, Recharts
* **Backend:** Node.js, Express.js, Socket.io
* **Database:** PostgreSQL (Hosted on Neon)
* **Security:** Helmet, Express Rate Limit, JWT Authentication
* **AI Integration:** Google Gemini API

## ⚙️ Local Setup & Installation

### 1. Clone the repository
```bash
git clone [https://github.com/kapilbhati2720/dtu-hostel-management.git](https://github.com/kapilbhati2720/dtu-hostel-management.git)
cd dtu-hostel-management
```

### 2. Install Dependencies
This project uses `concurrently` to run both the client and server simultaneously. Install root, server, and client dependencies:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Environment Variables
Create a `.env` file in the `server` directory and add the following keys:
```env
PORT=5000
DATABASE_URL=your_neon_postgres_connection_string
JWT_SECRET=your_secure_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Application
From the root directory, start both the backend and frontend dev servers:
```bash
npm run dev
```
* **Frontend:** `http://localhost:5173`
* **Backend:** `http://localhost:5000`

## 🏗️ Project Structure
Default testing data and routing are currently configured for **JCB Boys Hostel (Sir J.C. BOSE Hostel)** for development purposes.