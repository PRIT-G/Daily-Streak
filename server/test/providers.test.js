import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchGithubActivity, parseGithubContributions } from '../src/providers/github.js';
import { fetchLeetCodeActivity, fetchLeetCodeSubmissions } from '../src/providers/leetcode.js';
import { fetchCodeforcesActivity } from '../src/providers/codeforces.js';
import { fetchGitLabActivity } from '../src/providers/gitlab.js';
import { providerConnections, providerRegistry } from '../src/providers/registry.js';
import { fetchActivityYears, githubSyncYears } from '../src/services/providerService.js';

test('provider connection serialization supports registered and future providers', () => {
  const connections = providerConnections(new Map([
    ['github', { username: 'octocat', status: 'synced' }],
    ['jira', { username: 'workspace', status: 'connected' }]
  ]));
  assert.equal(connections.github.username, 'octocat');
  assert.equal(connections.jira.username, 'workspace');
  assert.equal(connections.leetcode.status, 'not-connected');
  assert.equal(connections.codeforces.status, 'not-connected');
  assert.equal(connections.gitlab.status, 'not-connected');
});

test('GitHub sync includes the current year and four prior years', () => {
  assert.deepEqual(githubSyncYears(2026), [2026, 2025, 2024, 2023, 2022]);
  assert.equal(providerRegistry.github.syncConcurrency, 2);
});

test('yearly provider sync runs bounded batches and combines all activity', async () => {
  let activeRequests = 0;
  let maxActiveRequests = 0;
  const activity = await fetchActivityYears(async (_username, year) => {
    activeRequests += 1;
    maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
    await new Promise((resolve) => setTimeout(resolve, 2));
    activeRequests -= 1;
    return { [`${year}-01-01`]: 1 };
  }, 'coder', [2026, 2025, 2024, 2023, 2022], 2);

  assert.equal(maxActiveRequests, 2);
  assert.equal(Object.keys(activity).length, 5);
  assert.equal(activity['2022-01-01'], 1);
});

test('new provider sync ranges reflect public API limits', () => {
  assert.deepEqual(providerRegistry.codeforces.syncYears(2026), [2026]);
  assert.deepEqual(providerRegistry.gitlab.syncYears(2026), [2026, 2025, 2024, 2023, 2022]);
});

test('GitHub adapter imports daily contribution calendar counts', async () => {
  const fetchMock = async (url, options) => {
    assert.match(url, /users\/octocat\/contributions\?from=2025-01-01&to=2025-12-31/);
    assert.equal(options.headers.Accept, 'text/html');
    return {
      ok: true,
      text: async () => `
        <td id="day-1" data-date="2025-03-01" class="ContributionCalendar-day"></td>
        <tool-tip for="day-1">3 contributions on March 1st.</tool-tip>
        <td data-date="2025-03-02" id="day-2" class="ContributionCalendar-day"></td>
        <tool-tip for="day-2">No contributions on March 2nd.</tool-tip>
      `
    };
  };
  assert.deepEqual(await fetchGithubActivity('octocat', fetchMock, 2025), {
    '2025-03-01': 3,
    '2025-03-02': 0
  });
});

test('GitHub contribution parser supports comma-separated counts and skips unrelated cells', () => {
  const html = `
    <td id="day-1" data-date="2025-03-01" class="ContributionCalendar-day"></td>
    <tool-tip for="day-1">1,234 contributions on March 1st.</tool-tip>
    <td id="other" data-date="2025-03-02" class="other-day"></td>
    <tool-tip for="other">99 contributions on March 2nd.</tool-tip>
  `;
  assert.deepEqual(parseGithubContributions(html), { '2025-03-01': 1234 });
});

test('GitHub adapter reports rate limits without hiding the failure', async () => {
  const fetchMock = async () => ({ ok: false, status: 429 });
  await assert.rejects(() => fetchGithubActivity('octocat', fetchMock), /rate limit/i);
});

test('GitHub adapter fails explicitly when the contribution calendar is unreadable', async () => {
  const fetchMock = async () => ({ ok: true, text: async () => '<html>Unavailable</html>' });
  await assert.rejects(() => fetchGithubActivity('octocat', fetchMock), /readable public contribution calendar/i);
});

test('LeetCode adapter parses its public calendar into ISO days', async () => {
  const timestamp = Date.parse('2025-03-02T00:00:00Z') / 1000;
  const fetchMock = async (_url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.variables.username, 'coder');
    return {
      ok: true,
      json: async () => ({
        data: { matchedUser: { userCalendar: { submissionCalendar: JSON.stringify({ [timestamp]: 4 }) } } }
      })
    };
  };
  assert.deepEqual(await fetchLeetCodeActivity('coder', 2025, fetchMock), { '2025-03-02': 4 });
});

test('LeetCode adapter reports missing public calendar data', async () => {
  const fetchMock = async () => ({ ok: true, json: async () => ({ data: { matchedUser: null } }) });
  await assert.rejects(() => fetchLeetCodeActivity('unknown', 2025, fetchMock), /not found/i);
});

test('LeetCode submission adapter includes public status, difficulty, and topic metadata', async () => {
  let requestCount = 0;
  const fetchMock = async (_url, options) => {
    requestCount += 1;
    const body = JSON.parse(options.body);
    if (body.query.includes('recentUserSubmissions')) {
      assert.equal(body.variables.username, 'coder');
      return {
        ok: true,
        json: async () => ({
          data: {
            recentSubmissionList: [{
              id: '123',
              title: 'Two Sum',
              titleSlug: 'two-sum',
              timestamp: '1740931200',
              statusDisplay: 'Accepted',
              lang: 'javascript'
            }]
          }
        })
      };
    }
    assert.match(body.query, /questionFrontendId/);
    assert.equal(body.variables.slug0, 'two-sum');
    return {
      ok: true,
      json: async () => ({
        data: {
          problem0: {
            questionFrontendId: '1',
            title: 'Two Sum',
            titleSlug: 'two-sum',
            difficulty: 'Easy',
            topicTags: [{ name: 'Array', slug: 'array' }, { name: 'Hash Table', slug: 'hash-table' }]
          }
        }
      })
    };
  };
  const submissions = await fetchLeetCodeSubmissions('coder', fetchMock);
  assert.equal(requestCount, 2);
  assert.deepEqual(submissions[0], {
    id: '123',
    questionNumber: '1',
    title: 'Two Sum',
    titleSlug: 'two-sum',
    status: 'Accepted',
    language: 'javascript',
    submittedAt: new Date(1740931200 * 1000).toISOString(),
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table']
  });
});

test('Codeforces adapter aggregates public submissions by UTC day', async () => {
  const fetchMock = async (url) => {
    assert.match(url.toString(), /user\.status\?handle=handle&from=1&count=10000/);
    return {
      ok: true,
      json: async () => ({
        status: 'OK',
        result: [
          { creationTimeSeconds: Date.parse('2025-03-02T18:00:00Z') / 1000 },
          { creationTimeSeconds: Date.parse('2025-03-02T08:00:00Z') / 1000 },
          { creationTimeSeconds: Date.parse('2024-12-31T23:00:00Z') / 1000 }
        ]
      })
    };
  };
  assert.deepEqual(await fetchCodeforcesActivity('handle', 2025, fetchMock), { '2025-03-02': 2 });
});

test('Codeforces adapter reports invalid handles and missing profiles', async () => {
  await assert.rejects(() => fetchCodeforcesActivity('bad handle', 2025, fetch), /valid Codeforces handle/i);
  await assert.rejects(() => fetchCodeforcesActivity('missing', 2025, async () => ({
    ok: true,
    json: async () => ({ status: 'FAILED', comment: 'handle not found' })
  })), /handle not found/i);
});

test('GitLab adapter finds the exact public username and aggregates events', async () => {
  const fetchMock = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/users')) {
      assert.equal(parsedUrl.searchParams.get('username'), 'coder');
      return { ok: true, json: async () => [{ id: 7, username: 'coder' }] };
    }
    assert.match(parsedUrl.pathname, /\/users\/7\/events$/);
    assert.equal(parsedUrl.searchParams.get('after'), '2025-01-01');
    return {
      ok: true,
      headers: { get: () => '' },
      json: async () => [
        { created_at: '2025-03-02T18:00:00Z', push_data: { commit_count: 3 } },
        { created_at: '2025-03-02T08:00:00Z', action_name: 'opened' }
      ]
    };
  };
  assert.deepEqual(await fetchGitLabActivity('coder', 2025, fetchMock), { '2025-03-02': 4 });
});

test('GitLab adapter reports missing profiles without importing another username', async () => {
  await assert.rejects(() => fetchGitLabActivity('unknown', 2025, async () => ({
    ok: true,
    json: async () => [{ id: 8, username: 'another-user' }]
  })), /profile not found/i);
});

test('GitLab adapter follows pagination and ignores project-join events', async () => {
  const fetchMock = async (url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.pathname.endsWith('/users')) {
      return { ok: true, json: async () => [{ id: 7, username: 'coder' }] };
    }
    const page = parsedUrl.searchParams.get('page');
    return {
      ok: true,
      headers: { get: () => page === '1' ? '2' : '' },
      json: async () => page === '1'
        ? Array.from({ length: 100 }, () => ({
          created_at: '2025-03-02T18:00:00Z',
          action_name: 'joined'
        }))
        : [{ created_at: '2025-03-03T08:00:00Z', action_name: 'opened' }]
    };
  };
  assert.deepEqual(await fetchGitLabActivity('coder', 2025, fetchMock), { '2025-03-03': 1 });
});
