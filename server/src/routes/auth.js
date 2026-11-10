import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
  getPublicUser,
  loginUser,
  registerUser,
  refreshSession,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  revokeSession,
  verifyEmail
} from '../services/authService.js';
import { recordAudit } from '../services/auditService.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EARLY_ACCESS_TERMS_VERSION = '2026-11-05';
const recoveryLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.body?.email || '').trim().toLowerCase() || req.ip,
  message: { error: 'Too many sign-in attempts for this email. Please wait and try again.' }
});

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Name must be between 2 and 60 characters.' });
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Password must be at least 10 characters.' });
    if (req.body.consent !== true) return res.status(400).json({ error: 'Please review and accept the early-access data notes to create an account.' });
    const result = await registerUser({
      name,
      email,
      password,
      earlyAccessConsent: { acceptedAt: new Date(), termsVersion: EARLY_ACCESS_TERMS_VERSION }
    });
    if (result.conflict) return res.status(409).json({ error: 'An account with this email already exists.' });
    if (result.user?.id) await recordAudit(result.user.id, 'auth.register', { email }, req);
    return res.status(201).json(result);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' });
    next(error);
  }
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await loginUser({ email, password });
    if (result?.locked) {
      res.set('Retry-After', String(result.retryAfterSeconds));
      return res.status(429).json({ error: `Too many failed sign-in attempts. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minutes.` });
    }
    if (!result) {
      await recordAudit(null, 'auth.login_failed', { email }, req);
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    if (result.verificationRequired) return res.status(403).json({ error: 'Verify your email before signing in. Use the resend link if you need a new verification email.' });
    await recordAudit(result.user?.id, 'auth.login', { email }, req);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/email-verification/resend', recoveryLimiter, async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    await resendVerificationEmail(email);
    return res.json({ message: 'If this address needs verification, a new link will be sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/email-verification/confirm', async (req, res, next) => {
  const token = String(req.body.token || '');
  if (!/^[a-f\d]{64}$/i.test(token)) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  try {
    if (!await verifyEmail(token)) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    return res.json({ message: 'Your email is verified. You can now sign in.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/password-reset/request', recoveryLimiter, async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    await requestPasswordReset(email);
    await recordAudit(null, 'auth.password_reset_requested', { email }, req);
    return res.json({ message: 'If an account exists for this address, a password reset link will be sent.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/password-reset/confirm', async (req, res, next) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!/^[a-f\d]{64}$/i.test(token)) return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
  if (password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Password must be between 10 and 128 characters.' });
  try {
    if (!await resetPassword(token, password)) return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    await recordAudit(null, 'auth.password_reset_completed', {}, req);
    return res.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = String(req.body.refreshToken || '');
    const result = await refreshSession(refreshToken);
    if (!result) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await revokeSession(req.userId);
    await recordAudit(req.userId, 'auth.logout', {}, req);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getPublicUser(req.userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
