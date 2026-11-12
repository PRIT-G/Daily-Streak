import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { fromNodeHeaders } from 'better-auth/node';
import { config } from '../config.js';
import User from '../models/User.js';
import { auth } from '../auth.js';

export async function requireAuth(req, res, next) {
  // 1. Check Better Auth session first if database is connected
  if (mongoose.connection.readyState === 1) {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session?.user) {
        req.user = session.user;
        req.userId = session.user.id || session.user._id?.toString();
        req.session = session.session;
        return next();
      }
    } catch {
      // Fall through to JWT check
    }
  }

  // 2. Fallback to existing JWT token (Bearer <token>)
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !mongoose.isValidObjectId(payload.sub)
    ) {
      return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
    }
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(payload.sub).select('+passwordChangedAt');
      if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
      if (
        user.passwordChangedAt &&
        new Date(user.passwordChangedAt).getTime() > new Date(payload.iat * 1000).getTime()
      ) {
        return res.status(401).json({ error: 'Your password was changed. Please sign in again.' });
      }
    }
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}
