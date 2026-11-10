import { Router } from 'express';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import {
  callbackUrl,
  getAccessToken,
  getProviderCredentials,
  isConfigured,
  jiraRequest,
  listIntegrationStatuses,
  notionRequest,
  removeIntegration,
  saveIntegration,
  selectJiraSite
} from '../services/externalIntegrations.js';
import {
  fetchGithubActivity,
  fetchGithubPrivateActivity,
  fetchGithubPrivateRepositories
} from '../services/githubActivity.js';
import { createOAuthState, verifyOAuthStateClaims } from '../services/integrationSecurity.js';
import { logger } from '../utils/logger.js';

const router = Router();
const validIssueKey = /^[A-Z][A-Z0-9_]*-\d{1,10}$/i;
const validProviderId = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

function fetchProvider(url, options) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(12000) });
}

function safeClientRedirect(status, provider) {
  const page = provider === 'github' ? 'activity' : 'work';
  const query = provider === 'github' ? `github=${status}` : `integration=${status}`;
  return `${config.clientOrigin.replace(/\/+$/, '')}/#${page}?${query}`;
}

function propertyPlainText(value = []) {
  return value.map((part) => part.plain_text || part.text?.content || '').join('');
}

function notionPropertySchema(database) {
  const properties = Object.entries(database.properties || {});
  const title = properties.find(([, property]) => property.type === 'title');
  const status = properties.find(([name, property]) =>
    ['status', 'select'].includes(property.type) && /status|state|progress/i.test(name)
  ) || properties.find(([, property]) => ['status', 'select'].includes(property.type));
  const dueDate = properties.find(([name, property]) =>
    property.type === 'date' && /due|date|deadline/i.test(name)
  ) || properties.find(([, property]) => property.type === 'date');
  return {
    title: title ? { name: title[0], type: title[1].type } : null,
    status: status ? {
      name: status[0],
      type: status[1].type,
      options: (status[1][status[1].type]?.options || []).map((option) => option.name)
    } : null,
    dueDate: dueDate ? { name: dueDate[0], type: dueDate[1].type } : null
  };
}

function notionTask(page, schema) {
  const properties = page.properties || {};
  const titleValue = schema.title && properties[schema.title.name]?.title;
  const statusProperty = schema.status && properties[schema.status.name];
  const statusValue = statusProperty?.[schema.status.type];
  const dueValue = schema.dueDate && properties[schema.dueDate.name]?.date;
  const status = statusValue?.name || '';
  return {
    id: page.id,
    title: propertyPlainText(titleValue || []),
    status,
    completed: /done|complete|closed|finished/i.test(status),
    dueDate: dueValue?.start || '',
    url: page.url || ''
  };
}

function notionPageSummary(page) {
  const titleProperty = Object.values(page.properties || {}).find((property) => property.type === 'title');
  return {
    id: page.id,
    title: propertyPlainText(titleProperty?.title || []) || 'Untitled page',
    url: page.url || '',
    lastEditedTime: page.last_edited_time || ''
  };
}

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    return res.json({ integrations: await listIntegrationStatuses(req.userId) });
  } catch (error) {
    return next(error);
  }
});

router.post('/:provider/connect', requireAuth, async (req, res, next) => {
  const { provider } = req.params;
  if (!['jira', 'notion', 'github'].includes(provider)) return res.status(404).json({ error: 'Unsupported integration.' });
  if (provider === 'github' &&
      req.body?.includePrivateRepositories !== undefined &&
      typeof req.body.includePrivateRepositories !== 'boolean') {
    return res.status(400).json({ error: 'Private repository access must be explicitly enabled or disabled.' });
  }
  try {
    if (!await isConfigured(provider)) {
      const name = provider === 'jira' ? 'Jira' : provider === 'github' ? 'GitHub' : 'Notion';
      return res.status(503).json({ error: `${name} OAuth is not configured by the app administrator.` });
    }
    const includePrivateRepositories = provider === 'github' && req.body?.includePrivateRepositories === true;
    const state = createOAuthState(req.userId, provider, { includePrivateRepositories });
    const redirectUri = callbackUrl(provider);
    const credentials = await getProviderCredentials(provider);
    const authorizationUrl = provider === 'jira'
      ? new URL('https://auth.atlassian.com/authorize')
      : provider === 'github'
        ? new URL('https://github.com/login/oauth/authorize')
        : new URL('https://api.notion.com/v1/oauth/authorize');

    authorizationUrl.search = new URLSearchParams(provider === 'jira'
      ? {
        audience: 'api.atlassian.com',
        client_id: credentials.id,
        scope: 'offline_access read:jira-user read:jira-work write:jira-work',
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        prompt: 'consent'
      }
      : provider === 'github'
        ? {
          client_id: credentials.id,
          redirect_uri: redirectUri,
          scope: req.body?.includePrivateRepositories ? 'read:user repo' : 'read:user',
          state
        }
        : {
        client_id: credentials.id,
        redirect_uri: redirectUri,
        response_type: 'code',
        owner: 'user',
        state
      }).toString();
    return res.json({ url: authorizationUrl.toString() });
  } catch (error) {
    return next(error);
  }
});

router.get('/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  if (!['jira', 'notion', 'github'].includes(provider)) return res.status(404).send('Unsupported integration.');
  if (req.query.error || typeof req.query.code !== 'string' || typeof req.query.state !== 'string') {
    return res.redirect(302, safeClientRedirect('failed', provider));
  }
  try {
    const { userId, claims } = verifyOAuthStateClaims(req.query.state, provider);
    if (!mongoose.isValidObjectId(userId) || !await User.exists({ _id: userId })) {
      return res.redirect(302, safeClientRedirect('failed', provider));
    }
    if (!await isConfigured(provider)) return res.redirect(302, safeClientRedirect('failed', provider));

    const credentials = await getProviderCredentials(provider);
    const redirectUri = callbackUrl(provider);
    const tokenUrl = provider === 'jira'
      ? 'https://auth.atlassian.com/oauth/token'
      : provider === 'github'
        ? 'https://github.com/login/oauth/access_token'
        : 'https://api.notion.com/v1/oauth/token';
    const response = await fetchProvider(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(provider === 'notion'
          ? { Authorization: `Basic ${Buffer.from(`${credentials.id}:${credentials.secret}`).toString('base64')}` }
          : {})
      },
      body: JSON.stringify(provider === 'jira'
        ? {
          grant_type: 'authorization_code',
          client_id: credentials.id,
          client_secret: credentials.secret,
          code: req.query.code,
          redirect_uri: redirectUri
        }
        : provider === 'github'
          ? {
            client_id: credentials.id,
            client_secret: credentials.secret,
            code: req.query.code,
            redirect_uri: redirectUri
          }
          : {
          grant_type: 'authorization_code',
          code: req.query.code,
          redirect_uri: redirectUri
        })
    });
    const tokenPayload = await response.json().catch(() => ({}));
    if (!response.ok || !tokenPayload.access_token) {
      logger.error(`OAuth token exchange failed for ${provider} (${response.status}).`);
      return res.redirect(302, safeClientRedirect('failed', provider));
    }

    let providerData;
    if (provider === 'jira') {
      const sitesResponse = await fetchProvider('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: { Authorization: `Bearer ${tokenPayload.access_token}`, Accept: 'application/json' }
      });
      const sites = await sitesResponse.json().catch(() => []);
      if (!sitesResponse.ok || !Array.isArray(sites) || !sites.length) {
        logger.error(`Could not load Jira sites (${sitesResponse.status}).`);
        return res.redirect(302, safeClientRedirect('failed', provider));
      }
      providerData = {
        cloudId: sites[0].id,
        siteName: sites[0].name,
        siteUrl: sites[0].url,
        sites: sites.map((site) => ({
          cloudId: site.id,
          siteName: site.name,
          siteUrl: site.url
        }))
      };
    } else if (provider === 'github') {
      const userResponse = await fetchProvider('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenPayload.access_token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'DailyStreakTracker/1.0'
        }
      });
      const githubUser = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok || !githubUser.login) {
        logger.error(`Could not load GitHub user (${userResponse.status}).`);
        return res.redirect(302, safeClientRedirect('failed', provider));
      }
      providerData = {
        login: githubUser.login,
        avatarUrl: githubUser.avatar_url || '',
        profileUrl: githubUser.html_url || '',
        privateAccess: claims.includePrivateRepositories === true &&
          (!tokenPayload.scope || String(tokenPayload.scope).split(/[,\s]+/).includes('repo'))
      };
    } else {
      providerData = {
        workspaceId: tokenPayload.workspace_id || '',
        workspaceName: tokenPayload.workspace_name || '',
        botId: tokenPayload.bot_id || ''
      };
    }

    await saveIntegration({
      userId,
      provider,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token || '',
      expiresIn: Number(tokenPayload.expires_in),
      providerData
    });
    return res.redirect(302, safeClientRedirect('connected', provider));
  } catch (error) {
    logger.error(`OAuth callback failed for ${provider}: ${error.message}`);
    return res.redirect(302, safeClientRedirect('failed', provider));
  }
});

router.delete('/:provider', requireAuth, async (req, res, next) => {
  if (!['jira', 'notion', 'github'].includes(req.params.provider)) {
    return res.status(404).json({ error: 'Unsupported integration.' });
  }
  try {
    await removeIntegration(req.userId, req.params.provider);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.put('/jira/site', requireAuth, async (req, res, next) => {
  const cloudId = typeof req.body?.cloudId === 'string' ? req.body.cloudId : '';
  if (!validProviderId.test(cloudId)) return res.status(400).json({ error: 'Choose a valid Jira site.' });
  try {
    const site = await selectJiraSite(req.userId, cloudId);
    return res.json({ site });
  } catch (error) {
    return next(error);
  }
});

router.get('/jira/issues', requireAuth, async (req, res, next) => {
  const nextPageToken = typeof req.query.nextPageToken === 'string' ? req.query.nextPageToken : '';
  if (nextPageToken.length > 2048) return res.status(400).json({ error: 'Jira page token is invalid.' });
  try {
    const query = new URLSearchParams({
      jql: 'assignee = currentUser() ORDER BY updated DESC',
      maxResults: '50',
      fields: 'summary,status,priority,duedate,project,assignee'
    });
    if (nextPageToken) query.set('nextPageToken', nextPageToken);
    const accessContext = await getAccessToken(req.userId, 'jira');
    const result = await jiraRequest(
      req.userId,
      `/rest/api/3/search/jql?${query}`,
      {},
      accessContext
    );
    return res.json({
      nextPageToken: typeof result.nextPageToken === 'string' ? result.nextPageToken : '',
      issues: (result.issues || []).map((issue) => ({
        key: issue.key,
        summary: issue.fields?.summary || '',
        status: issue.fields?.status?.name || 'Unknown',
        priority: issue.fields?.priority?.name || '',
        dueDate: issue.fields?.duedate || '',
        project: issue.fields?.project?.name || '',
        assignee: issue.fields?.assignee?.displayName || '',
        url: `${accessContext.providerData?.siteUrl || ''}/browse/${encodeURIComponent(issue.key)}`
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/github/activity', requireAuth, async (req, res, next) => {
  try {
    return res.json(await fetchGithubActivity(req.userId));
  } catch (error) {
    return next(error);
  }
});

router.get('/github/private-repositories', requireAuth, async (req, res, next) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  if (!Number.isInteger(page) || page < 1 || page > 10) {
    return res.status(400).json({ error: 'Choose a private repository page between 1 and 10.' });
  }
  try {
    return res.json(await fetchGithubPrivateRepositories(req.userId, page));
  } catch (error) {
    return next(error);
  }
});

router.post('/github/private-activity', requireAuth, async (req, res, next) => {
  try {
    return res.json(await fetchGithubPrivateActivity(req.userId, req.body?.repositories));
  } catch (error) {
    return next(error);
  }
});

router.get('/jira/issues/:issueKey/transitions', requireAuth, async (req, res, next) => {
  if (!validIssueKey.test(req.params.issueKey)) return res.status(400).json({ error: 'Jira issue key is invalid.' });
  try {
    const result = await jiraRequest(
      req.userId,
      `/rest/api/3/issue/${encodeURIComponent(req.params.issueKey)}/transitions`
    );
    return res.json({
      transitions: (result.transitions || []).map((transition) => ({
        id: transition.id,
        name: transition.name,
        status: transition.to?.name || ''
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/jira/issues/:issueKey/transitions', requireAuth, async (req, res, next) => {
  const transitionId = String(req.body?.transitionId || '');
  if (!validIssueKey.test(req.params.issueKey)) return res.status(400).json({ error: 'Jira issue key is invalid.' });
  if (!/^[\da-z_-]{1,100}$/i.test(transitionId)) return res.status(400).json({ error: 'Choose a valid Jira transition.' });
  try {
    await jiraRequest(
      req.userId,
      `/rest/api/3/issue/${encodeURIComponent(req.params.issueKey)}/transitions`,
      { method: 'POST', body: JSON.stringify({ transition: { id: transitionId } }) }
    );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/jira/issues/:issueKey/assignees', requireAuth, async (req, res, next) => {
  if (!validIssueKey.test(req.params.issueKey)) return res.status(400).json({ error: 'Jira issue key is invalid.' });
  const query = String(req.query.q || '').trim().slice(0, 100);
  if (query.length < 2) return res.status(400).json({ error: 'Enter at least two characters to search Jira users.' });
  try {
    const params = new URLSearchParams({
      issueKey: req.params.issueKey,
      query,
      maxResults: '20'
    });
    const result = await jiraRequest(req.userId, `/rest/api/3/user/assignable/search?${params}`);
    return res.json({
      users: (Array.isArray(result) ? result : []).map((user) => ({
        accountId: user.accountId,
        displayName: user.displayName,
        avatarUrl: user.avatarUrls?.['24x24'] || ''
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/jira/issues/:issueKey/assignee', requireAuth, async (req, res, next) => {
  if (!validIssueKey.test(req.params.issueKey)) return res.status(400).json({ error: 'Jira issue key is invalid.' });
  const accountId = req.body?.accountId;
  if (typeof accountId !== 'string' || accountId.length > 200) {
    return res.status(400).json({ error: 'Choose a valid Jira assignee or leave the field empty to unassign.' });
  }
  try {
    await jiraRequest(
      req.userId,
      `/rest/api/3/issue/${encodeURIComponent(req.params.issueKey)}/assignee`,
      { method: 'PUT', body: JSON.stringify({ accountId: accountId || null }) }
    );
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/notion/search', requireAuth, async (req, res, next) => {
  const query = String(req.query.q || '').trim().slice(0, 100);
  const type = req.query.type === 'database' ? 'database' : 'page';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  if (cursor && !validProviderId.test(cursor)) return res.status(400).json({ error: 'Notion page cursor is invalid.' });
  try {
    const result = await notionRequest(req.userId, '/search', {
      method: 'POST',
      body: JSON.stringify({
        ...(query ? { query } : {}),
        filter: { property: 'object', value: type },
        page_size: 50,
        ...(cursor ? { start_cursor: cursor } : {}),
        sort: { direction: 'descending', timestamp: 'last_edited_time' }
      })
    });
    return res.json({
      hasMore: Boolean(result.has_more && result.next_cursor),
      nextCursor: typeof result.next_cursor === 'string' ? result.next_cursor : '',
      results: (result.results || []).map((item) => ({
        id: item.id,
        title: type === 'database'
          ? propertyPlainText(item.title || []) || 'Untitled database'
          : notionPageSummary(item).title,
        url: item.url || '',
        lastEditedTime: item.last_edited_time || ''
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/notion/databases/:databaseId', requireAuth, async (req, res, next) => {
  if (!validProviderId.test(req.params.databaseId)) return res.status(400).json({ error: 'Notion database id is invalid.' });
  try {
    const database = await notionRequest(req.userId, `/databases/${encodeURIComponent(req.params.databaseId)}`);
    return res.json({
      database: { id: database.id, title: propertyPlainText(database.title || []) || 'Untitled database' },
      schema: notionPropertySchema(database)
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/notion/databases/:databaseId/tasks', requireAuth, async (req, res, next) => {
  if (!validProviderId.test(req.params.databaseId)) return res.status(400).json({ error: 'Notion database id is invalid.' });
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '';
  if (cursor && !validProviderId.test(cursor)) return res.status(400).json({ error: 'Notion page cursor is invalid.' });
  try {
    const [database, result] = await Promise.all([
      notionRequest(req.userId, `/databases/${encodeURIComponent(req.params.databaseId)}`),
      notionRequest(req.userId, `/databases/${encodeURIComponent(req.params.databaseId)}/query`, {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
          sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
        })
      })
    ]);
    const schema = notionPropertySchema(database);
    if (!schema.title) return res.status(422).json({ error: 'This Notion database has no title property and cannot be used as a task list.' });
    return res.json({
      database: { id: database.id, title: propertyPlainText(database.title || []) || 'Untitled database' },
      schema,
      hasMore: Boolean(result.has_more && result.next_cursor),
      nextCursor: typeof result.next_cursor === 'string' ? result.next_cursor : '',
      tasks: (result.results || []).map((page) => notionTask(page, schema))
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/notion/databases/:databaseId/tasks', requireAuth, async (req, res, next) => {
  if (!validProviderId.test(req.params.databaseId)) return res.status(400).json({ error: 'Notion database id is invalid.' });
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const dueDate = req.body?.dueDate || '';
  if (!title || title.length > 120) return res.status(400).json({ error: 'Task title must be between 1 and 120 characters.' });
  const parsedDueDate = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
  if (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      !Number.isFinite(parsedDueDate.getTime()) || parsedDueDate.toISOString().slice(0, 10) !== dueDate)) {
    return res.status(400).json({ error: 'Enter a valid task due date.' });
  }
  try {
    const database = await notionRequest(req.userId, `/databases/${encodeURIComponent(req.params.databaseId)}`);
    const schema = notionPropertySchema(database);
    if (!schema.title) return res.status(422).json({ error: 'This Notion database has no title property and cannot be used as a task list.' });
    const properties = {
      [schema.title.name]: { title: [{ text: { content: title } }] }
    };
    if (dueDate && schema.dueDate) properties[schema.dueDate.name] = { date: { start: dueDate } };
    const page = await notionRequest(req.userId, '/pages', {
      method: 'POST',
      body: JSON.stringify({ parent: { database_id: req.params.databaseId }, properties })
    });
    return res.status(201).json({ task: notionTask(page, schema) });
  } catch (error) {
    return next(error);
  }
});

router.patch('/notion/pages/:pageId', requireAuth, async (req, res, next) => {
  if (!validProviderId.test(req.params.pageId)) return res.status(400).json({ error: 'Notion page id is invalid.' });
  const allowedFields = new Set(['title', 'status', 'dueDate']);
  if (!req.body || Object.keys(req.body).some((field) => !allowedFields.has(field)) || !Object.keys(req.body).length) {
    return res.status(400).json({ error: 'Provide a task title, status, or due date to update.' });
  }
  try {
    const page = await notionRequest(req.userId, `/pages/${encodeURIComponent(req.params.pageId)}`);
    const parentId = page.parent?.database_id;
    if (!parentId) return res.status(422).json({ error: 'This Notion page is not part of a task database.' });
    const database = await notionRequest(req.userId, `/databases/${encodeURIComponent(parentId)}`);
    const schema = notionPropertySchema(database);
    const properties = {};
    if (Object.hasOwn(req.body, 'title')) {
      const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
      if (!title || title.length > 120 || !schema.title) return res.status(400).json({ error: 'Enter a valid task title.' });
      properties[schema.title.name] = { title: [{ text: { content: title } }] };
    }
    if (Object.hasOwn(req.body, 'status')) {
      const status = String(req.body.status);
      if (!schema.status || !schema.status.options.includes(status)) {
        return res.status(400).json({ error: 'Choose one of the status options configured in the Notion database.' });
      }
      properties[schema.status.name] = {
        [schema.status.type]: { name: status }
      };
    }
    if (Object.hasOwn(req.body, 'dueDate')) {
      const dueDate = req.body.dueDate || '';
      const parsedDueDate = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
      if (!schema.dueDate || (dueDate && (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
          !Number.isFinite(parsedDueDate.getTime()) || parsedDueDate.toISOString().slice(0, 10) !== dueDate))) {
        return res.status(400).json({ error: 'A supported due-date property and valid date are required.' });
      }
      properties[schema.dueDate.name] = { date: dueDate ? { start: dueDate } : null };
    }
    const updated = await notionRequest(req.userId, `/pages/${encodeURIComponent(req.params.pageId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties })
    });
    return res.json({ task: notionTask(updated, schema) });
  } catch (error) {
    return next(error);
  }
});

export default router;
