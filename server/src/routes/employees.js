import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildLoginId, generateTempPassword } from '../utils/loginId.js';

const router = Router();
router.use(requireAuth);

const DEFAULT_COMPONENTS = [
  { name: 'basic', computation_type: 'percentage', value: 50 },
  { name: 'hra', computation_type: 'percentage', value: 50 }, // % of basic
  { name: 'standard_allowance', computation_type: 'percentage', value: 16.67 }, // % of basic
  { name: 'performance_bonus', computation_type: 'percentage', value: 8.33 }, // % of basic
  { name: 'lta', computation_type: 'percentage', value: 8.33 }, // % of basic
  { name: 'fixed_allowance', computation_type: 'percentage', value: 0 }, // remainder, computed
];

// NOTE: actual salary component computation happens in routes/salary.js (PUT /employees/:id/salary),
// which is the single source of truth for the wage → component amount math.

// GET /employees — directory grid (Image 2). Includes today's attendance status for the presence dots.
router.get('/', async (req, res) => {
  const { search } = req.query;
  const params = [req.user.companyId];
  let filter = '';
  if (search) {
    params.push(`%${search}%`);
    filter = `AND (e.first_name ILIKE $2 OR e.last_name ILIKE $2)`;
  }
  const result = await query(
    `SELECT e.id, e.first_name, e.last_name, e.profile_picture_url, e.job_position,
            a.status AS today_status, a.check_in_time, a.check_out_time
     FROM employees e
     LEFT JOIN attendance a ON a.employee_id = e.id AND a.date = CURRENT_DATE
     WHERE e.company_id = $1 ${filter}
     ORDER BY e.first_name`,
    params
  );
  res.json(result.rows);
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  department: z.string().optional(),
  jobPosition: z.string().optional(),
  role: z.enum(['employee', 'hr']).default('employee'),
});

// POST /employees — Admin/HR creates a new employee; login ID + temp password are auto-generated.
router.post('/', requireRole('admin', 'hr'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { firstName, lastName, email, phone, department, jobPosition, role } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const companyRes = await client.query('SELECT name_initials FROM companies WHERE id = $1', [req.user.companyId]);
    const initials = companyRes.rows[0].name_initials;
    const joinYear = new Date().getFullYear();

    const serialRes = await client.query(
      `SELECT COALESCE(MAX(join_serial), 0) + 1 AS next_serial
       FROM employees WHERE company_id = $1 AND EXTRACT(YEAR FROM date_of_joining) = $2`,
      [req.user.companyId, joinYear]
    );
    const joinSerial = serialRes.rows[0].next_serial;
    const loginId = buildLoginId({ companyInitials: initials, firstName, lastName, joinYear, joinSerial });
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const userRes = await client.query(
      `INSERT INTO users (company_id, login_id, email, phone, password_hash, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [req.user.companyId, loginId, email, phone || null, passwordHash, role]
    );

    const empRes = await client.query(
      `INSERT INTO employees (user_id, company_id, first_name, last_name, department, job_position, date_of_joining, join_serial)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7) RETURNING id`,
      [userRes.rows[0].id, req.user.companyId, firstName, lastName, department || null, jobPosition || null, joinSerial]
    );
    const employeeId = empRes.rows[0].id;

    await client.query(
      `INSERT INTO salary_structures (employee_id) VALUES ($1)`,
      [employeeId]
    );
    for (const c of DEFAULT_COMPONENTS) {
      await client.query(
        `INSERT INTO salary_components (employee_id, name, computation_type, value) VALUES ($1, $2, $3, $4)`,
        [employeeId, c.name, c.computation_type, c.value]
      );
    }

    const currentYear = new Date().getFullYear();
    const leaveTypes = await client.query('SELECT id, name, default_allocation_days FROM leave_types WHERE company_id = $1', [req.user.companyId]);
    for (const lt of leaveTypes.rows) {
      await client.query(
        `INSERT INTO leave_allocations (employee_id, leave_type_id, year, allocated_days) VALUES ($1, $2, $3, $4)`,
        [employeeId, lt.id, currentYear, lt.default_allocation_days]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ employeeId, loginId, tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not create employee' });
  } finally {
    client.release();
  }
});

// GET /employees/:id — profile. View-only for anyone but self/admin; salary tab gated server-side too.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const empRes = await query(
    `SELECT e.*, u.login_id, u.email, u.role, c.name AS company_name
     FROM employees e JOIN users u ON u.id = e.user_id
     JOIN companies c ON c.id = e.company_id
     WHERE e.id = $1 AND e.company_id = $2`,
    [id, req.user.companyId]
  );
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });
  const employee = empRes.rows[0];

  const isSelf = employee.user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  const editable = isSelf || isAdmin;

  const [privateInfo, resume, skills, certs] = await Promise.all([
    query('SELECT * FROM employee_private_info WHERE employee_id = $1', [id]),
    query('SELECT * FROM employee_resume WHERE employee_id = $1', [id]),
    query('SELECT id, name FROM skills WHERE employee_id = $1', [id]),
    query('SELECT id, name FROM certifications WHERE employee_id = $1', [id]),
  ]);

  const payload = {
    ...employee,
    editable,
    resume: resume.rows[0] || null,
    skills: skills.rows,
    certifications: certs.rows,
  };

  // Private info only visible to self or admin/hr, matching the "view-only, no salary tab" rule for co-workers
  if (editable) {
    payload.privateInfo = privateInfo.rows[0] || null;
  }

  res.json(payload);
});

const updateSchema = z.object({
  phone: z.string().optional(),
  residingAddress: z.string().optional(),
  personalEmail: z.string().email().optional(),
  profilePictureUrl: z.string().optional(),
  about: z.string().optional(),
  whatILove: z.string().optional(),
  interestsHobbies: z.string().optional(),
  // admin-only fields
  department: z.string().optional(),
  jobPosition: z.string().optional(),
  location: z.string().optional(),
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Not allowed to edit this profile' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;

  if (isAdmin) {
    await query(
      `UPDATE employees SET department = COALESCE($1, department), job_position = COALESCE($2, job_position),
       location = COALESCE($3, location), profile_picture_url = COALESCE($4, profile_picture_url) WHERE id = $5`,
      [d.department, d.jobPosition, d.location, d.profilePictureUrl, id]
    );
  } else if (d.profilePictureUrl) {
    await query('UPDATE employees SET profile_picture_url = $1 WHERE id = $2', [d.profilePictureUrl, id]);
  }

  await query(
    `INSERT INTO employee_private_info (employee_id, residing_address, personal_email)
     VALUES ($1, $2, $3)
     ON CONFLICT (employee_id) DO UPDATE SET
       residing_address = COALESCE($2, employee_private_info.residing_address),
       personal_email = COALESCE($3, employee_private_info.personal_email)`,
    [id, d.residingAddress || null, d.personalEmail || null]
  );

  if (d.phone) {
    await query('UPDATE users SET phone = $1 WHERE id = $2', [d.phone, empRes.rows[0].user_id]);
  }

  if (d.about || d.whatILove || d.interestsHobbies) {
    await query(
      `INSERT INTO employee_resume (employee_id, about, what_i_love, interests_hobbies)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id) DO UPDATE SET
         about = COALESCE($2, employee_resume.about),
         what_i_love = COALESCE($3, employee_resume.what_i_love),
         interests_hobbies = COALESCE($4, employee_resume.interests_hobbies)`,
      [id, d.about || null, d.whatILove || null, d.interestsHobbies || null]
    );
  }

  res.json({ ok: true });
});

export default router;
