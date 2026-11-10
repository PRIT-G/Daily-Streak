import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ADMIN_ISSUER = 'daily-streak-integration-admin';

export function requireIntegrationAdmin(req, res, next) {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Admin sign-in is required.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret, { issuer: ADMIN_ISSUER });
    if (typeof payload !== 'object' || payload.purpose !== 'integration-admin') {
      return res.status(403).json({ error: 'Admin access is not valid.' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Admin session expired. Sign in again.' });
  }
}

export { ADMIN_ISSUER };
