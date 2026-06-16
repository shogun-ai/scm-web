import mongoose from 'mongoose';

const ScheduleItemSchema = new mongoose.Schema({
  month:       { type: Number, required: true }, // 1, 2, 3...
  dueDate:     { type: Date, required: true },
  principal:   { type: Number, required: true }, // үндсэн
  interest:    { type: Number, required: true }, // хүү
  total:       { type: Number, required: true }, // нийт төлбөр
  balance:     { type: Number, required: true }, // үлдэгдэл
  paidAmount:  { type: Number, default: 0 },
  paidDate:    { type: Date },
  status: { type: String, enum: ['pending', 'paid', 'partial', 'overdue'], default: 'pending' },
}, { _id: true });

const ZentroLeaseSchema = new mongoose.Schema({
  contractNumber: { type: String, unique: true },
  client:  { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroClient', required: true },
  car:     { type: mongoose.Schema.Types.ObjectId, ref: 'ZentroCar', required: true },

  startDate:      { type: Date, required: true },
  endDate:        { type: Date },
  termMonths:     { type: Number, required: true },

  leaseValue:     { type: Number, required: true }, // нийт лизингийн үнэ
  downPayment:    { type: Number, default: 0 },     // урьдчилгаа
  loanAmount:     { type: Number, required: true }, // зээлийн дүн = leaseValue - downPayment
  interestRate:   { type: Number, required: true }, // жилийн хүү %
  monthlyPayment: { type: Number, required: true },

  schedule: [ScheduleItemSchema],

  // loan.scm.mn судалгааны холбоос
  researchRef: { type: String },

  status: { type: String, enum: ['active', 'completed', 'overdue', 'cancelled'], default: 'active' },
  notes:  { type: String },
}, { timestamps: true });

// Гэрээний дугаар автоматаар үүсгэх
ZentroLeaseSchema.pre('save', async function(next) {
  if (!this.contractNumber) {
    const count = await mongoose.model('ZentroLease').countDocuments();
    const year = new Date().getFullYear();
    this.contractNumber = `ZNT-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

export default mongoose.model('ZentroLease', ZentroLeaseSchema);
