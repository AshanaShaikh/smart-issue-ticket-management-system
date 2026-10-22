// api.js — Central Axios-free HTTP helper.
// All requests to the backend will go through this file.
// Base URL points to the existing Express server.

const BASE_URL = 'http://localhost:5000/api';

/**
 * A thin fetch wrapper that:
 *  - Automatically sets Content-Type to application/json
 *  - Attaches the JWT token from localStorage when present
 *  - Throws on non-2xx responses with the server error message
 *
 * @param {string} endpoint  e.g. '/users/login'
 * @param {object} options   Standard fetch options (method, body, etc.)
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    // Throw the backend's error message so it can be shown in the UI.
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
}

// Convenience methods — will be used by the service files.
const api = {
  get:    (endpoint)         => request(endpoint, { method: 'GET' }),
  post:   (endpoint, body)   => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint, body)   => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (endpoint)         => request(endpoint, { method: 'DELETE' }),
};

export default api;
