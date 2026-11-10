import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import UploadedBadge from '../models/UploadedBadge.js';
import User from '../models/User.js';
import { recordAudit } from '../services/auditService.js';

const router = Router();
const MAX_IMAGE_BYTES = 1024 * 1024;
const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function imageMatchesType(buffer, type) {
  if (type === 'image/png') {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (type === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  }
  return type === 'image/webp' && buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
}

function badgeResponse(badge) {
  return {
    id: badge._id.toString(),
    title: badge.title,
    platform: badge.platform,
    imageType: badge.imageType,
    imageData: badge.imageData,
    createdAt: badge.createdAt
  };
}

router.use(requireAuth);

router.get('/gallery', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+publicBadgeGalleryId').lean();
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    return res.json({ galleryId: user.publicBadgeGalleryId || '' });
  } catch (error) {
    return next(error);
  }
});

router.post('/gallery', async (req, res, next) => {
  try {
    const galleryId = randomBytes(32).toString('hex');
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { publicBadgeGalleryId: galleryId } },
      { new: true }
    ).select('+publicBadgeGalleryId');
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    await recordAudit(req.userId, 'badges.gallery_enabled', {}, req);
    return res.json({ galleryId: user.publicBadgeGalleryId });
  } catch (error) {
    return next(error);
  }
});

router.delete('/gallery', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { publicBadgeGalleryId: '' } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    await recordAudit(req.userId, 'badges.gallery_disabled', {}, req);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const badges = await UploadedBadge.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ badges: badges.map(badgeResponse) });
  } catch (error) {
    return next(error);
  }
});

router.get('/:badgeId/image', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.badgeId)) {
    return res.status(400).json({ error: 'Badge id is invalid.' });
  }
  try {
    const badge = await UploadedBadge.findOne({ _id: req.params.badgeId, userId: req.userId })
      .select('imageType imageData')
      .lean();
    if (!badge) return res.status(404).json({ error: 'Badge image not found.' });

    const image = Buffer.from(badge.imageData.split(',')[1], 'base64');
    res.set({
      'Content-Type': badge.imageType,
      'Content-Length': image.length,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    return res.status(200).send(image);
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  const { title, platform = '', imageData, imageType } = req.body || {};
  const allowedFields = new Set(['title', 'platform', 'imageData', 'imageType']);
  if (Object.keys(req.body || {}).some((key) => !allowedFields.has(key))) {
    return res.status(400).json({ error: 'Provide only badge name, platform, and image fields.' });
  }
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 80) {
    return res.status(400).json({ error: 'Badge name must be between 1 and 80 characters.' });
  }
  if (typeof platform !== 'string' || platform.trim().length > 40) {
    return res.status(400).json({ error: 'Platform name must be 40 characters or fewer.' });
  }
  if (!allowedTypes.has(imageType) || typeof imageData !== 'string') {
    return res.status(400).json({ error: 'Upload a PNG, JPEG, or WebP badge image.' });
  }

  const match = imageData.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[1] !== imageType) {
    return res.status(400).json({ error: 'Badge image data is invalid.' });
  }
  const image = Buffer.from(match[2], 'base64');
  if (!image.length || image.length > MAX_IMAGE_BYTES) {
    return res.status(400).json({ error: 'Badge images must be smaller than 1 MB.' });
  }
  if (!imageMatchesType(image, imageType)) {
    return res.status(400).json({ error: 'The image content does not match its file type.' });
  }

  try {
    const badge = await UploadedBadge.create({
      userId: req.userId,
      title: title.trim(),
      platform: platform.trim(),
      imageType,
      imageData
    });
    return res.status(201).json({ badge: badgeResponse(badge) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:badgeId', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.badgeId)) {
    return res.status(400).json({ error: 'Badge id is invalid.' });
  }
  try {
    const badge = await UploadedBadge.findOneAndDelete({ _id: req.params.badgeId, userId: req.userId });
    if (!badge) return res.status(404).json({ error: 'Badge not found.' });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

export default router;
