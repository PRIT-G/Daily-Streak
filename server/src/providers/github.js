const PROFILE_ROOT = 'https://github.com';

export function parseGithubContributions(html) {
  const tooltips = new Map();
  const tooltipPattern = /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/gi;
  for (const match of html.matchAll(tooltipPattern)) {
    tooltips.set(
      match[1],
      match[2]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  const totals = {};
  const cellPattern = /<td\b[^>]*\bclass="[^"]*\bContributionCalendar-day\b[^"]*"[^>]*>/gi;
  for (const match of html.matchAll(cellPattern)) {
    const date = match[0].match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const id = match[0].match(/\bid="([^"]+)"/)?.[1];
    if (!date || !id) continue;

    const tooltip = tooltips.get(id);
    const count = tooltip?.match(/\b([\d,]+) contributions?\b/i)?.[1];
    if (count) totals[date] = Number(count.replaceAll(',', ''));
    else if (tooltip?.toLowerCase().startsWith('no contributions')) totals[date] = 0;
  }
  return totals;
}

export async function fetchGithubActivity(
  username,
  fetchImpl = fetch,
  year = new Date().getUTCFullYear()
) {
  const clean = username.trim();
  if (!/^[\w-]{1,39}$/.test(clean)) throw new Error('Enter a valid GitHub username.');
  const response = await fetchImpl(
    `${PROFILE_ROOT}/users/${encodeURIComponent(clean)}/contributions?from=${year}-01-01&to=${year}-12-31`,
    {
      headers: {
        Accept: 'text/html',
        'User-Agent': 'DailyStreakTracker/1.0',
      },
      signal: AbortSignal.timeout(12000),
    }
  );
  if (!response.ok) {
    if (response.status === 404)
      throw new Error('GitHub profile not found or its contribution calendar is unavailable.');
    if (response.status === 403 || response.status === 429)
      throw new Error('GitHub rate limit reached. Try again later.');
    throw new Error(`GitHub returned status ${response.status}.`);
  }

  const html = await response.text();
  const totals = parseGithubContributions(html);
  if (!Object.keys(totals).length) {
    throw new Error('GitHub did not return a readable public contribution calendar.');
  }
  return totals;
}
