// UserManagementPage — Secure administrative portal for provisioning and managing user roles.
// Accessible exclusively to users with role === 'Admin'.
// Enforced by both PrivateRoute (frontend) and requireAdmin middleware (backend).

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import authService from "../services/authService";
import { useAuth } from "../context/AuthContext";

const ALLOWED_USER_TYPES = ["Student", "Faculty", "Staff"];
const ALLOWED_ROLES = ["Agent", "Admin", "User"];

function formatDate(dateString) {
  if (!dateString) return "\u2014";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function getRoleBadgeClass(role) {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "badge-role-admin";
    case "agent":
      return "badge-role-agent";
    case "user":
    default:
      return "badge-role-user";
  }
}

function getUserTypeBadgeClass(type) {
  switch ((type || "").toLowerCase()) {
    case "faculty":
      return "badge-type-faculty";
    case "staff":
      return "badge-type-staff";
    case "student":
    default:
      return "badge-type-student";
  }
}

function UserManagementPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [userTypeFilter, setUserTypeFilter] = useState("All");

  // Provisioning Form state
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [provName, setProvName] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [provUserType, setProvUserType] = useState("Staff");
  const [provRole, setProvRole] = useState("Agent");
  const [provLoading, setProvLoading] = useState(false);
  const [provError, setProvError] = useState("");
  const [provSuccess, setProvSuccess] = useState("");

  // Role update state
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState("");

  // Fetch users on mount
  useEffect(() => {
    let cancelled = false;

    authService
      .getAllUsers()
      .then((data) => {
        if (!cancelled) {
          setUsers(Array.isArray(data.users) ? data.users : []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load users list.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const data = await authService.getAllUsers();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setError(err.message || "Failed to refresh users.");
    }
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        String(u.id).includes(q);

      const matchesRole =
        roleFilter === "All" ||
        (u.role && u.role.toLowerCase() === roleFilter.toLowerCase());

      const matchesType =
        userTypeFilter === "All" ||
        (u.user_type && u.user_type.toLowerCase() === userTypeFilter.toLowerCase());

      return matchesQuery && matchesRole && matchesType;
    });
  }, [users, searchQuery, roleFilter, userTypeFilter]);

  // Handle Provisioning Form Submit
  const handleProvisionSubmit = async (e) => {
    e.preventDefault();
    setProvError("");
    setProvSuccess("");

    if (!provName.trim()) {
      setProvError("Full name is required.");
      return;
    }
    if (!provEmail.trim() || !provEmail.includes("@")) {
      setProvError("A valid email address is required.");
      return;
    }
    if (!provPassword || provPassword.length < 6) {
      setProvError("Password must be at least 6 characters long.");
      return;
    }

    setProvLoading(true);
    try {
      const res = await authService.provisionUser({
        name: provName.trim(),
        email: provEmail.trim(),
        password: provPassword,
        user_type: provUserType,
        role: provRole,
      });

      setProvSuccess(res.message || `${provRole} account provisioned successfully!`);
      // Reset form
      setProvName("");
      setProvEmail("");
      setProvPassword("");
      setProvUserType("Staff");
      setProvRole("Agent");

      // Refresh list
      await refreshUsers();
    } catch (err) {
      setProvError(err.message || "Failed to provision account.");
    } finally {
      setProvLoading(false);
    }
  };

  // Handle inline role promotion / change
  const handleRoleChange = async (targetUser, newRole) => {
    if (!newRole || newRole === targetUser.role) return;

    if (String(currentUser?.id) === String(targetUser.id) && newRole !== "Admin") {
      alert("You cannot demote your own Admin account.");
      return;
    }

    const confirmMsg = `Are you sure you want to change ${targetUser.name}'s role from "${targetUser.role}" to "${newRole}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(targetUser.id);
    setActionFeedback("");

    try {
      await authService.updateUserRole(targetUser.id, { role: newRole });
      setActionFeedback(`Successfully updated ${targetUser.name}'s role to ${newRole}.`);
      await refreshUsers();
    } catch (err) {
      alert(err.message || "Failed to update user role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Navigation / Breadcrumb */}
      <div className="td-nav-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/dashboard" className="btn btn-outline btn-sm">
            &larr; Back to Dashboard
          </Link>
          <span className="td-breadcrumb">
            <span className="td-breadcrumb-sep">Admin Portal</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span>User &amp; Access Provisioning</span>
          </span>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setShowProvisionForm((prev) => !prev);
            setProvError("");
            setProvSuccess("");
          }}
        >
          {showProvisionForm ? "Hide Provision Form" : "+ Provision New Account"}
        </button>
      </div>

      {/* Header Info Banner */}
      <div className="um-header-card card">
        <div className="um-header-info">
          <div className="um-header-badge">Admin Workspace</div>
          <h1 className="um-header-title">Account Provisioning &amp; Role Management</h1>
          <p className="um-header-desc">
            Securely provision support agent / worker accounts, assign administrative privileges, and manage user roles.
            <strong> User Type</strong> reflects institutional category (Student, Faculty, Staff), while <strong>Role</strong> controls system authorization (User, Agent, Admin).
          </p>
        </div>
      </div>

      {/* Action feedback */}
      {actionFeedback && (
        <div className="alert alert-success" role="status">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>{actionFeedback}</div>
        </div>
      )}

      {/* Provisioning Form Card (when toggled open) */}
      {showProvisionForm && (
        <div className="um-provision-card card">
          <div className="um-card-header">
            <div>
              <h2 className="um-card-title">Provision New Account</h2>
              <p className="um-card-subtitle">
                Create a pre-authorized Agent, Admin, or User account with a secure temporary password.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowProvisionForm(false)}
            >
              Cancel
            </button>
          </div>

          {provError && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>
              <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>{provError}</div>
            </div>
          )}

          {provSuccess && (
            <div className="alert alert-success" role="status" style={{ marginBottom: "1rem" }}>
              <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <div>{provSuccess}</div>
            </div>
          )}

          <form onSubmit={handleProvisionSubmit} className="um-provision-form" noValidate>
            <div className="um-form-grid">
              <div className="form-group">
                <label htmlFor="prov-name" className="form-label">
                  Full Name <span className="create-ticket-required">*</span>
                </label>
                <input
                  id="prov-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Connor"
                  value={provName}
                  onChange={(e) => setProvName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prov-email" className="form-label">
                  Email Address <span className="create-ticket-required">*</span>
                </label>
                <input
                  id="prov-email"
                  type="email"
                  className="form-input"
                  placeholder="e.g. sarah.agent@smartdesk.edu"
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prov-user-type" className="form-label">
                  Affiliation (User Type) <span className="create-ticket-required">*</span>
                </label>
                <select
                  id="prov-user-type"
                  className="form-select"
                  value={provUserType}
                  onChange={(e) => setProvUserType(e.target.value)}
                  required
                >
                  {ALLOWED_USER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="create-ticket-char-hint" style={{ textAlign: "left" }}>
                  Institutional category (DB check constraint)
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="prov-role" className="form-label">
                  System Role (Permissions) <span className="create-ticket-required">*</span>
                </label>
                <select
                  id="prov-role"
                  className="form-select"
                  value={provRole}
                  onChange={(e) => setProvRole(e.target.value)}
                  required
                >
                  <option value="Agent">Agent (Can resolve &amp; update assigned tickets)</option>
                  <option value="Admin">Admin (Full administrative &amp; user access)</option>
                  <option value="User">User (Standard ticket submitter)</option>
                </select>
                <span className="create-ticket-char-hint" style={{ textAlign: "left" }}>
                  Controls access authorization in backend
                </span>
              </div>

              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label htmlFor="prov-password" className="form-label">
                  Initial Password <span className="create-ticket-required">* (min 6 characters)</span>
                </label>
                <input
                  id="prov-password"
                  type="password"
                  className="form-input"
                  placeholder="Create a temporary secure password"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="um-form-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowProvisionForm(false)}
                disabled={provLoading}
              >
                Close
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={provLoading}
              >
                {provLoading ? "Provisioning..." : `Provision ${provRole} Account`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Toolbar */}
      <section className="filter-toolbar-card">
        <div className="filter-toolbar-row">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search users by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>

          <div className="filter-dropdowns-group">
            <select
              className="form-select filter-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Filter by Role"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Agent">Agent</option>
              <option value="User">User</option>
            </select>

            <select
              className="form-select filter-select"
              value={userTypeFilter}
              onChange={(e) => setUserTypeFilter(e.target.value)}
              aria-label="Filter by Affiliation"
            >
              <option value="All">All Affiliations</option>
              <option value="Student">Student</option>
              <option value="Faculty">Faculty</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
        </div>
      </section>

      {/* Users Table */}
      <section className="ticket-table-card">
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--navy-500)" }}>
            Loading user directory&#8230;
          </div>
        ) : error ? (
          <div className="alert alert-error" role="alert" style={{ margin: "1.5rem" }}>
            <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>{error}</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No users found</p>
            <p className="empty-state-desc">Try clearing or adjusting your search filters.</p>
          </div>
        ) : (
          <div className="ticket-table-responsive">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>ID</th>
                  <th>User Details</th>
                  <th>Affiliation (Type)</th>
                  <th>System Role</th>
                  <th>Joined</th>
                  <th style={{ textAlign: "right" }}>Promote / Change Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = String(currentUser?.id) === String(u.id);
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr key={u.id} className="ticket-table-row">
                      {/* ID */}
                      <td className="ticket-id-cell">
                        #{u.id}
                      </td>

                      {/* Name & Email */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div className="um-table-avatar">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 600, color: "var(--navy-900)" }}>
                              {u.name} {isCurrent && <span className="um-you-tag">You</span>}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--navy-500)" }}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Affiliation / user_type */}
                      <td>
                        <span className={`badge ${getUserTypeBadgeClass(u.user_type)}`}>
                          {u.user_type}
                        </span>
                      </td>

                      {/* Role */}
                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                          <span className="badge-dot" />
                          {u.role}
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="ticket-date-cell">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Role Management Dropdown */}
                      <td style={{ textAlign: "right" }}>
                        {isCurrent ? (
                          <span style={{ fontSize: "0.75rem", color: "var(--navy-400)", fontStyle: "italic" }}>
                            Current Admin (Locked)
                          </span>
                        ) : (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            <select
                              className="form-select"
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.25rem 1.75rem 0.25rem 0.5rem",
                                width: "auto",
                                fontWeight: 600,
                              }}
                              value={u.role}
                              disabled={isUpdating}
                              onChange={(e) => handleRoleChange(u, e.target.value)}
                              aria-label={`Change role for ${u.name}`}
                            >
                              {ALLOWED_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserManagementPage;
