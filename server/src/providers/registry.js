import { fetchGithubActivity } from './github.js';
import { fetchLeetCodeActivity } from './leetcode.js';
import { fetchCodeforcesActivity } from './codeforces.js';
import { fetchGitLabActivity } from './gitlab.js';

export function githubSyncYears(currentYear = new Date().getUTCFullYear()) {
  return Array.from({ length: 5 }, (_, index) => currentYear - index);
}

export const providerRegistry = {
  github: {
    label: 'GitHub',
    syncYears: githubSyncYears,
    syncConcurrency: 2,
    fetchActivity: (username, year) => fetchGithubActivity(username, fetch, year)
  },
  leetcode: {
    label: 'LeetCode',
    syncYears: (currentYear) => [currentYear],
    fetchActivity: (username, year) => fetchLeetCodeActivity(username, year)
  },
  codeforces: {
    label: 'Codeforces',
    syncYears: (currentYear) => [currentYear],
    fetchActivity: (username, year) => fetchCodeforcesActivity(username, year)
  },
  gitlab: {
    label: 'GitLab',
    syncYears: githubSyncYears,
    fetchActivity: (username, year) => fetchGitLabActivity(username, year)
  }
};

export const providerAdapters = Object.fromEntries(
  Object.entries(providerRegistry).map(([id, provider]) => [id, provider.fetchActivity])
);

export function providerConnections(providers) {
  const connections = providers instanceof Map
    ? Object.fromEntries([...providers].map(([id, connection]) => [id, connection?.toObject?.() || connection]))
    : { ...(providers || {}) };

  for (const [id] of Object.entries(providerRegistry)) {
    connections[id] ||= { username: '', status: 'not-connected', message: '', lastSyncedAt: null };
  }
  return connections;
}
