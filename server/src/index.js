import mongoose from 'mongoose';
import { app } from './app.js';
import { config } from './config.js';
import { startReminderJob } from './services/reminders.js';
import { startWeeklyDigestJob } from './services/weeklyDigest.js';
import { startSyncWorker, stopSyncWorker } from './services/syncQueue.js';
import { logger } from './utils/logger.js';

let reminderJob = null;
let digestJob = null;
let syncWorker = null;
let server = null;

async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  if (reminderJob) reminderJob.stop();
  if (digestJob) digestJob.stop();
  if (syncWorker) stopSyncWorker();
  if (server) {
    server.close(async () => {
      await mongoose.connection.close();
      logger.info('Shutdown complete.');
      process.exit(0);
    });
  } else {
    await mongoose.connection.close();
    process.exit(0);
  }
}

try {
  await mongoose.connect(config.mongoUri);
  server = app.listen(config.port, () => {
    logger.info(`Daily Streak API listening on http://localhost:${config.port}`);
    reminderJob = startReminderJob();
    digestJob = startWeeklyDigestJob();
    syncWorker = startSyncWorker();
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
} catch (error) {
  logger.error('Could not connect to MongoDB', error);
  process.exitCode = 1;
}