-- Dayflow HRMS — initial schema
-- Run with: psql -U postgres -d dayflow -f migrations/001_init.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_initials TEXT NOT NULL, -- e.g. 'OI' for Odoo India, used in login id generation
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE user_role AS ENUM ('admin', 'hr', 'employee');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  login_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  profile_picture_url TEXT,
  job_position TEXT,
  department TEXT,
  manager_id UUID REFERENCES employees(id),
  location TEXT,
  date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
  join_serial INT NOT NULL, -- serial number of joining within the join year, per company
  employment_status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE employee_private_info (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  date_of_birth DATE,
  residing_address TEXT,
  nationality TEXT,
  personal_email TEXT,
  gender TEXT,
  marital_status TEXT,
  bank_account_number TEXT,
  bank_name TEXT,
  ifsc_code TEXT,
  pan_no TEXT,
  uan_no TEXT,
  emp_code TEXT
);

CREATE TABLE employee_resume (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  about TEXT,
  what_i_love TEXT,
  interests_hobbies TEXT
);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE salary_structures (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  wage_type TEXT NOT NULL DEFAULT 'fixed',
  month_wage NUMERIC(12,2) NOT NULL DEFAULT 0,
  yearly_wage NUMERIC(12,2) NOT NULL DEFAULT 0,
  working_days_per_week INT NOT NULL DEFAULT 5,
  break_time_hours NUMERIC(4,2) NOT NULL DEFAULT 1,
  pf_employee_rate NUMERIC(5,2) NOT NULL DEFAULT 12,
  pf_employer_rate NUMERIC(5,2) NOT NULL DEFAULT 12,
  professional_tax NUMERIC(10,2) NOT NULL DEFAULT 200
);

CREATE TYPE component_name AS ENUM
  ('basic', 'hra', 'standard_allowance', 'performance_bonus', 'lta', 'fixed_allowance');
CREATE TYPE computation_type AS ENUM ('fixed', 'percentage');

CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name component_name NOT NULL,
  computation_type computation_type NOT NULL DEFAULT 'percentage',
  value NUMERIC(10,4) NOT NULL, -- percentage (0-100) or fixed amount depending on computation_type
  computed_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(employee_id, name)
);

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'leave');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  work_hours NUMERIC(5,2),
  extra_hours NUMERIC(5,2),
  status attendance_status NOT NULL DEFAULT 'absent',
  UNIQUE(employee_id, date)
);

CREATE TYPE leave_type_name AS ENUM ('paid', 'sick', 'unpaid');

CREATE TABLE leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name leave_type_name NOT NULL,
  default_allocation_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(company_id, name)
);

CREATE TABLE leave_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INT NOT NULL,
  allocated_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(5,2) NOT NULL,
  remarks TEXT,
  attachment_url TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
