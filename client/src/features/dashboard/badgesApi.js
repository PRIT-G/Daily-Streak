import { api, jsonBody } from '../../api/index.js';

export const uploadEarnedBadge = (token, badge) =>
  api('/badges', { token, method: 'POST', body: jsonBody(badge) });

export const deleteUploadedBadge = (token, badgeId) =>
  api(`/badges/${encodeURIComponent(badgeId)}`, { token, method: 'DELETE' });

export const getBadgeGallery = (token) => api('/badges/gallery', { token });

export const enableBadgeGallery = (token) =>
  api('/badges/gallery', { token, method: 'POST' });

export const disableBadgeGallery = (token) =>
  api('/badges/gallery', { token, method: 'DELETE' });
