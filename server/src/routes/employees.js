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
    `SELECT e.id, e.first_name, e.last_name, e.profile_picture_url, e.job_position, e.department, e.location,
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

// POST /employees — Creates a new employee; login ID + temp password are auto-generated.
router.post('/', async (req, res) => {
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
  phone: z.string().optional().nullable(),
  residingAddress: z.string().optional().nullable(),
  personalEmail: z.string().optional().nullable(),
  profilePictureUrl: z.string().optional().nullable(),
  about: z.string().optional().nullable(),
  whatILove: z.string().optional().nullable(),
  interestsHobbies: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  panNo: z.string().optional().nullable(),
  uanNo: z.string().optional().nullable(),
  empCode: z.string().optional().nullable(),
  // admin-only fields
  department: z.string().optional().nullable(),
  jobPosition: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
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
  } else if (d.profilePictureUrl !== undefined) {
    await query('UPDATE employees SET profile_picture_url = $1 WHERE id = $2', [d.profilePictureUrl, id]);
  }

  if (d.phone !== undefined) {
    await query('UPDATE users SET phone = $1 WHERE id = $2', [d.phone, empRes.rows[0].user_id]);
  }

  // Update employee_private_info
  await query(
    `INSERT INTO employee_private_info (
       employee_id, date_of_birth, residing_address, nationality, personal_email,
       gender, marital_status, bank_account_number, bank_name, ifsc_code, pan_no, uan_no, emp_code
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (employee_id) DO UPDATE SET
       date_of_birth = COALESCE(EXCLUDED.date_of_birth, employee_private_info.date_of_birth),
       residing_address = COALESCE(EXCLUDED.residing_address, employee_private_info.residing_address),
       nationality = COALESCE(EXCLUDED.nationality, employee_private_info.nationality),
       personal_email = COALESCE(EXCLUDED.personal_email, employee_private_info.personal_email),
       gender = COALESCE(EXCLUDED.gender, employee_private_info.gender),
       marital_status = COALESCE(EXCLUDED.marital_status, employee_private_info.marital_status),
       bank_account_number = COALESCE(EXCLUDED.bank_account_number, employee_private_info.bank_account_number),
       bank_name = COALESCE(EXCLUDED.bank_name, employee_private_info.bank_name),
       ifsc_code = COALESCE(EXCLUDED.ifsc_code, employee_private_info.ifsc_code),
       pan_no = COALESCE(EXCLUDED.pan_no, employee_private_info.pan_no),
       uan_no = COALESCE(EXCLUDED.uan_no, employee_private_info.uan_no),
       emp_code = COALESCE(EXCLUDED.emp_code, employee_private_info.emp_code)`,
    [
      id,
      d.dateOfBirth || null,
      d.residingAddress || null,
      d.nationality || null,
      d.personalEmail || null,
      d.gender || null,
      d.maritalStatus || null,
      d.bankAccountNumber || null,
      d.bankName || null,
      d.ifscCode || null,
      d.panNo || null,
      d.uanNo || null,
      d.empCode || null,
    ]
  );

  // Update employee_resume
  await query(
    `INSERT INTO employee_resume (employee_id, about, what_i_love, interests_hobbies)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (employee_id) DO UPDATE SET
       about = COALESCE(EXCLUDED.about, employee_resume.about),
       what_i_love = COALESCE(EXCLUDED.what_i_love, employee_resume.what_i_love),
       interests_hobbies = COALESCE(EXCLUDED.interests_hobbies, employee_resume.interests_hobbies)`,
    [id, d.about || null, d.whatILove || null, d.interestsHobbies || null]
  );

  res.json({ ok: true });
});

// POST /employees/:id/skills
router.post('/:id/skills', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Skill name is required' });

  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

  const result = await query(
    'INSERT INTO skills (employee_id, name) VALUES ($1, $2) RETURNING id, name',
    [id, name.trim()]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /employees/:id/skills/:skillId
router.delete('/:id/skills/:skillId', async (req, res) => {
  const { id, skillId } = req.params;
  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

  await query('DELETE FROM skills WHERE id = $1 AND employee_id = $2', [skillId, id]);
  res.json({ ok: true });
});

// POST /employees/:id/certifications
router.post('/:id/certifications', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Certification name is required' });

  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

  const result = await query(
    'INSERT INTO certifications (employee_id, name) VALUES ($1, $2) RETURNING id, name',
    [id, name.trim()]
  );
  res.status(201).json(result.rows[0]);
});

// DELETE /employees/:id/certifications/:certId
router.delete('/:id/certifications/:certId', async (req, res) => {
  const { id, certId } = req.params;
  const empRes = await query('SELECT user_id FROM employees WHERE id = $1 AND company_id = $2', [id, req.user.companyId]);
  if (!empRes.rows.length) return res.status(404).json({ error: 'Not found' });

  const isSelf = empRes.rows[0].user_id === req.user.sub;
  const isAdmin = ['admin', 'hr'].includes(req.user.role);
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Not allowed' });

  await query('DELETE FROM certifications WHERE id = $1 AND employee_id = $2', [certId, id]);
  res.json({ ok: true });
});

export default router;
