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
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowNew(true)}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + New
        </button>
        <div className="flex gap-4">
          {balances.map((b) => (
            <div key={b.name} className="text-sm text-right">
              <p className="text-brand-600 font-medium">{LEAVE_LABELS[b.name]}</p>
              <p className="text-slate-400 text-xs">{Number(b.remaining_days)} Days Available</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Start Date</th>
              <th className="text-left px-4 py-2 font-medium">End Date</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{new Date(r.start_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-2">{new Date(r.end_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-2 text-brand-600">{LEAVE_LABELS[r.leave_type]}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No time off requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Time off Type Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Time off Type">
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
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputCls} />
          </Field>
          {leaveType === 'sick' && (
            <Field label="Attachment (sick leave certificate)">
              <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setFile(e.target.files[0])} className="text-sm" />
            </Field>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-100">
              Discard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
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
      <h2 className="text-sm text-slate-400 mb-4">Time Off — all employees</h2>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Start Date</th>
              <th className="text-left px-4 py-2 font-medium">End Date</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              requests.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2">{new Date(r.start_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-2">{new Date(r.end_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-2 text-brand-600">{LEAVE_LABELS[r.leave_type]}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    {r.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'reject')}
                          className="w-7 h-7 rounded-md bg-status-reject/90 hover:bg-status-reject text-white text-xs"
                          title="Reject"
                        >
                          ✕
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, 'approve')}
                          className="w-7 h-7 rounded-md bg-status-present/90 hover:bg-status-present text-white text-xs"
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
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No time off requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status]}`}>{status}</span>;
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
