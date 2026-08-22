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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white/90 font-medium"
        />
        <div className="flex gap-2 text-xs sm:text-sm">
          <Chip label="Days present" value={summary?.days_present ?? '—'} />
          <Chip label="Leaves" value={summary?.leaves_count ?? '—'} />
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-slate-50/80 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Check In</th>
                <th className="text-left px-4 py-3 font-semibold">Check Out</th>
                <th className="text-left px-4 py-3 font-semibold">Work Hours</th>
                <th className="text-left px-4 py-3 font-semibold">Extra Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-100/80">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {new Date(r.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtTime(r.check_in_time)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtTime(r.check_out_time)}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {r.work_hours ? Number(r.work_hours).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {r.extra_hours ? Number(r.extra_hours).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No attendance records for this month.
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

function AdminAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState([]);

  useEffect(() => {
    api.get('/attendance', { params: { date } }).then(({ data }) => setRecords(data));
  }, [date]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-slate-700">Attendance — all employees</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white/90 font-medium"
        />
      </div>

      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead className="bg-slate-50/80 text-slate-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Check In</th>
                <th className="text-left px-4 py-3 font-semibold">Check Out</th>
                <th className="text-left px-4 py-3 font-semibold">Work Hours</th>
                <th className="text-left px-4 py-3 font-semibold">Extra Hours</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-slate-100/80">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtTime(r.check_in_time)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{fmtTime(r.check_out_time)}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {r.work_hours ? Number(r.work_hours).toFixed(2) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 font-medium">
                    {r.extra_hours ? Number(r.extra_hours).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No one has checked in on this date.
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

function Chip({ label, value }) {
  return (
    <span className="bg-slate-100/90 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200/60 font-medium">
      {label}: <strong className="text-brand-700">{value}</strong>
    </span>
  );
}
