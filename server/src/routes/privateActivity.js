import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import PrivateActivityEntry from '../models/PrivateActivityEntry.js';

const router = Router();
router.use(requireAuth);
const validDate = /^\d{4}-\d{2}-\d{2}$/;
const entryTypes = new Set(['coding', 'study', 'other']);

function isCalendarDate(value) {
  if (!validDate.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function publicEntry(entry) {
  return {
    id: entry._id.toString(),
    date: entry.date,
    type: entry.type,
    title: entry.title,
    details: entry.details || '',
    createdAt: entry.createdAt
  };
}

router.get('/', async (req, res, next) => {
  try {
    const before = String(req.query.before || '');
    const filter = { userId: req.userId };
    if (before) {
      if (!validDate.test(before) || !isCalendarDate(before)) {
        return res.status(400).json({ error: 'before must be a valid YYYY-MM-DD date.' });
      }
      filter.date = { $lt: before };
    }
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200));
    const entries = await PrivateActivityEntry.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;
    const nextCursor = hasMore && page.length ? page[page.length - 1].date : null;
    return res.json({ entries: page.map(publicEntry), nextCursor, hasMore });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const date = String(req.body?.date || '');
  const type = String(req.body?.type || 'coding');
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const details = typeof req.body?.details === 'string' ? req.body.details.trim() : '';
  if (!isCalendarDate(date) || date > new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ error: 'Choose a valid date today or in the past.' });
  }
  if (!entryTypes.has(type)) return res.status(400).json({ error: 'Choose coding, study, or other activity.' });
  if (!title || title.length > 120) return res.status(400).json({ error: 'Activity title must be between 1 and 120 characters.' });
  if (details.length > 500) return res.status(400).json({ error: 'Activity details must be 500 characters or fewer.' });
  try {
    const entry = await PrivateActivityEntry.create({ userId: req.userId, date, type, title, details });
    return res.status(201).json({ entry: publicEntry(entry) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:entryId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ error: 'Private activity entry id is invalid.' });
  }
  try {
    const deletion = await PrivateActivityEntry.deleteOne({
      _id: req.params.entryId,
      userId: req.userId
    });
    if (!deletion.deletedCount) return res.status(404).json({ error: 'Private activity entry was not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
