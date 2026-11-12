const API_URL = 'https://codeforces.com/api/user.status';
const SUBMISSION_LIMIT = 10000;

export async function fetchCodeforcesActivity(
  username,
  year = new Date().getUTCFullYear(),
  fetchImpl = fetch
) {
  const clean = username.trim();
  if (!/^[\w.-]{1,24}$/.test(clean)) throw new Error('Enter a valid Codeforces handle.');

  const url = new URL(API_URL);
  url.searchParams.set('handle', clean);
  url.searchParams.set('from', '1');
  url.searchParams.set('count', String(SUBMISSION_LIMIT));
  const response = await fetchImpl(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'DailyStreakTracker/1.0' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Codeforces rate limit reached. Try again later.');
    throw new Error(`Codeforces returned status ${response.status}.`);
  }

  const payload = await response.json();
  if (payload.status !== 'OK' || !Array.isArray(payload.result)) {
    throw new Error(
      payload.comment || 'Codeforces could not find a public submission history for this handle.'
    );
  }

  const counts = {};
  const yearPrefix = `${year}-`;
  for (const submission of payload.result) {
    const timestamp = Number(submission.creationTimeSeconds);
    if (!Number.isFinite(timestamp)) continue;
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    if (date.startsWith(yearPrefix)) counts[date] = (counts[date] || 0) + 1;
  }
  return counts;
}
