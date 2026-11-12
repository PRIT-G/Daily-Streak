import SyncJob from '../models/SyncJob.js';
import { refreshProvider } from './providerService.js';
import { logger } from '../utils/logger.js';

const POLL_MS = 15 * 1000;
const MAX_ATTEMPTS = 3;
let timer = null;
let running = false;

export async function enqueueSync(userId, provider, { runAt = new Date() } = {}) {
  // Collapse duplicate pending jobs for the same user+provider.
  const existing = await SyncJob.findOne({ userId, provider, status: 'pending' })
    .select('_id')
    .lean();
  if (existing) {
    await SyncJob.updateOne({ _id: existing._id }, { $set: { runAt } });
    return existing._id;
  }
  const job = await SyncJob.create({ userId, provider, runAt });
  return job._id;
}

async function processNextJob() {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const job = await SyncJob.findOneAndUpdate(
      { status: 'pending', runAt: { $lte: now } },
      { $set: { status: 'running' }, $inc: { attempts: 1 } },
      { sort: { runAt: 1 }, new: true }
    );
    if (!job) return;
    try {
      const result = await refreshProvider(job.userId, job.provider);
      const ok = result.status < 400;
      await SyncJob.updateOne(
        { _id: job._id },
        ok
          ? { $set: { status: 'done', result: result.body, lastError: '' } }
          : {
              $set: {
                status: job.attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
                lastError: result.body?.error || `HTTP ${result.status}`,
                runAt: new Date(Date.now() + 5 * 60 * 1000),
              },
            }
      );
    } catch (error) {
      await SyncJob.updateOne(
        { _id: job._id },
        job.attempts >= MAX_ATTEMPTS
          ? { $set: { status: 'failed', lastError: error.message } }
          : {
              $set: {
                status: 'pending',
                lastError: error.message,
                runAt: new Date(Date.now() + 5 * 60 * 1000),
              },
            }
      );
      logger.warn(`Sync job ${job._id} (${job.provider}) failed: ${error.message}`);
    }
  } finally {
    running = false;
  }
}

export function startSyncWorker() {
  if (timer) return timer;
  timer = setInterval(() => {
    processNextJob().catch((error) => logger.error('Sync worker error', error));
  }, POLL_MS);
  timer.unref?.();
  return timer;
}

export function stopSyncWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}
