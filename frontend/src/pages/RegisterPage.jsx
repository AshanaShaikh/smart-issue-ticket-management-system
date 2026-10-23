// RegisterPage — registration form wired to POST /api/users/register.
// On success, redirects to /login with a success message via location state.
// Does NOT auto-login (backend issues no token on registration).

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

function RegisterPage() {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('');

  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const navigate = useNavigate();

  // Client-side validation — mirrors backend rules for instant feedback.
  const validate = () => {
    if (!name.trim())         return 'Name is required.';
    if (!email.trim())        return 'Email is required.';
    if (!email.includes('@')) return 'Please enter a valid email address.';
    if (!password)            return 'Password is required.';
    if (password.length < 6)  return 'Password must be at least 6 characters.';
    if (!userType)            return 'Please select an account type.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.register({
        name:      name.trim(),
        email:     email.trim(),
        password,
        user_type: userType,
      });

      // Redirect to login with a success message via router state.
      navigate('/login', {
        state: { successMessage: 'Account created successfully! Please log in.' },
      });

    } catch (err) {
      console.error(err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Create an Account</h1>

      <form onSubmit={handleSubmit} noValidate>

        <input
          id="register-name"
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <input
          id="register-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          id="register-password"
          type="password"
          placeholder="Password (min. 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <select
          id="register-user-type"
          value={userType}
          onChange={(e) => setUserType(e.target.value)}
          required
        >
          <option value="" disabled>Select account type</option>
          <option value="Student">Student</option>
          <option value="Faculty">Faculty</option>
          <option value="Staff">Staff</option>
        </select>

        <button
          type="submit"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>

      </form>

      {error && (
        <p role="alert">{error}</p>
      )}

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default RegisterPage;
