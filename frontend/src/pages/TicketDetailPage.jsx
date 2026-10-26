// TicketDetailPage — shows a single ticket with its comments, history,
// and Gemini AI analysis.

import { useParams, Link } from "react-router-dom";

function TicketDetailPage() {
  const { id } = useParams();

  return (
    <div className="dashboard-wrapper">
      <div style={{ marginBottom: "1rem" }}>
        <Link to="/dashboard" className="btn btn-outline btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="card" style={{ padding: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <span className="ticket-id-cell" style={{ fontSize: "1.125rem" }}>Ticket #{id}</span>
          <span className="badge badge-status-open">
            <span className="badge-dot" />
            Detail View
          </span>
        </div>

        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Ticket Details</h1>
        <p style={{ color: "var(--navy-500)", lineHeight: "1.6" }}>
          Ticket details, discussion thread, timeline history, and AI resolution analysis will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default TicketDetailPage;
