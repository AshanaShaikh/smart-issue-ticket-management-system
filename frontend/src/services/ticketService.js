// ticketService.js — Handles all ticket-related API calls.
// Maps to the existing /api/tickets endpoints in ticketRoutes.js.
// All methods require the user to be logged in (JWT is attached by api.js).

import api from './api';

const ticketService = {
  /** GET /api/tickets — returns tickets for the logged-in user's role */
  getAll: () => api.get('/tickets'),

  /** GET /api/tickets/:id */
  getById: (id) => api.get(`/tickets/${id}`),

  /** POST /api/tickets */
  create: (data) => api.post('/tickets', data),

  /** PUT /api/tickets/:id */
  update: (id, data) => api.put(`/tickets/${id}`, data),

  // --- Comments ---
  /** GET /api/tickets/:id/comments */
  getComments: (id) => api.get(`/tickets/${id}/comments`),

  /** POST /api/tickets/:id/comments */
  addComment: (id, data) => api.post(`/tickets/${id}/comments`, data),

  /** PUT /api/tickets/comments/:commentId */
  editComment: (commentId, data) => api.put(`/tickets/comments/${commentId}`, data),

  /** DELETE /api/tickets/comments/:commentId */
  deleteComment: (commentId) => api.delete(`/tickets/comments/${commentId}`),

  // --- History ---
  /** GET /api/tickets/:id/history */
  getHistory: (id) => api.get(`/tickets/${id}/history`),

  // --- AI Analysis ---
  /** POST /api/tickets/:id/ai-analysis */
  runAiAnalysis: (id) => api.post(`/tickets/${id}/ai-analysis`),

  /** GET /api/tickets/:id/ai-analysis */
  getAiAnalyses: (id) => api.get(`/tickets/${id}/ai-analysis`),
};

export default ticketService;
