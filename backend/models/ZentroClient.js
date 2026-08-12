import mongoose from 'mongoose';

const ZentroClientSchema = new mongoose.Schema({
  type: { type: String, enum: ['individual', 'organization'], default: 'individual' },

  // Иргэн
  lastname:   { type: String },
  firstname:  { type: String },
  register:   { type: String },
  phone:      { type: String },
  phone2:     { type: String },
  email:      { type: String },
  address:    { type: String },
  dob:        { type: String },

  // Байгууллага
  orgName:    { type: String },
  orgRegNo:   { type: String },
  directorName:     { type: String },
  directorRegister: { type: String },

  // Дотоод судалгааны холбоос
  researchId: { type: String },

  status: { type: String, enum: ['active', 'inactive', 'blacklist'], default: 'active' },
  notes:  { type: String },
}, { timestamps: true });

export default mongoose.model('ZentroClient', ZentroClientSchema);
