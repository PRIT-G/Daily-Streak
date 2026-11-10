import { api, jsonBody } from '../../api/index.js';

export const getStudentTasks = (token) => api('/tasks', { token });

export const createStudentTask = (token, task) =>
  api('/tasks', { token, method: 'POST', body: jsonBody(task) });

export const updateStudentTask = (token, taskId, updates) =>
  api(`/tasks/${encodeURIComponent(taskId)}`, { token, method: 'PATCH', body: jsonBody(updates) });

export const deleteStudentTask = (token, taskId) =>
  api(`/tasks/${encodeURIComponent(taskId)}`, { token, method: 'DELETE' });
