import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import NewEmployeeModal from '../components/NewEmployeeModal';
import BackgroundVideo from '../components/BackgroundVideo';

function StatusBadge({ status }) {
  if (status === 'present') {
    return (
      <span
        className="flex items-center justify-center w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white shadow-xs"
        title="Present in office (Checked In)"
      >
        <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
      </span>
    );
  }
  if (status === 'leave') {
    return (
      <span
        className="flex items-center justify-center px-2 py-0.5 text-[11px] bg-blue-100/90 text-blue-800 rounded-full font-bold border border-blue-200 shadow-2xs"
        title="Employee is on leave"
      >
        ✈️ Leave
      </span>
    );
  }
  // Absent / Default
  return (
    <span
      className="flex items-center justify-center w-4 h-4 bg-amber-400 rounded-full ring-2 ring-white shadow-xs"
      title="Absent (Has not checked in today)"
    >
      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
    </span>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/employees', { params: search ? { search } : {} });
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] px-4 py-8">
      {/* Background Video */}
      <BackgroundVideo overlayOpacity="bg-slate-950/40" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Search and New Employee Action Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => setShowNew(true)}
            className="bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 hover:scale-105"
          >
            <span className="text-base font-bold">+</span> NEW
          </button>

          <div className="relative w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees…"
              className="w-full border border-white/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/90 backdrop-blur-md transition-all shadow-md placeholder-slate-400 font-medium"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-white/90 text-sm font-medium bg-black/20 backdrop-blur-md rounded-2xl">
            <svg className="animate-spin h-5 w-5 mr-2 text-brand-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading employee directory…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {employees.map((e) => (
              <Link
                key={e.id}
                to={`/employees/${e.id}`}
                className="group bg-white/90 hover:bg-white backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex items-center gap-4 hover:shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden"
              >
                {/* Profile Picture Avatar */}
                <div className="relative shrink-0">
                  {e.profile_picture_url ? (
                    <img
                      src={e.profile_picture_url}
                      alt={`${e.first_name} ${e.last_name}`}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white group-hover:border-brand-400 shadow-sm transition-colors"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base border-2 border-white group-hover:border-brand-300 shadow-xs">
                      {e.first_name?.[0]}
                      {e.last_name?.[0]}
                    </div>
                  )}
                </div>

                {/* Basic Information */}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-base group-hover:text-brand-700 transition-colors truncate">
                    {e.first_name} {e.last_name}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                    {e.job_position || 'Employee'}
                  </p>
                  {e.department && (
                    <span className="inline-block text-[11px] text-slate-600 font-semibold mt-1 truncate bg-slate-100/90 border border-slate-200/60 px-2 py-0.5 rounded-md">
                      {e.department}
                    </span>
                  )}
                </div>

                {/* Attendance Status Dot at Top Right */}
                <div className="absolute top-4 right-4">
                  <StatusBadge status={e.today_status} />
                </div>
              </Link>
          ))}

            {employees.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-lg">
                <p className="text-slate-700 font-bold text-base">No employees found.</p>
                {search && <p className="text-xs text-slate-500 mt-1">Try searching with a different keyword.</p>}
              </div>
            )}
          </div>
        )}
      </div>

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
