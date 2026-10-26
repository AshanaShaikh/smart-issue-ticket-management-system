// DashboardPage — Main ticket dashboard.
// Fetches real tickets via ticketService.getAll() and displays live metrics,
// search/filter controls, and ticket table linking to /tickets/:id.

import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import ticketService from "../services/ticketService";
import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();
  const location = useLocation();

  // Success message when redirected back from CreateTicketPage
  const successMessage = location.state?.successMessage || "";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Initial fetch on mount without synchronous setState in effect
  useEffect(() => {
    let isCancelled = false;

    ticketService
      .getAll()
      .then((data) => {
        if (!isCancelled) {
          setTickets(Array.isArray(data.tickets) ? data.tickets : []);
          setError("");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Error fetching tickets:", err);
          setError(err.message || "Failed to load tickets. Please try again.");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Manual refresh callback
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await ticketService.getAll();
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err) {
      console.error("Error refreshing tickets:", err);
      setError(err.message || "Failed to refresh tickets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Derived Summary Metrics calculated from actual tickets
  const metrics = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(
      (t) => (t.status || "").toLowerCase() === "open"
    ).length;
    const inProgress = tickets.filter(
      (t) => (t.status || "").toLowerCase() === "in progress"
    ).length;
    const resolved = tickets.filter((t) =>
      ["resolved", "closed"].includes((t.status || "").toLowerCase())
    ).length;

    return { total, open, inProgress, resolved };
  }, [tickets]);

  // Client-side filtering
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search matching title, description, or ticket ID
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        (ticket.title && ticket.title.toLowerCase().includes(query)) ||
        (ticket.description && ticket.description.toLowerCase().includes(query)) ||
        (ticket.id && String(ticket.id).includes(query));

      // Status Filter
      const matchesStatus =
        statusFilter === "All" ||
        (ticket.status && ticket.status.toLowerCase() === statusFilter.toLowerCase());

      // Priority Filter
      const matchesPriority =
        priorityFilter === "All" ||
        (ticket.priority && ticket.priority.toLowerCase() === priorityFilter.toLowerCase());

      // Category Filter
      const matchesCategory =
        categoryFilter === "All" ||
        (ticket.category && ticket.category.toLowerCase() === categoryFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
    });
  }, [tickets, searchTerm, statusFilter, priorityFilter, categoryFilter]);

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    categoryFilter !== "All";

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setCategoryFilter("All");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "critical":
        return "badge-priority-critical";
      case "high":
        return "badge-priority-high";
      case "low":
        return "badge-priority-low";
      case "medium":
      default:
        return "badge-priority-medium";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "in progress":
        return "badge-status-in-progress";
      case "resolved":
        return "badge-status-resolved";
      case "closed":
        return "badge-status-closed";
      case "open":
      default:
        return "badge-status-open";
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Header Row */}
      <section className="dashboard-header">
        <div className="dashboard-title-row">
          <div>
            <h1 className="dashboard-heading">Support Tickets Overview</h1>
            <p className="dashboard-subheading">
              Welcome, {user?.name || "User"} &bull; Real-time status of your submitted and assigned issues
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-outline btn-sm"
            disabled={loading}
            title="Refresh tickets from server"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            to="/tickets/new"
            className="btn btn-primary btn-sm"
            aria-label="Create a new support ticket"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Ticket</span>
          </Link>
        </div>
      </section>

      {/* Success banner when redirected back after ticket creation */}
      {successMessage && (
        <div className="alert alert-success" role="status">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>{successMessage}</div>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <section className="metrics-grid" aria-label="Ticket statistics">
        {/* Total Tickets */}
        <div className="metric-card">
          <div className="metric-data">
            <span className="metric-label">Total Tickets</span>
            <span className="metric-count">{metrics.total}</span>
          </div>
          <div className="metric-icon-wrap metric-icon-total">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
        </div>

        {/* Open Issues */}
        <div className="metric-card">
          <div className="metric-data">
            <span className="metric-label">Open Issues</span>
            <span className="metric-count">{metrics.open}</span>
          </div>
          <div className="metric-icon-wrap metric-icon-open">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </div>
        </div>

        {/* In Progress */}
        <div className="metric-card">
          <div className="metric-data">
            <span className="metric-label">In Progress</span>
            <span className="metric-count">{metrics.inProgress}</span>
          </div>
          <div className="metric-icon-wrap metric-icon-progress">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        </div>

        {/* Resolved / Closed */}
        <div className="metric-card">
          <div className="metric-data">
            <span className="metric-label">Resolved</span>
            <span className="metric-count">{metrics.resolved}</span>
          </div>
          <div className="metric-icon-wrap metric-icon-resolved">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
      </section>

      {/* Error Message if API fails */}
      {error && (
        <div className="alert alert-error" role="alert">
          <svg className="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>{error}</div>
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-sm btn-outline"
            style={{ marginLeft: "auto" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <section className="filter-toolbar-card">
        <div className="filter-toolbar-row">
          {/* Search Input */}
          <div className="search-input-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Search by ID, title, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search tickets"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="filter-dropdowns-group">
            {/* Status Filter */}
            <select
              className="form-select filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              className="form-select filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              className="form-select filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="All">All Categories</option>
              <option value="Network">Network</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Account">Account</option>
              <option value="Access">Access</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Lost and Found">Lost and Found</option>
            </select>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-outline reset-filters-btn"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Meta Bar */}
        <div className="filter-meta-bar">
          <span>
            Showing <strong>{filteredTickets.length}</strong> of{" "}
            <strong>{tickets.length}</strong> tickets
          </span>
          {hasActiveFilters && (
            <span>Filtered results active</span>
          )}
        </div>
      </section>

      {/* Ticket Table / List Container */}
      <section className="ticket-table-card">
        {loading ? (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="skeleton-box"
                style={{ height: "3.5rem", width: "100%" }}
              />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            {tickets.length === 0 ? (
              <>
                <h3 className="empty-state-title">No tickets submitted yet</h3>
                <p className="empty-state-desc">
                  Your submitted tickets and assigned issues will automatically appear here once created.
                </p>
              </>
            ) : (
              <>
                <h3 className="empty-state-title">No tickets match your filters</h3>
                <p className="empty-state-desc">
                  Try adjusting or clearing your search keywords and dropdown filters to see results.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn btn-secondary btn-sm"
                >
                  Clear All Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="ticket-table-responsive">
            <table className="ticket-table">
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Ticket ID</th>
                  <th>Title &amp; Summary</th>
                  <th style={{ width: "140px" }}>Category</th>
                  <th style={{ width: "120px" }}>Priority</th>
                  <th style={{ width: "130px" }}>Status</th>
                  <th style={{ width: "130px" }}>Created</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    {/* ID */}
                    <td className="ticket-id-cell">
                      #{ticket.id}
                    </td>

                    {/* Title & Preview */}
                    <td>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="ticket-title-link"
                        title={ticket.title}
                      >
                        <span>{ticket.title}</span>
                        {ticket.description && (
                          <span className="ticket-desc-snippet">
                            {ticket.description}
                          </span>
                        )}
                      </Link>
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge badge-category">
                        {ticket.category || "General"}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                        <span className="badge-dot" />
                        {ticket.priority || "Medium"}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                        <span className="badge-dot" />
                        {ticket.status || "Open"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="ticket-date-cell">
                      {formatDate(ticket.created_at)}
                    </td>

                    {/* Action */}
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/tickets/${ticket.id}`}
                        className="ticket-action-btn"
                        title={`View details for ticket #${ticket.id}`}
                      >
                        <span>View</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
