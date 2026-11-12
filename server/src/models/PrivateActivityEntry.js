import mongoose from 'mongoose';

const privateActivityEntrySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['coding', 'study', 'other'], default: 'coding' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    details: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

privateActivityEntrySchema.index({ userId: 1, date: -1 });
export default mongoose.models.PrivateActivityEntry ||
  mongoose.model('PrivateActivityEntry', privateActivityEntrySchema);
