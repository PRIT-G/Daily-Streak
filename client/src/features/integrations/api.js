import { api, jsonBody } from '../../api/index.js';

export const getIntegrationStatuses = (token) => api('/integrations/status', { token });

export const startIntegrationAdminSession = (secret) =>
  api('/integrations/admin/session', {
    method: 'POST',
    body: jsonBody({ secret }),
  });

export const getIntegrationAdminProviders = (token) =>
  api('/integrations/admin/providers', { token });

export const saveIntegrationAdminProvider = (token, provider, credentials) =>
  api(`/integrations/admin/providers/${provider}`, {
    token,
    method: 'PUT',
    body: jsonBody(credentials),
  });

export const removeIntegrationAdminProvider = (token, provider) =>
  api(`/integrations/admin/providers/${provider}`, { token, method: 'DELETE' });

export const getGithubActivity = (token) => api('/integrations/github/activity', { token });

export const getGithubPrivateRepositories = (token, page = 1) =>
  api(`/integrations/github/private-repositories?page=${page}`, { token });

export const getGithubPrivateActivity = (token, repositories) =>
  api('/integrations/github/private-activity', {
    token,
    method: 'POST',
    body: jsonBody({ repositories }),
  });

export const startIntegrationConnect = (token, provider, options = {}) =>
  api(`/integrations/${provider}/connect`, {
    token,
    method: 'POST',
    ...(provider === 'github'
      ? {
          body: jsonBody({
            includePrivateRepositories: options.includePrivateRepositories === true,
          }),
        }
      : {}),
  });

export const disconnectIntegration = (token, provider) =>
  api(`/integrations/${provider}`, { token, method: 'DELETE' });

export const selectJiraSite = (token, cloudId) =>
  api('/integrations/jira/site', {
    token,
    method: 'PUT',
    body: jsonBody({ cloudId }),
  });

export const getJiraIssues = (token, nextPageToken = '') =>
  api(
    `/integrations/jira/issues${nextPageToken ? `?nextPageToken=${encodeURIComponent(nextPageToken)}` : ''}`,
    { token }
  );

export const getJiraTransitions = (token, issueKey) =>
  api(`/integrations/jira/issues/${encodeURIComponent(issueKey)}/transitions`, { token });

export const updateJiraIssueStatus = (token, issueKey, transitionId) =>
  api(`/integrations/jira/issues/${encodeURIComponent(issueKey)}/transitions`, {
    token,
    method: 'POST',
    body: jsonBody({ transitionId }),
  });

export const searchJiraAssignees = (token, issueKey, query) =>
  api(
    `/integrations/jira/issues/${encodeURIComponent(issueKey)}/assignees?q=${encodeURIComponent(query)}`,
    { token }
  );

export const updateJiraAssignee = (token, issueKey, accountId) =>
  api(`/integrations/jira/issues/${encodeURIComponent(issueKey)}/assignee`, {
    token,
    method: 'PUT',
    body: jsonBody({ accountId }),
  });

export const searchNotion = (token, query, type = 'page', cursor = '') =>
  api(
    `/integrations/notion/search?q=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    { token }
  );

export const getNotionTasks = (token, databaseId, cursor = '') =>
  api(
    `/integrations/notion/databases/${encodeURIComponent(databaseId)}/tasks${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    { token }
  );

export const createNotionTask = (token, databaseId, task) =>
  api(`/integrations/notion/databases/${encodeURIComponent(databaseId)}/tasks`, {
    token,
    method: 'POST',
    body: jsonBody(task),
  });

export const updateNotionTask = (token, pageId, changes) =>
  api(`/integrations/notion/pages/${encodeURIComponent(pageId)}`, {
    token,
    method: 'PATCH',
    body: jsonBody(changes),
  });

export const getLeetCodeSubmissions = (token) => api('/providers/leetcode/submissions', { token });
