import { apiBlob, api, jsonBody } from '../../api/index.js';

export const exportAccount = (token) => apiBlob('/account/export', { token });

export const exportActivityCsv = (token) => apiBlob('/account/export/activity.csv', { token });

export const deleteAccount = (token, password) =>
  api('/account', { token, method: 'DELETE', body: jsonBody({ password }) });
