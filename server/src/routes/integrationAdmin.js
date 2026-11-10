import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import {
  callbackUrl,
  getProviderCredentials,
  isConfigured,
  removeProviderCredentials,
  saveProviderCredentials
} from '../services/externalIntegrations.js';
import { ADMIN_ISSUER, requireIntegrationAdmin } from '../middleware/integrationAdmin.js';

const router = Router();
const providers = ['github', 'jira', 'notion'];

router.post('/session', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
}), (req, res) => {
  const adminSecret = config.integrations.adminSecret;
  const supplied = typeof req.body?.secret === 'string' ? req.body.secret : '';
  if (!adminSecret) return res.status(503).json({ error: 'Owner OAuth settings are not enabled on this server.' });
  if (adminSecret.length < 32) return res.status(503).json({ error: 'INTEGRATION_ADMIN_SECRET must contain at least 32 characters.' });
  const expectedHash = createHash('sha256').update(adminSecret).digest();
  const suppliedHash = createHash('sha256').update(supplied).digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) {
    return res.status(401).json({ error: 'Admin secret is incorrect.' });
  }
  const token = jwt.sign({ purpose: 'integration-admin' }, config.jwtSecret, {
    issuer: ADMIN_ISSUER,
    expiresIn: '30m'
  });
  return res.json({ token, expiresIn: 1800 });
});

router.get('/providers', requireIntegrationAdmin, async (_req, res, next) => {
  try {
    const integrations = {};
    for (const provider of providers) {
      const credentials = await getProviderCredentials(provider);
      integrations[provider] = {
        configured: await isConfigured(provider),
        source: credentials.source,
        clientId: credentials.source === 'admin' ? credentials.id : '',
        callbackUrl: callbackUrl(provider)
      };
    }
    return res.json({ integrations });
  } catch (error) {
    return next(error);
  }
});

router.put('/providers/:provider', requireIntegrationAdmin, async (req, res, next) => {
  const { provider } = req.params;
  const { clientId, clientSecret } = req.body || {};
  if (!providers.includes(provider)) return res.status(404).json({ error: 'Unsupported integration.' });
  if (typeof clientId !== 'string' || !clientId.trim() || clientId.length > 512 ||
      typeof clientSecret !== 'string' || !clientSecret.trim() || clientSecret.length > 4096) {
    return res.status(400).json({ error: 'Enter a valid OAuth client ID and client secret.' });
  }
  const environment = provider === 'github'
    ? [config.integrations.githubClientId, config.integrations.githubClientSecret]
    : provider === 'jira'
      ? [config.integrations.jiraClientId, config.integrations.jiraClientSecret]
      : [config.integrations.notionClientId, config.integrations.notionClientSecret];
  if (environment.some(Boolean)) {
    return res.status(409).json({ error: 'This provider is managed by server environment variables and cannot be changed here.' });
  }
  try {
    await saveProviderCredentials(provider, clientId.trim(), clientSecret.trim());
    return res.json({ configured: true, source: 'admin' });
  } catch (error) {
    return next(error);
  }
});

router.delete('/providers/:provider', requireIntegrationAdmin, async (req, res, next) => {
  const { provider } = req.params;
  if (!providers.includes(provider)) return res.status(404).json({ error: 'Unsupported integration.' });
  const environment = provider === 'github'
    ? [config.integrations.githubClientId, config.integrations.githubClientSecret]
    : provider === 'jira'
      ? [config.integrations.jiraClientId, config.integrations.jiraClientSecret]
      : [config.integrations.notionClientId, config.integrations.notionClientSecret];
  if (environment.some(Boolean)) {
    return res.status(409).json({ error: 'This provider is managed by server environment variables.' });
  }
  try {
    await removeProviderCredentials(provider);
    return res.json({ configured: false });
  } catch (error) {
    return next(error);
  }
});

export default router;
