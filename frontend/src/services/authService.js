// authService.js — Handles authentication and user provisioning API calls.
// Connects to /api/users endpoints in userRoutes.js.

import api from './api';

const authService = {
  /**
   * Public registration for standard users.
   * Server strictly enforces role = 'User'.
   * @param {{ name: string, email: string, password: string, user_type: string }} data
   */
  register: (data) => api.post('/users/register', data),

  /**
   * Log in and receive a JWT token.
   * @param {{ email: string, password: string }} data
   * @returns {{ token: string, user: object }}
   */
  login: (data) => api.post('/users/login', data),

  /**
   * Fetch current authenticated user's profile.
   */
  getProfile: () => api.get('/users/profile'),

  /**
   * Fetch all users in the system (Admin only).
   * @returns {Promise<{ users: Array }>}
   */
  getAllUsers: () => api.get('/users'),

  /**
   * Provision a new account directly (Admin only).
   * Used by Admins to provision Agent/Worker or Admin accounts.
   * @param {{ name: string, email: string, password: string, user_type: string, role?: string }} data
   * @returns {Promise<{ message: string, user: object }>}
   */
  provisionUser: (data) => api.post('/users/provision', data),

  /**
   * Promote or update a user's system role (Admin only).
   * @param {number|string} id
   * @param {{ role: string }} data
   * @returns {Promise<{ message: string, user: object }>}
   */
  updateUserRole: (id, data) => api.put(`/users/${id}/role`, data),

  /**
   * Fetch list of active agents (for ticket assignment).
   * @returns {Promise<{ agents: Array }>}
   */
  getAgents: () => api.get('/users/agents'),
};

export default authService;
