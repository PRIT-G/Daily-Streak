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

// Bind the HTTP port first so health checks and traffic can reach the app
// even before MongoDB is available. If the DB connection fails, the server
// keeps running and reports unhealthy via the health check endpoint.
server = app.listen(config.port, () => {
  logger.info(`Daily Streak API listening on http://localhost:${config.port}`);
});

mongoose.connect(config.mongoUri).then(() => {
  logger.info('MongoDB connected');
  reminderJob = startReminderJob();
  digestJob = startWeeklyDigestJob();
  syncWorker = startSyncWorker();
}).catch((error) => {
  logger.error('Could not connect to MongoDB', error);
  // Don't exit — keep the server running so health checks can report the
  // degraded state and operators can fix the URI without losing the process.
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));