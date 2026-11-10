const GRAPHQL_URL = 'https://leetcode.com/graphql';
const CALENDAR_QUERY = `query userProfileCalendar($username: String!, $year: Int) {
  matchedUser(username: $username) {
    username
    userCalendar(year: $year) { submissionCalendar }
  }
}`;
const RECENT_SUBMISSIONS_QUERY = `query recentUserSubmissions($username: String!, $limit: Int!) {
  recentSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}`;

async function leetCodeGraphql(query, variables, fetchImpl) {
  const response = await fetchImpl(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; DailyStreakTracker/1.0)'
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`LeetCode public profile service returned status ${response.status}.`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error('LeetCode public profile data is temporarily unavailable.');
  return payload.data;
}

export async function fetchLeetCodeSubmissions(username, fetchImpl = fetch) {
  const clean = username.trim();
  if (!/^[\w-]{1,30}$/.test(clean)) throw new Error('Enter a valid LeetCode username.');
  const data = await leetCodeGraphql(RECENT_SUBMISSIONS_QUERY, { username: clean, limit: 50 }, fetchImpl);
  const submissions = data?.recentSubmissionList;
  if (!Array.isArray(submissions)) {
    throw new Error('LeetCode recent submissions are unavailable for this public profile.');
  }
  const slugs = [...new Set(submissions.map((submission) => submission.titleSlug).filter(
    (slug) => typeof slug === 'string' && /^[a-z0-9-]{1,120}$/.test(slug)
  ))];
  if (!slugs.length) return [];

  const batchSize = 10;
  const problemsBySlug = {};
  for (let i = 0; i < slugs.length; i += batchSize) {
    const chunk = slugs.slice(i, i + batchSize);
    const variables = Object.fromEntries(chunk.map((slug, index) => [`slug${index}`, slug]));
    const selections = chunk.map((_, index) =>
      `problem${index}: question(titleSlug: $slug${index}) {
        questionFrontendId
        title
        titleSlug
        difficulty
        topicTags { name slug }
      }`
    );
    const declarations = chunk.map((_, index) => `$slug${index}: String!`).join(', ');
    const detailsQuery = `query submissionProblemDetails(${declarations}) { ${selections.join('\n')} }`;
    const details = await leetCodeGraphql(detailsQuery, variables, fetchImpl);
    chunk.forEach((slug, index) => {
      problemsBySlug[slug] = details?.[`problem${index}`] || null;
    });
  }

  return submissions.map((submission) => {
    const problem = problemsBySlug[submission.titleSlug] || {};
    return {
      id: String(submission.id || `${submission.titleSlug}-${submission.timestamp}`),
      questionNumber: problem.questionFrontendId || '',
      title: problem.title || submission.title || 'Untitled problem',
      titleSlug: submission.titleSlug || '',
      status: submission.statusDisplay || 'Unknown',
      language: submission.lang || '',
      submittedAt: submission.timestamp
        ? new Date(Number(submission.timestamp) * 1000).toISOString()
        : '',
      difficulty: problem.difficulty || '',
      topics: (problem.topicTags || []).map((tag) => tag.name).filter(Boolean)
    };
  });
}

export async function fetchLeetCodeActivity(username, year = new Date().getUTCFullYear(), fetchImpl = fetch) {
  const clean = username.trim();
  if (!/^[\w-]{1,30}$/.test(clean)) throw new Error('Enter a valid LeetCode username.');
  const data = await leetCodeGraphql(CALENDAR_QUERY, { username: clean, year: Number(year) }, fetchImpl);
  const calendar = data?.matchedUser?.userCalendar?.submissionCalendar;
  if (!calendar) throw new Error('LeetCode profile not found or its public calendar is unavailable.');
  let parsed;
  try {
    parsed = typeof calendar === 'string' ? JSON.parse(calendar) : calendar;
  } catch {
    throw new Error('LeetCode returned an unreadable activity calendar.');
  }
  return Object.fromEntries(Object.entries(parsed).map(([timestamp, count]) => [
    new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
    Number(count) || 0
  ]));
}
