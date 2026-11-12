import mongoose from 'mongoose';

const providerConnectionSchema = new mongoose.Schema(
  {
    username: { type: String, default: '' },
    lastSyncedAt: { type: Date, default: null },
    status: { type: String, default: 'not-connected' },
    message: { type: String, default: '' },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String, default: '', select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    passwordResetTokenHash: { type: String, default: '', select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    passwordHash: { type: String, required: false, select: false },
    passwordChangedAt: { type: Date, default: null, select: false },
    providers: {
      type: Map,
      of: providerConnectionSchema,
      default: () =>
        new Map([
          ['github', {}],
          ['leetcode', {}],
          ['codeforces', {}],
          ['gitlab', {}],
        ]),
    },
    goal: { dailyTarget: { type: Number, default: 1, min: 1, max: 1000 } },
    streakFreeze: {
      enabled: { type: Boolean, default: false },
      shields: { type: Number, default: 0, min: 0, max: 5 },
      coveredDates: { type: [String], default: [] },
      rewardedThrough: { type: Number, default: 0 },
    },
    reminders: {
      enabled: { type: Boolean, default: false },
      reminderTime: { type: String, default: '20:00' },
      weeklyDigest: { type: Boolean, default: false },
    },
    badges: [{ id: String, title: String, description: String, earnedAt: Date }],
    earlyAccessConsent: {
      acceptedAt: { type: Date, default: null },
      termsVersion: { type: String, default: '' },
    },
    publicBadgeGalleryId: { type: String, default: '', select: false },
    publicProfileEnabled: { type: Boolean, default: false },
    lastReminderDate: { type: String, default: '' },
    lastDigestWeek: { type: String, default: '' },
    refreshTokenHash: { type: String, default: '', select: false },
    refreshTokenExpiresAt: { type: Date, default: null },
    webhookSecretHash: { type: String, default: '', select: false },
  },
  { timestamps: true }
);

userSchema.index({ publicBadgeGalleryId: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
