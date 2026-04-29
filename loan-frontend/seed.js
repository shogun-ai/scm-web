const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/loan_db';

// ==================== SCHEMAS ====================

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'manager', 'officer'] },
  phone: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const LoanApplicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, unique: true },
  applicant: {
    firstName: String,
    lastName: String,
    registerNumber: String,
    phone: String,
    email: String,
    address: String,
    dateOfBirth: Date
  },
  loanDetails: {
    amount: Number,
    currency: { type: String, default: 'MNT' },
    termMonths: Number,
    interestRate: Number,
    purpose: String,
    type: { type: String, enum: ['personal', 'business', 'mortgage', 'auto'] }
  },
  employment: {
    employer: String,
    position: String,
    monthlyIncome: Number,
    employmentYears: Number
  },
  status: {
    type: String,
    enum: ['created', 'pending', 'processing', 'approved', 'rejected'],
    default: 'created'
  },
  assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  rejectionReason: String,
  submittedAt: Date,
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const LoanApplication = mongoose.model('LoanApplication', LoanApplicationSchema);

// ==================== SEED DATA ====================

const generateAppNumber = (index) => {
  const year = new Date().getFullYear();
  return `LOAN-${year}-${String(index).padStart(5, '0')}`;
};

const seedUsers = [
  {
    firstName: 'Батболд',
    lastName: 'Гантулга',
    email: 'admin@loanapp.mn',
    password: 'Admin@123456',
    role: 'admin',
    phone: '99112233',
    isActive: true
  },
  {
    firstName: 'Мөнхзул',
    lastName: 'Дорж',
    email: 'manager@loanapp.mn',
    password: 'Manager@123456',
    role: 'manager',
    phone: '88223344',
    isActive: true
  },
  {
    firstName: 'Энхбаяр',
    lastName: 'Нарантуяа',
    email: 'officer@loanapp.mn',
    password: 'Officer@123456',
    role: 'officer',
    phone: '77334455',
    isActive: true
  }
];

const seedLoanApplications = (officerId, managerId) => [
  {
    applicationNumber: generateAppNumber(1),
    applicant: {
      firstName: 'Оюунчимэг',
      lastName: 'Батсүх',
      registerNumber: 'АБ12345678',
      phone: '99887766',
      email: 'oyunchimeg.batsukh@gmail.com',
      address: 'Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Энхтайваны өргөн чөлөө 15',
      dateOfBirth: new Date('1990-03-15')
    },
    loanDetails: {
      amount: 15000000,
      currency: 'MNT',
      termMonths: 24,
      interestRate: 18.5,
      purpose: 'Орон сууц засварлах зориулалтаар',
      type: 'personal'
    },
    employment: {
      employer: 'Монгол Телеком ХК',
      position: 'Ахлах инженер',
      monthlyIncome: 2500000,
      employmentYears: 5
    },
    status: 'pending',
    assignedOfficer: officerId,
    notes: 'Бүх бичиг баримт бүрэн ирүүлсэн. Шалгалт хийгдэж байна.',
    submittedAt: new Date('2024-01-10T09:30:00Z'),
    createdAt: new Date('2024-01-10T09:30:00Z'),
    updatedAt: new Date('2024-01-10T09:30:00Z')
  },
  {
    applicationNumber: generateAppNumber(2),
    applicant: {
      firstName: 'Болдбаатар',
      lastName: 'Цэрэнпунцаг',
      registerNumber: 'ВГ87654321',
      phone: '88776655',
      email: 'boldbaatar.ts@yahoo.com',
      address: 'Улаанбаатар хот, Баянгол дүүрэг, 3-р хороо, Үйлдвэрчний гудамж 22',
      dateOfBirth: new Date('1985-07-22')
    },
    loanDetails: {
      amount: 50000000,
      currency: 'MNT',
      termMonths: 60,
      interestRate: 16.0,
      purpose: 'Жижиг дунд бизнес хөгжүүлэх',
      type: 'business'
    },
    employment: {
      employer: 'Цэрэн Трейд ХХК',
      position: 'Захирал',
      monthlyIncome: 8000000,
      employmentYears: 10
    },
    status: 'approved',
    assignedOfficer: officerId,
    reviewedBy: managerId,
    notes: 'Зээлийн чадвар сайн, бизнесийн төлөвлөгөө батлагдсан.',
    submittedAt: new Date('2024-01-05T10:00:00Z'),
    reviewedAt: new Date('2024-01-12T14:00:00Z'),
    createdAt: new Date('2024-01-05T10:00:00Z'),
    updatedAt: new Date('2024-01-12T14:00:00Z')
  },
  {
    applicationNumber: generateAppNumber(3),
    applicant: {
      firstName: 'Дэлгэрмаа',
      lastName: 'Гомбосүрэн',
      registerNumber: 'ДЕ23456789',
      phone: '77665544',
      email: 'delgermaa.g@hotmail.com',
      address: 'Улаанбаатар хот, Чингэлтэй дүүрэг, 2-р хороо, Бага тойруу 8',
      dateOfBirth: new Date('1995-11-08')
    },
    loanDetails: {
      amount: 8000000,
      currency: 'MNT',
      termMonths: 12,
      interestRate: 20.0,
      purpose: 'Автомашин худалдан авах',
      type: 'auto'
    },
    employment: {
      employer: 'Улаанбаатар Их Сургууль',
      position: 'Багш',
      monthlyIncome: 1200000,
      employmentYears: 3
    },
    status: 'rejected',
    assignedOfficer: officerId,
    reviewedBy: managerId,
    notes: 'Орлого хүрэлцэхгүй байна.',
    rejectionReason: 'Сарын орлого нь зээлийн дүнтэй харьцуулахад хангалтгүй байна. Орлогоо нэмэгдүүлсний дараа дахин хандана уу.',
    submittedAt: new Date('2024-01-08T11:00:00Z'),
    reviewedAt: new Date('2024-01-11T16:30:00Z'),
    createdAt: new Date('2024-01-08T11:00:00Z'),
    updatedAt: new Date('2024-01-11T16:30:00Z')
  },
  {
    applicationNumber: generateAppNumber(4),
    applicant: {
      firstName: 'Ганзориг',
      lastName: 'Мөнхбаяр',
      registerNumber: 'ЖЗ34567890',
      phone: '99445566',
      email: 'ganzorig.munkh@gmail.com',
      address: 'Улаанбаатар хот, Хан-Уул дүүрэг, 7-р хороо, Зайсангийн гудамж 45',
      dateOfBirth: new Date('1988-05-30')
    },
    loanDetails: {
      amount: 120000000,
      currency: 'MNT',
      termMonths: 120,
      interestRate: 14.5,
      purpose: 'Орон сууц худалдан авах',
      type: 'mortgage'
    },
    employment: {
      employer: 'Голомт Банк ХК',
      position: 'Мэдээллийн технологийн менежер',
      monthlyIncome: 5500000,
      employmentYears: 8
    },
    status: 'created',
    notes: '',
    submittedAt: null,
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-01-15T08:00:00Z')
  },
  {
    applicationNumber: generateAppNumber(5),
    applicant: {
      firstName: 'Солонгоо',
      lastName: 'Батдорж',
      registerNumber: 'ИК45678901',
      phone: '88554433',
      email: 'solongoo.batdorj@outlook.com',
      address: 'Улаанбаатар хот, Баянзүрх дүүрэг, 5-р хороо, Нарны зам 33',
      dateOfBirth: new Date('1992-09-17')
    },
    loanDetails: {
      amount: 25000000,
      currency: 'MNT',
      termMonths: 36,
      interestRate: 17.0,
      purpose: 'Бизнес тоног төхөөрөмж худалдан авах',
      type: 'business'
    },
    employment: {
      employer: 'Солонгоо Фэшн ХХК',
      position: 'Гүйцэтгэх захирал',
      monthlyIncome: 4200000,
      employmentYears: 6
    },
    status: 'processing',
    assignedOfficer: officerId,
    notes: 'Бичиг баримт нэмэлтээр шаардсан. Татварын гэрчилгээ хүлээгдэж байна.',
    submittedAt: new Date('2024-01-13T13:00:00Z'),
    createdAt: new Date('2024-01-13T13:00:00Z'),
    updatedAt: new Date('2024-01-14T10:00:00Z')
  }
];

// ==================== MAIN SEED FUNCTION ====================

async function seed() {
  try {
    console.log('🔌 MongoDB-д холбогдож байна...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB-д амжилттай холбогдлоо.');

    // Clear existing data
    console.log('🗑️  Одоо байгаа өгөгдлийг устгаж байна...');
    await User.deleteMany({});
    await LoanApplication.deleteMany({});
    console.log('✅ Өгөгдлийг амжилттай устгалаа.');

    // Create users
    console.log('👥 Хэрэглэгчдийг үүсгэж байна...');
    const createdUsers = [];
    for (const userData of seedUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = new User({ ...userData, password: hashedPassword });
      const saved = await user.save();
      createdUsers.push(saved);
      console.log(`   ✓ ${userData.role.toUpperCase()}: ${userData.lastName} ${userData.firstName} (${userData.email})`);
    }

    const adminUser = createdUsers.find(u => u.role === 'admin');
    const managerUser = createdUsers.find(u => u.role === 'manager');
    const officerUser = createdUsers.find(u => u.role === 'officer');

    // Create loan applications
    console.log('📋 Зээлийн өргөдлүүдийг үүсгэж байна...');
    const applications = seedLoanApplications(officerUser._id, managerUser._id);
    const createdApplications = [];
    for (const appData of applications) {
      const app = new LoanApplication(appData);
      const saved = await app.save();
      createdApplications.push(saved);
      const statusLabels = {
        created: '🆕 Үүсгэсэн',
        pending: '⏳ Хүлээгдэж байна',
        processing: '🔄 Боловсруулж байна',
        approved: '✅ Зөвшөөрсөн',
        rejected: '❌ Татгалзсан'
      };
      console.log(`   ✓ ${saved.applicationNumber} | ${saved.applicant.lastName} ${saved.applicant.firstName} | ${saved.loanDetails.amount.toLocaleString()}₮ | ${statusLabels[saved.status]}`);
    }

    // Summary
    console.log('\n========================================');
    console.log('🎉 SEED АМЖИЛТТАЙ ДУУСЛАА!');
    console.log('========================================');
    console.log(`\n👤 Нийт хэрэглэгч: ${createdUsers.length}`);
    console.log('   Нэвтрэх мэдээлэл:');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ Роль      │ Имэйл                  │ Нууц үг       │');
    console.log('   ├─────────────────────────────────────────────────────┤');
    console.log('   │ Admin     │ admin@loanapp.mn        │ Admin@123456  │');
    console.log('   │ Manager   │ manager@loanapp.mn      │ Manager@123456│');
    console.log('   │ Officer   │ officer@loanapp.mn      │ Officer@123456│');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log(`\n📋 Нийт зээлийн өргөдөл: ${createdApplications.length}`);
    console.log('   Статусуудаар:');
    const statusCount = {};
    createdApplications.forEach(a => {
      statusCount[a.status] = (statusCount[a.status] || 0) + 1;
    });
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} өргөдөл`);
    });
    console.log('\n');

  } catch (error) {
    console.error('❌ Seed алдаа гарлаа:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB-с салгалаа.');
    process.exit(0);
  }
}

seed();
