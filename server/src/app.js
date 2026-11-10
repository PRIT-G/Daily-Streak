import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import providerRoutes from './routes/providers.js';
import studentTaskRoutes from './routes/studentTasks.js';
import badgeRoutes from './routes/badges.js';
import publicBadgeRoutes from './routes/publicBadges.js';
import integrationRoutes from './routes/integrations.js';
import integrationAdminRoutes from './routes/integrationAdmin.js';
import accountRoutes from './routes/account.js';
import privateActivityRoutes from './routes/privateActivity.js';
import clientErrorRoutes from './routes/clientErrors.js';
import { webhookAccountRouter, webhookIngestRouter } from './routes/webhooks.js';
import publicProfileRoutes from './routes/publicProfiles.js';
import { requestLogger } from './middleware/requestLogger.js';
import { logger } from './utils/logger.js';

export const app = express();
app.disable('x-powered-by');
// Trust a single proxy hop (load balancer / dev preview proxy) so
// X-Forwarded-For is honored and express-rate-limit validations pass.
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", config.clientOrigin]
    }
  }
}));
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(requestLogger);
app.use('/api/badges', express.json({ limit: '2mb' }));
app.use(express.json({ limit: '20kb' }));

// Key authenticated requests by user id (decoded, unverified — auth still enforced downstream)
// so users behind shared IPs (campus NAT, offices) get independent budgets.
function rateLimitKey(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const payload = jwt.decode(token);
      if (payload?.sub) return `user:${payload.sub}`;
    } catch {
      // fall through to IP keying
    }
  }
  return req.ip;
}

const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  message: { error: 'Too many requests. Please slow down and try again later.' }
});

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  service: 'daily-streak-tracker-api',
  database: {
    connected: mongoose.connection.readyState === 1,
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown'
  }
}));
app.use('/api/client-errors', clientErrorRoutes);
app.use('/api/webhooks', webhookIngestRouter);
app.use('/api/webhooks', authenticatedLimiter, webhookAccountRouter);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/account', authenticatedLimiter, accountRoutes);
app.use('/api/private-activity', authenticatedLimiter, privateActivityRoutes);
app.use('/api/dashboard', authenticatedLimiter, dashboardRoutes);
app.use('/api/providers', authenticatedLimiter, providerRoutes);
app.use('/api/integrations/admin', authenticatedLimiter, integrationAdminRoutes);
app.use('/api/integrations', authenticatedLimiter, integrationRoutes);
app.use('/api/tasks', authenticatedLimiter, studentTaskRoutes);
app.use('/api/public/badges', rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }), publicBadgeRoutes);
app.use('/api/public', rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }), publicProfileRoutes);
app.use('/api/badges', authenticatedLimiter, badgeRoutes);

// Versioned aliases: /api/v1/* mirrors the unversioned routes above.
app.use('/api/v1/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/v1/account', authenticatedLimiter, accountRoutes);
app.use('/api/v1/private-activity', authenticatedLimiter, privateActivityRoutes);
app.use('/api/v1/dashboard', authenticatedLimiter, dashboardRoutes);
app.use('/api/v1/providers', authenticatedLimiter, providerRoutes);
app.use('/api/v1/integrations/admin', authenticatedLimiter, integrationAdminRoutes);
app.use('/api/v1/integrations', authenticatedLimiter, integrationRoutes);
app.use('/api/v1/tasks', authenticatedLimiter, studentTaskRoutes);
app.use('/api/v1/badges', authenticatedLimiter, badgeRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  logger.error('Request handler error', error);
  const status = error.status || 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : error.message });
});
