import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  const isCheckedIn = presence === 'present';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Brand Logo & Mobile Toggle */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => setMobileNavOpen((v) => !v)}
            className="sm:hidden text-slate-600 hover:text-slate-800 p-1 rounded-lg focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileNavOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          <Link to="/employees" className="flex items-center gap-2 font-bold text-brand-700 text-base sm:text-lg group shrink-0">
            {user?.company_logo_url ? (
              <img
                src={user.company_logo_url}
                alt={user.company_name || 'Company Logo'}
                className="h-7 sm:h-8 max-w-[100px] sm:max-w-[120px] object-contain rounded"
              />
            ) : null}
            <span>Dayflow</span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavItem to="/employees">Employees</NavItem>
            <NavItem to="/attendance">Attendance</NavItem>
            <NavItem to="/time-off">Time Off</NavItem>
          </nav>
        </div>

        {/* Right Actions: Check-In/Out + Status Dot + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={isCheckedIn ? onCheckOut : onCheckIn}
            className={`text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
              isCheckedIn
                ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'border-brand-500 text-brand-600 hover:bg-brand-50'
            }`}
          >
            {isCheckedIn ? 'Check Out →' : 'Check IN →'}
          </button>

          <span
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white shadow-xs shrink-0 ${
              isCheckedIn ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            title={isCheckedIn ? 'Checked in (Green dot)' : 'Not checked in (Red dot)'}
          />

          {/* User Profile Avatar with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs sm:text-sm font-bold hover:ring-2 hover:ring-brand-400 transition-all overflow-hidden border border-slate-200"
              title="User Account"
            >
              {user?.profile_picture_url ? (
                <img
                  src={user.profile_picture_url}
                  alt={`${user.first_name} ${user.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {user?.first_name?.[0]}
                  {user?.last_name?.[0]}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {user?.first_name && (
                  <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-800">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{user.email || user.login_id}</p>
                    {user?.role && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-100 text-brand-700">
                        {user.role} Account
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/employees/${user.employee_id}`);
                  }}
                  className="block w-full text-left px-3.5 py-2 text-sm font-medium hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  My Profile
                </button>
                <button
                  onClick={logout}
                  className="block w-full text-left px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-slate-50 transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white/95 px-4 py-3 space-y-2 shadow-inner">
          <NavItem to="/employees" onClick={() => setMobileNavOpen(false)}>
            Employees
          </NavItem>
          <NavItem to="/attendance" onClick={() => setMobileNavOpen(false)}>
            Attendance
          </NavItem>
          <NavItem to="/time-off" onClick={() => setMobileNavOpen(false)}>
            Time Off
          </NavItem>
        </div>
      )}
    </header>
  );
}
