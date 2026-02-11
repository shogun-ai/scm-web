import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'employee' },
  
  // ✅ ЗАСВАР: default: true гэж нэмснээр автоматаар Идэвхтэй үүснэ
  isActive: { type: Boolean, default: true }, 
  
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);