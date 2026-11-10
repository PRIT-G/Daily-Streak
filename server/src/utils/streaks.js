import { activityTotal } from './activitySources.js';

export function dayTotal(day) {
  return activityTotal(day);
}

export function calculateStreaks(days, dailyTarget = 1, today = new Date(), coveredDates = null) {
  const byDate = new Map(days.map((day) => [day.date, dayTotal(day)]));
  const covered = coveredDates instanceof Set ? coveredDates : new Set(coveredDates || []);
  const target = Math.max(1, Number(dailyTarget) || 1);
  const qualifies = (dateKey) => (byDate.get(dateKey) || 0) >= target || covered.has(dateKey);
  const todayKey = isoDate(today);
  const hasToday = qualifies(todayKey);
  let current = 0;
  let cursor = hasToday ? today : addDays(today, -1);
  while (qualifies(isoDate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const qualifiedDates = new Set([...byDate.keys(), ...covered]);
  const qualified = [...qualifiedDates]
    .filter((date) => qualifies(date))
    .sort();
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const date of qualified) {
    const currentDate = new Date(`${date}T00:00:00.000Z`);
    const consecutive = previous && (currentDate - previous) === 86_400_000;
    run = consecutive ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = currentDate;
  }
  return { current, longest };
}

export function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}
