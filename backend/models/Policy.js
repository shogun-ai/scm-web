import mongoose from 'mongoose';

const policySchema = new mongoose.Schema({
  title: String,     // "Ёс зүйн дүрэм"
  fileName: String,  // "ethics-rule.pdf"
  category: { type: String, enum: ['policy', 'report'] }, // Журам уу, тайлан уу
  uploadDate: { type: Date, default: Date.now }
});

export default mongoose.model('Policy', policySchema);