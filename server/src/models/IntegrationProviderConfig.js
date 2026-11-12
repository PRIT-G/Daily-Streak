import mongoose from 'mongoose';

const integrationProviderConfigSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['github', 'jira', 'notion'], required: true, unique: true },
    clientId: { type: String, required: true, select: false },
    clientSecret: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.models.IntegrationProviderConfig ||
  mongoose.model('IntegrationProviderConfig', integrationProviderConfigSchema);
