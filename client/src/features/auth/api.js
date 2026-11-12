import { api, jsonBody } from '../../api/index.js';
import { signOut as betterSignOut } from '../../lib/auth-client.js';

export const authenticate = async (mode, form) => {
  if (mode === 'login') {
    return api('/auth/login', {
      method: 'POST',
      body: jsonBody({
        email: form.email,
        password: form.password,
      }),
    });
  }

  if (mode === 'register') {
    return api('/auth/register', {
      method: 'POST',
      body: jsonBody({
        name: form.name,
        email: form.email,
        password: form.password,
        consent: form.consent !== false,
      }),
    });
  }

  return api(`/auth/${mode}`, { method: 'POST', body: jsonBody(form) });
};

export const getCurrentUser = (token) => api('/auth/me', { token });

export const runRecoveryAction = (action, form) =>
  api(`/auth/${action}`, { method: 'POST', body: jsonBody(form) });

export const logoutRequest = async (token, refreshToken) => {
  try {
    await betterSignOut();
  } catch {
    // Ignore client-side signout errors
  }
  return api('/auth/logout', { token, method: 'POST', body: jsonBody({ refreshToken }) });
};
