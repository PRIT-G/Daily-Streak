import mongoose from 'mongoose';

const activityDaySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  github: { type: Number, default: 0, min: 0 },
  leetcode: { type: Number, default: 0, min: 0 },
  manual: { type: Number, default: 0, min: 0 },
  sources: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
}, { timestamps: true });

activityDaySchema.index({ userId: 1, date: 1 }, { unique: true });
export default mongoose.models.ActivityDay || mongoose.model('ActivityDay', activityDaySchema);
