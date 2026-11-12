import { api, jsonBody } from '../../api/index.js';

export const createWebhookToken = (token) =>
  api('/webhooks/token', { token, method: 'POST', body: jsonBody({}) });

export const revokeWebhookToken = (token) => api('/webhooks/token', { token, method: 'DELETE' });
