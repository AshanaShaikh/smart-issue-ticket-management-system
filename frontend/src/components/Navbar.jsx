// Navbar — SaaS top navigation bar.
// Displays for authenticated users on application screens (e.g. Dashboard, Tickets).
// Hidden on /login and /register pages.

import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Do not show the navbar if unauthenticated or on auth pages
  if (!user || location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const displayRole = user.role || user.user_type || 'User';

  return (
    <header className="app-navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand-group" aria-label="SmartDesk Home">
          <div className="navbar-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z" />
              <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
              <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div className="navbar-brand-text">
            <div className="navbar-brand-title">
              SmartDesk
              <span className="navbar-brand-badge">SaaS</span>
            </div>
            <span className="navbar-brand-subtitle">Smart Issue &amp; Ticket Management System</span>
          </div>
        </Link>

        {/* Navigation links for authenticated pages */}
        <nav className="navbar-nav-links">
          <Link
            to="/dashboard"
            className={`navbar-nav-link${location.pathname === '/dashboard' || location.pathname.startsWith('/tickets') ? ' navbar-nav-link-active' : ''}`}
          >
            Dashboard
          </Link>
          {user.role === 'Admin' && (
            <Link
              to="/admin/users"
              className={`navbar-nav-link${location.pathname === '/admin/users' ? ' navbar-nav-link-active' : ''}`}
            >
              User Management
            </Link>
          )}
        </nav>

        <div className="navbar-actions">
          <div className="navbar-user-card" title={`Logged in as ${user.email || user.name}`}>
            <div className="user-avatar-circle">
              {userInitial}
            </div>
            <div className="navbar-user-info">
              <span className="navbar-user-name">{user.name || 'User'}</span>
              <span className="navbar-user-meta">{displayRole}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="navbar-logout-btn"
            title="Log out of SmartDesk"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
