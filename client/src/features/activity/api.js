import { api, jsonBody } from '../../api/index.js';

export const getPrivateActivityEntries = (token) =>
  api('/private-activity', { token });

export const createPrivateActivityEntry = (token, entry) =>
  api('/private-activity', { token, method: 'POST', body: jsonBody(entry) });

export const deletePrivateActivityEntry = (token, entryId) =>
  api(`/private-activity/${encodeURIComponent(entryId)}`, { token, method: 'DELETE' });
