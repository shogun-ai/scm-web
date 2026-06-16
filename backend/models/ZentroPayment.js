import mongoose from 'mongoose';

const ZentroPaymentSchema = new mongoose.Schema({
  lease:    { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroLease', required: true },
  date:     { type: Date, required: true },
  amount:   { type: Number, required: true },
  source:   { type: String, enum: ['manual', 'bank_import'], default: 'manual' },

  bankReference: { type: String }, // банкны гүйлгээний дугаар
  description:   { type: String },
  appliedMonths: [{ type: Number }], // хэдэн дугаар сарын төлбөрт тооцсон

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('ZentroPayment', ZentroPaymentSchema);
