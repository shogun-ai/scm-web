import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy'; 
import QRCode from 'qrcode'; 
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super_secret_key_change_this';
// Энэ хэсгийг ингэж өөрчил:
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ============================================================
// ⚙️ DATABASE SCHEMAS & MIDDLEWARE
// ============================================================

// Энэ код нь бүх төрлийн толгой мэдээлэл болон OPTIONS хүсэлтийг хүчээр зөвшөөрнө
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*'); // Бүх төрлийн Header-ийг (x-session-id г.м) шууд зөвшөөрөх
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

cloudinary.config({ 
    cloud_name: 'dcreily3l', 
    api_key: '644213573533415', 
    api_secret: 'ONABORM8BAwtApxp7UiZLqIiku0' 
});

const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { folder: 'scm_uploads', resource_type: 'auto' } 
});
const upload = multer({ storage: storage }).any();

const UserSchema = new mongoose.Schema({ 
    name: String, 
    email: { type: String, unique: true }, 
    password: { type: String, required: true }, 
    role: { type: String, default: 'employee' }, 
    isActive: { type: Boolean, default: true }, 
    twoFASecret: { type: Object, default: null }, 
    isTwoFAEnabled: { type: Boolean, default: false }, 
    createdAt: { type: Date, default: Date.now } 
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const LoanRequestSchema = new mongoose.Schema({ 
    selectedProduct: String, amount: Number, term: Number, userType: String, 
    lastname: String, firstname: String, regNo: String, phone: String, email: String, 
    address: String, status: { type: String, default: 'pending' }, 
    selfieUrl: String, fileNames: [String], createdAt: { type: Date, default: Date.now } 
});
const LoanRequest = mongoose.models.LoanRequest || mongoose.model('LoanRequest', LoanRequestSchema);

const TrustRequestSchema = new mongoose.Schema({ 
    lastname: String, firstname: String, phone: String, email: String, amount: String, 
    status: { type: String, default: 'pending' }, contactNote: String, 
    createdAt: { type: Date, default: Date.now } 
});
const TrustRequest = mongoose.models.TrustRequest || mongoose.model('TrustRequest', TrustRequestSchema);

const LogSchema = new mongoose.Schema({ 
    userName: String, userRole: String, action: String, details: String, 
    date: { type: Date, default: Date.now } 
});
const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);

const MONGO_URI = 'mongodb+srv://otgonbilegtseden_db_user:uFE1QiJHzhovsslQ@cluster0.izqptda.mongodb.net/scm_db?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(MONGO_URI).then(() => console.log('✅ MongoDB Connected')).catch(e => console.error(e));

const createLog = async (user, action, details) => { 
    try { if(user) await new Log({ userName: user.name, userRole: user.role, action, details }).save(); } 
    catch (e) {} 
};

// ============================================================
// 🤖 МЭДЭЭЛЛИЙН САН БА ТООЦООЛОЛ
// ============================================================

const CONTACT_INFO = `📞 Утас: 75991919, 75999191\n📧 Имэйл: info@scm.mn\n📍 Хаяг: Хан-Уул дүүрэг, 20-р хороо, Чингисийн өргөн чөлөө, Мишээл сити төв, М3 цамхаг 1208 тоот`;

const PRODUCT_INFO = {
    'автомашины зээл': `🚗 Автомашины зээл:\nШинэ хуучин автомашин авах, мөн унаж яваа машинаа барьцаалан зээл авах боломжтой.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-60 сар.`,
    'хэрэглээний зээл': `💰 Хэрэглээний зээл:\nБүх төрлийн хэрэглээ, лизингийн зээл - Цалингийн орлогод суурилсан.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-36 сар.`,
    'кредит карт': `💳 Кредит карт:\nPlatinum Master карт. 100 сая хүртэлх лимит, 55 хоног хүүгүй.`,
    'бизнесийн зээл': `🏢 Бизнесийн зээл:\n500 сая төгрөг хүртэл, ЖДҮ-ийн санхүүжилт.`,
    'үл хөдлөх барьцаалсан зээл': `🏠 Үл хөдлөх барьцаалсан зээл:\n1 тэрбум төгрөг хүртэл, зах зээлийн үнэлгээний 70% хүртэл.`,
    'шугмын зээл': `📈 Шугмын зээл:\n1.5 тэрбум төгрөг хүртэл, мөнгөн урсгалыг дэмжих зээл.`
};

function formatMNT(n) { return Math.round(n).toLocaleString('en-US'); }

function parseMoneyMNT(msg) {
    // Мессеж доторх бүх үсэг, тэмдэгтийг устгаж зөвхөн тоог үлдээнэ
    const cleaned = String(msg || '').replace(/[^0-9]/g, '');
    const value = parseInt(cleaned);
    return isNaN(value) ? null : value;
}

// ============================================================
// 💬 RULE-BASED ЧАТБОТ (Сайжруулсан & Баталгаажуулсан хувилбар)
// ============================================================

const sessions = new Map();

app.post('/api/chat', async (req, res) => {
    try {
        const sessionId = req.body?.sessionId || `anon_${req.headers['user-agent']}`;
        if (!sessions.has(sessionId)) sessions.set(sessionId, { state: 'START', data: {} });
        const s = sessions.get(sessionId);
        const msg = String(req.body?.message || '').trim().toLowerCase();
        const money = parseMoneyMNT(msg);

        // --- GLOBAL ACTIONS (🔙 БУЦАХ ЛОГИК) ---
        if (msg === 'буцах') {
            if (s.state.includes('CALC') || s.state.includes('T_CALC')) {
                s.state = s.state.startsWith('T_') ? 'TRUST_INFO' : 'PRODUCT_OPTIONS';
            } else if (s.state === 'PRODUCT_OPTIONS' || s.state === 'TYPE_SELECT') {
                s.state = 'LOAN_MENU';
            } else {
                s.state = 'START';
            }
            s.data = {};
            return res.json({ reply: `Сонголтоо хийнэ үү:\n\n[OPTIONS: Зээл, Итгэлцэл]` });
        }

        // --- GATEWAY (ХОЛБОО БАРИХ, ЗЭЭЛ, ИТГЭЛЦЭЛ ШУУД ҮСРЭХ) ---
        if (msg.includes('холбоо барих')) return res.json({ reply: CONTACT_INFO + `\n\n[OPTIONS: Буцах]` });
        if (msg === 'зээл') { s.state = 'LOAN_MENU'; s.data = {}; return res.json({ reply: `Манай зээлийн бүтээгдэхүүнүүд:\n\n[OPTIONS: Автомашины зээл, Хэрэглээний зээл, Кредит карт, Бизнесийн зээл, Үл хөдлөх барьцаалсан зээл, Шугмын зээл, Буцах]` }); }
        if (msg === 'итгэлцэл') { s.state = 'TRUST_INFO'; s.data = {}; return res.json({ reply: `Итгэлцэл нь таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ юм. 😊\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` }); }

        // --- STATE MACHINE LOGIC ---
        switch (s.state) {
            case 'START':
                if (msg === 'hi' || msg === 'сайн байна уу' || msg === 'хш') return res.json({ reply: `Сайн байна уу? Би Солонго Капитал ББСБ-ийн санхүүгийн ухаалаг зөвлөх байна. 😊\n\n[OPTIONS: Зээл, Итгэлцэл]` });
                break;

            case 'LOAN_MENU':
                for (let prod in PRODUCT_INFO) {
                    if (msg.includes(prod)) {
                        s.data.productKey = prod;
                        s.state = (['хэрэглээний зээл', 'шугмын зээл'].includes(prod)) ? 'PRODUCT_OPTIONS' : 'TYPE_SELECT';
                        const opt = s.state === 'TYPE_SELECT' ? `\n\nТа Иргэн эсвэл Байгууллагаар сонирхож байна уу?\n\n[OPTIONS: Иргэн, Байгууллага, Буцах]` : `\n\n[OPTIONS: Бүрдүүлэх баримт бичиг, Тооцоолол, Онлайн хүсэлт өгөх, Холбоо барих, Буцах]`;
                        return res.json({ reply: PRODUCT_INFO[prod] + opt });
                    }
                }
                break;

            case 'TYPE_SELECT':
                if (msg.includes('иргэн')) { s.data.userType = 'individual'; s.state = 'PRODUCT_OPTIONS'; return res.json({ reply: `Сонголтоо хийнэ үү:\n\n[OPTIONS: Бүрдүүлэх баримт бичиг, Тооцоолол, Онлайн хүсэлт өгөх, Холбоо барих, Буцах]` }); }
                if (msg.includes('байгууллага')) { s.data.userType = 'company'; s.state = 'PRODUCT_OPTIONS'; return res.json({ reply: `Сонголтоо хийнэ үү:\n\n[OPTIONS: Бүрдүүлэх баримт бичиг, Тооцоолол, Онлайн хүсэлт өгөх, Холбоо барих, Буцах]` }); }
                break;

            case 'PRODUCT_OPTIONS':
                if (msg.includes('бүрдүүлэх баримт бичиг')) {
                    const mat = s.data.userType === 'company' ? "Байгууллагын дүрэм, гэрчилгээ, албан хүсэлт, сүүлийн 12 сарын дансны хуулга." : "Иргэний үнэмлэхийн лавлагаа, хаягийн лавлагаа, НДШ лавлагаа /и-монгол/.";
                    return res.json({ reply: mat + `\n\n[OPTIONS: Тооцоолол, Онлайн хүсэлт өгөх, Холбоо барих, Буцах]` });
                }
                if (msg.includes('тооцоолол')) { s.state = 'CALC_AMOUNT'; return res.json({ reply: `Зээлийн дүнгээ зөвхөн тоогоор оруулна уу? (Жишээ нь: 50000000)` }); }
                if (msg.includes('онлайн хүсэлт')) return res.json({ reply: `Та www.scm.mn хаягаар орж хүсэлтээ илгээнэ үү.\n\n[OPTIONS: Буцах]` });
                break;

            case 'CALC_AMOUNT':
                if (money) { 
                    s.data.amount = money; 
                    s.state = 'CALC_TERM'; 
                    return res.json({ reply: `Та ${formatMNT(money)} ₮-ийн зээл тооцоолохоор орууллаа. Хэдэн сарын хугацаатай авах вэ? (Зөвхөн тоогоор оруулна уу. Жишээ нь: 24)` }); 
                }
                return res.json({ reply: `Уучлаарай, дүнгээ зөвхөн тоогоор бичнэ үү? (Жишээ нь: 10000000)` });

            case 'CALC_TERM':
                const term = parseInt(msg.match(/\d+/)?.[0]);
                if (term) {
                    const rate = 0.032; 
                    const pow = Math.pow(1 + rate, term);
                    const pmt = Math.round(s.data.amount * (rate * pow) / (pow - 1));
                    const dtiRatio = (s.data.userType === 'company') ? 0.20 : 0.55;
                    const requiredIncome = Math.round(pmt / dtiRatio);
                    const warn = (s.data.productKey?.includes('авто') || s.data.productKey?.includes('хэрэглээ')) ? "\n⚠️ Анхааруулга: Автомашин, хэрэглээний зээлийн хувьд урьдчилгаа төлбөр 45%-иас багагүй, өр орлогын харьцаа 55%-иас ихгүй байх ёстой." : "";
                    
                    const savedAmt = s.data.amount;
                    s.state = 'PRODUCT_OPTIONS';
                    return res.json({ reply: `📊 ЗЭЭЛИЙН ЖИШЭЭ ТООЦООЛОЛ (3.2% хүү):\n\n- Зээлийн дүн: ${formatMNT(savedAmt)} ₮\n- Сар бүр төлөх: **${formatMNT(pmt)} ₮**\n- Нийт төлөх дүн: ${formatMNT(pmt * term)} ₮\n- Сарын доод орлого: ${formatMNT(requiredIncome)} ₮ байх шаардлагатай.${warn}\n\n[OPTIONS: Онлайн хүсэлт өгөх, Холбоо барих, Буцах]` });
                }
                return res.json({ reply: `Хугацаагаа зөвхөн тоогоор оруулна уу? (Жишээ нь: 12)` });

            case 'TRUST_INFO':
                if (msg.includes('тооцоолол')) { s.state = 'T_CALC_AMT'; return res.json({ reply: `Итгэлцэл байршуулах дүнгээ зөвхөн тоогоор оруулна уу? (Жишээ нь: 10000000)` }); }
                return res.json({ reply: `Итгэлцэл нь таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ юм. 😊\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` });

            case 'T_CALC_AMT':
                if (money) { 
                    s.data.amount = money; 
                    s.state = 'T_CALC_TERM'; 
                    return res.json({ reply: `Та ${formatMNT(money)} ₮ байршуулахаар орууллаа. Хугацаагаа сараар хэлнэ үү? (Минимум 6 сар)` }); 
                }
                return res.json({ reply: `Дүнгээ зөвхөн тоогоор бичнэ үү? (Жишээ нь: 50000000)` });

            case 'T_CALC_TERM':
                const tTerm = parseInt(msg.match(/\d+/)?.[0]);
                if (tTerm >= 6) { 
                    s.data.months = tTerm; 
                    s.state = 'T_CALC_TOPUP'; 
                    return res.json({ reply: `Сар бүр тогтмол дүн нэмэх үү? (Зөвхөн тоо бичнэ үү. Хэрэв нэмэхгүй бол "Үгүй" гэж дарна уу)\n\n[OPTIONS: Үгүй, Буцах]` }); 
                }
                return res.json({ reply: `Итгэлцлийн хугацаа хамгийн багадаа 6 сар байх ёстой. Дахин оруулна уу?` });

            case 'T_CALC_TOPUP':
                let topup = (msg === 'үгүй' || msg === 'ugui') ? 0 : money;
                if (topup === null && msg !== 'үгүй' && msg !== 'ugui') return res.json({ reply: `Нэмэх дүнгээ зөвхөн тоогоор бичнэ үү эсвэл "Үгүй" товчийг дарна уу.` });
                
                let bal = s.data.amount;
                for (let i = 0; i < s.data.months; i++) { bal = bal * 1.018 + (topup || 0); }
                const invested = s.data.amount + ((topup || 0) * s.data.months);
                const interest = bal - invested;
                const tax = interest * 0.10;
                const final = bal - tax;
                const growth = ((final - invested) / invested * 100).toFixed(1);

                const savedTrustAmt = s.data.amount;
                s.state = 'TRUST_INFO';
                s.data = {};
                return res.json({ reply: `📊 ИТГЭЛЦЛИЙН ТООЦООЛОЛ (1.8% хүү):\n\n- Оруулсан дүн: ${formatMNT(savedTrustAmt)} ₮\n- Сар бүр нэмэх: ${formatMNT(topup || 0)} ₮\n- Нийт өсөх дүн: **${formatMNT(final)} ₮**\n- Хүүгийн орлого: ${formatMNT(interest)} ₮\n- Өсөлтийн хувь: ${growth}%\n\n⚠️ МУ-ын хуулийн дагуу хүүгийн орлогоос 10% буюу ${formatMNT(tax)} ₮ татвар суутгагдахыг анхаарна уу.\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` });
        }
        return res.json({ reply: `Сонголтоо хийнэ үү:\n\n[OPTIONS: Зээл, Итгэлцэл, Холбоо барих]` });
    } catch (e) { res.status(500).json({ message: "Error" }); }
});
// ============================================================
// 🔐 AUTH & 2FA & ADMIN ROUTES
// ============================================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await new User({ ...req.body, password: hashedPassword }).save();
        res.status(201).json({ message: 'Success' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, token: twoFAToken } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Error' });
        if (user.isTwoFAEnabled) {
            if (!twoFAToken) return res.json({ require2FA: true, userId: user._id });
            const verified = speakeasy.totp.verify({ secret: user.twoFASecret.base32, encoding: 'base32', token: twoFAToken, window: 1 });
            if (!verified) return res.status(401).json({ message: '2FA error' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/auth/2fa/setup', async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        const secret = speakeasy.generateSecret({ name: `SCM Admin (${user.email})` });
        user.twoFASecret = secret; await user.save();
        QRCode.toDataURL(secret.otpauth_url, (err, url) => res.json({ secret: secret.base32, qrCode: url }));
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
        const user = await User.findById(req.body.userId);
        const verified = speakeasy.totp.verify({ secret: user.twoFASecret.base32, encoding: 'base32', token: req.body.token, window: 1 });
        if (verified) { user.isTwoFAEnabled = true; await user.save(); res.json({ message: 'Success' }); }
        else res.status(400).json({ message: 'Error' });
    } catch (e) { res.status(500).send("Error"); }
});

// ============================================================
// 📄 LOAN & TRUST & LOG ROUTES
// ============================================================

app.post('/api/loans', (req, res) => {
    upload(req, res, async (err) => {
        try {
            const newLoan = new LoanRequest({ ...req.body, amount: parseInt(req.body.amount) || 0, fileNames: req.files ? req.files.map(f => f.path) : [] });
            await newLoan.save(); res.status(201).json({ message: 'Success' });
        } catch (e) { res.status(500).json({ message: 'Error' }); }
    });
});

app.get('/api/loans', async (req, res) => { try { res.json(await LoanRequest.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).send("Error"); } });

app.put('/api/loans/:id', async (req, res) => { try { const updated = await LoanRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); res.json(updated); } catch (e) { res.status(500).send("Error"); } });

app.post('/api/trusts', async (req, res) => { try { await new TrustRequest(req.body).save(); res.status(201).json({ message: 'Success' }); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/trusts', async (req, res) => { try { res.json(await TrustRequest.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/users', async (req, res) => { try { res.json(await User.find().select('-password')); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/logs', async (req, res) => { try { res.json(await Log.find().sort({ date: -1 }).limit(100)); } catch (e) { res.status(500).send("Error"); } });

app.listen(PORT, () => console.log(`🚀 Port: ${PORT}`));