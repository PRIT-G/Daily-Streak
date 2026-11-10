import { getAccessToken } from './externalIntegrations.js';

const GITHUB_API = 'https://api.github.com';
const MAX_EVENT_PAGES = 3;
const MAX_PULL_REQUEST_DETAILS = 10;
const MAX_PRIVATE_REPOSITORIES = 5;

function privateAccessRequired() {
  const error = new Error('Private repository access has not been enabled. Reconnect GitHub and explicitly approve private repository access first.');
  error.status = 403;
  return error;
}

async function getGithubContext(userId) {
  const context = await getAccessToken(userId, 'github');
  if (!context.providerData.privateAccess) throw privateAccessRequired();
  return context;
}

async function githubFetch(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DailyStreakTracker/1.0'
    },
    signal: AbortSignal.timeout(12000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? 'GitHub authorization expired. Disconnect and reconnect GitHub.'
        : response.status === 403 || response.status === 429
          ? 'GitHub rate limit reached. Try again later.'
          : response.status === 404
            ? payload.message || 'The requested GitHub resource was not found. Check the OAuth app and account permissions.'
            : `GitHub request failed (${response.status}).`
    );
    error.status = response.status === 401 ? 401 : response.status === 403 || response.status === 429 ? 429 : 502;
    throw error;
  }
  return payload;
}

export function githubUserEventsUrl(login, page) {
  return `${GITHUB_API}/users/${encodeURIComponent(login)}/events?per_page=100&page=${page}`;
}

function eventSummary(event) {
  const payload = event.payload || {};
  const repo = event.repo?.name || '';
  const pullRequest = payload.pull_request;
  const issue = payload.issue;
  const review = payload.review;
  const commitCount = event.type === 'PushEvent'
    ? Number(payload.size) || payload.commits?.length || 0
    : 0;
  let summary = event.type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  if (event.type === 'PushEvent') summary = `Pushed ${commitCount} ${commitCount === 1 ? 'commit' : 'commits'}`;
  if (event.type === 'PullRequestEvent') {
    summary = `${payload.action || 'Updated'} pull request #${pullRequest?.number || ''}: ${pullRequest?.title || ''}`.trim();
  }
  if (event.type === 'PullRequestReviewEvent') {
    summary = `${review?.state || 'Submitted'} review on pull request #${pullRequest?.number || ''}`.trim();
  }
  if (event.type === 'IssuesEvent') {
    summary = `${payload.action || 'Updated'} issue #${issue?.number || ''}: ${issue?.title || ''}`.trim();
  }
  if (event.type === 'IssueCommentEvent') {
    summary = `Commented on issue #${issue?.number || ''}: ${issue?.title || ''}`.trim();
  }
  return {
    id: String(event.id),
    type: event.type || 'Activity',
    repository: repo,
    createdAt: event.created_at || '',
    summary,
    commitCount,
    action: payload.action || '',
    url: pullRequest?.html_url || issue?.html_url || (repo ? `https://github.com/${repo}` : ''),
    pullRequest: pullRequest ? {
      number: pullRequest.number,
      title: pullRequest.title || '',
      state: pullRequest.state || '',
      merged: Boolean(pullRequest.merged || pullRequest.merged_at),
      mergeable: typeof pullRequest.mergeable === 'boolean' ? pullRequest.mergeable : null,
      mergeableState: pullRequest.mergeable_state || ''
    } : null,
    reviewState: review?.state || ''
  };
}

function pullRequestKey(repository, number) {
  return repository && number ? `${repository}#${number}` : '';
}

async function fetchPullRequestDetails(events, token) {
  const references = new Map();
  for (const event of events) {
    const pullRequest = event.payload?.pull_request;
    const repository = event.repo?.name || '';
    const key = pullRequestKey(repository, pullRequest?.number);
    if (event.type === 'PullRequestEvent' && key) references.set(key, { repository, number: pullRequest.number });
  }
  const limitedReferences = [...references.entries()].slice(0, MAX_PULL_REQUEST_DETAILS);
  const details = new Map();
  for (let index = 0; index < limitedReferences.length; index += 10) {
    const batch = limitedReferences.slice(index, index + 10);
    const results = await Promise.all(batch.map(async ([key, reference]) => {
      const parts = reference.repository.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) return { key, detail: null };
      const [owner, repo] = parts;
      try {
        return {
          key,
          detail: await githubFetch(
            `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${reference.number}`,
            token
          )
        };
      } catch (error) {
        if (error.status === 404) return { key, detail: null };
        throw error;
      }
    }));
    for (const result of results) {
      if (result.detail) details.set(result.key, result.detail);
    }
  }
  return { details, inspected: limitedReferences.length };
}

export async function fetchGithubActivity(userId) {
  const { token } = await getAccessToken(userId, 'github');
  const profile = await githubFetch(`${GITHUB_API}/user`, token);
  const eventPages = await Promise.all(Array.from({ length: MAX_EVENT_PAGES }, (_, index) =>
    githubFetch(githubUserEventsUrl(profile.login, index + 1), token)
  ));
  const sourceEvents = eventPages.flatMap((page) => Array.isArray(page) ? page : []);
  const pullRequestDetails = await fetchPullRequestDetails(sourceEvents, token);
  const events = sourceEvents.map((event) => {
    const key = pullRequestKey(event.repo?.name || '', event.payload?.pull_request?.number);
    const detail = pullRequestDetails.details.get(key);
    const mapped = eventSummary(event);
    if (!detail || !mapped.pullRequest) return mapped;
    return {
      ...mapped,
      pullRequest: {
        ...mapped.pullRequest,
        state: detail.state || mapped.pullRequest.state,
        merged: Boolean(detail.merged_at),
        mergeable: typeof detail.mergeable === 'boolean' ? detail.mergeable : null,
        mergeableState: detail.mergeable_state || ''
      }
    };
  });
  const repositories = [...new Set(events.map((event) => event.repository).filter(Boolean))].sort();
  const summary = events.reduce((totals, event) => {
    totals.events += 1;
    totals.commits += event.commitCount;
    if (event.type === 'PullRequestEvent') totals.pullRequests += 1;
    if (event.type === 'PullRequestReviewEvent') totals.reviews += 1;
    if (event.type === 'IssuesEvent' || event.type === 'IssueCommentEvent') totals.issues += 1;
    if (event.pullRequest?.merged) totals.merged += 1;
    if (event.pullRequest?.mergeable === false || event.pullRequest?.mergeableState === 'dirty') totals.conflicts += 1;
    return totals;
  }, { events: 0, commits: 0, pullRequests: 0, reviews: 0, issues: 0, merged: 0, conflicts: 0 });

  return {
    profile: { login: profile.login || '', avatarUrl: profile.avatar_url || '', profileUrl: profile.html_url || '' },
    summary: { ...summary, repositories: repositories.length },
    repositories,
    events,
    limitations: `GitHub only exposes up to 300 recent account events (typically the last 90 days), not a complete lifetime contribution or repository history. Merge/conflict details are enriched for up to ${pullRequestDetails.inspected} recent pull requests; GitHub may return mergeability as unknown while calculating it.`
  };
}

export async function fetchGithubPrivateRepositories(userId, page = 1) {
  const { token } = await getGithubContext(userId);
  const response = await githubFetch(
    `${GITHUB_API}/user/repos?visibility=private&affiliation=owner,collaborator,organization_member&sort=pushed&direction=desc&per_page=100&page=${page}`,
    token
  );
  const repositories = Array.isArray(response) ? response : [];
  return {
    repositories: repositories
      .filter((repository) => repository.private && typeof repository.full_name === 'string')
      .map((repository) => ({
        fullName: repository.full_name,
        description: repository.description || '',
        pushedAt: repository.pushed_at || '',
        defaultBranch: repository.default_branch || ''
      })),
    page,
    hasMore: repositories.length === 100
  };
}

export async function fetchGithubPrivateActivity(userId, repositoryNames) {
  if (!Array.isArray(repositoryNames) ||
      repositoryNames.length < 1 ||
      repositoryNames.length > MAX_PRIVATE_REPOSITORIES ||
      repositoryNames.some((name) => typeof name !== 'string' || !/^[\w.-]{1,100}\/[\w.-]{1,100}$/.test(name))) {
    const error = new Error(`Select between 1 and ${MAX_PRIVATE_REPOSITORIES} valid private repositories.`);
    error.status = 400;
    throw error;
  }
  const { token, providerData } = await getGithubContext(userId);
  const login = providerData.login;
  if (!login) {
    const error = new Error('GitHub account details are missing. Disconnect and reconnect GitHub.');
    error.status = 401;
    throw error;
  }

  const repos = [...new Set(repositoryNames)];
  const repositoryActivity = await Promise.all(repos.map(async (fullName) => {
    const [owner, repo] = fullName.split('/');
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);
    const repository = await githubFetch(`${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}`, token);
    if (!repository.private) {
      const error = new Error(`Repository ${fullName} is not private.`);
      error.status = 400;
      throw error;
    }
    const [commits, pullRequests] = await Promise.all([
      githubFetch(`${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}/commits?author=${encodeURIComponent(login)}&per_page=100`, token),
      githubFetch(`${GITHUB_API}/repos/${encodedOwner}/${encodedRepo}/pulls?state=all&sort=updated&direction=desc&per_page=100`, token)
    ]);
    const ownCommits = Array.isArray(commits) ? commits : [];
    const ownPullRequests = (Array.isArray(pullRequests) ? pullRequests : []).filter((pullRequest) =>
      pullRequest.user?.login?.toLowerCase() === login.toLowerCase()
    );
    return {
      repository: fullName,
      commits: ownCommits.map((commit) => ({
        id: commit.sha,
        type: 'Commit',
        summary: commit.commit?.message?.split('\n')[0] || 'Commit',
        createdAt: commit.commit?.author?.date || '',
        url: commit.html_url || ''
      })),
      pullRequests: ownPullRequests.map((pullRequest) => ({
        id: String(pullRequest.id),
        type: pullRequest.merged_at ? 'Merged pull request' : 'Pull request',
        number: pullRequest.number,
        summary: pullRequest.title || 'Pull request',
        state: pullRequest.merged_at ? 'merged' : pullRequest.state || 'unknown',
        createdAt: pullRequest.created_at || '',
        updatedAt: pullRequest.updated_at || '',
        url: pullRequest.html_url || ''
      }))
    };
  }));
  const events = repositoryActivity.flatMap((repository) => [
    ...repository.commits.map((event) => ({ ...event, repository: repository.repository })),
    ...repository.pullRequests.map((event) => ({ ...event, repository: repository.repository }))
  ]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    repositories: repositoryActivity,
    events,
    summary: {
      repositories: repositoryActivity.length,
      commits: repositoryActivity.reduce((count, repository) => count + repository.commits.length, 0),
      pullRequests: repositoryActivity.reduce((count, repository) => count + repository.pullRequests.length, 0),
      merged: repositoryActivity.reduce((count, repository) =>
        count + repository.pullRequests.filter((pullRequest) => pullRequest.state === 'merged').length, 0)
    },
    limitations: 'Private repository data is only fetched for the repositories you selected. Up to 100 recent commits and pull requests per selected repository are checked. This does not include every possible private contribution or full history.'
  };
}
