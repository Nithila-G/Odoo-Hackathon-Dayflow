import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function getEmployeeId(userId) {
  const r = await query('SELECT id FROM employees WHERE user_id = $1', [userId]);
  return r.rows[0]?.id;
}

// POST /attendance/check-in — creates/updates today's attendance row, broadcast on socket by caller.
router.post('/check-in', async (req, res) => {
  const employeeId = await getEmployeeId(req.user.sub);
  const existing = await query(
    'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE',
    [employeeId]
  );
  if (existing.rows.length && existing.rows[0].check_in_time && !existing.rows[0].check_out_time) {
    return res.status(409).json({ error: 'Already checked in' });
  }
  const result = await query(
    `INSERT INTO attendance (employee_id, date, check_in_time, status)
     VALUES ($1, CURRENT_DATE, now(), 'present')
     ON CONFLICT (employee_id, date) DO UPDATE SET check_in_time = now(), check_out_time = NULL, status = 'present'
     RETURNING *`,
    [employeeId]
  );
  req.app.get('io')?.emit('presence:update', { employeeId, status: 'present' });
  res.json(result.rows[0]);
});

// POST /attendance/check-out — closes today's session and computes work hours.
router.post('/check-out', async (req, res) => {
  const employeeId = await getEmployeeId(req.user.sub);
  const existing = await query(
    'SELECT * FROM attendance WHERE employee_id = $1 AND date = CURRENT_DATE',
    [employeeId]
  );
  if (!existing.rows.length || !existing.rows[0].check_in_time) {
    return res.status(409).json({ error: 'Not checked in yet' });
  }

  const salary = await query('SELECT working_days_per_week, break_time_hours FROM salary_structures WHERE employee_id = $1', [employeeId]);
  const breakHours = Number(salary.rows[0]?.break_time_hours || 0);

  const result = await query(
    `UPDATE attendance SET check_out_time = now(),
       work_hours = GREATEST(EXTRACT(EPOCH FROM (now() - check_in_time)) / 3600.0 - $2, 0),
       extra_hours = GREATEST(EXTRACT(EPOCH FROM (now() - check_in_time)) / 3600.0 - $2 - 8, 0)
     WHERE employee_id = $1 AND date = CURRENT_DATE RETURNING *`,
    [employeeId, breakHours]
  );
  req.app.get('io')?.emit('presence:update', { employeeId, status: 'checked_out' });
  res.json(result.rows[0]);
});

// GET /attendance/me?month=2026-08 — day-wise history for the logged-in employee.
router.get('/me', async (req, res) => {
  const employeeId = await getEmployeeId(req.user.sub);
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const result = await query(
    `SELECT * FROM attendance WHERE employee_id = $1
     AND to_char(date, 'YYYY-MM') = $2 ORDER BY date DESC`,
    [employeeId, month]
  );
  const summary = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'present') AS days_present,
       COUNT(*) FILTER (WHERE status = 'leave') AS leaves_count
     FROM attendance WHERE employee_id = $1 AND to_char(date, 'YYYY-MM') = $2`,
    [employeeId, month]
  );
  res.json({ records: result.rows, summary: summary.rows[0] });
});

// GET /attendance?date=2026-08-22 — all employees for a given day (Admin/HR).
router.get('/', requireRole('admin', 'hr'), async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const result = await query(
    `SELECT a.*, e.first_name, e.last_name
     FROM attendance a JOIN employees e ON e.id = a.employee_id
     WHERE e.company_id = $1 AND a.date = $2
     ORDER BY e.first_name`,
    [req.user.companyId, date]
  );
  res.json(result.rows);
});

export default router;
