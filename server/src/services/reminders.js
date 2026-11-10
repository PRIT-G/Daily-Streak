import cron from 'node-cron';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';
import { config, mailConfigured } from '../config.js';
import { dayTotal } from '../utils/streaks.js';
import { logger } from '../utils/logger.js';

export function reminderText(name, remaining) {
  return `Hi ${name}, your daily coding goal is still waiting. Complete ${remaining} more activity ${remaining === 1 ? 'item' : 'items'} today to keep your momentum going.`;
}

export function startReminderJob() {
  if (!mailConfigured) {
    logger.info('Reminder email delivery is disabled (SMTP is not configured).');
    return null;
  }
  const transport = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.pass }
  });
  return cron.schedule('* * * * *', async () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const users = await User.find({
      'reminders.enabled': true,
      'reminders.reminderTime': time,
      lastReminderDate: { $ne: date }
    });
    if (!users.length) return;
    const [activityDays, privateActivityCounts] = await Promise.all([
      ActivityDay.find({
        userId: { $in: users.map((user) => user._id) },
        date
      }).select('userId github leetcode manual sources').lean(),
      PrivateActivityEntry.aggregate([
        { $match: { userId: { $in: users.map((user) => user._id) }, date } },
        { $group: { _id: '$userId', count: { $sum: 1 } } }
      ])
    ]);
    const activityByUser = new Map(activityDays.map((activity) => [activity.userId.toString(), activity]));
    const privateActivityByUser = new Map(privateActivityCounts.map(({ _id, count }) => [_id.toString(), count]));

    for (const user of users) {
      const completed = dayTotal(activityByUser.get(user._id.toString()) || {}) +
        (privateActivityByUser.get(user._id.toString()) || 0);
      const remaining = Math.max(0, user.goal.dailyTarget - completed);
      if (!remaining) continue;
      const claimed = await User.findOneAndUpdate(
        { _id: user._id, lastReminderDate: { $ne: date } },
        { $set: { lastReminderDate: date } },
        { new: false }
      ).select('_id').lean();
      if (!claimed) continue;
      try {
        await transport.sendMail({
          from: config.smtp.from,
          to: user.email,
          subject: 'A quick nudge for your coding streak',
          text: reminderText(user.name, remaining)
        });
      } catch (error) {
        await User.updateOne(
          { _id: user._id, lastReminderDate: date },
          { $set: { lastReminderDate: '' } }
        );
        logger.error(`Reminder delivery failed for user ${user.id}`, error);
      }
    }
  });
}
