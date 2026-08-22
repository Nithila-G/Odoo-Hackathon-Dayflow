import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

const LEAVE_LABELS = { paid: 'Paid Time Off', sick: 'Sick Time Off', unpaid: 'Unpaid Leave' };

export default function TimeOff() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminTimeOff /> : <MyTimeOff />;
}

function MyTimeOff() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [b, r] = await Promise.all([api.get('/leave/balances/me'), api.get('/leave/requests')]);
    setBalances(b.data);
    setRequests(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <button
          onClick={() => setShowNew(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors self-start"
        >
          + New Request
        </button>
        <div className="flex flex-wrap gap-3 sm:gap-4">
          {balances.map((b) => (
            <div key={b.name} className="text-xs sm:text-sm bg-white/90 border border-slate-200/80 p-2.5 rounded-xl shadow-2xs">
              <p className="text-brand-700 font-bold">{LEAVE_LABELS[b.name]}</p>
              <p className="text-slate-500 font-medium">{Number(b.remaining_days)} Days Available</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50/80 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Start Date</th>
                <th className="text-left px-4 py-3 font-semibold">End Date</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100/80">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{new Date(r.start_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-slate-600">{new Date(r.end_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-brand-600 font-semibold">{LEAVE_LABELS[r.leave_type]}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No time off requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewRequestModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewRequestModal({ onClose, onCreated }) {
  const [leaveType, setLeaveType] = useState('paid');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!startDate || !endDate) return setError('Select a validity period.');
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be on or after start date.');
    if (leaveType === 'sick' && !file) return setError('Sick leave requires an attachment (certificate).');

    setSubmitting(true);
    try {
      let attachmentUrl;
      if (file) {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/uploads-api', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        attachmentUrl = data.url;
      }
      await api.post('/leave/requests', { leaveType, startDate, endDate, remarks, attachmentUrl });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-30 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 text-base">Time Off Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <Field label="Time Off Type">
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className={inputCls}>
              <option value="paid">Paid Time Off</option>
              <option value="sick">Sick Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="To">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Remarks">
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputCls} placeholder="Optional notes" />
          </Field>
          {leaveType === 'sick' && (
            <Field label="Attachment (sick leave certificate)">
              <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-xs" />
            </Field>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm font-semibold px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100">
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2 rounded-xl shadow-xs"
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminTimeOff() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/leave/requests');
    setRequests(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(id, action) {
    setBusyId(id);
    try {
      await api.patch(`/leave/requests/${id}/${action}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Time Off — all employees</h2>
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50/80 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Start Date</th>
                <th className="text-left px-4 py-3 font-semibold">End Date</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading &&
                requests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100/80">
                    <td className="px-4 py-2.5 font-bold text-slate-800">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{new Date(r.start_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-slate-600">{new Date(r.end_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-2.5 text-brand-600 font-semibold">{LEAVE_LABELS[r.leave_type]}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                          <button
                            disabled={busyId === r.id}
                            onClick={() => decide(r.id, 'reject')}
                            className="w-7 h-7 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-xs"
                            title="Reject"
                          >
                            ✕
                          </button>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => decide(r.id, 'approve')}
                            className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs"
                            title="Approve"
                          >
                            ✓
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No time off requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-800 border border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    rejected: 'bg-red-100 text-red-800 border border-red-200',
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${styles[status]}`}>{status}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium';
