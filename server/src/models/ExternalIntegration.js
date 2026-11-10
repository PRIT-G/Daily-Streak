import mongoose from 'mongoose';

const externalIntegrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider: { type: String, enum: ['jira', 'notion', 'github'], required: true },
  accessToken: { type: String, required: true, select: false },
  refreshToken: { type: String, default: '', select: false },
  expiresAt: { type: Date, default: null },
  providerData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

externalIntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.models.ExternalIntegration ||
  mongoose.model('ExternalIntegration', externalIntegrationSchema);
