const API_ROOT = 'https://gitlab.com/api/v4';
const PAGE_SIZE = 100;
const MAX_PAGES = 100;

async function requestJson(url, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'DailyStreakTracker/1.0' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('GitLab profile or public activity was not found.');
    if (response.status === 429) throw new Error('GitLab rate limit reached. Try again later.');
    throw new Error(`GitLab returned status ${response.status}.`);
  }
  return response;
}

export async function fetchGitLabActivity(username, year = new Date().getUTCFullYear(), fetchImpl = fetch) {
  const clean = username.trim();
  if (!/^[\w.-]{1,255}$/.test(clean)) throw new Error('Enter a valid GitLab username.');

  const userUrl = new URL(`${API_ROOT}/users`);
  userUrl.searchParams.set('username', clean);
  const userResponse = await requestJson(userUrl, fetchImpl);
  const users = await userResponse.json();
  const user = Array.isArray(users)
    ? users.find((candidate) => candidate.username?.toLowerCase() === clean.toLowerCase())
    : null;
  if (!user) throw new Error('GitLab profile not found or its public activity is unavailable.');

  const counts = {};
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const eventsUrl = new URL(`${API_ROOT}/users/${encodeURIComponent(user.id)}/events`);
    eventsUrl.searchParams.set('after', `${year}-01-01`);
    eventsUrl.searchParams.set('before', `${year}-12-31`);
    eventsUrl.searchParams.set('per_page', String(PAGE_SIZE));
    eventsUrl.searchParams.set('page', String(page));
    const response = await requestJson(eventsUrl, fetchImpl);
    const events = await response.json();
    if (!Array.isArray(events)) throw new Error('GitLab returned an unreadable public activity history.');

    for (const event of events) {
      if (event.action_name === 'joined') continue;
      if (typeof event.created_at !== 'string') continue;
      const date = event.created_at.slice(0, 10);
      if (!date?.startsWith(`${year}-`)) continue;
      const commits = Number(event.push_data?.commit_count);
      counts[date] = (counts[date] || 0) + (Number.isFinite(commits) && commits > 0 ? commits : 1);
    }

    const nextPage = response.headers?.get?.('x-next-page');
    const hasNext = nextPage ? Number(nextPage) > page : events.length === PAGE_SIZE;
    if (!hasNext) return counts;
    if (page === MAX_PAGES) {
      throw new Error('GitLab activity is too large to sync in one request. Try again with a less active profile.');
    }
  }
  return counts;
}
