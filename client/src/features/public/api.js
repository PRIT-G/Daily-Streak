import { api } from '../../api/index.js';

export const getPublicProfile = (userId) => api(`/public/profiles/${userId}`);

export const getLeaderboard = () => api('/public/leaderboard');
