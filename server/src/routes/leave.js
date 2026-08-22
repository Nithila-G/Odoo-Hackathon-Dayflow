import { Router } from 'express';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function getEmployeeId(userId) {
  const r = await query('SELECT id FROM employees WHERE user_id = $1', [userId]);
  return r.rows[0]?.id;
}

router.get('/types', async (req, res) => {
  const result = await query('SELECT * FROM leave_types WHERE company_id = $1', [req.user.companyId]);
  res.json(result.rows);
});

// GET /leave/balances/me — "24 Days Available" / "07 Days Available" chips
router.get('/balances/me', async (req, res) => {
  const employeeId = await getEmployeeId(req.user.sub);
  const year = new Date().getFullYear();
  const result = await query(
    `SELECT lt.name, la.allocated_days, la.used_days,
            (la.allocated_days - la.used_days) AS remaining_days
     FROM leave_allocations la JOIN leave_types lt ON lt.id = la.leave_type_id
     WHERE la.employee_id = $1 AND la.year = $2`,
    [employeeId, year]
  );
  res.json(result.rows);
});

const requestSchema = z.object({
  leaveType: z.enum(['paid', 'sick', 'unpaid']),
  startDate: z.string(),
  endDate: z.string(),
  remarks: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

// POST /leave/requests — validated per PRD §11: end>=start, no overlap, within balance, attachment required for sick leave.
router.post('/requests', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { leaveType, startDate, endDate, remarks, attachmentUrl } = parsed.data;

  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'End date must be on or after start date' });
  }
  if (leaveType === 'sick' && !attachmentUrl) {
    return res.status(400).json({ error: 'Sick leave requires an attachment (certificate)' });
  }

  const employeeId = await getEmployeeId(req.user.sub);
  const daysCount = Math.floor((new Date(endDate) - new Date(startDate)) / 86400000) + 1;

  const typeRes = await query('SELECT id FROM leave_types WHERE company_id = $1 AND name = $2', [req.user.companyId, leaveType]);
  const leaveTypeId = typeRes.rows[0]?.id;
  if (!leaveTypeId) return res.status(400).json({ error: 'Unknown leave type for this company' });

  const overlap = await query(
    `SELECT id FROM leave_requests WHERE employee_id = $1 AND status IN ('pending','approved')
     AND daterange(start_date, end_date, '[]') && daterange($2::date, $3::date, '[]')`,
    [employeeId, startDate, endDate]
  );
  if (overlap.rows.length) {
    return res.status(409).json({ error: 'Overlaps an existing leave request' });
  }

  if (leaveType !== 'unpaid') {
    const year = new Date(startDate).getFullYear();
    const balance = await query(
      `SELECT allocated_days - used_days AS remaining FROM leave_allocations
       WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3`,
      [employeeId, leaveTypeId, year]
    );
    const remaining = Number(balance.rows[0]?.remaining ?? 0);
    if (daysCount > remaining) {
      return res.status(400).json({ error: `Only ${remaining} day(s) remaining for this leave type` });
    }
  }

  const result = await query(
    `INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_count, remarks, attachment_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [employeeId, leaveTypeId, startDate, endDate, daysCount, remarks || null, attachmentUrl || null]
  );
  res.status(201).json(result.rows[0]);
});

// GET /leave/requests — own requests for employees; all company requests for Admin/HR.
router.get('/requests', async (req, res) => {
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (isAdmin) {
    const result = await query(
      `SELECT lr.*, lt.name AS leave_type, e.first_name, e.last_name
       FROM leave_requests lr
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       JOIN employees e ON e.id = lr.employee_id
       WHERE e.company_id = $1 ORDER BY lr.created_at DESC`,
      [req.user.companyId]
    );
    return res.json(result.rows);
  }
  const employeeId = await getEmployeeId(req.user.sub);
  const result = await query(
    `SELECT lr.*, lt.name AS leave_type FROM leave_requests lr
     JOIN leave_types lt ON lt.id = lr.leave_type_id
     WHERE lr.employee_id = $1 ORDER BY lr.created_at DESC`,
    [employeeId]
  );
  res.json(result.rows);
});

async function decide(req, res, status) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reqRow = await client.query(
      `SELECT lr.*, e.company_id, lt.name AS leave_type FROM leave_requests lr
       JOIN employees e ON e.id = lr.employee_id
       JOIN leave_types lt ON lt.id = lr.leave_type_id
       WHERE lr.id = $1 FOR UPDATE`,
      [id]
    );
    if (!reqRow.rows.length || reqRow.rows[0].company_id !== req.user.companyId) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    const leave = reqRow.rows[0];
    if (leave.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Request already decided' });
    }

    await client.query(
      `UPDATE leave_requests SET status = $1, approved_by = $2, approved_at = now(), comments = $3 WHERE id = $4`,
      [status, req.user.sub, req.body.comments || null, id]
    );

    if (status === 'approved' && leave.leave_type !== 'unpaid') {
      const year = new Date(leave.start_date).getFullYear();
      await client.query(
        `UPDATE leave_allocations SET used_days = used_days + $1
         WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
        [leave.days_count, leave.employee_id, leave.leave_type_id, year]
      );
    }

    await client.query('COMMIT');
    req.app.get('io')?.emit('leave:update', { employeeId: leave.employee_id, status });
    res.json({ ok: true, status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not update request' });
  } finally {
    client.release();
  }
}

router.patch('/requests/:id/approve', requireRole('admin', 'hr'), (req, res) => decide(req, res, 'approved'));
router.patch('/requests/:id/reject', requireRole('admin', 'hr'), (req, res) => decide(req, res, 'rejected'));

export default router;
