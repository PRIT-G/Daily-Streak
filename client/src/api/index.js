const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export const TOKEN_KEY = 'daily-streak-token';
export const REFRESH_KEY = 'daily-streak-refresh';

let sessionUpdatedHandler = null;
export function onSessionUpdated(handler) {
  sessionUpdatedHandler = handler;
}

export function storeSession(token, refreshToken) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function refreshTokens() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      clearSession();
      return null;
    }
    const payload = await response.json();
    storeSession(payload.token, payload.refreshToken);
    sessionUpdatedHandler?.(payload.token, payload.user);
    return payload.token;
  } catch {
    return null;
  }
}

export function apiUrl(path) {
  return new URL(`${API_BASE}${path}`, window.location.origin).toString();
}

async function fetchWithAuth(path, options, token) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function api(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetchWithAuth(path, options, token);
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      const newToken = await refreshTokens();
      if (newToken) {
        response = await fetchWithAuth(path, options, newToken);
      }
    }
  } catch (cause) {
    const error = new Error(
      `Could not reach the API at ${API_BASE}. Check that the backend is running and the API URL is configured correctly.`,
      { cause }
    );
    error.code = 'API_UNREACHABLE';
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function apiBlob(path, { token } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (response.status === 401 && token && !path.startsWith('/auth/')) {
      const newToken = await refreshTokens();
      if (newToken) {
        response = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
      }
    }
  } catch (cause) {
    const error = new Error(
      `Could not reach the API at ${API_BASE}. Check that the backend is running and the API URL is configured correctly.`,
      { cause }
    );
    error.code = 'API_UNREACHABLE';
    throw error;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

export const jsonBody = (value) => JSON.stringify(value);
