import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import NewEmployeeModal from '../components/NewEmployeeModal';

function StatusDot({ status }) {
  if (status === 'present') return <span className="w-2.5 h-2.5 rounded-full bg-status-present" title="Present" />;
  if (status === 'leave') return <span title="On leave">✈️</span>;
  return <span className="w-2.5 h-2.5 rounded-full bg-status-absent" title="Absent" />;
}

export default function Employees() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/employees', { params: search ? { search } : {} });
    setEmployees(data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        {isAdmin && (
          <button
            onClick={() => setShowNew(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            + New
          </button>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees…"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <Link
              key={e.id}
              to={`/employees/${e.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-sm hover:border-brand-300 transition-all relative"
            >
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold shrink-0">
                {e.first_name[0]}
                {e.last_name[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">
                  {e.first_name} {e.last_name}
                </p>
                <p className="text-xs text-slate-400 truncate">{e.job_position}</p>
              </div>
              <div className="absolute top-3 right-3">
                <StatusDot status={e.today_status} />
              </div>
            </Link>
          ))}
          {employees.length === 0 && (
            <p className="text-slate-400 text-sm col-span-full">No employees found.</p>
          )}
        </div>
      )}

      {showNew && (
        <NewEmployeeModal
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
