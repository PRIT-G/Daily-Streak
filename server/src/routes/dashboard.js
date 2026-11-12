import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getDashboard,
  updateDailyGoal,
  updatePublicProfile,
  updateReminderSettings,
  updateStreakFreeze,
} from '../services/dashboardService.js';
import { recordAudit } from '../services/auditService.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const year = req.query.year === undefined ? now.getUTCFullYear() : Number(req.query.year);
    if (!Number.isInteger(year) || year < 2000 || year > now.getUTCFullYear() + 1) {
      return res.status(400).json({ error: 'Choose a valid calendar year.' });
    }
    const data = await getDashboard(req.userId, year, now);
    if (!data) return res.status(404).json({ error: 'Account not found.' });
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

router.put('/goal', async (req, res, next) => {
  try {
    const dailyTarget = Number(req.body.dailyTarget);
    if (!Number.isInteger(dailyTarget) || dailyTarget < 1 || dailyTarget > 1000) {
      return res
        .status(400)
        .json({ error: 'Daily goal must be a whole number between 1 and 1000.' });
    }
    const user = await updateDailyGoal(req.userId, dailyTarget);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ goal: user.goal });
  } catch (error) {
    next(error);
  }
});

router.put('/streak-freeze', async (req, res, next) => {
  try {
    const enabled = req.body.enabled;
    if (typeof enabled !== 'boolean')
      return res.status(400).json({ error: 'Streak freeze enabled must be true or false.' });
    const user = await updateStreakFreeze(req.userId, enabled);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    await recordAudit(req.userId, 'settings.streak_freeze', { enabled }, req);
    return res.json({
      streakFreeze: {
        enabled: user.streakFreeze?.enabled === true,
        shields: user.streakFreeze?.shields || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/public-profile', async (req, res, next) => {
  try {
    const enabled = req.body.enabled;
    if (typeof enabled !== 'boolean')
      return res.status(400).json({ error: 'Public profile enabled must be true or false.' });
    const user = await updatePublicProfile(req.userId, enabled);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    await recordAudit(req.userId, 'settings.public_profile', { enabled }, req);
    return res.json({
      publicProfile: { enabled: user.publicProfileEnabled === true, id: user.id },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/reminders', async (req, res, next) => {
  try {
    const enabled = req.body.enabled;
    const reminderTime = String(req.body.reminderTime || '20:00');
    const weeklyDigest = req.body.weeklyDigest;
    if (typeof enabled !== 'boolean')
      return res.status(400).json({ error: 'Reminder enabled must be true or false.' });
    if (weeklyDigest !== undefined && typeof weeklyDigest !== 'boolean')
      return res.status(400).json({ error: 'Weekly digest must be true or false.' });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime))
      return res.status(400).json({ error: 'Use a valid 24-hour reminder time.' });
    const user = await updateReminderSettings(req.userId, enabled, reminderTime, weeklyDigest);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ reminders: user.reminders });
  } catch (error) {
    next(error);
  }
});

export default router;
