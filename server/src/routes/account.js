import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { deleteAccount, exportAccountData, exportActivityCsv } from '../services/accountService.js';
import { recordAudit } from '../services/auditService.js';

const router = Router();
router.use(requireAuth);

router.get('/export', async (req, res, next) => {
  try {
    const data = await exportAccountData(req.userId);
    if (!data) return res.status(404).json({ error: 'Account no longer exists.' });
    await recordAudit(req.userId, 'account.export', { format: 'json' }, req);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily-streak-export-${date}.json"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.status(200).send(JSON.stringify(data, null, 2));
  } catch (error) {
    return next(error);
  }
});

router.get('/export/activity.csv', async (req, res, next) => {
  try {
    const csv = await exportActivityCsv(req.userId);
    if (!csv) return res.status(404).json({ error: 'Account no longer exists.' });
    await recordAudit(req.userId, 'account.export', { format: 'csv' }, req);
    const date = new Date().toISOString().slice(0, 10);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily-streak-activity-${date}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
});

router.delete('/', async (req, res, next) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return res.status(400).json({ error: 'Enter your current password to delete this account.' });
  }
  try {
    const result = await deleteAccount(req.userId, password);
    if (result.error) return res.status(result.status).json({ error: result.error });
    await recordAudit(req.userId, 'account.delete', {}, req);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
