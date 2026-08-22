import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function NavBar({ presence, onCheckIn, onCheckOut }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isCheckedIn = presence === 'present';

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/employees" className="font-semibold text-brand-700 text-lg">
            Dayflow
          </Link>
          <nav className="flex items-center gap-1">
            <NavItem to="/employees">Employees</NavItem>
            <NavItem to="/attendance">Attendance</NavItem>
            <NavItem to="/time-off">Time Off</NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={isCheckedIn ? onCheckOut : onCheckIn}
            className={`text-xs font-medium px-3 py-1.5 rounded-md border transition-colors ${
              isCheckedIn
                ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                : 'border-brand-500 text-brand-600 hover:bg-brand-50'
            }`}
          >
            {isCheckedIn ? 'Check Out' : 'Check In'}
          </button>

          <span
            className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-status-present' : 'bg-status-reject'}`}
            title={isCheckedIn ? 'Checked in' : 'Not checked in'}
          />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold"
            >
              {user?.first_name?.[0]}
              {user?.last_name?.[0]}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/employees/${user.employee_id}`);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                >
                  My Profile
                </button>
                <button
                  onClick={logout}
                  className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-slate-50"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
