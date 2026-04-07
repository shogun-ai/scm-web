// server.js-ийн хамгийн дээр байгаа бүх require-ийг үүгээр соль:
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // ✅ require('cors')-ийг ингэж сольсон
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy'; 
import QRCode from 'qrcode'; 
import OpenAI from 'openai';
import Parser from 'rss-parser';
import cron from 'node-cron';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Stat from './models/Stat.js';
import Policy from './models/Policy.js';
import SiteConfig from './models/SiteConfig.js';
import ProductContent from './models/ProductContent.js';
import TeamMember from './models/TeamMember.js';
import FormConfig from './models/FormConfig.js';
import fs from 'fs'; // Файл устгахад хэрэгтэй

dotenv.config();
// process.env.NODE_TLS_REJECT_UNAUTHORIZED-ийг энд нэг удаа тавьж өгье
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();

// Дээр нь 'import cors from 'cors'' байгаа учраас шууд ингэж ашиглана:
app.use(cors());
// 1. CORS - Зөвхөн ЭНД нэг удаа байхад хангалттай
// --- ФУНКЦҮҮД БА ТОХИРГОО ---

const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'super_secret_key_change_this';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cloudinary тохиргоо
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

// --- МОДЕЛҮҮД (SCHEMAS) ---

const UserSchema = new mongoose.Schema({ 
    name: String, email: { type: String, unique: true }, password: { type: String, required: true }, 
    role: { type: String, default: 'employee' }, isActive: { type: Boolean, default: true }, 
    twoFASecret: { type: Object, default: null }, isTwoFAEnabled: { type: Boolean, default: false }, 
    createdAt: { type: Date, default: Date.now } 
});
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const BlogSchema = new mongoose.Schema({
    title: String, link: { type: String }, contentSnippet: String,
    source: { type: String, default: 'custom' }, pubDate: { type: Date, default: Date.now }, imageUrl: String,
    isCustom: { type: Boolean, default: false }
});
const Blog = mongoose.models.Blog || mongoose.model('Blog', BlogSchema);

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

// --- ӨГӨГДЛИЙН САН ---

const MONGO_URI = 'mongodb+srv://otgonbilegtseden_db_user:uFE1QiJHzhovsslQ@cluster0.izqptda.mongodb.net/scm_db?retryWrites=true&w=majority&appName=Cluster0';

const createLog = async (user, action, details) => { 
    try { if(user) await new Log({ userName: user.name, userRole: user.role, action, details }).save(); } 
    catch (e) {} 
};

// --- RSS PARSER БА МЭДЭЭ ТАТАХ ---

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
});

const scrapeNews = async () => {
    try {
        await Blog.deleteMany({});
        console.log("🧹 Бааз цэвэрлэгдлээ.");

        const targets = [
            { name: 'Ikon', url: 'https://ikon.mn/l/2' },
            { name: 'Golomt', url: 'https://golomtcapital.com/news' },
            { name: 'TavanBogd', url: 'https://tavanbogdcapital.com/news/c/662' },
            { name: 'TDB Securities', url: 'https://www.tdbsecurities.mn/category/weekly-news' }
        ];

        for (const target of targets) {
            try {
                console.log(`📡 ${target.name} руу хандаж байна...`);
                const { data: html } = await axios.get(target.url, {
                    timeout: 30000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36' }
                });
                const $ = cheerio.load(html);
                const articles = [];
                $('a').each((_, el) => {
                    const title = $(el).text().trim();
                    const href = $(el).attr('href') || '';
                    const fullHref = href.startsWith('http') ? href : (href.startsWith('/') ? new URL(href, target.url).href : '');
                    if (title.length > 30 && fullHref.includes('http')) {
                        articles.push({ title, link: fullHref });
                    }
                });
                const uniqueArticles = [...new Map(articles.map(item => [item.link, item])).values()];
                for (const art of uniqueArticles) {
                    await Blog.findOneAndUpdate(
                        { link: art.link },
                        { title: art.title, link: art.link, source: target.name, pubDate: new Date() },
                        { upsert: true }
                    );
                }
                console.log(`✅ ${target.name}: ${uniqueArticles.length} мэдээ олж хадгаллаа.`);
            } catch (e) {
                console.log(`❌ ${target.name} алдаа: ${e.message}`);
            }
        }
        console.log("🏁 Процесс дууслаа.");
    } catch (err) {
        console.error("Ерөнхий алдаа:", err);
    }
};

// Функцийг дуудах
scrapeNews();

// ============================================================
// 🤖 МЭДЭЭЛЛИЙН САН БА ТООЦООЛОЛ (DB-с уншдаг cache)
// ============================================================

// In-memory cache — сервер эхлэхэд дүүргэгдэнэ, admin хадгалахад шинэчлэгдэнэ
let chatbotCache = null;

const buildChatbotCache = async () => {
    try {
        const [cfgDocs, prodDocs] = await Promise.all([
            SiteConfig.find({ group: { $in: ['contact', 'rates'] } }),
            ProductContent.find({ isActive: true })
        ]);
        const cfg = {};
        cfgDocs.forEach(d => { cfg[d.key] = d.value; });

        const CONTACT_INFO = `📞 Утас: ${cfg.contact_phone || '75991919'}\n📧 Имэйл: ${cfg.contact_email || 'info@scm.mn'}\n📍 Хаяг: ${cfg.contact_address || ''}`;

        const PRODUCT_INFO = {};
        const keyMap = {
            'biz_loan': 'бизнесийн зээл',
            'car_loan': 'автомашины зээл',
            'cons_loan': 'хэрэглээний зээл',
            'trust': 'итгэлцэл',
            'credit_card': 'кредит карт',
            're_loan': 'үл хөдлөх барьцаалсан зээл',
            'line_loan': 'шугмын зээл',
        };
        prodDocs.forEach(p => {
            const key = keyMap[p.productKey];
            if (key && p.chatbotText) PRODUCT_INFO[key] = p.chatbotText;
        });

        chatbotCache = {
            CONTACT_INFO,
            PRODUCT_INFO,
            loan_rate_default: cfg.loan_rate_default || 3.2,
            dti_individual: (cfg.dti_individual || 55) / 100,
            dti_org: (cfg.dti_org || 20) / 100,
            trust_rate: (cfg.trust_rate || 1.8) / 100,
        };
        console.log('✅ Chatbot cache шинэчлэгдлээ');
    } catch (e) { console.error('Chatbot cache error:', e); }
};

const getChat = async () => {
    if (!chatbotCache) await buildChatbotCache();
    return chatbotCache;
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
        const { CONTACT_INFO, PRODUCT_INFO, loan_rate_default, dti_individual, dti_org, trust_rate } = await getChat();
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

        // --- GATEWAY ---
        if (msg.includes('холбоо барих')) return res.json({ reply: CONTACT_INFO + `\n\n[OPTIONS: Буцах]` });
        if (msg === 'зээл') { s.state = 'LOAN_MENU'; s.data = {}; return res.json({ reply: `Манай зээлийн бүтээгдэхүүнүүд:\n\n[OPTIONS: Автомашины зээл, Хэрэглээний зээл, Кредит карт, Бизнесийн зээл, Үл хөдлөх барьцаалсан зээл, Шугмын зээл, Буцах]` }); }
        if (msg === 'итгэлцэл') { s.state = 'TRUST_INFO'; s.data = {}; return res.json({ reply: `Итгэлцэл нь таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ юм. 😊\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` }); }

        // --- STATE MACHINE ---
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
                if (money) { s.data.amount = money; s.state = 'CALC_TERM'; return res.json({ reply: `Та ${formatMNT(money)} ₮-ийн зээл тооцоолохоор орууллаа. Хэдэн сарын хугацаатай авах вэ? (Жишээ нь: 24)` }); }
                return res.json({ reply: `Уучлаарай, дүнгээ зөвхөн тоогоор бичнэ үү? (Жишээ нь: 10000000)` });

            case 'CALC_TERM': {
                const term = parseInt(msg.match(/\d+/)?.[0]);
                if (term) {
                    const rate = (loan_rate_default || 3.2) / 100;
                    const pow = Math.pow(1 + rate, term);
                    const pmt = Math.round(s.data.amount * (rate * pow) / (pow - 1));
                    const dtiRatio = (s.data.userType === 'company') ? (dti_org || 0.20) : (dti_individual || 0.55);
                    const requiredIncome = Math.round(pmt / dtiRatio);
                    const warn = (s.data.productKey?.includes('авто') || s.data.productKey?.includes('хэрэглээ')) ? "\n⚠️ Анхааруулга: Урьдчилгаа 45%+, ӨОХ 55% ихгүй." : "";
                    const savedAmt = s.data.amount;
                    s.state = 'PRODUCT_OPTIONS';
                    return res.json({ reply: `📊 ЗЭЭЛИЙН ЖИШЭЭ ТООЦООЛОЛ (${(rate*100).toFixed(1)}% хүү):\n\n- Зээлийн дүн: ${formatMNT(savedAmt)} ₮\n- Сар бүр төлөх: **${formatMNT(pmt)} ₮**\n- Нийт төлөх дүн: ${formatMNT(pmt * term)} ₮\n- Сарын доод орлого: ${formatMNT(requiredIncome)} ₮${warn}\n\n[OPTIONS: Онлайн хүсэлт өгөх, Холбоо барих, Буцах]` });
                }
                return res.json({ reply: `Хугацаагаа зөвхөн тоогоор оруулна уу? (Жишээ нь: 12)` });
            }

            case 'TRUST_INFO':
                if (msg.includes('тооцоолол')) { s.state = 'T_CALC_AMT'; return res.json({ reply: `Итгэлцэл байршуулах дүнгээ зөвхөн тоогоор оруулна уу? (Жишээ нь: 10000000)` }); }
                return res.json({ reply: `Итгэлцэл нь таны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ юм. 😊\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` });

            case 'T_CALC_AMT':
                if (money) { s.data.amount = money; s.state = 'T_CALC_TERM'; return res.json({ reply: `Та ${formatMNT(money)} ₮ байршуулахаар орууллаа. Хугацаагаа сараар хэлнэ үү? (Минимум 6 сар)` }); }
                return res.json({ reply: `Дүнгээ зөвхөн тоогоор бичнэ үү? (Жишээ нь: 50000000)` });

            case 'T_CALC_TERM': {
                const tTerm = parseInt(msg.match(/\d+/)?.[0]);
                if (tTerm >= 6) { s.data.months = tTerm; s.state = 'T_CALC_TOPUP'; return res.json({ reply: `Сар бүр тогтмол дүн нэмэх үү?\n\n[OPTIONS: Үгүй, Буцах]` }); }
                return res.json({ reply: `Итгэлцлийн хугацаа хамгийн багадаа 6 сар байх ёстой. Дахин оруулна уу?` });
            }

            case 'T_CALC_TOPUP': {
                const topup = (msg === 'үгүй' || msg === 'ugui') ? 0 : money;
                if (topup === null && msg !== 'үгүй' && msg !== 'ugui') return res.json({ reply: `Нэмэх дүнгээ зөвхөн тоогоор бичнэ үү эсвэл "Үгүй" товчийг дарна уу.` });
                const r = trust_rate || 0.018;
                let bal = s.data.amount;
                for (let i = 0; i < s.data.months; i++) { bal = bal * (1 + r) + (topup || 0); }
                const invested = s.data.amount + ((topup || 0) * s.data.months);
                const interest = bal - invested;
                const tax = interest * 0.10;
                const finalAmt = bal - tax;
                const growth = ((finalAmt - invested) / invested * 100).toFixed(1);
                const savedTrustAmt = s.data.amount;
                s.state = 'TRUST_INFO'; s.data = {};
                return res.json({ reply: `📊 ИТГЭЛЦЛИЙН ТООЦООЛОЛ (${(r*100).toFixed(1)}% хүү):\n\n- Оруулсан дүн: ${formatMNT(savedTrustAmt)} ₮\n- Сар бүр нэмэх: ${formatMNT(topup || 0)} ₮\n- Нийт өсөх дүн: **${formatMNT(finalAmt)} ₮**\n- Хүүгийн орлого: ${formatMNT(interest)} ₮\n- Өсөлтийн хувь: ${growth}%\n\n⚠️ Хүүгийн орлогоос 10% (${formatMNT(tax)} ₮) татвар суутгагдана.\n\n[OPTIONS: Тооцоолол хийх, Холбоо барих, Буцах]` });
            }
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
            const cleanToken = twoFAToken.replace(/\s/g, '');
            console.log('🔐 2FA debug:', { cleanToken, secret: user.twoFASecret?.base32?.substring(0, 6) + '...', serverTime: new Date().toISOString() });
            const verified = speakeasy.totp.verify({ secret: user.twoFASecret.base32, encoding: 'base32', token: cleanToken, window: 4 });
            console.log('✅ verified:', verified);
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

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Бүх талбарыг бөглөнө үү' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'И-мэйл бүртгэлтэй байна' });
    const hashed = await bcrypt.hash(password, 10);
    const u = await new User({ name, email, password: hashed, role: role || 'employee' }).save();
    res.json({ message: 'Амжилттай', user: { _id: u._id, name: u.name, email: u.email, role: u.role } });
  } catch (e) { res.status(500).json({ message: 'Алдаа гарлаа' }); }
});

app.delete('/api/users/:id', async (req, res) => { try { await User.findByIdAndDelete(req.params.id); res.json({ message: 'Устгагдлаа' }); } catch (e) { res.status(500).send("Error"); } });

app.put('/api/trusts/:id', async (req, res) => { try { const t = await TrustRequest.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(t); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/logs', async (req, res) => { try { res.json(await Log.find().sort({ date: -1 }).limit(100)); } catch (e) { res.status(500).send("Error"); } });

// ✅ ОДОО ЭНД БЛОГИЙН API БАЙРЛАХ ЁСТОЙ
app.get('/api/blogs', async (req, res) => {
    try {
        if (req.query.isCustom === 'true') {
            return res.json(await Blog.find({ isCustom: true }).sort({ pubDate: -1 }));
        }
        const limit = parseInt(req.query.limit);
        let blogs = await Blog.find().sort({ pubDate: -1 });

        if (limit === 4) {
            // 💡 Нүүр хуудас: Эх сурвалж бүрээс хамгийн сүүлийн 1 мэдээг авна
            const sources = ['Ikon', 'Golomt', 'TavanBogd', 'TDB Securities'];
            let featuredBlogs = [];
            
            sources.forEach(source => {
                const latestFromSource = blogs.find(b => b.source === source);
                if (latestFromSource) featuredBlogs.push(latestFromSource);
            });
            
            return res.json(featuredBlogs.slice(0, 4));
        }

        // 💡 Бүх мэдээ: Жагсаалтыг санамсаргүйгээр холино (Shuffle)
        blogs = blogs.sort(() => Math.random() - 0.5);
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/blogs', async (req, res) => {
    try {
        const { title, contentSnippet, imageUrl, link } = req.body;
        const blog = new Blog({
            title, contentSnippet, imageUrl,
            link: link || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: 'custom', isCustom: true
        });
        await blog.save();
        res.status(201).json(blog);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/blogs/:id', async (req, res) => {
    try {
        const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/blogs/:id', async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Устгагдлаа' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- 1. САНХҮҮГИЙН ҮЗҮҮЛЭЛТ API ---
// Бүх тоог баазаас авах (Нүүр хуудсанд харуулах)
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await Stat.find().sort({ order: 1 });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Тоог шинэчлэх (Админ панелаас хадгалах үед)
app.put('/api/stats/:id', async (req, res) => {
    try {
        await Stat.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: "Амжилттай шинэчлэгдлээ" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 2. ЖУРАМ БОЛОН ТАЙЛАН API ---
app.get('/api/policies', async (req, res) => {
    try {
        const filter = req.query.category ? { category: req.query.category } : {};
        const policies = await Policy.find(filter).sort({ uploadDate: -1 });
        res.json(policies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Файл хуулах тохиргоо (frontend/public/policies хавтас руу хадгална)
const policyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../frontend/public/policies'); 
    },
    filename: (req, file, cb) => {
        // Файлын нэрийг давхцуулахгүйн тулд огноо нэмнэ
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const uploadPolicy = multer({ storage: policyStorage });

// Шинэ файл (PDF) бааз руу бүртгэж, хавтас руу хуулах
app.post('/api/policies', uploadPolicy.single('file'), async (req, res) => {
    try {
        const newPolicy = new Policy({
            title: req.body.title,
            category: req.body.category,
            fileName: req.file.filename
        });
        await newPolicy.save();
        res.json(newPolicy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🗑 Файл устгах API
app.delete('/api/policies/:id', async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Файл олдсонгүй" });

        // 1. Хавтаснаас нь устгах
        const filePath = `../frontend/public/policies/${policy.fileName}`;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 2. Баазаас устгах
        await Policy.findByIdAndDelete(req.params.id);
        res.json({ message: "Файл амжилттай устлаа" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// ============================================================
// 🗄️ CMS — SITE CONFIG (Текст, хүү, холбоо барих)
// ============================================================

// Анхны өгөгдөл оруулах (нэг удаа дуудна)
const seedSiteConfig = async () => {
    const defaults = [
        // --- Холбоо барих ---
        { key: 'contact_phone', value: '75991919, 75999191', label: 'Утас', group: 'contact' },
        { key: 'contact_email', value: 'info@scm.mn', label: 'Имэйл', group: 'contact' },
        { key: 'contact_address', value: 'Хан-Уул дүүрэг, 20-р хороо, Чингисийн өргөн чөлөө, Мишээл сити төв, М3 цамхаг 1208 тоот', label: 'Хаяг', group: 'contact' },
        // --- Hero хэсэг ---
        { key: 'hero_line1', value: 'Бизнесийн', label: 'Hero гарчиг (1-р мөр)', group: 'hero' },
        { key: 'hero_highlight', value: 'Өсөлтийг', label: 'Hero онцолсон үг', group: 'hero' },
        { key: 'hero_line2', value: 'Дэмжинэ', label: 'Hero гарчиг (2-р мөр)', group: 'hero' },
        { key: 'hero_description', value: 'Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.', label: 'Hero тайлбар текст', group: 'hero' },
        { key: 'hero_button', value: 'Бүтээгдэхүүн үзэх', label: 'Hero товчны текст', group: 'hero' },
        // --- Бид хэн бэ ---
        { key: 'about_title', value: 'Бид хэн бэ?', label: '"Бид хэн бэ" гарчиг', group: 'about' },
        { key: 'about_intro', value: 'Солонго Капитал ББСБ ХХК нь харилцагч төвтэй үйлчилгээг эрхэмлэн, санхүүгийн салбарт шинэ жишиг тогтоохоор зорин ажиллаж байна.', label: 'Танилцуулгын оршил', group: 'about' },
        { key: 'about_mission_title', value: 'Эрхэм зорилго', label: 'Эрхэм зорилго гарчиг', group: 'about' },
        { key: 'about_mission_text', value: 'Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан шийдлээр хангах.', label: 'Эрхэм зорилго текст', group: 'about' },
        { key: 'about_vision_title', value: 'Алсын хараа', label: 'Алсын хараа гарчиг', group: 'about' },
        { key: 'about_vision_text', value: 'Итгэлд суурилсан, дижитал, хэрэглэгч төвтэй байгууллага болох.', label: 'Алсын харааны текст', group: 'about' },
        { key: 'about_values_title', value: 'Үнэ цэнэ', label: 'Үнэ цэнэ гарчиг', group: 'about' },
        { key: 'about_values_text', value: 'Шударга ёс, Ил тод байдал, Хамтын ажиллагаа, Инноваци.', label: 'Үнэ цэнэ текст', group: 'about' },
        // --- Санхүүгийн үзүүлэлт ---
        { key: 'financial_section_label', value: 'Бидний амжилт', label: 'Санхүүгийн хэсгийн дэд гарчиг', group: 'financials' },
        { key: 'financial_section_title', value: 'Санхүүгийн үзүүлэлтүүд', label: 'Санхүүгийн хэсгийн гарчиг', group: 'financials' },
        { key: 'financial_section_desc', value: 'Бид богино хугацааны өндөр ашигт бус, урт хугацаанд тогтвортой, хүртээмжтэй санхүүгийн экосистемийг бүтээхийг зорьдог.', label: 'Санхүүгийн хэсгийн тайлбар', group: 'financials' },
        { key: 'financial_date', value: '2025 оны 11 сарын 30-ны байдлаар', label: 'Тайлангийн огноо', group: 'financials' },
        // --- Хүү & Тооцоолуур ---
        { key: 'loan_rate_min', value: 2.5, label: 'Зээлийн хүү (доод, %)', group: 'rates' },
        { key: 'loan_rate_max', value: 3.5, label: 'Зээлийн хүү (дээд, %)', group: 'rates' },
        { key: 'loan_rate_default', value: 3.2, label: 'Зээлийн хүү (чатботын тооцоолол, %)', group: 'rates' },
        { key: 'loan_max_term', value: 96, label: 'Зээлийн хамгийн дээд хугацаа (сар)', group: 'rates' },
        { key: 'trust_rate', value: 1.8, label: 'Итгэлцлийн хүү (сарын, %)', group: 'rates' },
        { key: 'dti_individual', value: 55, label: 'ӨОХ харьцаа — Иргэн (%)', group: 'rates' },
        { key: 'dti_org', value: 20, label: 'ӨОХ харьцаа — Байгууллага (%)', group: 'rates' },
        // --- Захирлын мэндчилгээ ---
        { key: 'ceo_name', value: 'Б.Золбоо', label: 'Захирлын нэр', group: 'ceo' },
        { key: 'ceo_title', value: 'Гүйцэтгэх захирал', label: 'Захирлын албан тушаал', group: 'ceo' },
        { key: 'ceo_image', value: '/board/zolboo.jpg', label: 'Захирлын зургийн зам', group: 'ceo' },
        { key: 'ceo_headline', value: 'Итгэлцэл дээр Ирээдүйг бүтээнэ', label: 'Мэндчилгээний гарчиг', group: 'ceo' },
        { key: 'ceo_message', value: 'Эрхэм харилцагч, хүндэт түншүүд та бүхний амар амгаланг айлтгая.\n\n"Солонго Капитал ББСБ" нь байгуулагдсан цагаасаа эхлэн харилцагч төвтэй үйлчилгээ, шинэлэг бүтээгдэхүүнийг зах зээлд нэвтрүүлж, Монгол Улсын санхүүгийн салбарын хөгжилд өөрийн хувь нэмрийг оруулахыг зорин ажиллаж байна.\n\nБид зөвхөн санхүүгийн үйлчилгээ үзүүлэгч бус, таны бизнесийн өсөлтийг дэмжигч, найдвартай түнш байхыг эрхэмлэдэг.\n\nБидэнд итгэл хүлээлгэн хамтран ажилладаг та бүхэндээ талархал илэрхийлье.', label: 'Мэндчилгээний текст', group: 'ceo' },
        { key: 'ceo_signature', value: '/signature.png', label: 'Гарын үсгийн зураг', group: 'ceo' },
        // --- Хувьцаа эзэмшигч ---
        { key: 'shareholder_name', value: 'Б.Дөлгөөн', label: 'Хувьцаа эзэмшигчийн нэр', group: 'shareholder' },
        { key: 'shareholder_percent', value: '100', label: 'Эзэмшлийн хувь (%)', group: 'shareholder' },
        { key: 'shareholder_description', value: '"Солонго Капитал ББСБ" ХХК нь Монгол Улсын иргэний 100% өмчлөлд байдаг, дотоодын хөрөнгө оруулалттай компани юм.', label: 'Тайлбар', group: 'shareholder' },
    ];
    await Promise.all(defaults.map(d =>
        SiteConfig.findOneAndUpdate({ key: d.key }, { $setOnInsert: d }, { upsert: true })
    ));
    console.log('✅ SiteConfig seed хийгдлээ');
};

const seedTeamMembers = async () => {
    const mgmtCount = await TeamMember.countDocuments({ memberType: 'management' });
    if (mgmtCount === 0) {
        await TeamMember.insertMany([
            { name: 'Ц.Отгонбилэг', role: 'Ерөнхий захирал', imagePath: '/board/otgonbileg.jpg', memberType: 'management', order: 1 },
            { name: 'Б.Золбоо', role: 'Гүйцэтгэх захирал', imagePath: '/board/zolboo.jpg', memberType: 'management', order: 2 },
        ]);
    }
    const boardCount = await TeamMember.countDocuments({ memberType: 'board' });
    if (boardCount === 0) {
        await TeamMember.insertMany([
            { name: 'Б.Дөлгөөн', role: 'ТУЗ-ын дарга', experience: 'Уул уурхай, олборлолтын салбарт 20 гаран жилийн ажлын туршлагатай.', imagePath: '/board/dulguun.jpg', memberType: 'board', order: 1 },
            { name: 'Б.Золбоо', role: 'ТУЗ-ын гишүүн, Гүйцэтгэх захирал', experience: 'Банк санхүүгийн салбарт 18 жилийн ажлын туршлагатай.', imagePath: '/board/zolboo.jpg', memberType: 'board', order: 2 },
            { name: 'Ц.Отгонбилэг', role: 'ТУЗ-ын гишүүн, Ерөнхий захирал', experience: 'Банк санхүүгийн салбарт 23 жилийн ажлын туршлагатай.', imagePath: '/board/otgonbileg.jpg', memberType: 'board', order: 3 },
            { name: 'В.Ганзориг', role: 'ТУЗ-ын хараат бус гишүүн', experience: 'Банк санхүү, маркетинг, медиа салбарт 22 жилийн туршлагатай.', imagePath: '/board/ganzorig.jpg', memberType: 'board', order: 4 },
            { name: 'Д.Энхтүвшин', role: 'ТУЗ-ын нарийн бичгийн дарга', experience: 'Банк санхүү, эм ханган нийлүүлэлтийн салбарт 18 жилийн туршлагатай.', imagePath: '/board/enkhtuvshin.jpg', memberType: 'board', order: 5 },
        ]);
    }
    console.log('✅ TeamMember seed хийгдлээ');
};

const seedProductContent = async () => {
    const defaults = [
        {
            productKey: 'biz_loan', order: 1, title: 'Бизнесийн зээл',
            shortDesc: 'Бизнесийн өсөлтийг хурдасгах стратегийн санхүүжилт.',
            description: 'Бизнесийн үйл ажиллагаагаа өргөжүүлэх, эргэлтийн хөрөнгөө нэмэгдүүлэх, шинэ тоног төхөөрөмж болон үйлдвэрлэлийн хүчин чадлаа сайжруулахад зориулагдсан зээл. Танай бизнесийн онцлог, мөнгөн урсгалд нийцсэн бүтэцтэйгээр санхүүжилтийг шийднэ.',
            chatbotText: '🏢 Бизнесийн зээл:\n500 сая төгрөг хүртэл, ЖДҮ-ийн санхүүжилт.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-60 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн хэмжээ: 500 сая хүртэл', 'Хугацаа: 1-60 сар хүртэл', 'Хүү: 2.5% - 3.5%'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] },
            organization: { conditions: ['Зээлийн хэмжээ: 1.5 тэрбум хүртэл', 'Хугацаа: 1-60 сар хүртэл', 'Хүү: 2.5% - 3.5%'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }
        },
        {
            productKey: 'car_loan', order: 2, title: 'Автомашины зээл',
            shortDesc: 'Шуурхай шийдвэрлэлт.',
            description: 'Автомашин худалдан авах болон автомашин барьцаалсан зээлийн үйлчилгээ.',
            chatbotText: '🚗 Автомашины зээл:\nШинэ хуучин автомашин авах, мөн унаж яваа машинаа барьцаалан зээл авах боломжтой.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-60 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            purchase: { label: 'Автомашины зээл', individual: { conditions: ['Хугацаа 1-ээс 60 сар хүртэл', 'Зээлийн хүү 2.5%-аас 3.5% хүртэл', 'Урьдчилгаа төлбөр 45%-аас багагүй', 'Зээлийн хэмжээ барьцаа хөрөнгийн зах зээлийн үнэлгээний 60% хүртэл', 'Өр орлогын харьцаа 55% ихгүй'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }, organization: { conditions: ['Зээл: Үнэлгээний 80%', 'Хугацаа: 1-96 сар хүртэл', 'Зээлийн хүү: 2.5%-3.5%'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] } },
            collateral: { label: 'Автомашин барьцаалсан зээл', individual: { conditions: ['Зээл: Үнэлгээний 50%', 'Зээлийн хүү: 2.8% - 3.5%', 'Хугацаа: 1-24 сар хүртэл', 'Өр орлогын харьцаа 55% ихгүй'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх', 'Автомашин нь өөрийнх нь нэр дээр'] }, organization: { conditions: ['Зээл: Үнэлгээний 50%', 'Зээлийн хүү: 2.8% - 3.5%', 'Хугацаа: 1-24 сар'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх', 'Автомашин нь тухайн байгууллагын нэр дээр байх'] } }
        },
        {
            productKey: 'cons_loan', order: 3, title: 'Хэрэглээний зээл',
            shortDesc: 'Иргэдийн хувийн хэрэгцээнд зориулсан зээл.',
            description: 'Иргэдийн хувийн хэрэгцээнд зориулсан, шуурхай шийдвэртэй, уян хатан нөхцөлтэй зээл.',
            chatbotText: '💰 Хэрэглээний зээл:\nБүх төрлийн хэрэглээ, лизингийн зээл.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-36 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['300 сая хүртэл', 'Зээлийн хүү: 2.5% - 3.5%', 'Хугацаа: 1-36 сар хүртэлх', 'Өр орлогын харьцаа 55% ихгүй байх'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажилласан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }
        },
        {
            productKey: 'trust', order: 4, title: 'Итгэлцэл',
            shortDesc: 'Өндөр өгөөж.',
            description: 'Таны мөнгөн хөрөнгийг найдвартай өсгөх, өндөр өгөөжтэй хөрөнго оруулалтын үйлчилгээ.',
            chatbotText: '💎 Итгэлцэл:\nТаны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ.\n- Хүү: сарын 1.8%\n- Хугацаа: 6 сараас дээш.',
            bgImageUrl: 'https://images.unsplash.com/photo-1565514020176-db8217350024?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
        },
        {
            productKey: 'credit_card', order: 5, title: 'Кредит карт',
            shortDesc: 'Санхүүгийн эрх чөлөө.',
            description: 'ApplePay болон GooglePay-д холбогдсон Олон улсын эрхтэй зээлийн Платинум МастерКарт - ТУН УДАХГҮЙ...',
            chatbotText: '💳 Кредит карт:\nPlatinum Master карт. 100 сая хүртэлх лимит, 55 хоног хүүгүй.',
            bgImageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн эрх: 300 сая хүртэл'], requirements: ['Тогтмол орлоготой байх ба ББСБ-наас шаардсан бусад шаарлагын хангасан байх.'] },
            organization: { conditions: ['Зээлийн эрх: 500 сая хүртэл'], requirements: ['Бизнесийн тогтмол орлоготой байх ба байгууллагын батлан даалттайгаар хэдэн ч ажилтан, эрх бүхий этгээд ашиглах боломжтой'] }
        },
        {
            productKey: 're_loan', order: 6, title: 'Үл хөдлөх барьцаалсан зээл',
            shortDesc: 'Томоохон хэмжээний санхүүжилт.',
            description: 'Таны гэнэтийн санхүүгийн хэрэгцээг түргэн шуурхай шийдэх зорилгоор таны өөрийн өмчлөлийн үл хөдлөх хөрөнгийг барьцаалан олгох зээл.',
            chatbotText: '🏠 Үл хөдлөх барьцаалсан зээл:\n1 тэрбум төгрөг хүртэл, зах зээлийн үнэлгээний 70% хүртэл.',
            bgImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн хэмжээ: 1 тэрбум төгрөг хүртэлх', 'Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй', 'Зээлийн хүү: 2.5% - 3.5%', 'Зээлийн хугацаа: 1-24 сар хүртэлх'], requirements: ['Үл хөдлөх хөрөнгийн гэрчилгээ', 'Бизнесийн болон цалингийн тогтмол орлоготой байх', 'Кредит скорингийн оноо хангалттай байх'] },
            organization: { conditions: ['Зээлийн хэмжээ: 1.5 тэрбум төгрөг хүртэлх', 'Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй', 'Зээлийн хүү: 2.5% - 3.5%', 'Зээлийн хугацаа: 1-24 сар хүртэлх'], requirements: ['Байгууллагын өмчлөлийн үл хөрөнгө байх', 'Бизнесийн тогтмол орлоготой байх', 'Кредит скорингийн хангалттай оноотой байх'] }
        },
        {
            productKey: 'line_loan', order: 7, title: 'Шугмын зээл',
            shortDesc: 'Бизнесийн эргэлтийг дэмжих тасралтгүй санхүүжилт.',
            description: 'Бизнесийн байнгын үйл ажиллагааг тасралтгүй дэмжих, мөнгөн урсгалын зохистой байдлыг хангах зориулалттай зээлийн шугам. Хэрэгцээндээ нийцүүлэн ашиглах боломжтой уян хатан бүтэцтэй.',
            chatbotText: '📈 Шугмын зээл:\n1.5 тэрбум төгрөг хүртэл, мөнгөн урсгалыг дэмжих зээл.',
            bgImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1664575602554-2087b04935a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            organization: { conditions: ['Зээлийн эрх: Орлогын 40%', 'Зээлийн хэмжээ: 1.5 тэрбум төгрөг хүртэлх', 'Хугацаа: 6-36 сар хүртэлх'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }
        },
    ];
    await Promise.all(defaults.map(d =>
        ProductContent.findOneAndUpdate(
            { productKey: d.productKey },
            { $setOnInsert: d },
            { upsert: true }
        )
    ));
    console.log('✅ ProductContent seed хийгдлээ');
};

const seedFormConfig = async () => {
    const count = await FormConfig.countDocuments();
    if (count > 0) return;
    await FormConfig.insertMany([
        { formId: 'loan', fields: [
            { fieldKey: 'lastname', label: 'Овог', placeholder: 'Овгоо оруулна уу', isRequired: true, isEnabled: true, order: 1 },
            { fieldKey: 'firstname', label: 'Нэр', placeholder: 'Нэрээ оруулна уу', isRequired: true, isEnabled: true, order: 2 },
            { fieldKey: 'regNo', label: 'Регистрийн дугаар', placeholder: 'АА00000000', isRequired: true, isEnabled: true, order: 3 },
            { fieldKey: 'phone', label: 'Утасны дугаар', placeholder: '8 оронтой дугаар', isRequired: true, isEnabled: true, order: 4 },
            { fieldKey: 'email', label: 'Имэйл', placeholder: 'email@example.com', isRequired: false, isEnabled: true, order: 5 },
            { fieldKey: 'address', label: 'Хаяг', placeholder: 'Дүүрэг, хороо, гудамж', isRequired: true, isEnabled: true, order: 6 },
            { fieldKey: 'amount', label: 'Зээлийн дүн', placeholder: '10,000,000', isRequired: true, isEnabled: true, order: 7 },
            { fieldKey: 'term', label: 'Хугацаа (сар)', placeholder: '12', isRequired: true, isEnabled: true, order: 8 },
        ]},
        { formId: 'trust', fields: [
            { fieldKey: 'lastname', label: 'Овог', placeholder: 'Овгоо оруулна уу', isRequired: true, isEnabled: true, order: 1 },
            { fieldKey: 'firstname', label: 'Нэр', placeholder: 'Нэрээ оруулна уу', isRequired: true, isEnabled: true, order: 2 },
            { fieldKey: 'phone', label: 'Утасны дугаар', placeholder: '8 оронтой дугаар', isRequired: true, isEnabled: true, order: 3 },
            { fieldKey: 'email', label: 'Имэйл', placeholder: 'email@example.com', isRequired: false, isEnabled: true, order: 4 },
            { fieldKey: 'amount', label: 'Байршуулах дүн', placeholder: '10,000,000', isRequired: true, isEnabled: true, order: 5 },
        ]},
    ]);
    console.log('✅ FormConfig seed хийгдлээ');
};

const seedStats = async () => {
    const defaults = [
        { label: 'Өөрийн хөрөнгө', value: '7 Тэрбум', order: 1 },
        { label: 'Нийт хөрөнгө', value: '10.8 Тэрбум', order: 2 },
        { label: 'Нийт зээлийн дүн', value: '9.2 Тэрбум', order: 3 },
        { label: 'Чанаргүй зээлийн хувь', value: '3.6%', order: 4 },
        { label: 'Өөрийн хөрөнгийн өгөөж (ROE)', value: '13.7%', order: 5 },
        { label: 'Дундаж хүү', value: '2.6%', order: 6 },
    ];
    await Promise.all(defaults.map(d =>
        Stat.findOneAndUpdate({ label: d.label }, { $setOnInsert: d }, { upsert: true })
    ));
    console.log('✅ Stat seed хийгдлээ');
};

mongoose.connect(MONGO_URI).then(async () => {
    console.log('✅ MongoDB Connected');
    await seedSiteConfig();
    await seedTeamMembers();
    await seedProductContent();
    await seedFormConfig();
    await seedStats();
}).catch(e => console.error(e));

// ============================================================
// 📡 CMS API — SiteConfig
// ============================================================

app.get('/api/config', async (req, res) => {
    try {
        const configs = await SiteConfig.find();
        const grouped = {};
        configs.forEach(c => {
            if (!grouped[c.group]) grouped[c.group] = {};
            grouped[c.group][c.key] = { value: c.value, label: c.label };
        });
        res.json(grouped);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/config/flat', async (req, res) => {
    try {
        const configs = await SiteConfig.find();
        const flat = {};
        configs.forEach(c => { flat[c.key] = c.value; });
        res.json(flat);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/config/:key', async (req, res) => {
    try {
        await SiteConfig.findOneAndUpdate(
            { key: req.params.key },
            { value: req.body.value, updatedAt: new Date() }
        );
        res.json({ message: 'Амжилттай шинэчлэгдлээ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/config/bulk', async (req, res) => {
    try {
        const updates = req.body;
        await Promise.all(Object.entries(updates).map(([key, value]) =>
            SiteConfig.findOneAndUpdate({ key }, { value, updatedAt: new Date() }, { upsert: true })
        ));
        chatbotCache = null; // cache шинэчлэх
        res.json({ message: 'Амжилттай хадгалагдлаа' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// 📡 CMS API — ProductContent
// ============================================================

// Зураг upload endpoint
app.post('/api/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Файл байхгүй' });
        res.json({ url: req.files[0].path });
    });
});

app.get('/api/products/content', async (req, res) => {
    try {
        res.json(await ProductContent.find().sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/products/content', async (req, res) => {
    try {
        const product = new ProductContent(req.body);
        await product.save();
        chatbotCache = null;
        res.json(product);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/products/content/:key', async (req, res) => {
    try {
        await ProductContent.findOneAndDelete({ productKey: req.params.key });
        chatbotCache = null;
        res.json({ message: 'Устгагдлаа' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/products/content/:key', async (req, res) => {
    try {
        await ProductContent.findOneAndUpdate(
            { productKey: req.params.key },
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        chatbotCache = null; // cache шинэчлэх
        res.json({ message: 'Амжилттай шинэчлэгдлээ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// 📡 CMS API — TeamMember
// ============================================================

app.get('/api/team', async (req, res) => {
    try {
        res.json(await TeamMember.find({ isActive: true }).sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/team/all', async (req, res) => {
    try {
        res.json(await TeamMember.find().sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/team', async (req, res) => {
    try {
        const member = new TeamMember(req.body);
        await member.save();
        res.status(201).json(member);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/team/:id', async (req, res) => {
    try {
        const updated = await TeamMember.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        res.json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/team/:id', async (req, res) => {
    try {
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Устгагдлаа' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// 📡 CMS API — FormConfig
// ============================================================

app.get('/api/form-config/:formId', async (req, res) => {
    try {
        const config = await FormConfig.findOne({ formId: req.params.formId });
        res.json(config);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/form-config/:formId', async (req, res) => {
    try {
        await FormConfig.findOneAndUpdate(
            { formId: req.params.formId },
            { fields: req.body.fields, updatedAt: new Date() }
        );
        res.json({ message: 'Амжилттай хадгалагдлаа' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.listen(PORT, () => console.log(`🚀 Port: ${PORT}`));