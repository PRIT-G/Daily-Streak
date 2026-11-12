import { Router } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import UploadedBadge from '../models/UploadedBadge.js';
import User from '../models/User.js';

const router = Router();
const galleryKeyPattern = /^[a-f0-9]{64}$/;

const publicBadgeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

router.use(cors({ origin: '*', methods: ['GET'] }));
router.use(publicBadgeLimiter);

router.get('/:galleryId', async (req, res, next) => {
  const { galleryId } = req.params;
  if (!galleryKeyPattern.test(galleryId))
    return res.status(404).json({ error: 'Badge gallery not found.' });
  try {
    const user = await User.findOne({ publicBadgeGalleryId: galleryId }).select('_id').lean();
    if (!user) return res.status(404).json({ error: 'Badge gallery not found.' });
    const badges = await UploadedBadge.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .select('title platform createdAt')
      .lean();
    res.set('Cache-Control', 'no-store');
    return res.json({
      badges: badges.map((badge) => ({
        title: badge.title,
        platform: badge.platform,
        createdAt: badge.createdAt,
        imageUrl: `/api/public/badges/${galleryId}/${badge._id}/image`,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:galleryId/:badgeId/image', async (req, res, next) => {
  const { galleryId, badgeId } = req.params;
  if (!galleryKeyPattern.test(galleryId) || !mongoose.isValidObjectId(badgeId)) {
    return res.status(404).json({ error: 'Badge image not found.' });
  }
  try {
    const user = await User.findOne({ publicBadgeGalleryId: galleryId }).select('_id').lean();
    if (!user) return res.status(404).json({ error: 'Badge image not found.' });
    const badge = await UploadedBadge.findOne({ _id: badgeId, userId: user._id })
      .select('imageType imageData')
      .lean();
    if (!badge) return res.status(404).json({ error: 'Badge image not found.' });

    const image = Buffer.from(badge.imageData.split(',')[1], 'base64');
    res.set({
      'Content-Type': badge.imageType,
      'Content-Length': image.length,
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=60',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.status(200).send(image);
  } catch (error) {
    return next(error);
  }
});

export default router;
