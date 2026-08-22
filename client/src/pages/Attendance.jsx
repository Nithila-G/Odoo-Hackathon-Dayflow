import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function Attendance() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminAttendance /> : <MyAttendance />;
}

function MyAttendance() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/attendance/me', { params: { month } }).then(({ data }) => {
      setRecords(data.records);
      setSummary(data.summary);
    });
  }, [month]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-2 text-sm">
          <Chip label="Days present" value={summary?.days_present ?? '—'} />
          <Chip label="Leaves" value={summary?.leaves_count ?? '—'} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Date</th>
              <th className="text-left px-4 py-2 font-medium">Check In</th>
              <th className="text-left px-4 py-2 font-medium">Check Out</th>
              <th className="text-left px-4 py-2 font-medium">Work Hours</th>
              <th className="text-left px-4 py-2 font-medium">Extra Hours</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-2">{fmtTime(r.check_in_time)}</td>
                <td className="px-4 py-2">{fmtTime(r.check_out_time)}</td>
                <td className="px-4 py-2">{r.work_hours ? Number(r.work_hours).toFixed(2) : '—'}</td>
                <td className="px-4 py-2">{r.extra_hours ? Number(r.extra_hours).toFixed(2) : '—'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No attendance records for this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get('/attendance', { params: { date } }).then(({ data }) => setRecords(data));
  }, [date]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-slate-400">Attendance — all employees</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Employee</th>
              <th className="text-left px-4 py-2 font-medium">Check In</th>
              <th className="text-left px-4 py-2 font-medium">Check Out</th>
              <th className="text-left px-4 py-2 font-medium">Work Hours</th>
              <th className="text-left px-4 py-2 font-medium">Extra Hours</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  {r.first_name} {r.last_name}
                </td>
                <td className="px-4 py-2">{fmtTime(r.check_in_time)}</td>
                <td className="px-4 py-2">{fmtTime(r.check_out_time)}</td>
                <td className="px-4 py-2">{r.work_hours ? Number(r.work_hours).toFixed(2) : '—'}</td>
                <td className="px-4 py-2">{r.extra_hours ? Number(r.extra_hours).toFixed(2) : '—'}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No one has checked in on this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full">
      {label}: <strong className="text-slate-800">{value}</strong>
    </span>
  );
}
