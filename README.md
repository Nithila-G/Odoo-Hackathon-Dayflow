# Dayflow — HRMS

> **Every workday, perfectly aligned.**  
> Full-stack HRMS built for the Odoo Hackathon: React + Tailwind frontend, Express + PostgreSQL backend, real-time presence via Socket.io, video background UI, and automatic salary breakdown calculator.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ or v20+

---

### Option A: Standard Run (Recommended — No Docker Required)

#### 1. Start Database (Embedded PostgreSQL)
Open terminal in `dayflow/`:
```bash
node server/start-postgres.js
```
*This automatically boots PostgreSQL on `localhost:5432`, creates the `dayflow` database, and applies all database schema migrations.*

#### 2. Start Backend API Server
Open a new terminal in `dayflow/server/`:
```bash
cd server
npm install
npm run dev
```
*Backend runs live on `http://localhost:4000`. Health check: `http://localhost:4000/api/health`*

#### 3. Start Frontend Client
Open a new terminal in `dayflow/client/`:
```bash
cd client
npm install
npm run dev
```
*Frontend runs live on `http://localhost:5173`*

---

### Option B: Run with Docker Compose

If you have Docker Desktop running:
```bash
# 1. Start Postgres database via Docker
docker compose up -d

# 2. Start backend
cd server
npm install
npm run dev

# 3. Start frontend
cd client
npm install
npm run dev
```

---

## 🔑 Key Features Implemented

1. **Company Onboarding & Sign Up**:
   - Live company logo upload with image preview (`POST /auth/upload-logo`).
   - Secure eye visibility toggles (`👁`) for password fields.
   - Pexels HD video background with responsive glassmorphism UI card overlays.
   - Auto-generated Login IDs (e.g. `SINIK20260001`).

2. **Employee Directory & Live Attendance**:
   - Card grid view showing employee photos, job positions, and department tags.
   - Live Socket.io status indicators:
     - 🟢 **Present** (Checked IN)
     - ✈️ **On Leave**
     - 🟡 **Absent**
   - Header **Check IN →** / **Check Out →** button with real-time status dot updates.

3. **Profile Personalization & Interactive Resume**:
   - Profile avatar image upload.
   - Interactive **+ Add Skill** and **+ Add Certification** pills with delete controls (`✕`).
   - Private information editor (financial details, contact info, employee metadata).

4. **Automatic Salary Component Calculator**:
   - Monthly Wage input (e.g., ₹50,000).
   - Real-time percentage component computation:
     - **Basic**: 50% of Month Wage
     - **HRA**: 50% of Basic
     - **Standard Allowance**: 16.67% of Basic
     - **Performance Bonus**: 8.33% of Basic
     - **LTA**: 8.33% of Basic
     - **Fixed Allowance**: Remainder component
     - **Provident Fund (PF)**: 12% (Employee & Employer)
     - **Professional Tax**: ₹200

5. **Time Off & Leave Approval Workflow**:
   - Employee leave requests with medical attachment uploads for sick leaves.
   - Admin/HR approval & rejection dashboard workflow.

---

## 📁 Project Structure

```
dayflow/
├── client/                 # React (Vite) + Tailwind CSS Frontend
│   ├── public/videos/      # HD Background Video Assets
│   └── src/
│       ├── components/     # NavBar, AppLayout, BackgroundVideo, SalaryTab
│       ├── pages/          # SignIn, SignUp, Employees, Profile, Attendance, TimeOff
│       └── utils/          # Date & Time Utility Helpers
├── server/                 # Express API + PostgreSQL Backend
│   ├── migrations/         # 001_init.sql Database Schema
│   ├── start-postgres.js   # Embedded Postgres Server Launcher
│   └── src/
│       ├── middleware/     # Auth & Role Enforcement Middleware
│       └── routes/         # Auth, Employees, Attendance, Leave, Salary, Health
└── docs/                   # PRD and System Architecture Documents
```

---

## 👥 Team Credits

Built with ❤️ for the Odoo Hackathon by **Team Dayflow**:
- **Nithila G** (`@Nithila-G`)
- **Tharunika** (`@tharunikanagendran`)
- **Rahul** (`@Rahul-1812`)
- **Nithitha K** (`@nithi-05K`)
