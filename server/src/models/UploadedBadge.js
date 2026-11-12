import mongoose from 'mongoose';

const uploadedBadgeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    platform: { type: String, default: '', trim: true, maxlength: 40 },
    imageType: { type: String, enum: ['image/png', 'image/jpeg', 'image/webp'], required: true },
    imageData: { type: String, required: true, maxlength: 1400000 },
  },
  { timestamps: true }
);

uploadedBadgeSchema.index({ userId: 1, createdAt: -1 });
export default mongoose.models.UploadedBadge ||
  mongoose.model('UploadedBadge', uploadedBadgeSchema);
