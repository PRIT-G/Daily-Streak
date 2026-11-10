import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import { config } from '../src/config.js';
import { verifyOAuthState, verifyOAuthStateClaims } from '../src/services/integrationSecurity.js';
import { githubUserEventsUrl } from '../src/services/githubActivity.js';
import { callbackUrl } from '../src/services/externalIntegrations.js';

const authHeader = () => `Bearer ${jwt.sign({ sub: '000000000000000000000001' }, config.jwtSecret)}`;

test('workspace integrations require authentication', async () => {
  const [status, connect, githubActivity, githubPrivateRepositories, githubPrivateActivity, leetcodeSubmissions] = await Promise.all([
    request(app).get('/api/integrations/status'),
    request(app).post('/api/integrations/jira/connect'),
    request(app).get('/api/integrations/github/activity'),
    request(app).get('/api/integrations/github/private-repositories'),
    request(app).post('/api/integrations/github/private-activity').send({ repositories: ['owner/private'] }),
    request(app).get('/api/providers/leetcode/submissions')
  ]);
  assert.equal(status.status, 401);
  assert.equal(connect.status, 401);
  assert.equal(githubActivity.status, 401);
  assert.equal(githubPrivateRepositories.status, 401);
  assert.equal(githubPrivateActivity.status, 401);
  assert.equal(leetcodeSubmissions.status, 401);
});

test('shared OAuth credentials require the owner secret, not a regular user session', async () => {
  const previous = config.integrations.adminSecret;
  config.integrations.adminSecret = 'owner-secret-for-integration-settings-32';
  try {
    const invalid = await request(app).post('/api/integrations/admin/session')
      .send({ secret: 'wrong-secret' });
    const session = await request(app).post('/api/integrations/admin/session')
      .send({ secret: config.integrations.adminSecret });
    const regularUser = await request(app).get('/api/integrations/admin/providers')
      .set('Authorization', authHeader());
    const invalidCredentials = await request(app).put('/api/integrations/admin/providers/github')
      .set('Authorization', `Bearer ${session.body.token}`)
      .send({ clientId: '', clientSecret: '' });

    assert.equal(invalid.status, 401);
    assert.equal(session.status, 200);
    assert.ok(session.body.token);
    assert.equal(regularUser.status, 401);
    assert.equal(invalidCredentials.status, 400);
  } finally {
    config.integrations.adminSecret = previous;
  }
});

test('GitHub private activity validates repository selections before provider access', async () => {
  const tooManyRepositories = await request(app).post('/api/integrations/github/private-activity')
    .set('Authorization', authHeader())
    .send({ repositories: Array.from({ length: 6 }, (_, index) => `owner/private-${index}`) });
  const invalidRepository = await request(app).post('/api/integrations/github/private-activity')
    .set('Authorization', authHeader())
    .send({ repositories: ['not-a-repository'] });
  const invalidPage = await request(app).get('/api/integrations/github/private-repositories?page=11')
    .set('Authorization', authHeader());
  assert.equal(tooManyRepositories.status, 400);
  assert.equal(invalidRepository.status, 400);
  assert.equal(invalidPage.status, 400);
});

test('GitHub activity uses the account event endpoint supported by GitHub REST API', () => {
  assert.equal(
    githubUserEventsUrl('pritgadhiya18', 1),
    'https://api.github.com/users/pritgadhiya18/events?per_page=100&page=1'
  );
});

test('GitHub OAuth requests public access by default and private access only after opt-in', async () => {
  const original = { ...config.integrations };
  Object.assign(config.integrations, {
    encryptionKey: '3'.repeat(64),
    githubClientId: 'github-test-client',
    githubClientSecret: 'github-test-secret'
  });
  try {
    const publicResponse = await request(app).post('/api/integrations/github/connect')
      .set('Authorization', authHeader());
    const publicAuthorization = new URL(publicResponse.body.url);
    assert.equal(publicResponse.status, 200);
    assert.equal(publicAuthorization.origin, 'https://github.com');
    assert.equal(publicAuthorization.pathname, '/login/oauth/authorize');
    assert.equal(publicAuthorization.searchParams.get('redirect_uri'), `${config.apiPublicUrl}/api/integrations/github/callback`);
    assert.equal(publicAuthorization.searchParams.get('scope'), 'read:user');
    assert.equal(verifyOAuthState(publicAuthorization.searchParams.get('state'), 'github'), '000000000000000000000001');

    const privateResponse = await request(app).post('/api/integrations/github/connect')
      .set('Authorization', authHeader())
      .send({ includePrivateRepositories: true });
    const privateAuthorization = new URL(privateResponse.body.url);
    assert.equal(privateResponse.status, 200);
    assert.equal(privateAuthorization.searchParams.get('scope'), 'read:user repo');
    const state = verifyOAuthStateClaims(privateAuthorization.searchParams.get('state'), 'github');
    assert.equal(state.claims.includePrivateRepositories, true);

    const invalidConsent = await request(app).post('/api/integrations/github/connect')
      .set('Authorization', authHeader())
      .send({ includePrivateRepositories: 'yes' });
    assert.equal(invalidConsent.status, 400);
  } finally {
    Object.assign(config.integrations, original);
  }
});

test('Jira and Notion endpoints validate identifiers before provider or database access', async () => {
  const auth = authHeader();
  const [issueKey, assignee, invalidAssignee, databaseId, pageId, newTask, invalidDate] = await Promise.all([
    request(app).get('/api/integrations/jira/issues/invalid/transitions').set('Authorization', auth),
    request(app).put('/api/integrations/jira/issues/invalid/assignee').set('Authorization', auth).send({ accountId: 5 }),
    request(app).put('/api/integrations/jira/issues/ABC-1/assignee').set('Authorization', auth).send({ accountId: 5 }),
    request(app).get('/api/integrations/notion/databases/not-a-uuid/tasks').set('Authorization', auth),
    request(app).patch('/api/integrations/notion/pages/not-a-uuid').set('Authorization', auth).send({ title: 'Update' }),
    request(app).post('/api/integrations/notion/databases/00000000-0000-0000-0000-000000000001/tasks')
      .set('Authorization', auth).send({ title: '' }),
    request(app).post('/api/integrations/notion/databases/00000000-0000-0000-0000-000000000001/tasks')
      .set('Authorization', auth).send({ title: 'Study', dueDate: '2026-02-31' })
  ]);
  assert.equal(issueKey.status, 400);
  assert.equal(assignee.status, 400);
  assert.equal(invalidAssignee.status, 400);
  assert.equal(databaseId.status, 400);
  assert.equal(pageId.status, 400);
  assert.equal(newTask.status, 400);
  assert.equal(invalidDate.status, 400);
});

test('Jira and Notion pagination validates cursors before provider access', async () => {
  const auth = authHeader();
  const [jiraSite, jiraCursor, notionSearchCursor, notionTaskCursor] = await Promise.all([
    request(app).put('/api/integrations/jira/site')
      .set('Authorization', auth)
      .send({ cloudId: 'not-a-uuid' }),
    request(app).get(`/api/integrations/jira/issues?nextPageToken=${'x'.repeat(2049)}`)
      .set('Authorization', auth),
    request(app).get('/api/integrations/notion/search?cursor=not-a-uuid')
      .set('Authorization', auth),
    request(app).get('/api/integrations/notion/databases/00000000-0000-0000-0000-000000000001/tasks?cursor=not-a-uuid')
      .set('Authorization', auth)
  ]);
  assert.equal(jiraSite.status, 400);
  assert.equal(jiraCursor.status, 400);
  assert.equal(notionSearchCursor.status, 400);
  assert.equal(notionTaskCursor.status, 400);
});

test('unsupported OAuth provider names are rejected', async () => {
  const response = await request(app).post('/api/integrations/unsupported/connect')
    .set('Authorization', authHeader());
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Unsupported integration.');
});

test('OAuth connect returns a provider authorization URL with a bound state and callback', async () => {
  const original = { ...config.integrations };
  Object.assign(config.integrations, {
    encryptionKey: '2'.repeat(64),
    jiraClientId: 'test-client-id',
    jiraClientSecret: 'test-client-secret'
  });

  test('OAuth callback URL uses the configured public API origin', () => {
    const previous = config.apiPublicUrl;
    config.apiPublicUrl = 'https://api.example.test/';
    try {
      assert.equal(callbackUrl('notion'), 'https://api.example.test/api/integrations/notion/callback');
    } finally {
      config.apiPublicUrl = previous;
    }
  });
  try {
    const response = await request(app).post('/api/integrations/jira/connect')
      .set('Authorization', authHeader());
    assert.equal(response.status, 200);
    const authorization = new URL(response.body.url);
    assert.equal(authorization.origin, 'https://auth.atlassian.com');
    assert.equal(authorization.searchParams.get('redirect_uri'), `${config.apiPublicUrl}/api/integrations/jira/callback`);
    assert.match(authorization.searchParams.get('scope'), /write:jira-work/);
    assert.equal(verifyOAuthState(authorization.searchParams.get('state'), 'jira'), '000000000000000000000001');
  } finally {
    Object.assign(config.integrations, original);
  }
});
