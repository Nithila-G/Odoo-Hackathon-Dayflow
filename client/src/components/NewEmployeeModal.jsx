import { useState } from 'react';
import { api } from '../api/client';

const initial = { firstName: '', lastName: '', email: '', phone: '', department: '', jobPosition: '', role: 'employee' };

export default function NewEmployeeModal({ onClose, onCreated }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function validate() {
    if (!form.firstName.trim() || !form.lastName.trim()) return 'First and last name are required.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Enter a valid email.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/employees', form);
      setCreated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {created ? (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-2">Employee created. Share these first-login credentials:</p>
            <p className="font-mono text-lg text-brand-700">{created.loginId}</p>
            <p className="font-mono text-sm text-slate-600 mt-1">{created.tempPassword}</p>
            <button
              onClick={onCreated}
              className="mt-5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="font-semibold text-slate-800 mb-4">New Employee</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="First name" value={form.firstName} onChange={update('firstName')} className={inputCls} />
                <input placeholder="Last name" value={form.lastName} onChange={update('lastName')} className={inputCls} />
              </div>
              <input placeholder="Email" type="email" value={form.email} onChange={update('email')} className={inputCls} />
              <input placeholder="Phone" value={form.phone} onChange={update('phone')} className={inputCls} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Department" value={form.department} onChange={update('department')} className={inputCls} />
                <input placeholder="Job position" value={form.jobPosition} onChange={update('jobPosition')} className={inputCls} />
              </div>
              <select value={form.role} onChange={update('role')} className={inputCls}>
                <option value="employee">Employee</option>
                <option value="hr">HR Officer</option>
              </select>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
