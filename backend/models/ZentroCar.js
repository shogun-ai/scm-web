import mongoose from 'mongoose';

const ZentroCarSchema = new mongoose.Schema({
  make:          { type: String, required: true }, // Toyota, Lexus...
  model:         { type: String, required: true }, // Camry, LX570...
  year:          { type: Number },
  color:         { type: String },
  vin:           { type: String },
  plateNumber:   { type: String },

  purchasePrice: { type: Number }, // худалдан авсан үнэ
  leaseValue:    { type: Number }, // лизингийн үнэ

  status: { type: String, enum: ['available', 'leased', 'sold'], default: 'available' },
  notes:  { type: String },
}, { timestamps: true });

export default mongoose.model('ZentroCar', ZentroCarSchema);
