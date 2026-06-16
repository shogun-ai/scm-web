import mongoose from 'mongoose';

const ZentroImportBatchSchema = new mongoose.Schema({
  filename:   { type: String, required: true },
  source:     { type: String, enum: ['excel', 'pdf'], default: 'excel' },
  rowCount:   { type: Number, default: 0 },
  skipped:    { type: Number, default: 0 },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('ZentroImportBatch', ZentroImportBatchSchema);
