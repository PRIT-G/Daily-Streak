import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import UploadedBadge from '../models/UploadedBadge.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';
import { awardBadges } from '../utils/badges.js';
import { dayTotal } from '../utils/streaks.js';
import { buildInsights } from '../utils/insights.js';
import { applyStreakFreeze, streakFreezeResponse } from './streakFreezeService.js';
import { activitySources } from '../utils/activitySources.js';
import { providerConnections } from '../providers/registry.js';

function activityResponse(day) {
  const sources = activitySources(day);
  return {
    date: day.date,
    sources,
    github: sources.github || 0,
    leetcode: sources.leetcode || 0,
    manual: sources.manual || 0,
    total: dayTotal(day),
  };
}

function addPrivateActivityCounts(days, entries) {
  const counts = new Map(entries.map(({ _id, count }) => [_id, count]));
  const updatedDays = new Map(days.map((day) => [day.date, day]));
  for (const [date, count] of counts) {
    if (!updatedDays.has(date))
      updatedDays.set(date, { date, github: 0, leetcode: 0, manual: 0, sources: {} });
    const day = updatedDays.get(date);
    const sources = activitySources(day);
    sources.manual = (Number(sources.manual) || 0) + count;
    updatedDays.set(date, { ...day, manual: (Number(day.manual) || 0) + count, sources });
  }
  return [...updatedDays.values()];
}

export async function getDashboard(userId, year, now = new Date()) {
  const user = await User.findById(userId);
  if (!user) return null;

  const start = `${year}-01-01`;
  const end = year === now.getUTCFullYear() ? now.toISOString().slice(0, 10) : `${year}-12-31`;
  const today = now.toISOString().slice(0, 10);
  const [storedDays, allDays, uploadedBadges, privateActivityCounts, privateActivityYearCounts] =
    await Promise.all([
      ActivityDay.find({ userId: user._id, date: { $gte: start, $lte: end } })
        .select('date github leetcode manual sources')
        .lean(),
      ActivityDay.find({ userId: user._id, date: { $lte: today } })
        .select('date github leetcode manual sources')
        .sort({ date: -1 })
        .limit(5000)
        .lean(),
      UploadedBadge.find({ userId: user._id })
        .select('title platform createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      PrivateActivityEntry.aggregate([
        { $match: { userId: user._id, date: { $lte: today } } },
        { $group: { _id: '$date', count: { $sum: 1 } } },
      ]),
      PrivateActivityEntry.aggregate([
        { $match: { userId: user._id, date: { $gte: start, $lte: end } } },
        { $group: { _id: '$date', count: { $sum: 1 } } },
      ]),
    ]);
  const allDaysWithPrivateActivity = addPrivateActivityCounts(allDays, privateActivityCounts);
  const storedDaysWithPrivateActivity = addPrivateActivityCounts(
    storedDays,
    privateActivityYearCounts
  );
  const streaks = await applyStreakFreeze(user, allDaysWithPrivateActivity, now);
  const qualifiedDays = allDaysWithPrivateActivity.filter(
    (day) => dayTotal(day) >= user.goal.dailyTarget
  ).length;
  const nextBadges = awardBadges(user.badges, streaks, qualifiedDays);
  if (nextBadges.length !== user.badges.length) {
    user.badges = nextBadges;
    await user.save();
  }

  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const thisWeekDays = allDaysWithPrivateActivity.filter(
    (day) => day.date >= weekStart.toISOString().slice(0, 10)
  );
  const weekProgress = thisWeekDays.reduce(
    (sum, day) => sum + (dayTotal(day) >= user.goal.dailyTarget ? 1 : 0),
    0
  );
  const recent = [...storedDaysWithPrivateActivity]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
  const providerMap = providerConnections(user.providers);
  const insights = buildInsights(
    allDaysWithPrivateActivity,
    user.goal.dailyTarget,
    streaks,
    providerMap,
    now
  );

  return {
    year,
    today,
    todayActivity: dayTotal(allDaysWithPrivateActivity.find((day) => day.date === today) || {}),
    activity: storedDaysWithPrivateActivity.map(activityResponse),
    recent: recent.map(activityResponse),
    streaks,
    goal: user.goal,
    weekProgress: { completed: weekProgress, target: 7 },
    badges: user.badges,
    uploadedBadges: uploadedBadges.map((badge) => ({
      id: badge._id.toString(),
      title: badge.title,
      platform: badge.platform,
      imageUrl: `/badges/${badge._id}/image`,
      createdAt: badge.createdAt,
    })),
    providers: providerMap,
    insights,
    streakFreeze: streakFreezeResponse(user),
    publicProfile: { enabled: user.publicProfileEnabled === true, id: user.id },
    reminders: {
      enabled: user.reminders.enabled,
      reminderTime: user.reminders.reminderTime,
      weeklyDigest: user.reminders.weeklyDigest === true,
    },
  };
}

export async function updateDailyGoal(userId, dailyTarget) {
  return User.findByIdAndUpdate(userId, { 'goal.dailyTarget': dailyTarget }, { new: true });
}

export async function updateReminderSettings(userId, enabled, reminderTime, weeklyDigest) {
  const update = {
    'reminders.enabled': enabled,
    'reminders.reminderTime': reminderTime,
  };
  if (typeof weeklyDigest === 'boolean') update['reminders.weeklyDigest'] = weeklyDigest;
  return User.findByIdAndUpdate(userId, update, { new: true });
}

export async function updateStreakFreeze(userId, enabled) {
  return User.findByIdAndUpdate(userId, { 'streakFreeze.enabled': enabled }, { new: true });
}

export async function updatePublicProfile(userId, enabled) {
  return User.findByIdAndUpdate(userId, { publicProfileEnabled: enabled }, { new: true });
}
