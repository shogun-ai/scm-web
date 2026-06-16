import mongoose from 'mongoose';

const ZentroTransactionSchema = new mongoose.Schema({
  date:        { type: Date, required: true },
  amount:      { type: Number, required: true },
  description: { type: String, default: '' },
  dt:          { type: String, default: '' },
  ct:          { type: String, default: '' },
  code:        { type: String, default: '' },
  bankReference: { type: String },
  source:      { type: String, enum: ['manual', 'bank_import'], default: 'manual' },
  importBatchId: { type: String },
  // давхардал шалгах key: огноо+дүн+тайлбарын эхний 80 тэмдэгт
  dedupKey:    { type: String, index: true },
}, { timestamps: true });

export default mongoose.model('ZentroTransaction', ZentroTransactionSchema);
