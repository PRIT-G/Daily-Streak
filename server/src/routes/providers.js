import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';
import { fetchLeetCodeSubmissions } from '../providers/leetcode.js';
import { connectProvider, providerAdapters, refreshProvider } from '../services/providerService.js';
import { providerConnections } from '../providers/registry.js';
import { recordAudit } from '../services/auditService.js';
import { enqueueSync } from '../services/syncQueue.js';

const router = Router();
router.use(requireAuth);
const isSupportedProvider = (provider) => Object.hasOwn(providerAdapters, provider);
router.get('/status', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('providers').lean();
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    const connections = providerConnections(user.providers);
    const status = Object.fromEntries(
      Object.entries(connections).map(([id, connection]) => [id, {
        connected: Boolean(connection.username),
        username: connection.username || '',
        status: connection.status || 'not-connected',
        message: connection.message || '',
        lastSyncedAt: connection.lastSyncedAt || null
      }])
    );
    return res.json({ providers: status, checkedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.put('/:provider', async (req, res, next) => {
  try {
    const provider = req.params.provider;
    if (!isSupportedProvider(provider)) return res.status(404).json({ error: 'Unsupported provider.' });
    const username = String(req.body.username || '').trim();
    if (username.length > 80) return res.status(400).json({ error: 'Username must be 80 characters or fewer.' });
    const connection = await connectProvider(req.userId, provider, username);
    if (!connection) return res.status(404).json({ error: 'Account not found.' });
    await recordAudit(req.userId, 'provider.connect', { provider, username: connection.username || '' }, req);
    return res.json({ provider: connection });
  } catch (error) {
    next(error);
  }
});

router.post('/:provider/refresh', async (req, res, next) => {
  const provider = req.params.provider;
  if (!isSupportedProvider(provider)) return res.status(404).json({ error: 'Unsupported provider.' });
  try {
    if (req.query.background === '1' || req.query.background === 'true') {
      const jobId = await enqueueSync(req.userId, provider);
      await recordAudit(req.userId, 'provider.sync_enqueued', { provider }, req);
      return res.status(202).json({ queued: true, jobId: jobId.toString(), provider });
    }
    const result = await refreshProvider(req.userId, provider);
    if (result.status < 400) await recordAudit(req.userId, 'provider.refresh', { provider }, req);
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

router.post('/sync-all', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('providers').lean();
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    const connected = Object.entries(user.providers?.toObject?.() || user.providers || {})
      .filter(([, connection]) => connection?.username)
      .map(([provider]) => provider)
      .filter(isSupportedProvider);
    const jobs = [];
    for (const provider of connected) {
      jobs.push({ provider, jobId: (await enqueueSync(req.userId, provider)).toString() });
    }
    await recordAudit(req.userId, 'provider.sync_all_enqueued', { count: jobs.length }, req);
    return res.status(202).json({ queued: jobs.length, jobs });
  } catch (error) {
    next(error);
  }
});

router.get('/leetcode/submissions', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('providers').lean();
    const username = user?.providers?.leetcode?.username || '';
    if (!username) return res.status(409).json({ error: 'Connect a LeetCode username in Settings to view its recent submissions.' });
    const submissions = await fetchLeetCodeSubmissions(username);
    return res.json({
      username,
      submissions,
      limitations: `LeetCode's public profile API exposes a limited recent submission list, not a complete history. This view cannot guarantee older submissions or all submission types.`
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
