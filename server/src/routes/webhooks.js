import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes } from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';

const MAX_COUNT_PER_REQUEST = 10;
const validDate = /^\d{4}-\d{2}-\d{2}$/;
const entryTypes = new Set(['coding', 'study', 'other']);

function hashSecret(secret) {
  return createHash('sha256').update(String(secret)).digest('hex');
}

function isCalendarDate(value) {
  if (!validDate.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Authenticated: manage the user's inbound webhook secret.
export const webhookAccountRouter = Router();
webhookAccountRouter.use(requireAuth);

webhookAccountRouter.post('/token', async (req, res, next) => {
  try {
    const secret = `whsec_${randomBytes(24).toString('hex')}`;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { webhookSecretHash: hashSecret(secret) } },
      { new: true }
    ).select('+webhookSecretHash');
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({
      secret,
      endpoint: '/api/webhooks/activity',
      note: 'Store this secret now — it is shown only once. Send POST requests with { "secret": "...", "count": 1, "date": "YYYY-MM-DD", "type": "coding", "title": "..." }.'
    });
  } catch (error) {
    next(error);
  }
});

webhookAccountRouter.delete('/token', async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.userId }, { $set: { webhookSecretHash: '' } });
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

// Public: ingest activity using the per-user secret.
export const webhookIngestRouter = Router();
webhookIngestRouter.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many webhook requests. Slow down.' }
}));

webhookIngestRouter.post('/activity', async (req, res, next) => {
  try {
    const secret = String(req.body?.secret || '');
    if (!secret || secret.length > 128) {
      return res.status(400).json({ error: 'A valid webhook secret is required.' });
    }
    const user = await User.findOne({ webhookSecretHash: hashSecret(secret) })
      .select('_id webhookSecretHash');
    if (!user) return res.status(401).json({ error: 'Invalid webhook secret.' });

    const today = new Date().toISOString().slice(0, 10);
    const date = req.body?.date ? String(req.body.date) : today;
    if (!isCalendarDate(date) || date > today) {
      return res.status(400).json({ error: 'Date must be a valid calendar date today or in the past.' });
    }
    const type = entryTypes.has(req.body?.type) ? req.body.type : 'coding';
    const title = typeof req.body?.title === 'string' && req.body.title.trim()
      ? req.body.title.trim().slice(0, 120)
      : 'Webhook activity';
    const count = Math.min(MAX_COUNT_PER_REQUEST, Math.max(1, Math.floor(Number(req.body?.count) || 1)));

    const docs = Array.from({ length: count }, () => ({
      userId: user._id,
      date,
      type,
      title,
      details: typeof req.body?.details === 'string' ? req.body.details.trim().slice(0, 500) : ''
    }));
    await PrivateActivityEntry.insertMany(docs);
    return res.status(201).json({ recorded: count, date });
  } catch (error) {
    next(error);
  }
});
