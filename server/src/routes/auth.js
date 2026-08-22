import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query, pool } from '../db.js';
import { signAccessToken, requireAuth } from '../middleware/auth.js';
import { buildLoginId, companyInitials } from '../utils/loginId.js';

const router = Router();

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ALLOWED_LOGOS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve('src/uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = ALLOWED_LOGOS[file.mimetype] || path.extname(file.originalname);
    cb(null, `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadLogoMulter = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_LOGOS[file.mimetype]) {
      return cb(new Error('Only PNG, JPG, WEBP, or SVG images are allowed for company logo'));
    }
    cb(null, true);
  },
});

// POST /auth/upload-logo — upload company logo image before signup
router.post('/upload-logo', uploadLogoMulter.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No logo image provided' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
});

const signupSchema = z.object({
  companyName: z.string().min(2),
  logoUrl: z.string().optional().nullable(),
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// POST /auth/signup — creates a new company + its first Admin/HR user.
// Per the wireframe: employees do NOT self-register here; only the
// company's first admin does, then creates employee accounts afterward.
router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { companyName, logoUrl, name, email, phone, password } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const initials = companyInitials(companyName);
    const company = await client.query(
      `INSERT INTO companies (name, name_initials, logo_url) VALUES ($1, $2, $3) RETURNING id`,
      [companyName, initials, logoUrl || null]
    );
    const companyId = company.rows[0].id;

    const [firstName, ...rest] = name.trim().split(/\s+/);
    const lastName = rest.join(' ') || firstName;
    const joinYear = new Date().getFullYear();
    const loginId = buildLoginId({
      companyInitials: initials, firstName, lastName, joinYear, joinSerial: 1,
    });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await client.query(
      `INSERT INTO users (company_id, login_id, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id, login_id, role, company_id`,
      [companyId, loginId, email, phone || null, passwordHash]
    );

    const empRow = await client.query(
      `INSERT INTO employees (user_id, company_id, first_name, last_name, date_of_joining, join_serial, job_position)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 1, 'Admin') RETURNING id`,
      [user.rows[0].id, companyId, firstName, lastName]
    );

    // seed default leave types for the new company
    const leaveTypes = await client.query(
      `INSERT INTO leave_types (company_id, name, default_allocation_days) VALUES
        ($1, 'paid', 24), ($1, 'sick', 7), ($1, 'unpaid', 0)
       RETURNING id, default_allocation_days`,
      [companyId]
    );
    const currentYear = new Date().getFullYear();
    for (const lt of leaveTypes.rows) {
      await client.query(
        `INSERT INTO leave_allocations (employee_id, leave_type_id, year, allocated_days) VALUES ($1, $2, $3, $4)`,
        [empRow.rows[0].id, lt.id, currentYear, lt.default_allocation_days]
      );
    }

    await client.query('COMMIT');

    const token = signAccessToken(user.rows[0]);
    res.status(201).json({ token, loginId, role: 'admin' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  } finally {
    client.release();
  }
});

const loginSchema = z.object({
  loginId: z.string().min(1),
  password: z.string().min(1),
});

// POST /auth/login — accepts Login ID OR email in the same field, matching the Sign In wireframe.
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Login ID/Email and password are required' });
  }
  const { loginId, password } = parsed.data;

  const result = await query(
    'SELECT * FROM users WHERE login_id = $1 OR email = $1',
    [loginId]
  );
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signAccessToken(user);
  res.json({
    token,
    role: user.role,
    mustChangePassword: user.must_change_password,
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await query(
    `SELECT u.id, u.login_id, u.email, u.role, u.must_change_password,
            e.id AS employee_id, e.first_name, e.last_name, e.profile_picture_url,
            c.name AS company_name, c.logo_url AS company_logo_url, c.name_initials AS company_initials
     FROM users u
     JOIN employees e ON e.user_id = u.id
     JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.user.sub]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post('/change-password', requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { currentPassword, newPassword } = parsed.data;

  const result = await query('SELECT * FROM users WHERE id = $1', [req.user.sub]);
  const user = result.rows[0];
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(newPassword, 10);
  await query(
    'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
    [newHash, req.user.sub]
  );
  res.json({ ok: true });
});

export default router;
