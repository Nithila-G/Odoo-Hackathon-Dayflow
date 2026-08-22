# Dayflow — HRMS

Every workday, perfectly aligned.

Full-stack HRMS built for the Odoo Hackathon: React + Tailwind frontend, Express +
PostgreSQL backend (self-hosted, no MongoDB/Prisma/BaaS), real-time presence via
Socket.io, local-disk file storage. See [`docs/PRD.md`](./docs/PRD.md) for the full
spec this was built against.

## Project structure

```
dayflow/
  server/     Express API + Postgres schema/migrations
  client/     React (Vite) + Tailwind frontend
  docs/       PRD and requirements
  docker-compose.yml   spins up just Postgres
```

## Prerequisites

- Node.js 20+
- Docker (for Postgres) — or a local Postgres 16 instance if you'd rather not use Docker

## 1. Start the database

```bash
docker compose up -d
```

This starts Postgres on `localhost:5432` and automatically applies
`server/migrations/001_init.sql` on first boot (via Postgres's `docker-entrypoint-initdb.d`).

If you're not using Docker, create a `dayflow` database yourself and run:
```bash
psql -U postgres -d dayflow -f server/migrations/001_init.sql
```

## 2. Start the backend

```bash
cd server
cp .env.example .env   # defaults already point at the Docker Postgres above
npm install
npm run dev
```

API runs on `http://localhost:4000`. Health check: `GET /health`.

## 3. Start the frontend

```bash
cd client
npm install
npm run dev
```

App runs on `http://localhost:5173` and proxies `/api`, `/uploads`, and `/socket.io`
to the backend — no CORS config needed in dev.

## 4. Try it out

1. Go to `http://localhost:5173/signup` and create your company + admin account.
   Note the auto-generated Login ID shown after signup.
2. From the Employees page, click **+ New** to create an employee — their Login ID
   and a temporary password are generated automatically (shown once in the modal).
3. Log out and log back in as that employee to see the Employee view (no Salary Info
   edit access, no visibility into anyone else's salary).

## Environment variables (`server/.env`)

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/dayflow` |
| `JWT_SECRET` | Signs access tokens — change this for anything beyond local dev | — |
| `PORT` | API port | `4000` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |

## What's implemented

- Company sign-up + auto-generated employee Login IDs (`OIJODO20260001` format)
- Role-based access (Admin/HR vs Employee), enforced server-side on every route
- Employee directory with live presence dots (Socket.io)
- Check-in/check-out with computed work hours
- Attendance history (self) and all-employees day view (Admin/HR)
- Time-off requests with validation (balance checks, overlap checks, sick-leave
  attachment requirement) and an Admin/HR approve/reject workflow
- Salary Info tab: auto-computed components (Basic → HRA/Standard Allowance/
  Performance Bonus/LTA as % of Basic, Fixed Allowance as remainder), read-only
  for employees, editable by Admin/HR only
- Resume tab (About/skills/certifications) and Private Info tab (bank details, etc.)

## Not yet implemented (see `docs/PRD.md` §17)

Payslip PDF generation, email/notification alerts, analytics dashboard, and the
public-holiday calendar are out of scope for this pass — flagged as future work
in the PRD.
