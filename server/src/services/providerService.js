import User from '../models/User.js';
import ActivityDay from '../models/ActivityDay.js';
import { activitySources } from '../utils/activitySources.js';
import { providerRegistry } from '../providers/registry.js';

export { githubSyncYears, providerAdapters } from '../providers/registry.js';

export async function fetchActivityYears(fetchActivity, username, years, concurrency = 1) {
  const daily = {};
  const batchSize = Math.max(1, Number.isFinite(concurrency) ? Math.floor(concurrency) : 1);
  for (let index = 0; index < years.length; index += batchSize) {
    const batch = years.slice(index, index + batchSize);
    const results = await Promise.all(batch.map((year) => fetchActivity(username, year)));
    results.forEach((activity) => Object.assign(daily, activity));
  }
  return daily;
}

export async function connectProvider(userId, provider, username) {
  const user = await User.findById(userId);
  if (!user) return null;

  const connection = user.providers.get(provider) || {};
  connection.username = username;
  connection.status = username ? 'connected' : 'not-connected';
  connection.message = '';
  user.providers.set(provider, connection);
  await user.save();
  return user.providers.get(provider);
}

export async function refreshProvider(userId, provider) {
  const user = await User.findById(userId);
  if (!user) return { status: 404, body: { error: 'Account not found.' } };

  const definition = providerRegistry[provider];
  const connection = user.providers.get(provider);
  if (!connection?.username) {
    return { status: 400, body: { error: `Connect a ${definition.label} username first.` } };
  }

  try {
    const years = definition.syncYears(new Date().getUTCFullYear());
    const daily = await fetchActivityYears(
      definition.fetchActivity,
      connection.username,
      years,
      definition.syncConcurrency
    );
    const dateRange = {
      $gte: `${Math.min(...years)}-01-01`,
      $lte: `${Math.max(...years)}-12-31`,
    };
    const reset = { [`sources.${provider}`]: 0 };
    if (['github', 'leetcode', 'manual'].includes(provider)) reset[provider] = 0;
    await ActivityDay.updateMany({ userId: user._id, date: dateRange }, { $set: reset });

    const operations = Object.entries(daily)
      .filter(([, count]) => Number(count) > 0)
      .map(([date, count]) => ({
        updateOne: {
          filter: { userId: user._id, date },
          update: { $set: { [`sources.${provider}`]: Math.max(0, Number(count) || 0) } },
          upsert: true,
        },
      }));
    if (operations.length) await ActivityDay.bulkWrite(operations, { ordered: false });
    const existingDays = await ActivityDay.find({ userId: user._id, date: dateRange }).lean();
    const emptyDays = existingDays
      .filter((day) => Object.values(activitySources(day)).every((count) => !(Number(count) > 0)))
      .map((day) => day._id);
    if (emptyDays.length) await ActivityDay.deleteMany({ _id: { $in: emptyDays } });

    connection.status = 'synced';
    connection.lastSyncedAt = new Date();
    connection.message = operations.length
      ? `Imported ${operations.length} active days${years.length > 1 ? ` across ${Math.min(...years)}–${Math.max(...years)}` : ''}.`
      : `No activity was found in the public ${definition.label} calendar for the available period.`;
    await user.save();
    return {
      status: 200,
      body: {
        provider: connection,
        importedDays: operations.length,
        years,
      },
    };
  } catch (error) {
    connection.status = 'error';
    connection.message =
      error.message || 'Provider sync failed. Refresh to check the saved activity.';
    await user.save();
    return { status: 502, body: { error: connection.message, provider: connection } };
  }
}
