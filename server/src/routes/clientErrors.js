import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

router.post('/', limiter, (req, res) => {
  const { message, stack, source, path, userAgent } = req.body || {};
  logger.warn('Client error reported', {
    message: String(message || '').slice(0, 500),
    stack: String(stack || '').slice(0, 4000),
    source: String(source || '').slice(0, 60),
    path: String(path || '').slice(0, 300),
    userAgent: String(userAgent || '').slice(0, 300),
    ip: req.ip
  });
  return res.status(204).end();
});

export default router;
