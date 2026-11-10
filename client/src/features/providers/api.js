import { api, jsonBody } from '../../api/index.js';

export const connectProvider = (token, provider, username) =>
  api(`/providers/${provider}`, { token, method: 'PUT', body: jsonBody({ username }) });

export const refreshProviderActivity = (token, provider) =>
  api(`/providers/${provider}/refresh`, { token, method: 'POST' });

export const getProviderStatus = (token) => api('/providers/status', { token });
