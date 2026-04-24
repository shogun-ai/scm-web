import mongoose from 'mongoose';

const ExposureSnapshotRowSchema = new mongoose.Schema({
  caseKey: { type: String, index: true },
  borrowerName: String,
  regNo: String,
  loanId: String,
  productName: String,
  branch: String,
  loanOfficer: String,
  phone: String,
  collateral: String,
  currency: String,
  interestRate: Number,
  startDate: String,
  endDate: String,
  originalAmount: Number,
  principalDebt: Number,
  interestDebt: Number,
  regularizationAmount: Number,
  contactNote: String,
  lastContactDate: String,
  outstandingBalance: Number,
  overdueAmount: Number,
  overdueDays: Number,
  classification: String,
  overdueBucket: String,
  isOverdue: Boolean,
  isNewlyOverdue: Boolean,
}, { _id: false });

const ExposureSnapshotSchema = new mongoose.Schema({
  snapshotLabel: { type: String, required: true },
  reportDate: { type: String, default: '' },
  detectedReportDate: { type: String, default: '' },
  sourceFileName: String,
  sheetName: String,
  fileUrl: { type: String, default: '' },
  filePublicId: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  size: { type: Number, default: 0 },
  uploadedBy: {
    userId: String,
    name: String,
  },
  comparison: {
    previousSnapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExposureSnapshot', default: null },
    previousSnapshotLabel: { type: String, default: '' },
  },
  summary: {
    totalLoans: { type: Number, default: 0 },
    overdueLoans: { type: Number, default: 0 },
    overdueBalance: { type: Number, default: 0 },
    overdueAmount: { type: Number, default: 0 },
    newlyOverdueCount: { type: Number, default: 0 },
    maxOverdueDays: { type: Number, default: 0 },
  },
  rows: { type: [ExposureSnapshotRowSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.ExposureSnapshot || mongoose.model('ExposureSnapshot', ExposureSnapshotSchema);
