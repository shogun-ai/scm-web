import mongoose from 'mongoose';

const LoanRequestSchema = new mongoose.Schema({
  // 1. Хэрэглэгчийн төрөл
  userType: { type: String, default: 'individual' },

  // 2. Үндсэн мэдээлэл (иргэн)
  lastname:   { type: String },
  firstname:  { type: String },
  fatherName: { type: String },
  regNo:      { type: String },
  dob:        { type: String },
  phone:      { type: String },
  email:      { type: String },
  address:    { type: String },

  // 3. Байгууллагын мэдээлэл
  orgName:         { type: String },
  orgRegNo:        { type: String },
  legalForm:       { type: String },
  ceoName:         { type: String },
  contactName:     { type: String },
  contactPosition: { type: String },
  contactPhone:    { type: String },
  orgAddress:      { type: String },

  // 4. Зээлийн мэдээлэл
  selectedProduct:  { type: String },
  amount:           { type: Number },
  term:             { type: Number },
  purpose:          { type: String },
  repaymentSource:  { type: String },
  collateralType:   { type: String, default: 'real_estate' },

  // 5. Барьцаа — үл хөдлөх
  collateral: {
    certificateNumber: String,
    propertyType:      String,
    address:           String,
    area:              String,
    district:          String,
    khoroo:            String,
    blockNumber:       String,
    apartmentNumber:   String,
    landArea:          String,
    buildingYear:      String,
    ownerName:         String,
    ownerRegNo:        String,
    ownerRelation:     String,
  },

  // 6. Барьцаа — тээврийн хэрэгсэл
  vehicle: {
    plateNumber:           String,
    vehicleType:           String,
    make:                  String,
    model:                 String,
    year:                  String,
    color:                 String,
    engineNumber:          String,
    chassisNumber:         String,
    technicalPassportNumber: String,
    ownerName:             String,
    ownerRegNo:            String,
    ownerRelation:         String,
  },

  // 7. Батлан даагч / хамтран зээлдэгч
  guarantors: [{
    guarantorType: String,
    lastName:      String,
    firstName:     String,
    fatherName:    String,
    regNo:         String,
    phone:         String,
    address:       String,
  }],

  // Legacy co-borrower fields (backwards compat)
  hasCoBorrower: { type: Boolean, default: false },
  coLastname:  { type: String },
  coFirstname: { type: String },
  coRegNo:     { type: String },
  coPhone:     { type: String },

  // 8. Файлууд
  selfieUrl:   { type: String },
  fileNames:   { type: [String] },
  fileDetails: [{
    fieldName: String,
    fileName:  String,
    fileUrl:   String,
    mimeType:  String,
    size:      Number,
  }],

  // Статус
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'created', 'committee', 'approved', 'rejected', 'resolved', 'disbursed'],
  },

  // Internal fields (set by staff)
  approvalNote:  { type: String },
  assignedTo:    { type: String },
  createdAt:     { type: Date, default: Date.now },

  // Structured application data — read by LoanApplicationDetail
  applicationData: { type: mongoose.Schema.Types.Mixed, default: null },
}, { strict: false });

export default mongoose.model('LoanRequest', LoanRequestSchema);
