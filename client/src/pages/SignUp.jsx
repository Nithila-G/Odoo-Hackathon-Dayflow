import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import BackgroundVideo from '../components/BackgroundVideo';

const initialForm = {
  companyName: '',
  logoUrl: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdLoginId, setCreatedLoginId] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, SVG)');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    setError('');

    try {
      const { data } = await api.post('/auth/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((f) => ({ ...f, logoUrl: data.url }));
    } catch (err) {
      setError(err.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
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
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <BackgroundVideo overlayOpacity="bg-slate-950/50" />
        <div className="relative z-10 w-full max-w-sm bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl p-8 text-center">
          <p className="text-sm text-slate-500 mb-1">Company created. Your Login ID is</p>
          <p className="text-2xl font-bold text-brand-700 mb-4">{createdLoginId}</p>
          <p className="text-sm text-slate-500">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      {/* Background Video */}
      <BackgroundVideo overlayOpacity="bg-slate-950/45" />

      {/* Glassmorphism Sign Up Card */}
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl p-8 transition-all">
        <div className="mb-6 text-center">
          <div className="inline-block px-5 py-2 rounded-xl bg-brand-50/90 text-brand-700 text-sm font-bold tracking-wide shadow-xs border border-brand-100">
            Dayflow HRMS
          </div>
          <p className="text-xs text-slate-600 mt-2.5 font-medium leading-relaxed">
            Create your company & Admin account. Employee profiles are managed inside the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Company Name with Upload Logo Button */}
          <Field label="Company Name">
            <div className="flex items-center gap-2">
              <input
                value={form.companyName}
                onChange={update('companyName')}
                className={inputCls}
                placeholder="e.g. Odoo India"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                title="Upload Company Logo"
                className="shrink-0 relative group flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {uploadingLogo ? (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Company Logo"
                    className="w-full h-full object-cover rounded-xl border border-blue-400"
                  />
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                  </svg>
                )}
              </button>
            </div>
            {form.logoUrl && (
              <div className="flex items-center justify-between mt-1 text-xs text-emerald-600 font-semibold">
                <span>✓ Logo uploaded</span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                  className="text-slate-400 hover:text-red-500 underline text-[11px]"
                >
                  Remove
                </button>
              </div>
            )}
          </Field>

          <Field label="Name">
            <input value={form.name} onChange={update('name')} className={inputCls} placeholder="First Last" />
          </Field>

          <Field label="Email">
            <input type="email" value={form.email} onChange={update('email')} className={inputCls} placeholder="admin@company.com" />
          </Field>

          <Field label="Phone">
            <input value={form.phone} onChange={update('phone')} className={inputCls} placeholder="+91 9876543210" />
          </Field>

          {/* Password with Eye Visibility Toggle */}
          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                className={`${inputCls} pr-10`}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </Field>

          {/* Confirm Password with Eye Visibility Toggle */}
          <Field label="Confirm Password">
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                className={`${inputCls} pr-10`}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </Field>

          {error && <p className="text-sm text-red-600 bg-red-50/90 p-2.5 rounded-xl border border-red-200 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm transition-all shadow-md mt-2"
          >
            {submitting ? 'Creating…' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 font-medium mt-5">
          Already have an account?{' '}
          <Link to="/signin" className="text-brand-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300/80 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/90 transition-all shadow-2xs';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
