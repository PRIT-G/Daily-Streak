import cron from 'node-cron';
import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';
import { mailConfigured } from '../config.js';
import { buildInsights } from '../utils/insights.js';
import { applyStreakFreeze } from './streakFreezeService.js';
import { providerConnections } from '../providers/registry.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from './emailService.js';

function addPrivateCounts(days, entries) {
  const counts = new Map(entries.map(({ _id, count }) => [_id, count]));
  const merged = new Map(days.map((day) => [day.date, day]));
  for (const [date, count] of counts) {
    if (!merged.has(date))
      merged.set(date, { date, github: 0, leetcode: 0, manual: 0, sources: {} });
    const day = merged.get(date);
    const sources = { ...(day.sources || {}) };
    sources.manual = (Number(sources.manual) || 0) + count;
    merged.set(date, { ...day, manual: (Number(day.manual) || 0) + count, sources });
  }
  return [...merged.values()];
}

export function digestText({ name, streaks, insights, goal }) {
  const lines = [
    `Hi ${name},`,
    '',
    'Here is your weekly Daily Streak summary:',
    '',
    `- Current streak: ${streaks.current} day${streaks.current === 1 ? '' : 's'} (longest: ${streaks.longest})`,
    `- Consistency score (last 30 days): ${insights.consistencyScore}%`,
    `- Goal days this week: ${insights.weekComparison.thisWeek} (last week: ${insights.weekComparison.lastWeek})`,
    `- Average activity per day: ${insights.averageDailyActivity}`,
  ];
  if (insights.bestDay) {
    lines.push(`- Best day: ${insights.bestDay.total} items on ${insights.bestDay.date}`);
  }
  if (insights.nextMilestone) {
    lines.push(
      `- Next milestone: ${insights.nextMilestone.title} (${insights.nextMilestone.daysRemaining} days away)`
    );
  }
  if (insights.streak.atRisk) {
    lines.push('', 'Your streak is at risk today — log some activity to keep it alive.');
  }
  if (insights.recommendations.length) {
    lines.push('', 'Recommendations:');
    insights.recommendations.slice(0, 3).forEach((item) => lines.push(`- ${item.text}`));
  }
  lines.push(
    '',
    `Daily goal: ${goal.dailyTarget} items. Open Daily Streak to see your full dashboard.`
  );
  return lines.join('\n');
}

async function sendDigestsForUser(user, now) {
  const today = now.toISOString().slice(0, 10);
  const [days, privateCounts] = await Promise.all([
    ActivityDay.find({ userId: user._id, date: { $lte: today } })
      .select('date github leetcode manual sources')
      .lean(),
    PrivateActivityEntry.aggregate([
      { $match: { userId: user._id, date: { $lte: today } } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
    ]),
  ]);
  const allDays = addPrivateCounts(days, privateCounts);
  const streaks = await applyStreakFreeze(user, allDays, now);
  const insights = buildInsights(
    allDays,
    user.goal.dailyTarget,
    streaks,
    providerConnections(user.providers),
    now
  );
  await sendEmail({
    to: user.email,
    subject: `Your weekly streak summary — ${streaks.current}-day streak`,
    text: digestText({ name: user.name, streaks, insights, goal: user.goal }),
  });
}

export function startWeeklyDigestJob() {
  if (!mailConfigured) {
    logger.info('Weekly digest email delivery is disabled (SMTP is not configured).');
    return null;
  }
  // Runs hourly; sends on Sundays at 17:00 UTC.
  return cron.schedule('0 * * * *', async () => {
    const now = new Date();
    if (now.getUTCDay() !== 0 || now.getUTCHours() !== 17) return;
    const weekKey = now.toISOString().slice(0, 10);
    const users = await User.find({
      'reminders.weeklyDigest': true,
      emailVerified: { $ne: false },
      lastDigestWeek: { $ne: weekKey },
    });
    for (const user of users) {
      const claimed = await User.findOneAndUpdate(
        { _id: user._id, lastDigestWeek: { $ne: weekKey } },
        { $set: { lastDigestWeek: weekKey } },
        { new: false }
      )
        .select('_id')
        .lean();
      if (!claimed) continue;
      try {
        await sendDigestsForUser(user, now);
      } catch (error) {
        await User.updateOne(
          { _id: user._id, lastDigestWeek: weekKey },
          { $set: { lastDigestWeek: '' } }
        );
        logger.error(`Weekly digest delivery failed for user ${user.id}`, error);
      }
    }
  });
}
