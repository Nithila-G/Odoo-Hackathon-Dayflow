# Dayflow — Human Resource Management System
### Product Requirements Document (PRD)
*"Every workday, perfectly aligned."*

| | |
|---|---|
| **Doc type** | Hackathon PRD / build spec |
| **Source material** | `Dayflow - Human Resource Management System.pdf` + 7 wireframes (Excalidraw) |
| **Status** | Draft for team sign-off before build starts |

---

## 1. Overview & Purpose

Dayflow is a Human Resource Management System (HRMS) that digitizes core HR operations for a small-to-mid-size company: authentication, employee profiles, attendance, leave/time-off, and payroll visibility, with an approval workflow between **Employees** and **Admin/HR Officers**.

This document translates the original SRS + wireframes into a buildable spec, under the hackathon's technical constraints (self-hosted SQL database, no BaaS/ORM shortcuts like Mongo or Prisma, real/dynamic data, offline-friendly).

## 2. Goals & Non-Goals

**Goals (MVP for hackathon demo):**
- Company + user onboarding with role-based access (Admin/HR vs Employee)
- Employee directory with live presence status
- Check-in/check-out attendance, with day-wise history for self and (for Admin/HR) everyone
- Time-off request → approval workflow, with balances and a yearly calendar
- Salary structure visible read-only to the employee, editable by Admin/HR, with auto-computed components

**Non-goals for MVP (see §17 Future Enhancements):**
- Payslip PDF generation / email delivery
- Analytics/reporting dashboards
- Multi-company billing or subscription logic
- Push notifications

## 3. Users & Roles

| Role | Description | Key permissions |
|---|---|---|
| **Admin / HR Officer** | Manages employees, approves leave & attendance, controls payroll | Create employees, edit any profile, view/edit everyone's Salary Info, approve/reject time-off, view all attendance |
| **Employee** | Regular staff member | View/edit limited fields on own profile, check in/out, apply for leave, view own (read-only) salary |

Role is set at account-creation time and gates UI (nav items, tabs, buttons) **and** must be enforced server-side on every endpoint — not just hidden in the UI.

## 4. Constraints & Guardrails

These are hard requirements from the hackathon brief and take priority over convenience:

**Must have**
- Own database — **PostgreSQL or MySQL**, self-modeled schema (no MongoDB, no Prisma, no other managed BaaS/ORM-as-a-service)
- Real/dynamic data end-to-end; static JSON only acceptable for early prototyping, not for the submitted build
- Responsive, visually consistent UI (one color system, one spacing scale)
- Robust input validation, client- and server-side
- Clear, uncluttered navigation matching the wireframes' top nav
- Real git workflow across the whole team (not one person pushing everything)

**Nice to have**
- Hand-rolled backend API + data model + local DB setup (counts extra vs. using a hosted DB-as-a-service)
- Any AI-generated code is understood and adapted by the team, not pasted blind
- App remains usable with a local Postgres/MySQL instance and local file storage — no hard dependency on third-party cloud services to run/demo
- Avoid tech chosen just because it's trendy — everything below is picked because it maps to a concrete requirement

## 5. Proposed Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) + Tailwind CSS | Fast to build, matches component-card-heavy wireframes, easy responsive utility classes |
| State/data | React Query (or SWR) for server-state, WebSocket client for live status | Keeps "dynamic data" requirement honest — no hand-rolled polling everywhere |
| Backend | Node.js + Express (or Fastify) | Team can move fast; plain SQL/query-builder keeps you clear of the "no Prisma" rule |
| DB access | Raw SQL or a lightweight query builder (e.g. `pg`/`mysql2` driver, or Knex) | Knex is a query builder, not an ORM-as-a-service — acceptable and still means *you* model the schema |
| Database | PostgreSQL (preferred) or MySQL, run locally via Docker Compose | Self-hosted, works fully offline, satisfies "own DB" requirement |
| Real-time | Socket.io (or native WebSocket) for presence dot + attendance updates | Employee-card status and check-in/out need to feel live without full page refresh |
| Auth | JWT (access + refresh token) + bcrypt password hashing | Standard, no external auth-as-a-service needed |
| File storage | Local disk (`multer` uploads folder) for logos/avatars/attachments | Keeps the app runnable with zero cloud dependency; swappable for S3-compatible storage later |
| Dev/infra | Docker Compose (db + api + web), `.env` per service | One command to stand the whole stack up locally for judges |

> Note: any of these can be swapped for team-familiar equivalents (e.g. Django/DRF + Postgres, or NestJS) — the constraint that matters is *self-hosted SQL DB + hand-modeled schema + no managed ORM/BaaS*, not the specific framework.

## 6. High-Level Architecture

```
[React SPA] <--HTTPS/REST--> [Express API] <--SQL--> [PostgreSQL/MySQL]
      |                            |
      '--------WebSocket-----------'
      (presence status, check-in/out, live leave-approval updates)

[Express API] --local disk--> [uploads/ (avatars, logos, leave attachments)]
```

Single-tenant-per-company data model with a `company_id` on every scoped table, so the schema is ready for multi-company even if the demo only shows one company.

## 7. Functional Requirements by Module

### 7.1 Authentication & Onboarding *(wireframe: Image 1)*

**Sign In page:** Login ID/Email + Password → "Sign In" button; link to Sign Up.

**Sign Up page:** Company Name (+ logo upload), Name, Email, Phone, Password, Confirm Password → "Sign Up" button; link to Sign In.

> **Assumption / reconciliation:** The original SRS text describes employees self-registering with an Employee ID + role. The wireframe's explicit note contradicts this: *normal users cannot self-register*. We're building to the wireframe note, and interpreting the Sign Up screen (with its "Company Name" + logo fields) as **company onboarding** — the first person to sign up creates the company and becomes its first Admin/HR. All subsequent employee accounts are created *by* Admin/HR from inside the app, not via public sign-up. Flag this to the team before building so everyone's aligned.

**Auto-generated Login ID**, format:
```
[First 2 letters of Company Name][First 2 letters of first+last name][Year of joining][Serial no. of joining that year]
Example: OIJODO20220001
```
- `OI` = Company Name initials, `JODO` = first two letters of first + last name, `2022` = year of joining, `0001` = serial number for that year (per-company, resets each calendar year).
- Password is system-generated on first creation; the user can log in and change it afterward (needs a `must_change_password` flag).

### 7.2 Navigation Shell / Landing Page *(wireframe: Image 2)*

Top nav (all authenticated pages): `Company Logo | Employees | Attendance | Time Off | [presence dot] | [avatar]`

- Post-login landing page = **Employees** grid: "NEW" button (Admin/HR only), search bar, employee cards in a responsive grid.
- Each card: profile photo, name, status indicator top-right —
  - 🟢 green dot = present in office
  - ✈️ airplane icon = on approved leave
  - 🟡 yellow dot = absent (no time-off applied, unaccounted)
- Clicking a card opens that employee's profile in **view-only** mode (no edit controls rendered, enforced server-side too).
- Avatar (top-right) opens a dropdown: **My Profile** (opens own profile in editable form view) and **Log Out**.
- The presence dot next to the avatar reflects *your own* check-in state: red = not checked in, green = checked in. A **Check In** button flips it to green and starts a "Since HH:MM" timer; a **Check Out** button ends it. This check-in/out action is what populates the Attendance module.
- "Settings" link (bottom-left, Admin view) — reserved for company-level settings; scope TBD, treat as a stub for MVP unless time allows.

### 7.3 Employee Profile *(wireframes: Images 2–4)*

Profile is tabbed. Tab set differs slightly by whose profile is open:

| Viewing... | Tabs shown |
|---|---|
| Admin/HR viewing **their own** "My Profile" | Resume, Private Info, Salary Info |
| Employee viewing **their own** "My Profile" | Resume, Private Info, Salary Info, **Security** |
| Anyone viewing **someone else's** profile (via card click, view-only) | Resume, Private Info — **Salary Info tab only rendered if viewer is Admin/HR** |

**Header block (all profiles):** editable avatar (pencil icon, own profile only), Name, Login ID (read-only), Email, Mobile, Job Position — plus Company/Department/Manager/Location on the right.

**Resume tab:** free-text "About", "What I love about my job", "My interests and hobbies" (each edit-in-place via pencil icon), plus **Skills** and **Certification** lists ("+ Add" affordance).

**Private Info tab:** Date of Birth, Residing Address, Nationality, Personal Email, Gender, Marital Status, Date of Joining — and **Bank Details**: Account Number, Bank Name, IFSC Code, PAN No, UAN No, Emp Code.

**Salary Info tab** *(detail in §7.6)*.

**Security tab** (employee-only, per Image 4): reserved for password change / 2FA settings — scope as time allows; at minimum ship a "change password" form here since first-login passwords are system-generated.

**Edit permissions:** Employees can edit only limited fields on their own profile (address, phone, profile picture, resume-style content). Admin can edit all fields on any employee.

### 7.4 Attendance *(wireframe: Image 5)*

- **Employee's own view:** defaults to current month, day-wise. Nav arrows + month selector; summary chips — days present, leaves count, total working days. Table: Date | Check In | Check Out | Work Hours | Extra Hours.
- **Admin/HR view:** defaults to current day across *all* employees, with a Date/Day toggle and search. Table: Employee | Check In | Check Out | Work Hours | Extra Hours.
- Work Hours/Extra Hours are derived (not entered): computed from check-in/out timestamps against the employee's configured working hours (from Salary Info → "No. of working days/week" + break time).
- **Attendance feeds payroll:** attendance records determine payable days; unpaid leave or unexplained absence automatically reduces payable days at payslip time (payslip generation itself is out of MVP scope, but the payable-days calculation should exist so it's ready).

### 7.5 Time Off / Leave *(wireframes: Images 6–7)*

**Employee view:**
- Balances shown per type: e.g. "Paid Time Off — 24 Days Available", "Sick time off — 07 Days Available".
- Full-year calendar (Jan–Dec) with a color legend: Validated / To Approve / Refused, plus a public-holiday list rendered alongside (holiday set should be configurable per company/locale — the wireframe example uses Indian holidays).
- "NEW" opens a **Time off Type Request** modal: Employee (auto-filled), Time off Type (dropdown — Paid Time Off / Sick Leave / Unpaid Leave), Validity Period (From–To), Allocation (auto-computed day count), Attachment upload (for sick-leave certificates) → Submit/Discard.
- Employees can view **only their own** time-off records.

**Admin/HR view:**
- "Time Off" and "Allocation" sub-tabs; "NEW", search bar.
- Table of **all employees'** requests: Name, Start Date, End Date, Time off Type, Status, and inline **Reject (red)** / **Approve (green)** actions.
- Admin/HR can view and approve/reject time off for every employee; approving/rejecting should update the employee's balance and calendar in real time.

### 7.6 Salary / Payroll *(wireframes: Images 3–4)*

Visible on the "Salary Info" profile tab, editable only by Admin/HR, read-only for the employee viewing their own data (per SRS §3.6.1).

- **Inputs:** Wage Type (Fixed wage for MVP), Month Wage, Yearly Wage, No. of working days/week, Break time.
- **Salary Components** (each with a computation type — Fixed Amount or % of Wage — and a description):
  | Component | Default computation |
  |---|---|
  | Basic Salary | 50% of wage |
  | House Rent Allowance | 50% of Basic |
  | Standard Allowance | 16.67% of wage |
  | Performance Bonus | 8.33% of wage |
  | Leave Travel Allowance | 8.33% of wage |
  | Fixed Allowance | remainder = wage − sum(other components) |
- **Auto-calculation rule:** component amounts recompute whenever the wage changes; the sum of all components must never exceed the defined wage (validate this on save).
  - Example: Wage = ₹50,000, Basic = 50% → ₹25,000; HRA = 50% of Basic → ₹12,500.
- **Provident Fund (PF):** Employee contribution % and Employer contribution % (both default 12%, both computed on Basic Salary).
- **Tax Deductions:** Professional Tax, a configurable fixed amount per month (default ₹200).

## 8. Data Model (proposed schema)

```
companies
  id, name, logo_url, created_at

users
  id, company_id, login_id (unique, system-generated), email (unique),
  phone, password_hash, role ENUM('admin','hr','employee'),
  must_change_password BOOLEAN, created_at

employees
  id, user_id, first_name, last_name, profile_picture_url,
  job_position, department, manager_id (FK -> employees.id, nullable),
  location, date_of_joining, employment_status

employee_private_info
  employee_id, date_of_birth, residing_address, nationality,
  personal_email, gender, marital_status,
  bank_account_number, bank_name, ifsc_code, pan_no, uan_no, emp_code

employee_resume
  employee_id, about, what_i_love, interests_hobbies

skills            (id, employee_id, name)
certifications    (id, employee_id, name)

salary_structures
  employee_id, wage_type, month_wage, yearly_wage,
  working_days_per_week, break_time_hours,
  pf_employee_rate, pf_employer_rate, professional_tax

salary_components
  id, employee_id, name ENUM('basic','hra','standard_allowance',
    'performance_bonus','lta','fixed_allowance'),
  computation_type ENUM('fixed','percentage'), value, computed_amount

attendance
  id, employee_id, date, check_in_time, check_out_time,
  work_hours, extra_hours, status ENUM('present','absent','half_day','leave')

leave_types
  id, company_id, name ENUM('paid','sick','unpaid'), default_allocation_days

leave_allocations
  id, employee_id, leave_type_id, year,
  allocated_days, used_days, remaining_days

leave_requests
  id, employee_id, leave_type_id, start_date, end_date, days_count,
  remarks, attachment_url, status ENUM('pending','approved','rejected'),
  approved_by (FK -> users.id, nullable), approved_at, comments

holidays
  id, company_id, name, date

refresh_tokens
  id, user_id, token_hash, expires_at
```

Every scoped table carries (directly or via `employees`) a `company_id`, so role checks and data isolation are enforceable at the query layer.

## 9. API Surface (indicative)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` (company+admin), `POST /auth/login`, `POST /auth/refresh`, `POST /auth/change-password` |
| Employees | `GET /employees`, `POST /employees` (Admin/HR only), `GET /employees/:id`, `PATCH /employees/:id`, `GET /employees/me` |
| Attendance | `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/me?month=`, `GET /attendance?date=` (Admin/HR) |
| Time off | `GET /leave-types`, `GET /leave/balances/me`, `POST /leave/requests`, `GET /leave/requests` (own or all, role-gated), `PATCH /leave/requests/:id/approve`, `PATCH /leave/requests/:id/reject` |
| Salary | `GET /employees/:id/salary` (role-gated read/write), `PUT /employees/:id/salary` (Admin/HR only) |
| Realtime | WebSocket channel(s): `presence`, `attendance`, `leave-updates` |

All write endpoints validate payloads server-side regardless of client-side validation; all read/write endpoints re-check role + company scope, not just the JWT's presence.

## 10. Real-Time & Offline Behavior

- **Real-time:** presence dots, check-in/out state, and leave-approval status should update live via WebSocket (or short-interval polling as a fallback) — this is what satisfies the "no static JSON / dynamic data" requirement, not just "data comes from a DB."
- **Offline/local-first for the demo:** the whole stack (web, api, db) should run from `docker compose up` with no required external service, so it can be demoed without internet. File uploads go to local disk, not a cloud bucket, for MVP.

## 11. Validation Rules (minimum set)

- Email: valid format, unique per system.
- Password: minimum length + mix of character classes; confirm-password match on sign up.
- Phone: numeric, length-checked per locale.
- Leave requests: `end_date >= start_date`; cannot exceed remaining balance; no overlapping requests for the same employee; attachment required for Sick leave.
- Salary components: sum of component amounts ≤ defined wage; percentages between 0–100.
- File uploads: type allow-list (png/jpg for images, pdf for attachments) and size limit.
- All required fields enforced both client-side (fast feedback) and server-side (source of truth).

## 12. UI/UX Guidelines

- **Color system:** one primary accent (the wireframes use a violet/purple, e.g. `#A855F7`, for primary buttons — Sign In, Sign Up, NEW); status colors: green `#22C55E` (present/approved), amber `#F59E0B` (absent/pending), red `#EF4444` (not checked in/reject), blue for icon accents (upload, edit).
- **Layout:** consistent top navbar (logo, Employees/Attendance/Time Off, presence dot, avatar) on every authenticated screen; card-based grids for lists; modal dialogs for create/request flows (matches the Time-Off request modal).
- **Responsiveness:** card grid should reflow (3→2→1 columns) at standard breakpoints; tables scroll horizontally on narrow viewports rather than breaking layout.
- **Navigation:** keep the three top-level modules (Employees, Attendance, Time Off) always visible and reachable in ≤1 click; avoid nested menus beyond the avatar dropdown.

## 13. Non-Functional Requirements

- **Security:** bcrypt-hashed passwords, short-lived JWT access tokens + refresh tokens, parameterized SQL everywhere (no string-concatenated queries), role checks on every protected route.
- **Performance:** paginate employee/attendance/leave lists server-side rather than loading everything client-side.
- **Accessibility:** sufficient color contrast for status dots (don't rely on color alone — pair with icon/label), keyboard-navigable forms.
- **Data integrity:** foreign keys + transactions for multi-row writes (e.g., approving leave updates both `leave_requests` and `leave_allocations` atomically).

## 14. Git & Team Workflow

- Shared repo from day one; **every team member commits under their own account** — a single person pushing everyone else's work doesn't satisfy the "proper version control" requirement.
- Branch per feature/module (`feature/attendance-checkin`, `feature/leave-approval`, etc.), PRs reviewed by at least one teammate before merging to `main`.
- `.gitignore` for `node_modules`, `.env`, uploaded files.
- Commit messages describe *what and why*, not "fix" / "update".

## 15. Suggested Build Plan (hackathon-scale phases)

| Phase | Scope |
|---|---|
| 0 — Setup | Repo + Docker Compose (db/api/web), schema migrations, base auth scaffold |
| 1 — Core | Company/Admin sign-up, employee creation (auto Login ID + password), role-gated login, Employees grid |
| 2 — Attendance | Check-in/out widget with live presence dot, attendance list views (self + Admin) |
| 3 — Time Off | Balances, request modal, calendar view, Admin approve/reject, real-time balance updates |
| 4 — Salary | Salary Info tab (Admin edit / Employee read-only), auto-computed components, PF & tax |
| 5 — Polish | Responsive pass, validation pass, empty/error states, demo data seed script, README |

## 16. Assumptions & Open Questions (confirm with team before building)

1. **Sign-up flow** — building to the wireframe (company onboarding + Admin/HR-created employee accounts), not the SRS text's "employee self-registers with role" — confirm this is the intended flow.
2. **Multi-company support** — schema is multi-tenant-ready; confirm whether the demo needs more than one company or if a single seeded company is enough.
3. **Holiday calendar** — wireframe shows India-specific holidays; treat as a per-company configurable list rather than hardcoded.
4. **Email verification** (mentioned in SRS 3.1.1) — no wireframe coverage; propose stubbing/skipping for MVP given time constraints, revisit if time allows.
5. **"Settings" nav item** (Image 2, bottom-left) — no spec detail; scope as a stretch item.
6. **Security tab** contents (Image 4, employee-only) — proposing "change password" as the MVP scope; open to expanding.

## 17. Future Enhancements (explicitly out of MVP scope)

From the source doc's "Future Enhancements" heading plus items implied by §3.6.2 of the SRS:
- Payslip generation (PDF) and salary-slip history
- Email & in-app notification alerts (leave approved/rejected, check-in reminders)
- Analytics & reports dashboard (attendance trends, leave utilization)
- Half-day attendance status handling
- Cloud file storage swap-in (S3-compatible) once offline constraint is no longer needed

---
*Once this is confirmed, next step is scaffolding the repo (Phase 0) against this schema and API surface.*
