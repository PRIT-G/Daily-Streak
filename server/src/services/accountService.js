import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import StudentTask from '../models/StudentTask.js';
import UploadedBadge from '../models/UploadedBadge.js';
import ExternalIntegration from '../models/ExternalIntegration.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';
import { activitySources, activityTotal } from '../utils/activitySources.js';

export async function exportAccountData(userId) {
  const user = await User.findById(userId).select('+publicBadgeGalleryId').lean();
  if (!user) return null;

  const [activity, tasks, uploadedBadges, integrations, privateActivity] = await Promise.all([
    ActivityDay.find({ userId }).select('-__v').sort({ date: 1 }).lean(),
    StudentTask.find({ userId }).select('-__v').sort({ dueDate: 1, createdAt: 1 }).lean(),
    UploadedBadge.find({ userId }).select('-__v').sort({ createdAt: 1 }).lean(),
    ExternalIntegration.find({ userId }).select('provider providerData createdAt updatedAt').lean(),
    PrivateActivityEntry.find({ userId }).sort({ date: 1, createdAt: 1 }).lean(),
  ]);

  return {
    format: 'daily-streak-account-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      goal: user.goal,
      reminders: user.reminders,
      badges: user.badges,
      earlyAccessConsent: user.earlyAccessConsent,
      providers:
        user.providers instanceof Map
          ? Object.fromEntries(user.providers)
          : { ...(user.providers || {}) },
      publicBadgeGalleryEnabled: Boolean(user.publicBadgeGalleryId),
    },
    activity,
    tasks,
    uploadedBadges,
    privateActivity,
    integrations: integrations.map(({ provider, providerData, createdAt, updatedAt }) => ({
      provider,
      providerData,
      createdAt,
      updatedAt,
      credentialsIncluded: false,
    })),
  };
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportActivityCsv(userId) {
  const user = await User.findById(userId).select('goal').lean();
  if (!user) return null;
  const [days, privateCounts] = await Promise.all([
    ActivityDay.find({ userId })
      .select('date github leetcode manual sources')
      .sort({ date: 1 })
      .lean(),
    PrivateActivityEntry.aggregate([
      { $match: { userId } },
      { $group: { _id: '$date', count: { $sum: 1 } } },
    ]),
  ]);
  const merged = new Map(days.map((day) => [day.date, day]));
  for (const { _id: date, count } of privateCounts) {
    if (!merged.has(date))
      merged.set(date, { date, github: 0, leetcode: 0, manual: 0, sources: {} });
    const day = merged.get(date);
    const sources = { ...(day.sources || {}) };
    sources.manual = (Number(sources.manual) || 0) + count;
    merged.set(date, { ...day, manual: (Number(day.manual) || 0) + count, sources });
  }
  const sorted = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  const sourceIds = [...new Set(sorted.flatMap((day) => Object.keys(activitySources(day))))].sort();
  const header = ['date', 'total', 'goal_met', ...sourceIds];
  const target = user.goal?.dailyTarget || 1;
  const rows = sorted.map((day) => {
    const sources = activitySources(day);
    const total = activityTotal(day);
    return [
      day.date,
      total,
      total >= target ? 'yes' : 'no',
      ...sourceIds.map((id) => sources[id] || 0),
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export async function deleteAccount(userId, password) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { status: 401, error: 'Password is incorrect.' };
  }

  await Promise.all([
    ActivityDay.deleteMany({ userId }),
    StudentTask.deleteMany({ userId }),
    UploadedBadge.deleteMany({ userId }),
    ExternalIntegration.deleteMany({ userId }),
    PrivateActivityEntry.deleteMany({ userId }),
  ]);
  const deletion = await User.deleteOne({ _id: userId });
  if (!deletion.deletedCount) return { status: 404, error: 'Account no longer exists.' };
  return { status: 204 };
}
