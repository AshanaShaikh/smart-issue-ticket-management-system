// TicketDetailPage — shows a single ticket with its comments, history,
// and Gemini AI analysis.
// Also displays a success banner when redirected here from CreateTicketPage.

import { useParams, Link, useLocation } from "react-router-dom";

function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();

  // Success message passed via router state after ticket creation
  const successMessage = location.state?.successMessage || "";

  return (
    <div className="dashboard-wrapper">
      {/* Back navigation */}
      <div>
        <Link to="/dashboard" className="btn btn-outline btn-sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Success banner from ticket creation */}
      {successMessage && (
        <div className="alert alert-success" role="status">
          <svg
            className="alert-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <div>{successMessage}</div>
        </div>
      )}

      {/* Ticket card */}
      <div className="card" style={{ padding: "2rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          <span className="ticket-id-cell" style={{ fontSize: "1.125rem" }}>
            Ticket #{id}
          </span>
          <span className="badge badge-status-open">
            <span className="badge-dot" />
            Detail View
          </span>
        </div>

        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Ticket Details
        </h1>
        <p style={{ color: "var(--navy-500)", lineHeight: "1.6" }}>
          Ticket details, discussion thread, timeline history, and AI resolution
          analysis will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default TicketDetailPage;
