// Navbar — top navigation bar, shared across all pages.
// Shows the app name and a Logout button when the user is logged in.

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();           // clears user + token from state and localStorage
    navigate('/login'); // redirect to login page
  };

  return (
    <nav style={{
      padding: '1rem',
      borderBottom: '1px solid #ccc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <strong>Smart Issue &amp; Ticket Management System</strong>

      {user && (
        <button
          onClick={handleLogout}
          style={{
            padding: '0.4rem 1rem',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}

export default Navbar;
