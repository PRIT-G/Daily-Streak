import { api, jsonBody } from '../../api/index.js';
export {
  deleteUploadedBadge,
  disableBadgeGallery,
  enableBadgeGallery,
  getBadgeGallery,
  uploadEarnedBadge
} from './badgesApi.js';
export {
  createStudentTask,
  deleteStudentTask,
  getStudentTasks,
  updateStudentTask
} from './tasksApi.js';

export const getDashboard = (token, year = new Date().getUTCFullYear()) =>
  api(`/dashboard?year=${year}`, { token });

export const updateGoal = (token, dailyTarget) =>
  api('/dashboard/goal', { token, method: 'PUT', body: jsonBody({ dailyTarget }) });

export const updateReminders = (token, enabled, reminderTime, weeklyDigest) =>
  api('/dashboard/reminders', { token, method: 'PUT', body: jsonBody({ enabled, reminderTime, weeklyDigest }) });

export const updateStreakFreeze = (token, enabled) =>
  api('/dashboard/streak-freeze', { token, method: 'PUT', body: jsonBody({ enabled }) });

export const updatePublicProfile = (token, enabled) =>
  api('/dashboard/public-profile', { token, method: 'PUT', body: jsonBody({ enabled }) });
