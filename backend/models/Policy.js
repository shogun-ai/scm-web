import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
  title: String,
  fileName: String,
  fileUrl: String,   // Cloudinary URL
  category: { type: String, enum: ['policy', 'report'] },
  uploadDate: { type: Date, default: Date.now }
});

export default mongoose.model('Policy', policySchema);