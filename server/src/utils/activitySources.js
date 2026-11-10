const LEGACY_SOURCES = ['github', 'leetcode', 'manual'];

export function activitySources(day) {
  const storedSources = day.sources instanceof Map
    ? Object.fromEntries(day.sources)
    : day.sources || {};
  const sources = { ...storedSources };

  for (const source of LEGACY_SOURCES) {
    if (!Object.hasOwn(sources, source) && Number(day[source]) > 0) {
      sources[source] = Number(day[source]);
    }
  }
  return sources;
}

export function activityTotal(day) {
  return Object.values(activitySources(day)).reduce(
    (total, count) => total + Math.max(0, Number(count) || 0),
    0
  );
}
