import mongoose from 'mongoose';

const studentTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  course: { type: String, default: '', trim: true, maxlength: 60 },
  dueDate: { type: String, default: '' },
  type: { type: String, enum: ['assignment', 'exam', 'study'], default: 'study' },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

studentTaskSchema.index({ userId: 1, dueDate: 1 });
export default mongoose.models.StudentTask || mongoose.model('StudentTask', studentTaskSchema);
