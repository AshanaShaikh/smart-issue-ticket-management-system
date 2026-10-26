// CreateTicketPage — Full-page form to submit a new support ticket.
// Maps exactly to POST /api/tickets:
//   Required: title, description, category
//   Optional: priority (defaults to "Medium" on the server)
// created_by is set server-side from the JWT — never sent by the client.
// On success, navigates to the new ticket's detail page (/tickets/:id).

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ticketService from "../services/ticketService";

// Values must exactly match backend allowedCategories / allowedPriorities
const CATEGORIES = [
  "Network",
  "Hardware",
  "Software",
  "Account",
  "Access",
  "Cleaning",
  "Lost and Found",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function CreateTicketPage() {
  const navigate = useNavigate();

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]     = useState("");
  const [priority, setPriority]     = useState(""); // blank → backend defaults to "Medium"

  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Client-side validation — mirrors backend required-field checks
  const validate = () => {
    if (!title.trim())       return "Title is required.";
    if (title.trim().length > 200)
                             return "Title must be 200 characters or fewer.";
    if (!description.trim()) return "Description is required.";
    if (!category)           return "Please select a category.";
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
      const payload = {
        title:       title.trim(),
        description: description.trim(),
        category,
        // Only include priority when the user explicitly chose one
        ...(priority ? { priority } : {}),
      };

      const response = await ticketService.create(payload);

      // Navigate to the newly created ticket's detail page if the API
      // returned an id; otherwise fall back to the dashboard.
      const newId = response?.ticket?.id;
      if (newId) {
        navigate(`/tickets/${newId}`, {
          state: { successMessage: "Ticket created successfully!" },
        });
      } else {
        navigate("/dashboard", {
          state: { successMessage: "Ticket created successfully!" },
        });
      }
    } catch (err) {
      console.error("Failed to create ticket:", err);
      setError(err.message || "Failed to create ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {/* Back navigation */}
      <div>
        <Link
          to="/dashboard"
          className="btn btn-outline btn-sm"
          aria-label="Back to dashboard"
        >
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

      {/* Page heading */}
      <div className="dashboard-header">
        <h1 className="dashboard-heading">Create New Ticket</h1>
        <p className="dashboard-subheading">
          Describe the issue clearly so it can be routed to the right team.
        </p>
      </div>

      {/* Form card */}
      <div className="create-ticket-card">
        {/* Error alert */}
        {error && (
          <div className="alert alert-error" role="alert">
            <svg
              className="alert-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        <form
          id="create-ticket-form"
          onSubmit={handleSubmit}
          className="create-ticket-form"
          noValidate
        >
          {/* Title */}
          <div className="form-group">
            <label htmlFor="ticket-title" className="form-label">
              Title
              <span className="create-ticket-required" aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="ticket-title"
              type="text"
              className="form-input"
              placeholder="Short, descriptive summary of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              autoFocus
            />
            <span className="create-ticket-char-hint">
              {title.length}/200
            </span>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="ticket-description" className="form-label">
              Description
              <span className="create-ticket-required" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id="ticket-description"
              className="form-input form-textarea"
              placeholder="Provide full details: what happened, when it happened, steps to reproduce, and any error messages."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              required
            />
          </div>

          {/* Category + Priority row */}
          <div className="create-ticket-row">
            {/* Category */}
            <div className="form-group create-ticket-field-category">
              <label htmlFor="ticket-category" className="form-label">
                Category
                <span className="create-ticket-required" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id="ticket-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority (optional) */}
            <div className="form-group create-ticket-field-priority">
              <label htmlFor="ticket-priority" className="form-label">
                Priority
                <span className="form-label-optional">Optional — defaults to Medium</span>
              </label>
              <select
                id="ticket-priority"
                className="form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">Default (Medium)</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Helper note about created_by */}
          <p className="create-ticket-note">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Your account will automatically be recorded as the ticket submitter.
          </p>

          {/* Actions */}
          <div className="create-ticket-actions">
            <Link
              to="/dashboard"
              className="btn btn-outline"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="create-ticket-spinner"
                    aria-hidden="true"
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTicketPage;
