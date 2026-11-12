import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config, mailConfigured } from '../config.js';
import { providerConnections } from '../providers/registry.js';
import { sendAuthEmail } from './authEmail.js';

const verificationLifetimeMs = 24 * 60 * 60 * 1000;
const resetLifetimeMs = 30 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const failedLogins = new Map(); // email -> { count, windowStart, lockedUntil }

function loginRecord(email) {
  const now = Date.now();
  let record = failedLogins.get(email);
  if (!record || now - record.windowStart > LOGIN_WINDOW_MS) {
    record = { count: 0, windowStart: now, lockedUntil: 0 };
    failedLogins.set(email, record);
  }
  return record;
}

function pruneFailedLogins() {
  const now = Date.now();
  for (const [email, record] of failedLogins) {
    if (
      now - record.windowStart > LOGIN_WINDOW_MS &&
      (!record.lockedUntil || record.lockedUntil < now)
    ) {
      failedLogins.delete(email);
    }
  }
}

export function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    providers: providerConnections(user.providers),
    goal: user.goal,
    reminders: { enabled: user.reminders.enabled, reminderTime: user.reminders.reminderTime },
  };
}

function issueAccessToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtAccessExpiresIn });
}

function ttlToMs(ttl) {
  const match = String(ttl).match(/^(\d+)\s*([smhd])?$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return Number(match[1]) * (multipliers[match[2] || 's'] || multipliers.s);
}

async function issueTokens(user) {
  const refreshToken = randomBytes(48).toString('hex');
  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + ttlToMs(config.jwtRefreshExpiresIn));
  await user.save();
  return { token: issueAccessToken(user), refreshToken, user: toPublicUser(user) };
}

export async function refreshSession(refreshToken) {
  if (typeof refreshToken !== 'string' || refreshToken.length < 32) return null;
  const user = await User.findOne({
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt: { $gt: new Date() },
  }).select('+refreshTokenHash +refreshTokenExpiresAt');
  if (!user) return null;
  return issueTokens(user);
}

export async function revokeSession(userId) {
  await User.updateOne(
    { _id: userId },
    { $set: { refreshTokenHash: '', refreshTokenExpiresAt: null } }
  );
}

function newToken() {
  return randomBytes(32).toString('hex');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function tokenLink(route, token) {
  return `${config.clientOrigin.replace(/\/+$/, '')}/#${route}?token=${encodeURIComponent(token)}`;
}

function emailDeliveryError() {
  return Object.assign(
    new Error(
      'Your account was created, but the email could not be sent. Please use the resend option or contact support.'
    ),
    { status: 503 }
  );
}

async function sendVerificationEmail(user, token) {
  await sendAuthEmail({
    to: user.email,
    subject: 'Verify your Daily Streak email',
    text: `Hi ${user.name},\n\nVerify your email address to sign in to Daily Streak:\n${tokenLink('verify-email', token)}\n\nThis link expires in 24 hours. If you did not create this account, you can ignore this email.`,
  });
}

export async function registerUser({ name, email, password, earlyAccessConsent }) {
  if (await User.exists({ email })) return { conflict: true };
  const passwordHash = await bcrypt.hash(password, 12);
  const isProd = process.env.NODE_ENV === 'production';
  const requireVerification = isProd && mailConfigured;
  const token = requireVerification ? newToken() : '';
  const user = await User.create({
    name,
    email,
    passwordHash,
    earlyAccessConsent,
    emailVerified: !requireVerification,
    emailVerificationTokenHash: token ? hashToken(token) : '',
    emailVerificationExpiresAt: token ? new Date(Date.now() + verificationLifetimeMs) : null,
  });
  if (token) {
    try {
      await sendVerificationEmail(user, token);
      return { verificationRequired: true };
    } catch {
      throw emailDeliveryError();
    }
  }
  return issueTokens(user);
}

export async function loginUser({ email, password }) {
  pruneFailedLogins();
  const record = loginRecord(email);
  if (record.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000) };
  }
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    record.count += 1;
    if (record.count >= LOGIN_MAX_ATTEMPTS) {
      record.lockedUntil = Date.now() + LOGIN_LOCK_MS;
      record.count = 0;
    }
    return null;
  }
  failedLogins.delete(email);
  if (user.emailVerified === false) {
    if (process.env.NODE_ENV !== 'production') {
      user.emailVerified = true;
      user.emailVerificationTokenHash = '';
      user.emailVerificationExpiresAt = null;
      await user.save();
    } else {
      return { verificationRequired: true };
    }
  }
  return issueTokens(user);
}

export async function resendVerificationEmail(email) {
  const user = await User.findOne({ email });
  if (!user || user.emailVerified !== false) return;
  const token = newToken();
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = new Date(Date.now() + verificationLifetimeMs);
  await user.save();
  try {
    await sendVerificationEmail(user, token);
  } catch {
    throw emailDeliveryError();
  }
}

export async function verifyEmail(token) {
  const user = await User.findOne({
    emailVerificationTokenHash: hashToken(token),
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
  if (!user) return false;
  user.emailVerified = true;
  user.emailVerificationTokenHash = '';
  user.emailVerificationExpiresAt = null;
  await user.save();
  return true;
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user) return;
  const token = newToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + resetLifetimeMs);
  await user.save();
  try {
    await sendAuthEmail({
      to: user.email,
      subject: 'Reset your Daily Streak password',
      text: `Hi ${user.name},\n\nReset your Daily Streak password using this link:\n${tokenLink('reset-password', token)}\n\nThis link expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
    });
  } catch {
    user.passwordResetTokenHash = '';
    user.passwordResetExpiresAt = null;
    await user.save();
    throw Object.assign(
      new Error('The password reset email could not be sent. Please try again later.'),
      { status: 503 }
    );
  }
}

export async function resetPassword(token, password) {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordHash');
  if (!user) return false;
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = '';
  user.passwordResetExpiresAt = null;
  user.emailVerified = true;
  user.emailVerificationTokenHash = '';
  user.emailVerificationExpiresAt = null;
  user.passwordChangedAt = new Date();
  user.refreshTokenHash = '';
  user.refreshTokenExpiresAt = null;
  await user.save();
  return true;
}

export async function getPublicUser(userId) {
  const user = await User.findById(userId);
  return user ? toPublicUser(user) : null;
}
