// TicketDetailPage — Complete ticket workspace.
// Shows ticket info, discussion thread (comments), change history timeline,
// and Gemini AI analysis.
//
// API contracts used (all existing, no backend changes):
//   GET    /api/tickets/:id
//   GET    /api/tickets/:id/comments
//   POST   /api/tickets/:id/comments          body: { comment }
//   PUT    /api/tickets/comments/:commentId   body: { comment }  (own only)
//   DELETE /api/tickets/comments/:commentId                      (own only)
//   GET    /api/tickets/:id/history
//   POST   /api/tickets/:id/ai-analysis
//   GET    /api/tickets/:id/ai-analysis

import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import ticketService from "../services/ticketService";
import { useAuth } from "../context/AuthContext";

// ─── Badge helpers (identical to DashboardPage) ────────────────────────────

function getPriorityBadgeClass(priority) {
  switch ((priority || "").toLowerCase()) {
    case "critical": return "badge-priority-critical";
    case "high":     return "badge-priority-high";
    case "low":      return "badge-priority-low";
    case "medium":
    default:         return "badge-priority-medium";
  }
}

function getStatusBadgeClass(status) {
  switch ((status || "").toLowerCase()) {
    case "in progress": return "badge-status-in-progress";
    case "resolved":    return "badge-status-resolved";
    case "closed":      return "badge-status-closed";
    case "open":
    default:            return "badge-status-open";
  }
}

function formatDate(dateString) {
  if (!dateString) return "\u2014";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "\u2014";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

async function computeContentHash(title, description, category) {
  try {
    const raw = `${title || ""}::${description || ""}::${category || ""}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// ─── Small reusable SVG icons ───────────────────────────────────────────────

function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="alert-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconError() {
  return (
    <svg className="alert-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="td-spinner" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconDelete() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function IconAI() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.5" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

function TicketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  // Success message from CreateTicketPage redirect
  const successMessage = location.state?.successMessage || "";

  // Ticket state
  const [ticket, setTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [ticketError, setTicketError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [applyingPriority, setApplyingPriority] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [addCommentError, setAddCommentError] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // AI Analysis state
  const [analyses, setAnalyses] = useState([]);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [analysesError, setAnalysesError] = useState("");
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [runAnalysisError, setRunAnalysisError] = useState("");
  const [activeJobId, setActiveJobId] = useState(null);
  const [analysisStatusText, setAnalysisStatusText] = useState("");
  const [lastAnalysisNotice, setLastAnalysisNotice] = useState(null); // { type: 'cached' | 'fresh', message: string }
  const [currentContentHash, setCurrentContentHash] = useState(null);

  // Recompute ticket content hash whenever ticket title, description, or category changes
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      if (ticket) {
        return computeContentHash(ticket.title, ticket.description, ticket.category);
      }
      return null;
    }).then((hash) => {
      if (active) setCurrentContentHash(hash || null);
    });

    return () => {
      active = false;
    };
  }, [ticket]);

  // Active tab
  const [activeTab, setActiveTab] = useState("comments");

  // Initial fetch on mount or id change — async promises avoid synchronous setState in effect
  useEffect(() => {
    let cancelled = false;

    ticketService
      .getById(id)
      .then((data) => {
        if (!cancelled) {
          setTicket(data.ticket || null);
          setTicketLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTicketError(err.message || "Failed to load ticket.");
          setTicketLoading(false);
        }
      });

    ticketService
      .getComments(id)
      .then((data) => {
        if (!cancelled) {
          setComments(Array.isArray(data.comments) ? data.comments : []);
          setCommentsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCommentsError(err.message || "Failed to load comments.");
          setCommentsLoading(false);
        }
      });

    ticketService
      .getHistory(id)
      .then((data) => {
        if (!cancelled) {
          setHistory(Array.isArray(data.history) ? data.history : []);
          setHistoryLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setHistoryError(err.message || "Failed to load history.");
          setHistoryLoading(false);
        }
      });

    ticketService
      .getAiAnalyses(id)
      .then((data) => {
        if (!cancelled) {
          setAnalyses(Array.isArray(data.analyses) ? data.analyses : []);
          setAnalysesLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAnalysesError(err.message || "Failed to load AI analyses.");
          setAnalysesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Refresh callbacks for user actions (comment post/edit/delete, status change, AI analysis)
  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setCommentsLoading(true);
    setCommentsError("");
    try {
      const data = await ticketService.getComments(id);
      setComments(Array.isArray(data.comments) ? data.comments : []);
    } catch (err) {
      setCommentsError(err.message || "Failed to load comments.");
    } finally {
      if (!silent) setCommentsLoading(false);
    }
  }, [id]);

  const fetchHistory = useCallback(async (silent = false) => {
    if (!silent) setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await ticketService.getHistory(id);
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setHistoryError(err.message || "Failed to load history.");
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }, [id]);

  const fetchAnalyses = useCallback(async (silent = false) => {
    if (!silent) setAnalysesLoading(true);
    setAnalysesError("");
    try {
      const data = await ticketService.getAiAnalyses(id);
      setAnalyses(Array.isArray(data.analyses) ? data.analyses : []);
    } catch (err) {
      setAnalysesError(err.message || "Failed to load AI analyses.");
    } finally {
      if (!silent) setAnalysesLoading(false);
    }
  }, [id]);

  // Polling effect for active background AI analysis job
  useEffect(() => {
    if (!activeJobId) return;

    let isMounted = true;
    let pollTimer = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 30; // 30 * 2000ms = 60s max polling time

    const poll = async () => {
      attempts += 1;
      try {
        const res = await ticketService.pollAiJob(id, activeJobId);
        if (!isMounted) return;

        if (res.status === "completed") {
          setActiveJobId(null);
          setRunningAnalysis(false);
          setAnalysisStatusText("");
          setLastAnalysisNotice({
            type: "fresh",
            message: "Fresh AI priority analysis generated successfully.",
          });
          fetchAnalyses(true);
          return;
        }

        if (res.status === "failed" || res.status === "timed_out") {
          setActiveJobId(null);
          setRunningAnalysis(false);
          setAnalysisStatusText("");
          setRunAnalysisError(res.error || "AI analysis failed. Please try again.");
          return;
        }

        // Job still pending or running
        if (attempts >= MAX_ATTEMPTS) {
          setActiveJobId(null);
          setRunningAnalysis(false);
          setAnalysisStatusText("");
          setRunAnalysisError("Analysis request timed out. Please click Retry.");
          return;
        }

        setAnalysisStatusText(
          res.status === "running"
            ? "Gemini is analyzing ticket content in background…"
            : "Analysis job queued, waiting for worker…"
        );
        pollTimer = setTimeout(poll, 2000);
      } catch (err) {
        if (!isMounted) return;
        setActiveJobId(null);
        setRunningAnalysis(false);
        setAnalysisStatusText("");
        setRunAnalysisError(err.message || "Failed to check analysis job status. Please retry.");
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [activeJobId, id, fetchAnalyses]);

  // Handlers
  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === ticket?.status) return;
    setUpdatingStatus(true);
    setStatusUpdateError("");
    try {
      const updated = await ticketService.update(id, { status: newStatus });
      setTicket(updated.ticket || { ...ticket, status: newStatus });
      fetchHistory(true);
    } catch (err) {
      setStatusUpdateError(err.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const [applyPriorityError, setApplyPriorityError] = useState("");

  const handleApplySuggestedPriority = async (suggestedPriority) => {
    if (!suggestedPriority || suggestedPriority === ticket?.priority || applyingPriority) return;
    setApplyingPriority(true);
    setApplyPriorityError("");
    try {
      const updated = await ticketService.update(id, { priority: suggestedPriority });
      if (updated.ticket) {
        setTicket(updated.ticket);
      } else {
        // Fallback: reload full ticket details
        const refreshed = await ticketService.getById(id);
        if (refreshed.ticket) setTicket(refreshed.ticket);
      }
      fetchHistory(true);
    } catch (err) {
      setApplyPriorityError(err.message || "Failed to update priority.");
    } finally {
      setApplyingPriority(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    const text = newComment.trim();
    if (!text) return;

    setAddingComment(true);
    setAddCommentError("");
    try {
      await ticketService.addComment(id, { comment: text });
      setNewComment("");
      fetchComments(true);
    } catch (err) {
      setAddCommentError(err.message || "Failed to add comment.");
    } finally {
      setAddingComment(false);
    }
  };

  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment);
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText("");
    setEditError("");
  };

  const handleSaveEdit = async (commentId) => {
    const text = editingText.trim();
    if (!text) { setEditError("Comment cannot be empty."); return; }

    setSavingEdit(true);
    setEditError("");
    try {
      await ticketService.editComment(commentId, { comment: text });
      setEditingCommentId(null);
      setEditingText("");
      fetchComments(true);
    } catch (err) {
      setEditError(err.message || "Failed to update comment.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    setDeletingCommentId(commentId);
    setDeleteError("");
    try {
      await ticketService.deleteComment(commentId);
      fetchComments(true);
    } catch (err) {
      setDeleteError(err.message || "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (runningAnalysis) return; // Prevent duplicate job submissions
    setRunningAnalysis(true);
    setRunAnalysisError("");
    setLastAnalysisNotice(null);
    setAnalysisStatusText("Submitting analysis request…");

    try {
      const res = await ticketService.submitAiAnalysis(id);

      if (res.cached && res.analysis) {
        // Cache hit: immediately show cached recommendation without polling!
        setRunningAnalysis(false);
        setAnalysisStatusText("");
        setLastAnalysisNotice({
          type: "cached",
          message: "Loaded from cache (ticket content unchanged). Instant response.",
        });
        fetchAnalyses(true);
      } else if (res.job_id) {
        // Async background job submitted or already in flight
        setAnalysisStatusText(
          res.status === "running"
            ? "Gemini analysis is in progress…"
            : "Analysis job queued in background…"
        );
        setActiveJobId(res.job_id);
      } else {
        // Fallback refresh
        setRunningAnalysis(false);
        setAnalysisStatusText("");
        fetchAnalyses(true);
      }
    } catch (err) {
      setRunningAnalysis(false);
      setAnalysisStatusText("");
      setRunAnalysisError(err.message || "AI analysis failed. Please try again.");
    }
  };

  // Helpers
  const isOwnComment = (comment) => Boolean(user && String(comment.user_id) === String(user.id));

  const confidencePercent = (score) =>
    score != null ? `${Math.round(score * 100)}%` : "\u2014";

  const confidenceColor = (score) => {
    if (score == null) return "var(--navy-500)";
    if (score >= 0.8)  return "var(--emerald-600)";
    if (score >= 0.5)  return "var(--amber-600)";
    return "var(--rose-600)";
  };

  const fieldLabel = (field) => {
    const map = {
      title: "Title", description: "Description", category: "Category",
      priority: "Priority", status: "Status", assigned_to: "Assignee",
    };
    return map[field] || field;
  };

  // Loading state
  if (ticketLoading) {
    return (
      <div className="dashboard-wrapper">
        <div className="td-loading-state">
          <IconSpinner />
          <span>Loading ticket&#8230;</span>
        </div>
      </div>
    );
  }

  // Error state
  if (ticketError) {
    return (
      <div className="dashboard-wrapper">
        <Link to="/dashboard" className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }}>
          <IconBack /><span>Back to Dashboard</span>
        </Link>
        <div className="alert alert-error" role="alert">
          <IconError />
          <div>
            <strong>Failed to load ticket.</strong>
            <br />{ticketError}
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!ticket) {
    return (
      <div className="dashboard-wrapper">
        <Link to="/dashboard" className="btn btn-outline btn-sm" style={{ alignSelf: "flex-start" }}>
          <IconBack /><span>Back to Dashboard</span>
        </Link>
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="empty-state-title">Ticket not found</p>
          <p className="empty-state-desc">
            This ticket does not exist or you do not have access to view it.
          </p>
          <Link to="/dashboard" className="btn btn-primary btn-sm">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // Full workspace
  return (
    <div className="dashboard-wrapper">

      {/* Navigation bar */}
      <div className="td-nav-bar">
        <Link to="/dashboard" className="btn btn-outline btn-sm">
          <IconBack /><span>Back to Dashboard</span>
        </Link>
        <span className="td-breadcrumb">
          <span className="td-breadcrumb-sep">Dashboard</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>Ticket #{ticket.id}</span>
        </span>
      </div>

      {/* Success banner from CreateTicketPage */}
      {successMessage && (
        <div className="alert alert-success" role="status">
          <IconCheck />
          <div>{successMessage}</div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="td-layout">

        {/* LEFT: Ticket info card */}
        <aside className="td-info-card card">
          <div className="td-info-header">
            <span className="ticket-id-cell" style={{ fontSize: "0.8125rem" }}>
              Ticket #{ticket.id}
            </span>
            <div className="td-badge-row">
              <span className={`badge ${getStatusBadgeClass(ticket.status)}`}>
                <span className="badge-dot" />
                {ticket.status || "Open"}
              </span>
              <span className={`badge ${getPriorityBadgeClass(ticket.priority)}`}>
                <span className="badge-dot" />
                {ticket.priority || "Medium"}
              </span>
            </div>
          </div>

          <h1 className="td-ticket-title">{ticket.title}</h1>

          <div className="td-section">
            <p className="td-section-label">Description</p>
            <p className="td-ticket-desc">{ticket.description}</p>
          </div>

          <div className="td-meta-grid">
            <div className="td-meta-item">
              <span className="td-meta-label">Category</span>
              <span className="badge badge-category">{ticket.category}</span>
            </div>
            <div className="td-meta-item">
              <span className="td-meta-label">Created</span>
              <span className="td-meta-value">{formatDate(ticket.created_at)}</span>
            </div>
            {ticket.updated_at && ticket.updated_at !== ticket.created_at && (
              <div className="td-meta-item">
                <span className="td-meta-label">Updated</span>
                <span className="td-meta-value">{formatDate(ticket.updated_at)}</span>
              </div>
            )}
            {ticket.created_by && (
              <div className="td-meta-item">
                <span className="td-meta-label">Reporter ID</span>
                <span className="td-meta-value td-id-mono">#{ticket.created_by}</span>
              </div>
            )}
            <div className="td-meta-item">
              <span className="td-meta-label">Assigned Agent</span>
              {ticket.assigned_to
                ? <span className="td-meta-value td-id-mono">#{ticket.assigned_to}</span>
                : <span className="td-meta-value td-unassigned">Unassigned</span>}
            </div>
          </div>

          {/* Status updater for Agent or Admin */}
          {(user?.role === "Admin" || user?.role === "Agent") && (
            <div className="td-status-updater">
              <label htmlFor="status-select" className="td-section-label">
                Update Status
              </label>
              <select
                id="status-select"
                className="form-select td-status-select"
                value={ticket.status || "Open"}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>
              {statusUpdateError && (
                <p className="td-field-error">{statusUpdateError}</p>
              )}
            </div>
          )}
        </aside>

        {/* RIGHT: Tabbed workspace */}
        <section className="td-workspace">

          {/* Tab bar */}
          <div className="td-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === "comments"}
              className={`td-tab${activeTab === "comments" ? " td-tab-active" : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Discussion
              {comments.length > 0 && <span className="td-tab-count">{comments.length}</span>}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "history"}
              className={`td-tab${activeTab === "history" ? " td-tab-active" : ""}`}
              onClick={() => setActiveTab("history")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="12 8 12 12 14 14" />
                <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
                <polyline points="3 3 3 8 8 8" />
              </svg>
              History
              {history.length > 0 && <span className="td-tab-count">{history.length}</span>}
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "ai"}
              className={`td-tab${activeTab === "ai" ? " td-tab-active" : ""}`}
              onClick={() => setActiveTab("ai")}
            >
              <IconAI />
              AI Analysis
              {analyses.length > 0 && <span className="td-tab-count td-tab-count-ai">{analyses.length}</span>}
            </button>
          </div>

          {/* Tab: Discussion */}
          {activeTab === "comments" && (
            <div className="td-tab-panel card">
              <div className="td-comments-list">
                {commentsLoading && (
                  <div className="td-panel-loading"><IconSpinner /><span>Loading comments&#8230;</span></div>
                )}
                {!commentsLoading && commentsError && (
                  <div className="alert alert-error" role="alert"><IconError /><div>{commentsError}</div></div>
                )}
                {!commentsLoading && !commentsError && comments.length === 0 && (
                  <div className="td-empty-panel">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p>No comments yet. Be the first to add one.</p>
                  </div>
                )}
                {deleteError && (
                  <div className="alert alert-error" role="alert" style={{ marginBottom: "0.75rem" }}>
                    <IconError /><div>{deleteError}</div>
                  </div>
                )}
                {!commentsLoading && comments.map((c) => {
                  const isOwn = isOwnComment(c);
                  const isEditing = editingCommentId === c.id;
                  return (
                    <div key={c.id} className={`td-comment-item${isOwn ? " td-comment-own" : ""}`}>
                      <div className="td-comment-meta">
                        <div className={`td-comment-avatar${isOwn ? " td-comment-avatar-own" : ""}`}>
                          {isOwn ? (user?.name?.[0] || "Y") : "U"}
                        </div>
                        <div className="td-comment-author-info">
                          <span className="td-comment-author">
                            {isOwn ? (user?.name || "You") : `User #${c.user_id}`}
                          </span>
                          <span className="td-comment-time">{formatDateTime(c.created_at)}</span>
                        </div>
                        {c.updated_at && c.updated_at !== c.created_at && (
                          <span className="td-comment-edited">edited</span>
                        )}
                      </div>
                      {isEditing ? (
                        <div className="td-edit-form">
                          <textarea
                            className="form-input form-textarea td-edit-textarea"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            aria-label="Edit comment"
                          />
                          {editError && <p className="td-field-error">{editError}</p>}
                          <div className="td-edit-actions">
                            <button type="button" className="btn btn-outline btn-sm" onClick={handleCancelEdit} disabled={savingEdit}>
                              Cancel
                            </button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(c.id)} disabled={savingEdit}>
                              {savingEdit ? <><IconSpinner />Saving&#8230;</> : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="td-comment-body">{c.comment}</p>
                      )}
                      {isOwn && !isEditing && (
                        <div className="td-comment-actions">
                          <button type="button" className="td-comment-action-btn" onClick={() => handleStartEdit(c)} aria-label="Edit comment">
                            <IconEdit /> Edit
                          </button>
                          <button
                            type="button"
                            className="td-comment-action-btn td-comment-action-delete"
                            onClick={() => handleDeleteComment(c.id)}
                            disabled={deletingCommentId === c.id}
                            aria-label="Delete comment"
                          >
                            {deletingCommentId === c.id ? <IconSpinner /> : <><IconDelete /> Delete</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="td-add-comment-form" noValidate>
                <div className="td-add-comment-row">
                  <div className="td-comment-avatar td-comment-avatar-own" aria-hidden="true">
                    {user?.name?.[0] || "Y"}
                  </div>
                  <textarea
                    id="new-comment-input"
                    className="form-input form-textarea td-new-comment-textarea"
                    placeholder="Add a comment&#8230;"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    disabled={addingComment}
                    aria-label="New comment"
                  />
                </div>
                {addCommentError && (
                  <div className="alert alert-error" role="alert"><IconError /><div>{addCommentError}</div></div>
                )}
                <div className="td-add-comment-actions">
                  <button
                    id="submit-comment-btn"
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={addingComment || !newComment.trim()}
                  >
                    {addingComment ? <><IconSpinner />Posting&#8230;</> : <><IconSend />Post Comment</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab: History */}
          {activeTab === "history" && (
            <div className="td-tab-panel card">
              {historyLoading && (
                <div className="td-panel-loading"><IconSpinner /><span>Loading history&#8230;</span></div>
              )}
              {!historyLoading && historyError && (
                <div className="alert alert-error" role="alert"><IconError /><div>{historyError}</div></div>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <div className="td-empty-panel">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="12 8 12 12 14 14" />
                    <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
                    <polyline points="3 3 3 8 8 8" />
                  </svg>
                  <p>No changes have been recorded yet.</p>
                </div>
              )}
              {!historyLoading && !historyError && history.length > 0 && (
                <div className="td-timeline" role="list">
                  {history.map((entry, idx) => (
                    <div key={entry.id} className="td-timeline-item" role="listitem">
                      <div className="td-timeline-line">
                        <div className="td-timeline-dot" />
                        {idx < history.length - 1 && <div className="td-timeline-track" />}
                      </div>
                      <div className="td-timeline-content">
                        <div className="td-timeline-header">
                          <span className="td-timeline-field">{fieldLabel(entry.field_changed)} changed</span>
                          <span className="td-timeline-ts">{formatDateTime(entry.changed_at)}</span>
                        </div>
                        <div className="td-timeline-values">
                          <span className="td-history-val td-history-old">
                            {entry.old_value != null ? entry.old_value : <em>none</em>}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                          <span className="td-history-val td-history-new">
                            {entry.new_value != null ? entry.new_value : <em>none</em>}
                          </span>
                        </div>
                        {entry.changed_by && (
                          <p className="td-timeline-actor">
                            By user <span className="td-id-mono">#{entry.changed_by}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: AI Analysis */}
          {activeTab === "ai" && (
            <div className="td-tab-panel card">
              <div className="td-ai-header">
                <div>
                  <h2 className="td-ai-title">Gemini AI Priority Analysis</h2>
                  <p className="td-ai-subtitle">
                    Analyzes the ticket title, description and category to suggest a priority.
                    The ticket&#39;s actual priority is never changed automatically.
                  </p>
                </div>
                <button
                  id="run-ai-analysis-btn"
                  type="button"
                  className="btn btn-primary btn-sm td-ai-run-btn"
                  onClick={handleRunAiAnalysis}
                  disabled={runningAnalysis}
                >
                  {runningAnalysis ? <><IconSpinner />Analyzing&#8230;</> : <><IconAI />{runAnalysisError ? "Retry Analysis" : "Run Analysis"}</>}
                </button>
              </div>

              {/* Progress banner when job is in flight */}
              {runningAnalysis && (
                <div className="td-ai-progress-banner" role="status" aria-live="polite">
                  <IconSpinner />
                  <div className="td-ai-progress-text">
                    <strong>AI Analysis In Progress</strong>
                    <p>{analysisStatusText || "Analyzing ticket content in the background…"}</p>
                  </div>
                </div>
              )}

              {/* Notice when analysis completed or loaded from cache */}
              {!runningAnalysis && lastAnalysisNotice && (
                <div
                  className={`alert ${lastAnalysisNotice.type === "cached" ? "alert-info" : "alert-success"}`}
                  role="status"
                  style={{ marginBottom: "1rem" }}
                >
                  <IconCheck />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span>{lastAnalysisNotice.message}</span>
                    {lastAnalysisNotice.type === "cached" && (
                      <span className="badge-cached-pill">Instant Cache Hit</span>
                    )}
                  </div>
                </div>
              )}

              {runAnalysisError && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: "1rem" }}>
                  <IconError />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: "1rem", flexWrap: "wrap" }}>
                    <span>{runAnalysisError}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ borderColor: "var(--rose-300)", color: "var(--rose-700)" }}
                      onClick={handleRunAiAnalysis}
                    >
                      Retry Now
                    </button>
                  </div>
                </div>
              )}

              {analysesLoading && (
                <div className="td-panel-loading"><IconSpinner /><span>Loading analyses&#8230;</span></div>
              )}
              {!analysesLoading && analysesError && (
                <div className="alert alert-error" role="alert"><IconError /><div>{analysesError}</div></div>
              )}
              {!analysesLoading && !analysesError && analyses.length === 0 && !runningAnalysis && (
                <div className="td-empty-panel">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    <circle cx="12" cy="16" r="1.5" />
                  </svg>
                  <p>No analyses yet. Click <strong>Run Analysis</strong> to get a priority suggestion.</p>
                </div>
              )}
              {!analysesLoading && analyses.length > 0 && (
                <div className="td-analyses-list">
                  {analyses.map((a, idx) => (
                    <div key={a.id} className={`td-analysis-card${idx === 0 ? " td-analysis-latest" : ""}`}>
                      <div className="td-analysis-top-badges">
                        {idx === 0 && <span className="td-analysis-badge-latest">Latest</span>}
                        {a.is_cached ? (
                          <span className="td-analysis-badge-cached" title="Served from content-hash cache">
                            Cached
                          </span>
                        ) : (
                          <span className="td-analysis-badge-fresh" title="Generated fresh from Gemini API">
                            Fresh
                          </span>
                        )}
                      </div>
                      <div className="td-analysis-header">
                        <div className="td-analysis-priority-block">
                          <span className="td-analysis-priority-label">Suggested Priority</span>
                          <span className={`badge ${getPriorityBadgeClass(a.suggested_priority)}`}>
                            <span className="badge-dot" />{a.suggested_priority}
                          </span>
                        </div>
                        <div className="td-analysis-confidence-block">
                          <span className="td-analysis-priority-label">Confidence</span>
                          <span className="td-confidence-score" style={{ color: confidenceColor(a.confidence_score) }}>
                            {confidencePercent(a.confidence_score)}
                          </span>
                          <div className="td-confidence-bar-bg">
                            <div
                              className="td-confidence-bar-fill"
                              style={{
                                width: `${Math.round((a.confidence_score || 0) * 100)}%`,
                                backgroundColor: confidenceColor(a.confidence_score),
                              }}
                            />
                          </div>
                        </div>
                        <span className="td-analysis-ts">{formatDateTime(a.created_at)}</span>
                      </div>
                      <div className="td-analysis-body">
                        <p className="td-section-label" style={{ marginBottom: "0.375rem" }}>Explanation</p>
                        <p className="td-analysis-text">{a.analysis}</p>
                      </div>
                      {idx === 0 && (
                        <div className="td-analysis-footer">
                          <div className="td-analysis-disclaimer">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            This is an AI recommendation. The actual ticket priority has not been changed.
                          </div>

                          {/* Admin Apply Priority Workflow */}
                          {user?.role === "Admin" && !runningAnalysis && a.suggested_priority && (
                            <div className="td-analysis-actions">
                              {/* If ticket content changed since this analysis was generated, recommendation is outdated */}
                              {currentContentHash && a.content_hash && currentContentHash !== a.content_hash ? (
                                <span className="td-analysis-outdated-badge" title="Ticket content changed since this analysis was created. Click 'Run Analysis' for a fresh recommendation.">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                  </svg>
                                  Content Modified — Recommendation Outdated
                                </span>
                              ) : ticket?.priority === a.suggested_priority ? (
                                /* Status indicator when ticket priority matches AI recommendation */
                                <span className="td-priority-applied-badge">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  Priority Applied: {a.suggested_priority}
                                </span>
                              ) : (
                                /* Action button to apply suggested priority */
                                <button
                                  id="apply-ai-priority-btn"
                                  type="button"
                                  className="btn btn-outline btn-sm td-apply-priority-btn"
                                  onClick={() => handleApplySuggestedPriority(a.suggested_priority)}
                                  disabled={applyingPriority}
                                >
                                  {applyingPriority ? (
                                    <>
                                      <IconSpinner />
                                      Applying Priority&#8230;
                                    </>
                                  ) : (
                                    <>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      Apply Priority: {a.suggested_priority}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}

                          {applyPriorityError && (
                            <div className="alert alert-error" role="alert" style={{ width: "100%", marginTop: "0.5rem" }}>
                              <IconError />
                              <div>{applyPriorityError}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default TicketDetailPage;
