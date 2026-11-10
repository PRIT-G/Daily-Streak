import { calculateStreaks, dayTotal, isoDate } from '../utils/streaks.js';

const MAX_SHIELDS = 5;
const SHIELD_EVERY_DAYS = 7;
const COVER_WINDOW_DAYS = 14;
const MAX_COVERED_DATES = 60;
const MAX_WALK_DAYS = 400;

function shiftKey(dateKey, amount) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function qualifiesOn(dateKey, totals, target, covered) {
  return covered.has(dateKey) || (totals.get(dateKey) || 0) >= target;
}

/**
 * Applies streak-freeze rules for a user:
 *  - awards +1 shield for every full SHIELD_EVERY_DAYS block of longest streak
 *  - spends shields to cover missed days inside the current streak run
 *    (only gaps within COVER_WINDOW_DAYS of today)
 * Mutates and saves the user document when state changes.
 * Returns the recomputed streaks.
 */
export async function applyStreakFreeze(user, days, now = new Date()) {
  const freeze = user.streakFreeze || (user.streakFreeze = {});
  freeze.enabled = freeze.enabled === true;
  freeze.shields = Math.min(MAX_SHIELDS, Math.max(0, Number(freeze.shields) || 0));
  freeze.coveredDates = Array.isArray(freeze.coveredDates) ? freeze.coveredDates.slice(-MAX_COVERED_DATES) : [];
  freeze.rewardedThrough = Math.max(0, Number(freeze.rewardedThrough) || 0);

  if (!freeze.enabled) {
    return calculateStreaks(days, user.goal.dailyTarget, now, freeze.coveredDates);
  }

  const target = Math.max(1, Number(user.goal.dailyTarget) || 1);
  const covered = new Set(freeze.coveredDates);
  const totals = new Map(days.map((day) => [day.date, dayTotal(day)]));
  const todayKey = isoDate(now);
  const minCoverable = shiftKey(todayKey, -COVER_WINDOW_DAYS);

  // Award shields for each completed 7-day block of longest streak.
  const strictStreaks = calculateStreaks(days, target, now, freeze.coveredDates);
  const earnedThrough = Math.floor(strictStreaks.longest / SHIELD_EVERY_DAYS) * SHIELD_EVERY_DAYS;
  let changed = false;
  if (earnedThrough > freeze.rewardedThrough) {
    const blocks = Math.floor((earnedThrough - freeze.rewardedThrough) / SHIELD_EVERY_DAYS);
    freeze.shields = Math.min(MAX_SHIELDS, freeze.shields + blocks);
    freeze.rewardedThrough = earnedThrough;
    changed = true;
  }

  // Spend shields on gaps in the current streak run, newest first.
  if (freeze.shields > 0) {
    let cursor = todayKey;
    let walked = 0;
    while (freeze.shields > 0 && walked < MAX_WALK_DAYS) {
      walked += 1;
      if (cursor < minCoverable) break;
      if (qualifiesOn(cursor, totals, target, covered)) {
        cursor = shiftKey(cursor, -1);
        continue;
      }
      covered.add(cursor);
      freeze.coveredDates.push(cursor);
      freeze.shields -= 1;
      changed = true;
      cursor = shiftKey(cursor, -1);
    }
    if (freeze.coveredDates.length > MAX_COVERED_DATES) {
      freeze.coveredDates = freeze.coveredDates.slice(-MAX_COVERED_DATES);
    }
  }

  if (changed) await user.save();
  return calculateStreaks(days, target, now, freeze.coveredDates);
}

export function streakFreezeResponse(user) {
  const freeze = user.streakFreeze || {};
  return {
    enabled: freeze.enabled === true,
    shields: Math.min(MAX_SHIELDS, Math.max(0, Number(freeze.shields) || 0)),
    coveredDates: Array.isArray(freeze.coveredDates) ? freeze.coveredDates.slice(-MAX_COVERED_DATES) : []
  };
}
