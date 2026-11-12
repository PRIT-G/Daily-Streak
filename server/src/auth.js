import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import mongoose from 'mongoose';
import { config } from './config.js';

const dbProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const db = mongoose.connection?.db;
      if (!db) {
        if (prop === 'collection') {
          return () => ({
            createIndex: () => Promise.resolve(),
            indexes: () => Promise.resolve([]),
          });
        }
        throw new Error('Database is not connected yet.');
      }
      const val = db[prop];
      return typeof val === 'function' ? val.bind(db) : val;
    },
  }
);

const secret =
  config.jwtSecret && config.jwtSecret.length >= 32
    ? config.jwtSecret
    : `${config.jwtSecret || 'daily-streak-tracker-secret'}0123456789abcdef0123456789abcdef`.slice(
        0,
        32
      );

export const auth = betterAuth({
  database: mongodbAdapter(dbProxy, { usePlural: true }),
  baseURL: config.apiPublicUrl,
  secret,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  trustedOrigins: [config.clientOrigin],
  user: {
    modelName: 'users',
    additionalFields: {
      providers: { type: 'string', required: false },
      goal: { type: 'string', required: false },
      reminders: { type: 'string', required: false },
    },
  },
});
