import { api, jsonBody } from '../../api/index.js';

export const authenticate = (mode, form) =>
  api(`/auth/${mode}`, { method: 'POST', body: jsonBody(form) });

export const getCurrentUser = (token) => api('/auth/me', { token });

export const runRecoveryAction = (action, form) =>
  api(`/auth/${action}`, { method: 'POST', body: jsonBody(form) });

export const logoutRequest = (token, refreshToken) =>
  api('/auth/logout', { token, method: 'POST', body: jsonBody({ refreshToken }) });
