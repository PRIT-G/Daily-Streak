import { activitySources } from './activitySources.js';
import { dayTotal } from './streaks.js';

const WINDOW_DAYS = 30;
const BEST_DAY_WINDOW_DAYS = 90;
const STALE_SYNC_MS = 7 * 24 * 60 * 60 * 1000;
const STREAK_MILESTONES = [
  { threshold: 7, title: 'Week on fire' },
  { threshold: 14, title: 'Two-week rhythm' },
  { threshold: 30, title: 'Month maker' },
];

function shiftDate(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function windowKeys(todayKey, days) {
  return Array.from({ length: days }, (_, index) => shiftDate(todayKey, index - (days - 1)));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function shiftIso(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatForecastDate(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Least-squares linear regression over daily totals; returns slope per day.
function dailySlope(values) {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) ** 2;
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

function buildPrediction(byDate, todayKey, streaks, target) {
  // Trailing 90-day daily totals (oldest -> newest, today last).
  const series = [];
  for (let offset = 89; offset >= 0; offset -= 1) {
    series.push(dayTotal(byDate.get(shiftIso(todayKey, -offset)) || {}));
  }
  const slope = dailySlope(series);
  const recentAvg = series.slice(-14).reduce((sum, value) => sum + value, 0) / 14;
  const baseline = Math.max(recentAvg, slope > 0 ? recentAvg : recentAvg * 0.9);

  // Forecast: days until the current streak would reach each milestone,
  // assuming the recent daily pace continues and the goal is met daily.
  const milestones = [7, 14, 30, 60, 100];
  const current = Number(streaks?.current) || 0;
  const forecasts = milestones
    .filter((threshold) => current < threshold)
    .map((threshold) => {
      const remaining = threshold - current;
      // At recent pace, estimate days needed; streak grows ~1/day when goal met.
      const paceRatio = baseline >= target ? 1 : Math.min(1, baseline / target);
      const daysNeeded = paceRatio > 0 ? Math.ceil(remaining / paceRatio) : null;
      return {
        streakDays: threshold,
        daysNeeded,
        estimatedDate: daysNeeded === null ? null : shiftIso(todayKey, daysNeeded),
      };
    })
    .filter((item) => item.daysNeeded !== null && item.daysNeeded <= 365)
    .slice(0, 3);

  return {
    recentDailyAverage: round1(recentAvg),
    trendSlope: round1(slope * 100) / 100,
    trend: slope > 0.05 ? 'improving' : slope < -0.05 ? 'declining' : 'steady',
    forecasts: forecasts.map((item) => ({
      ...item,
      estimatedDateLabel: item.estimatedDate ? formatForecastDate(item.estimatedDate) : null,
    })),
  };
}

function buildAnomaly(byDate, todayKey) {
  // Compare the last 30 days against the previous 30 days.
  const recent = [];
  const prior = [];
  for (let offset = 29; offset >= 0; offset -= 1)
    recent.push(dayTotal(byDate.get(shiftIso(todayKey, -offset)) || {}));
  for (let offset = 59; offset >= 30; offset -= 1)
    prior.push(dayTotal(byDate.get(shiftIso(todayKey, -offset)) || {}));
  const recentSum = recent.reduce((sum, value) => sum + value, 0);
  const priorSum = prior.reduce((sum, value) => sum + value, 0);
  if (priorSum === 0) {
    return { detected: false, direction: null, changePercent: 0, message: null };
  }
  const changePercent = Math.round(((recentSum - priorSum) / priorSum) * 100);
  if (Math.abs(changePercent) < 30) {
    return { detected: false, direction: null, changePercent, message: null };
  }
  const direction = changePercent > 0 ? 'up' : 'down';
  return {
    detected: true,
    direction,
    changePercent,
    message:
      direction === 'down'
        ? `Activity dropped ${Math.abs(changePercent)}% versus the previous 30 days.`
        : `Activity is up ${changePercent}% versus the previous 30 days — great momentum.`,
  };
}

function buildGoalSuggestion(byDate, todayKey, currentTarget) {
  // Suggest a target near the median of active days over the last 90 days.
  const totals = [];
  for (let offset = 89; offset >= 0; offset -= 1) {
    const total = dayTotal(byDate.get(shiftIso(todayKey, -offset)) || {});
    if (total > 0) totals.push(total);
  }
  if (totals.length < 7) return null;
  totals.sort((a, b) => a - b);
  const median = totals[Math.floor(totals.length / 2)];
  const suggestion = Math.min(1000, Math.max(1, Math.round(median)));
  if (suggestion === currentTarget) return null;
  const currentHitRate = totals.filter((total) => total >= currentTarget).length / totals.length;
  const suggestedHitRate = totals.filter((total) => total >= suggestion).length / totals.length;
  return {
    suggestedTarget: suggestion,
    currentTarget,
    activeDays: totals.length,
    currentHitRate: Math.round(currentHitRate * 100),
    suggestedHitRate: Math.round(suggestedHitRate * 100),
    message:
      suggestion > currentTarget
        ? `Your median active day is ${suggestion} items — consider raising your goal to ${suggestion}.`
        : `Your median active day is ${suggestion} items — a goal of ${suggestion} is more achievable than ${currentTarget}.`,
  };
}

export function buildInsights(days, dailyTarget, streaks, providers, now = new Date()) {
  const target = Math.max(1, Number(dailyTarget) || 1);
  const todayKey = now.toISOString().slice(0, 10);
  const byDate = new Map((days || []).map((day) => [day.date, day]));

  const windowKeys30 = windowKeys(todayKey, WINDOW_DAYS);
  const totals = windowKeys30.map((key) => dayTotal(byDate.get(key) || {}));
  const goalDays = totals.filter((total) => total >= target).length;
  const activeDays = totals.filter((total) => total > 0).length;
  const consistencyScore = Math.round((goalDays / WINDOW_DAYS) * 100);
  const averageDailyActivity = round1(totals.reduce((sum, total) => sum + total, 0) / WINDOW_DAYS);

  const bestDayWindow = windowKeys(todayKey, BEST_DAY_WINDOW_DAYS);
  let bestDay = null;
  for (const key of bestDayWindow) {
    const total = dayTotal(byDate.get(key) || {});
    if (total > 0 && (!bestDay || total > bestDay.total)) bestDay = { date: key, total };
  }

  const sourceTotals = {};
  for (const key of windowKeys30) {
    const day = byDate.get(key);
    if (!day) continue;
    for (const [source, count] of Object.entries(activitySources(day))) {
      sourceTotals[source] = (sourceTotals[source] || 0) + Math.max(0, Number(count) || 0);
    }
  }
  const busiestSource = Object.entries(sourceTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ id, count }));

  const thisWeekKeys = windowKeys(todayKey, 7);
  const lastWeekKeys = windowKeys(shiftDate(todayKey, -7), 7);
  const countGoalDays = (keys) =>
    keys.filter((key) => dayTotal(byDate.get(key) || {}) >= target).length;
  const weekComparison = {
    thisWeek: countGoalDays(thisWeekKeys),
    lastWeek: countGoalDays(lastWeekKeys),
  };

  const todayTotal = dayTotal(byDate.get(todayKey) || {});
  const todayMet = todayTotal >= target;
  const currentStreak = Number(streaks?.current) || 0;
  const streakAtRisk = currentStreak > 0 && !todayMet;

  const longestStreak = Number(streaks?.longest) || 0;
  const nextMilestone =
    STREAK_MILESTONES.find((milestone) => longestStreak < milestone.threshold) || null;

  const connections = providers && typeof providers === 'object' ? providers : {};
  const connectedProviders = Object.entries(connections).filter(
    ([, connection]) => connection?.username
  );
  const staleProviders = connectedProviders
    .filter(([, connection]) => {
      const syncedAt = connection?.lastSyncedAt ? new Date(connection.lastSyncedAt).getTime() : 0;
      return !syncedAt || now.getTime() - syncedAt > STALE_SYNC_MS;
    })
    .map(([id]) => id);

  const recommendations = [];
  if (connectedProviders.length === 0) {
    recommendations.push({
      id: 'connect-provider',
      text: 'Connect a coding profile in Settings to start automatic activity tracking.',
    });
  }
  if (streakAtRisk) {
    recommendations.push({
      id: 'protect-streak',
      text: `Log some activity today to protect your ${currentStreak}-day streak.`,
    });
  } else if (currentStreak > 0 && todayMet) {
    recommendations.push({
      id: 'streak-alive',
      text: `Your ${currentStreak}-day streak is safe for today. Consistency beats intensity.`,
    });
  }
  if (activeDays > 0 && consistencyScore < 40) {
    recommendations.push({
      id: 'build-consistency',
      text: `You hit your goal on ${goalDays} of the last ${WINDOW_DAYS} days. Small daily sessions build the strongest streaks.`,
    });
  }
  if (weekComparison.thisWeek < weekComparison.lastWeek && weekComparison.lastWeek > 0) {
    recommendations.push({
      id: 'week-comeback',
      text: `This week is behind last week (${weekComparison.thisWeek} vs ${weekComparison.lastWeek} goal days). One focused session closes the gap.`,
    });
  }
  if (busiestSource.length > 0 && connectedProviders.length > 0 && connectedProviders.length < 2) {
    recommendations.push({
      id: 'diversify-sources',
      text: 'Most of your activity comes from a single source. Connect another provider for a fuller picture.',
    });
  }
  if (goalDays === WINDOW_DAYS) {
    recommendations.push({
      id: 'raise-goal',
      text: 'A perfect 30 days. Consider raising your daily target to keep growing.',
    });
  }
  if (activeDays === 0 && connectedProviders.length > 0) {
    recommendations.push({
      id: 'first-activity',
      text: 'No activity recorded yet this month. Your first synced day starts the journey.',
    });
  }

  const anomaly = buildAnomaly(byDate, todayKey);
  const goalSuggestion = buildGoalSuggestion(byDate, todayKey, target);
  if (goalSuggestion) {
    recommendations.push({ id: 'goal-suggestion', text: goalSuggestion.message });
  }
  if (anomaly.detected && anomaly.direction === 'down') {
    recommendations.unshift({ id: 'anomaly-drop', text: anomaly.message });
  }

  const prediction = buildPrediction(byDate, todayKey, streaks, target);

  return {
    windowDays: WINDOW_DAYS,
    consistencyScore,
    activeDays,
    goalDays,
    averageDailyActivity,
    bestDay,
    busiestSource,
    weekComparison,
    streak: { current: currentStreak, atRisk: streakAtRisk, todayMet },
    nextMilestone: nextMilestone
      ? { ...nextMilestone, daysRemaining: Math.max(0, nextMilestone.threshold - longestStreak) }
      : null,
    prediction,
    anomaly,
    goalSuggestion,
    recommendations: recommendations.slice(0, 4),
    dataQuality: {
      connectedProviders: connectedProviders.length,
      staleProviders,
    },
  };
}
