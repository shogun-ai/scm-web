import mongoose from 'mongoose';

// One document per LOAN_PRODUCTS id. steps/subProducts are validated by shared/loanWidgets.js validateConfig before writes.
const LoanFormConfigSchema = new mongoose.Schema({
  productKey: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  baseProductEnabled: { type: Boolean, default: true },
  defaultAssigneeId: { type: String, default: '' },
  steps: { type: mongoose.Schema.Types.Mixed, default: () => [] },
  subProducts: { type: mongoose.Schema.Types.Mixed, default: () => [] },
  version: { type: Number, default: 1 },
  updatedBy: { userId: String, name: String },
  updatedAt: { type: Date, default: Date.now },
}, { minimize: false });

const LoanFormConfig = mongoose.models.LoanFormConfig || mongoose.model('LoanFormConfig', LoanFormConfigSchema);
export default LoanFormConfig;
