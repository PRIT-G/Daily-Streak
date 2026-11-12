import mongoose from 'mongoose';

const syncJobSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'done', 'failed'],
      default: 'pending',
      index: true,
    },
    runAt: { type: Date, default: Date.now, index: true },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: '' },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

syncJobSchema.index({ status: 1, runAt: 1 });

export default mongoose.models.SyncJob || mongoose.model('SyncJob', syncJobSchema);
