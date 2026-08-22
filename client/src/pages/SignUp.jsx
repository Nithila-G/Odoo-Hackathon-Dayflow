import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  companyName: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdLoginId, setCreatedLoginId] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function validate() {
    if (form.companyName.trim().length < 2) return 'Company name is required.';
    if (form.name.trim().length < 2) return 'Your name is required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const data = await signup(form);
      setCreatedLoginId(data.loginId);
      setTimeout(() => navigate('/employees'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (createdLoginId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-sm text-slate-500 mb-1">Company created. Your Login ID is</p>
          <p className="text-2xl font-semibold text-brand-700 mb-4">{createdLoginId}</p>
          <p className="text-sm text-slate-500">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="mb-6 text-center">
          <div className="inline-block px-4 py-2 rounded-lg bg-slate-100 text-slate-500 text-sm font-medium">
            Dayflow
          </div>
          <p className="text-xs text-slate-400 mt-2">
            This creates your company and your Admin/HR account. Individual employee
            accounts are created afterward from inside the app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Company Name">
            <input value={form.companyName} onChange={update('companyName')} className={inputCls} />
          </Field>
          <Field label="Name">
            <input value={form.name} onChange={update('name')} className={inputCls} placeholder="First Last" />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={update('email')} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={update('phone')} className={inputCls} />
          </Field>
          <Field label="Password">
            <input type="password" value={form.password} onChange={update('password')} className={inputCls} />
          </Field>
          <Field label="Confirm Password">
            <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} className={inputCls} />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-medium rounded-lg py-2.5 text-sm transition-colors mt-2"
          >
            {submitting ? 'Creating…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/signin" className="text-brand-600 font-medium hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
