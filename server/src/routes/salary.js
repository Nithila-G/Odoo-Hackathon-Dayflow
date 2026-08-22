import { Router } from 'express';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /employees/:id/salary — employee sees their own (read-only); Admin/HR can view anyone's.
router.get('/:id/salary', async (req, res) => {
  const { id } = req.params;
  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) {
    return res.status(403).json({ error: 'Salary info is not visible for this profile' });
  }

  const structure = await query('SELECT * FROM salary_structures WHERE employee_id = $1', [id]);
  const components = await query('SELECT * FROM salary_components WHERE employee_id = $1 ORDER BY name', [id]);
  res.json({
    structure: structure.rows[0] || null,
    components: components.rows,
    editable: isAdmin,
  });
});

const updateSchema = z.object({
  monthWage: z.number().positive(),
  workingDaysPerWeek: z.number().int().min(1).max(7).optional(),
  breakTimeHours: z.number().min(0).max(8).optional(),
  pfEmployeeRate: z.number().min(0).max(100).optional(),
  pfEmployerRate: z.number().min(0).max(100).optional(),
  professionalTax: z.number().min(0).optional(),
  components: z.array(z.object({
    name: z.enum(['basic', 'hra', 'standard_allowance', 'performance_bonus', 'lta', 'fixed_allowance']),
    computationType: z.enum(['fixed', 'percentage']),
    value: z.number().min(0),
  })).min(1),
});

// PUT /employees/:id/salary — Admin/HR only. Recomputes every component amount server-side
// and enforces "components must not exceed the defined wage" from the PRD.
router.put('/:id/salary', requireRole('admin', 'hr'), async (req, res) => {
  const { id } = req.params;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;

  const basic = d.components.find((c) => c.name === 'basic');
  const basicAmount = basic ? (basic.computationType === 'percentage' ? (d.monthWage * basic.value) / 100 : basic.value) : 0;

  let runningTotal = 0;
  const computed = d.components.map((c) => {
    let amount;
    if (c.name === 'basic') {
      amount = basicAmount;
    } else if (c.name === 'fixed_allowance') {
      amount = null; // remainder, filled in below
    } else if (c.computationType === 'percentage') {
      // HRA, Standard Allowance, Performance Bonus, LTA are all defined as a % of Basic Salary
      amount = (basicAmount * c.value) / 100;
    } else {
      amount = c.value;
    }
    if (amount !== null) runningTotal += amount;
    return { ...c, amount };
  });

  if (runningTotal > d.monthWage) {
    return res.status(400).json({ error: 'Salary components exceed the defined wage' });
  }
  const finalComponents = computed.map((c) =>
    c.amount === null ? { ...c, amount: d.monthWage - runningTotal } : c
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO salary_structures (employee_id, month_wage, yearly_wage, working_days_per_week, break_time_hours, pf_employee_rate, pf_employer_rate, professional_tax)
       VALUES ($1, $2::numeric, $8::numeric, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id) DO UPDATE SET
         month_wage = $2::numeric, yearly_wage = $8::numeric,
         working_days_per_week = COALESCE($3, salary_structures.working_days_per_week),
         break_time_hours = COALESCE($4, salary_structures.break_time_hours),
         pf_employee_rate = COALESCE($5, salary_structures.pf_employee_rate),
         pf_employer_rate = COALESCE($6, salary_structures.pf_employer_rate),
         professional_tax = COALESCE($7, salary_structures.professional_tax)`,
      [id, d.monthWage, d.workingDaysPerWeek, d.breakTimeHours, d.pfEmployeeRate, d.pfEmployerRate, d.professionalTax, d.monthWage * 12]
    );

    for (const c of finalComponents) {
      await client.query(
        `INSERT INTO salary_components (employee_id, name, computation_type, value, computed_amount)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (employee_id, name) DO UPDATE SET
           computation_type = $3, value = $4, computed_amount = $5`,
        [id, c.name, c.computationType, c.value, c.amount]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true, components: finalComponents });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not update salary' });
  } finally {
    client.release();
  }
});

export default router;
