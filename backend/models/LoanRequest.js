import mongoose from 'mongoose';

const LoanRequestSchema = new mongoose.Schema({
  // 1. Хэрэглэгчийн төрөл
  userType: { type: String, default: 'individual' }, 

  // 2. Үндсэн мэдээлэл
  lastname: { type: String },
  firstname: { type: String },
  regNo: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },

  // 3. Хамтран зээлдэгч
  hasCoBorrower: { type: Boolean, default: false },
  coLastname: { type: String },
  coFirstname: { type: String },
  coRegNo: { type: String },
  coPhone: { type: String },

  // 4. Байгууллагын мэдээлэл
  orgName: { type: String },
  orgRegNo: { type: String },
  contactName: { type: String },
  contactPosition: { type: String },
  contactPhone: { type: String },

  // 5. Зээлийн мэдээлэл
  selectedProduct: { type: String },
  amount: { type: Number }, 
  term: { type: Number },   
  purpose: { type: String },
  repaymentSource: { type: String },
  collateralType: { type: String },

  // 6. Файлууд
  fileNames: { type: [String] }, 

  status: { 
    type: String, 
    default: 'pending', 
    enum: ['pending', 'resolved', 'approved', 'rejected'] 
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('LoanRequest', LoanRequestSchema);