// PrivateRoute — wraps pages that require the user to be logged in.
// If the user is not authenticated, they will be redirected to /login.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PrivateRoute({ children, allowedRoles }) {
  const { user, token } = useAuth();

  // Redirect unauthenticated users to the login page.
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Redirect unauthorized roles to dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PrivateRoute;
