// authService.js — Handles authentication API calls.
// Connects to POST /api/users/register and POST /api/users/login.
// Not yet wired to the UI — will be called from Login/Register pages.

import api from './api';

const authService = {
  /**
   * Register a new user.
   * @param {{ name: string, email: string, password: string }} data
   */
  register: (data) => api.post('/users/register', data),

  /**
   * Log in and receive a JWT token.
   * @param {{ email: string, password: string }} data
   * @returns {{ token: string, user: object }}
   */
  login: (data) => api.post('/users/login', data),
};

export default authService;
