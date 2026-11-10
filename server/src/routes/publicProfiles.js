import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';
import UploadedBadge from '../models/UploadedBadge.js';
import { calculateStreaks, dayTotal } from '../utils/streaks.js';
import { buildInsights } from '../utils/insights.js';
import { providerConnections } from '../providers/registry.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
router.use(limiter);

const MAX_LEADERBOARD_USERS = 50;

function addPrivateCounts(days, entries) {
  const counts = new Map(entries.map(({ _id, count }) => [_id, count]));
  const merged = new Map(days.map((day) => [day.date, day]));
  for (const [date, count] of counts) {
    if (!merged.has(date)) merged.set(date, { date, github: 0, leetcode: 0, manual: 0, sources: {} });
    const day = merged.get(date);
    const sources = { ...(day.sources || {}) };
    sources.manual = (Number(sources.manual) || 0) + count;
    merged.set(date, { ...day, manual: (Number(day.manual) || 0) + count, sources });
  }
  return [...merged.values()];
}

async function loadUserActivity(userId, today) {
  const [days, privateCounts] = await Promise.all([
    ActivityDay.find({ userId, date: { $lte: today } }).select('date github leetcode manual sources').lean(),
    PrivateActivityEntry.aggregate([
      { $match: { userId, date: { $lte: today } } },
      { $group: { _id: '$date', count: { $sum: 1 } } }
    ])
  ]);
  return addPrivateCounts(days, privateCounts);
}

function displayName(name) {
  return String(name || 'Streaker').split(' ')[0].slice(0, 30);
}

router.get('/profiles/:userId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ error: 'Invalid profile id.' });
    }
    const user = await User.findById(req.params.userId)
      .select('name goal streakFreeze reminders providers badges createdAt publicProfileEnabled')
      .lean();
    if (!user || user.publicProfileEnabled !== true) {
      return res.status(404).json({ error: 'This profile is not public.' });
    }
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const days = await loadUserActivity(user._id, today);
    const streaks = calculateStreaks(days, user.goal?.dailyTarget || 1, now, user.streakFreeze?.coveredDates || []);
    const insights = buildInsights(days, user.goal?.dailyTarget || 1, streaks, providerConnections(user.providers), now);
    const badgeCount = await UploadedBadge.countDocuments({ userId: user._id });
    return res.json({
      profile: {
        name: displayName(user.name),
        memberSince: user.createdAt,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        consistencyScore: insights.consistencyScore,
        goalDaysLast30: insights.goalDays,
        badgesEarned: (user.badges || []).length + badgeCount,
        streakFreezeEnabled: user.streakFreeze?.enabled === true
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekStart = new Date(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const weekStartKey = weekStart.toISOString().slice(0, 10);

    // Only users opted into public profiles who had activity this week.
    const activeUserIds = await ActivityDay.distinct('userId', { date: { $gte: weekStartKey, $lte: today } });
    const privateActive = await PrivateActivityEntry.distinct('userId', { date: { $gte: weekStartKey, $lte: today } });
    const candidateIds = [...new Set([...activeUserIds, ...privateActive].map(String))];
    if (!candidateIds.length) return res.json({ leaderboard: [], weekStart: weekStartKey });

    const users = await User.find({
      _id: { $in: candidateIds.slice(0, MAX_LEADERBOARD_USERS * 4) },
      publicProfileEnabled: true
    }).select('name goal providers streakFreeze badges').limit(MAX_LEADERBOARD_USERS * 4).lean();

    const entries = [];
    for (const user of users) {
      const days = await loadUserActivity(user._id, today);
      const target = user.goal?.dailyTarget || 1;
      const streaks = calculateStreaks(days, target, now, user.streakFreeze?.coveredDates || []);
      const weekDays = days.filter((day) => day.date >= weekStartKey && day.date <= today);
      const goalDaysThisWeek = weekDays.filter((day) => dayTotal(day) >= target).length;
      entries.push({
        name: displayName(user.name),
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        goalDaysThisWeek,
        badgesEarned: (user.badges || []).length
      });
    }
    entries.sort((a, b) =>
      b.goalDaysThisWeek - a.goalDaysThisWeek ||
      b.currentStreak - a.currentStreak ||
      b.longestStreak - a.longestStreak
    );
    return res.json({ leaderboard: entries.slice(0, 20), weekStart: weekStartKey });
  } catch (error) {
    next(error);
  }
});

export default router;
