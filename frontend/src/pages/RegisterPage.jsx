// RegisterPage — registration form wired to POST /api/users/register.
// On success, redirects to /login with a success message via location state.
// Does NOT auto-login (backend issues no token on registration).

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import authService from "../services/authService";

function RegisterPage() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const navigate = useNavigate();

  const ALLOWED_USER_TYPES = ["Student", "Faculty", "Staff"];

  // Client-side validation — mirrors backend rules for instant feedback.
  const validate = () => {
    if (!name.trim())         return "Name is required.";
    if (!email.trim())        return "Email is required.";
    if (!email.includes("@")) return "Please enter a valid email address.";
    if (!password)            return "Password is required.";
    if (password.length < 6)  return "Password must be at least 6 characters.";
    if (!userType || !ALLOWED_USER_TYPES.includes(userType)) {
      return "Please select a valid affiliation (Student, Faculty, or Staff).";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await authService.register({
        name:      name.trim(),
        email:     email.trim(),
        password,
        user_type: userType,
      });

      // Redirect to login with a success message via router state.
      navigate("/login", {
        state: { successMessage: "Account created successfully! Please log in." },
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-container">
        {/* Brand & Page Header */}
        <div className="auth-header">
          <div className="auth-logo-badge" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9Z" />
              <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
              <path d="M10 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <span className="auth-brand-name">SmartDesk Platform</span>
          <h1 className="auth-title">Create an Account</h1>
          <p className="auth-subtitle">Join SmartDesk to report issues and track resolutions</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="register-name" className="form-label">
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-email" className="form-label">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="alex@organization.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="register-user-type" className="form-label">
              Academic Affiliation / User Category
            </label>
            <select
              id="register-user-type"
              className="form-select"
              value={userType}
              onChange={(e) => setUserType(e.target.value)}
              required
            >
              <option value="" disabled>Select your affiliation (Student, Faculty, Staff)</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="Staff">Staff</option>
            </select>
            <span style={{ fontSize: "0.75rem", color: "var(--navy-500)", marginTop: "0.2rem", display: "block" }}>
              Public registration creates standard User accounts. IT Agents and Admins are provisioned by system administration.
            </span>
          </div>

          <div className="form-group">
            <div className="form-label">
              <label htmlFor="register-password">Password</label>
              <span className="form-label-optional">Min. 6 chars</span>
            </div>
            <div className="password-input-wrapper">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>

        <div className="auth-demo-badge">
          SmartDesk &bull; Smart Issue &amp; Ticket Management System
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
