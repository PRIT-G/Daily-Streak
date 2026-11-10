import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config.js';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
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
      if (user.passwordChangedAt && new Date(user.passwordChangedAt).getTime() > new Date(payload.iat * 1000).getTime()) {
        return res.status(401).json({ error: 'Your password was changed. Please sign in again.' });
      }
    }
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}