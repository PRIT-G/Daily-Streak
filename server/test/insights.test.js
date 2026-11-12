import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInsights } from '../src/utils/insights.js';

const NOW = new Date('2025-06-15T12:00:00Z'); // a Sunday
const TODAY = '2025-06-15';

function daysAgo(key, amount) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - amount);
  return date.toISOString().slice(0, 10);
}

test('returns safe defaults for an empty history', () => {
  const insights = buildInsights([], 1, { current: 0, longest: 0 }, {}, NOW);
  assert.equal(insights.consistencyScore, 0);
  assert.equal(insights.activeDays, 0);
  assert.equal(insights.bestDay, null);
  assert.equal(insights.streak.atRisk, false);
  assert.equal(insights.nextMilestone.title, 'Week on fire');
  assert.ok(insights.recommendations.some((item) => item.id === 'connect-provider'));
});

test('computes consistency, averages, and best day over the window', () => {
  const days = [
    { date: daysAgo(TODAY, 1), github: 3 },
    { date: daysAgo(TODAY, 5), sources: { leetcode: 2, manual: 1 } },
    { date: daysAgo(TODAY, 40), github: 50 },
  ];
  const insights = buildInsights(days, 2, { current: 1, longest: 1 }, {}, NOW);
  // both in-window days total 3, meeting target 2; the 40-days-ago day is outside the window
  assert.equal(insights.goalDays, 2);
  assert.equal(insights.consistencyScore, Math.round((2 / 30) * 100));
  assert.equal(insights.activeDays, 2);
  assert.equal(insights.averageDailyActivity, Math.round(((3 + 3) / 30) * 10) / 10);
  // best day looks back 90 days, so the 40-days-ago 50-count day wins
  assert.deepEqual(insights.bestDay, { date: daysAgo(TODAY, 40), total: 50 });
});

test('flags streak risk when today has not met the goal', () => {
  const days = [{ date: daysAgo(TODAY, 1), github: 1 }];
  const insights = buildInsights(days, 1, { current: 5, longest: 9 }, {}, NOW);
  assert.equal(insights.streak.atRisk, true);
  assert.equal(insights.streak.todayMet, false);
  assert.ok(insights.recommendations.some((item) => item.id === 'protect-streak'));
});

test('reports next streak milestone and week comparison', () => {
  const days = [];
  // last week: 3 goal days; this week: 1 goal day (today excluded from risk since met)
  for (let i = 0; i < 3; i += 1) days.push({ date: daysAgo(TODAY, 8 + i), github: 1 });
  days.push({ date: TODAY, github: 1 });
  const insights = buildInsights(days, 1, { current: 1, longest: 9 }, {}, NOW);
  assert.deepEqual(insights.weekComparison, { thisWeek: 1, lastWeek: 3 });
  assert.equal(insights.nextMilestone.threshold, 14);
  assert.equal(insights.nextMilestone.daysRemaining, 5);
  assert.ok(insights.recommendations.some((item) => item.id === 'week-comeback'));
});

test('detects busiest source and stale provider syncs', () => {
  const days = [
    { date: TODAY, github: 4, sources: { github: 4, codeforces: 1 } },
    { date: daysAgo(TODAY, 2), sources: { github: 2 } },
  ];
  const providers = {
    github: {
      username: 'octocat',
      lastSyncedAt: new Date(NOW.getTime() - 30 * 86400000).toISOString(),
    },
    leetcode: { username: 'user', lastSyncedAt: NOW.toISOString() },
  };
  const insights = buildInsights(days, 1, { current: 1, longest: 1 }, providers, NOW);
  assert.equal(insights.busiestSource[0].id, 'github');
  assert.equal(insights.dataQuality.connectedProviders, 2);
  assert.deepEqual(insights.dataQuality.staleProviders, ['github']);
});

test('caps recommendations at four entries', () => {
  const days = [{ date: TODAY, github: 5 }];
  const insights = buildInsights(days, 1, { current: 30, longest: 30 }, {}, NOW);
  assert.ok(insights.recommendations.length <= 4);
  assert.equal(insights.nextMilestone, null);
});
