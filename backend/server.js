// server.js-Ð¸Ð¹Ð½ Ñ…Ð°Ð¼Ð³Ð¸Ð¹Ð½ Ð´ÑÑÑ€ Ð±Ð°Ð¹Ð³Ð°Ð° Ð±Ò¯Ñ… require-Ð¸Ð¹Ð³ Ò¯Ò¯Ð³ÑÑÑ€ ÑÐ¾Ð»ÑŒ:
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors'; // âœ… require('cors')-Ð¸Ð¹Ð³ Ð¸Ð½Ð³ÑÐ¶ ÑÐ¾Ð»ÑŒÑÐ¾Ð½
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy'; 
import QRCode from 'qrcode'; 
import OpenAI, { toFile } from 'openai';
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
import ExposureSnapshot from './models/ExposureSnapshot.js';
import ExposureCase from './models/ExposureCase.js';
import fs from 'fs'; // Ð¤Ð°Ð¹Ð» ÑƒÑÑ‚Ð³Ð°Ñ…Ð°Ð´ Ñ…ÑÑ€ÑÐ³Ñ‚ÑÐ¹
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localUploadsDir = path.join(__dirname, 'uploads');
const exposureUploadsDir = path.join(localUploadsDir, 'exposure');
if (!fs.existsSync(exposureUploadsDir)) {
    fs.mkdirSync(exposureUploadsDir, { recursive: true });
}

const app = express();

// Ð”ÑÑÑ€ Ð½ÑŒ 'import cors from 'cors'' Ð±Ð°Ð¹Ð³Ð°Ð° ÑƒÑ‡Ñ€Ð°Ð°Ñ ÑˆÑƒÑƒÐ´ Ð¸Ð½Ð³ÑÐ¶ Ð°ÑˆÐ¸Ð³Ð»Ð°Ð½Ð°:
const ALLOWED_ORIGINS = [
    'https://www.scm.mn',
    'https://scm.mn',
    'https://scm-okjs.onrender.com',
    'http://localhost:5173',
    'http://localhost:5001',
    'http://localhost:3000',
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(null, true); // allow all for now — tighten later if needed
    },
    credentials: true,
}));
// 1. CORS - Ð—Ó©Ð²Ñ…Ó©Ð½ Ð­ÐÐ” Ð½ÑÐ³ ÑƒÐ´Ð°Ð° Ð±Ð°Ð¹Ñ…Ð°Ð´ Ñ…Ð°Ð½Ð³Ð°Ð»Ñ‚Ñ‚Ð°Ð¹
// --- Ð¤Ð£ÐÐšÐ¦Ò®Ò®Ð” Ð‘Ð Ð¢ÐžÐ¥Ð˜Ð Ð“ÐžÐž ---

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Cloudinary Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dcreily3l',
    api_key: process.env.CLOUDINARY_API_KEY || '644213573533415',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'ONABORM8BAwtApxp7UiZLqIiku0'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'scm_uploads', resource_type: 'raw', access_mode: 'public' }
});
const upload = multer({ storage: storage }).any();
const exposureDiskStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, exposureUploadsDir),
    filename: (_req, file, cb) => {
        const safeName = String(file.originalname || 'exposure.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});
const exposureUpload = multer({
    storage: exposureDiskStorage,
    limits: { files: 1, fileSize: 20 * 1024 * 1024 }
}).single('file');
const analyzeUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024, files: 5 }
}).array('bankStatements', 5);

// --- ÐœÐžÐ”Ð•Ð›Ò®Ò®Ð” (SCHEMAS) ---

const UserSchema = new mongoose.Schema({
    name: String, email: { type: String, unique: true }, password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    roles: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
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
    // Байгууллага
    orgName: String, orgRegNo: String, contactName: String, contactPhone: String,
    purpose: String, repaymentSource: String,
    // Хариуцагч
    assignee: { userId: String, name: String },
    // Ажилтан үүсгэсэн эсэх
    createdByStaff: { type: Boolean, default: false },
    createdByUser: { userId: String, name: String },
    selfieUrl: String,
    fileNames: [String],
    fileDetails: [{
        fieldName: String, fileName: String, fileUrl: String, mimeType: String, size: Number
    }],
    // Дэлгэрэнгүй хүсэлтийн мэдээлэл (Application form data)
    applicationData: { type: mongoose.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now }
});
const LoanRequest = mongoose.models.LoanRequest || mongoose.model('LoanRequest', LoanRequestSchema);

const LoanResearchSchema = new mongoose.Schema({
    borrower: { type: mongoose.Schema.Types.Mixed, default: {} },
    outputs: { type: mongoose.Schema.Types.Mixed, default: {} },
    files: {
        bankStatements: [{
            fileName: String,
            fileUrl: String,
            mimeType: String,
            size: Number
        }],
        socialInsurance: {
            fileName: String,
            fileUrl: String,
            mimeType: String,
            size: Number
        },
        creditReference: {
            fileName: String,
            fileUrl: String,
            mimeType: String,
            size: Number
        }
    },
    createdBy: {
        userId: String,
        name: String,
        role: String
    },
    status: { type: String, default: 'draft' },
    embedding: { type: [Number], default: undefined, select: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const LoanResearch = mongoose.models.LoanResearch || mongoose.model('LoanResearch', LoanResearchSchema);

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

const createLog = async (user, action, details) => { 
    try { if(user) await new Log({ userName: user.name, userRole: user.role, action, details }).save(); } 
    catch (e) {} 
};

const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        if (!token) {
            console.warn('[AUTH] No token. Path:', req.path, 'Headers:', JSON.stringify(req.headers));
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(payload.id).select('-password');
        if (!user || !user.isActive) return res.status(401).json({ message: 'Unauthorized' });

        req.user = user;
        next();
    } catch (e) {
        console.warn('[AUTH] Error:', e.message, 'Path:', req.path);
        res.status(401).json({ message: 'Unauthorized' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin' && !req.user?.roles?.includes('admin')) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};

if (!MONGO_URI) {
    throw new Error('MONGO_URI or MONGODB_URI is required');
}

// --- RSS PARSER Ð‘Ð ÐœÐ­Ð”Ð­Ð­ Ð¢ÐÐ¢ÐÐ¥ ---

const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
    },
});

const scrapeNews = async () => {
    try {
        await Blog.deleteMany({ isCustom: { $ne: true } });
        console.log("News cache cleared.");

        const targets = [
            { name: 'Ikon', url: 'https://ikon.mn/l/2' },
            { name: 'Golomt', url: 'https://golomtcapital.com/news' },
            { name: 'TavanBogd', url: 'https://tavanbogdcapital.com/news/c/662' },
            { name: 'TDB Securities', url: 'https://www.tdbsecurities.mn/category/weekly-news' }
        ];

        for (const target of targets) {
            try {
                console.log(`Fetching news from ${target.name}...`);
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
                console.log(`${target.name}: saved ${uniqueArticles.length} news items.`);
            } catch (e) {
                console.log(`${target.name} scrape error: ${e.message}`);
            }
        }
        console.log("News scrape finished.");
    } catch (err) {
        console.error("News scrape failed:", err);
    }
};

// scrapeNews runs after MongoDB connects.

// ============================================================
// Chatbot knowledge base and calculator cache.
// ============================================================

// In-memory cache â€” ÑÐµÑ€Ð²ÐµÑ€ ÑÑ…Ð»ÑÑ…ÑÐ´ Ð´Ò¯Ò¯Ñ€Ð³ÑÐ³Ð´ÑÐ½Ñ, admin Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…Ð°Ð´ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÐ³Ð´ÑÐ½Ñ
let chatbotCache = null;

const asCleanList = (items = []) => (
    Array.isArray(items)
        ? items.map(item => String(item || '').trim()).filter(Boolean)
        : []
);

const uniqueList = (items = []) => [...new Set(asCleanList(items))];

const userTypeField = (docType) => (docType === 'company' ? 'organization' : 'individual');

const buildProductDocs = (product, docType) => {
    const field = userTypeField(docType);
    const groups = [
        { label: null, items: product?.[field]?.requirements },
        { label: product?.purchase?.label || 'Автомашин худалдан авах', items: product?.purchase?.[field]?.requirements },
        { label: product?.collateral?.label || 'Автомашин барьцаалсан зээл', items: product?.collateral?.[field]?.requirements },
    ];

    const hasSubProducts = Boolean(product?.purchase || product?.collateral);
    const docs = [];

    groups.forEach(({ label, items }) => {
        const cleanItems = uniqueList(items);
        if (!cleanItems.length) return;

        if (hasSubProducts && label) {
            docs.push(`${label}:`);
        }
        docs.push(...cleanItems);
    });

    return uniqueList(docs);
};

const buildChatbotCache = async () => {
    try {
        const [cfgDocs, prodDocs] = await Promise.all([
            SiteConfig.find({ group: { $in: ['contact', 'rates'] } }),
            ProductContent.find({ isActive: true })
        ]);
        const cfg = {};
        cfgDocs.forEach(d => { cfg[d.key] = d.value; });

        const CONTACT_INFO = `Утас: ${cfg.contact_phone || '75991919'}\nИмэйл: ${cfg.contact_email || 'info@scm.mn'}\nХаяг: ${cfg.contact_address || ''}`;

        const PRODUCT_INFO = {};
        const PRODUCT_DOCS = {};
        const PRODUCT_CONTEXT = [];
        const keyMap = {
            biz_loan: 'бизнесийн зээл',
            car_loan: 'автомашины зээл',
            cons_loan: 'хэрэглээний зээл',
            trust: 'итгэлцэл',
            credit_card: 'кредит карт',
            re_loan: 'үл хөдлөх барьцаалсан зээл',
            line_loan: 'шугмын зээл',
        };
        prodDocs.forEach(p => {
            const key = keyMap[p.productKey];
            if (key && p.chatbotText) PRODUCT_INFO[key] = p.chatbotText;
            if (p.productKey && p.chatbotText) PRODUCT_INFO[p.productKey] = p.chatbotText;
            const docs = {
                individual: buildProductDocs(p, 'individual'),
                company: buildProductDocs(p, 'company')
            };
            if (key) PRODUCT_DOCS[key] = docs;
            if (p.productKey) PRODUCT_DOCS[p.productKey] = docs;
            PRODUCT_CONTEXT.push({
                productKey: p.productKey,
                title: p.title,
                shortDesc: p.shortDesc,
                description: p.description,
                chatbotText: p.chatbotText,
                individual: {
                    conditions: asCleanList(p.individual?.conditions),
                    requirements: docs.individual
                },
                organization: {
                    conditions: asCleanList(p.organization?.conditions),
                    requirements: docs.company
                },
                purchase: p.purchase,
                collateral: p.collateral
            });
        });

        chatbotCache = {
            CONTACT_INFO,
            PRODUCT_INFO,
            PRODUCT_DOCS,
            PRODUCT_CONTEXT,
            loan_rate_default: cfg.loan_rate_default || 3.2,
            dti_individual: (cfg.dti_individual || 55) / 100,
            dti_org: (cfg.dti_org || 20) / 100,
            trust_rate: (cfg.trust_rate || 1.8) / 100,
        };
        console.log('Chatbot cache refreshed.');
    } catch (e) { console.error('Chatbot cache error:', e); }
};

const getChat = async () => {
    if (!chatbotCache) await buildChatbotCache();
    return chatbotCache;
};

function formatMNT(n) { return Math.round(n).toLocaleString('en-US'); }

function parseMoneyMNT(msg) {
    // ÐœÐµÑÑÐµÐ¶ Ð´Ð¾Ñ‚Ð¾Ñ€Ñ… Ð±Ò¯Ñ… Ò¯ÑÑÐ³, Ñ‚ÑÐ¼Ð´ÑÐ³Ñ‚Ð¸Ð¹Ð³ ÑƒÑÑ‚Ð³Ð°Ð¶ Ð·Ó©Ð²Ñ…Ó©Ð½ Ñ‚Ð¾Ð¾Ð³ Ò¯Ð»Ð´ÑÑÐ½Ñ
    const cleaned = String(msg || '').replace(/[^0-9]/g, '');
    const value = parseInt(cleaned);
    return isNaN(value) ? null : value;
}

function normalizeChatText(msg) {
    return String(msg || '').trim().toLowerCase();
}

function includesAny(msg, variants) {
    return variants.some(v => msg.includes(v));
}

function getMatchedProductKey(msg) {
    const productCommandMap = {
        car_loan: 'car_loan',
        consumer_loan: 'cons_loan',
        cons_loan: 'cons_loan',
        credit_card: 'credit_card',
        business_loan: 'biz_loan',
        biz_loan: 'biz_loan',
        real_estate_loan: 're_loan',
        re_loan: 're_loan',
        line_loan: 'line_loan',
    };

    if (productCommandMap[msg]) return productCommandMap[msg];

    const productSynonyms = [
        { key: 'car_loan', variants: ['автомашины зээл', 'машины зээл', 'машин', 'авто'] },
        { key: 'cons_loan', variants: ['хэрэглээний зээл', 'цалингийн зээл', 'хэрэглээ'] },
        { key: 'credit_card', variants: ['кредит карт', 'карт', 'mastercard', 'master card'] },
        { key: 'biz_loan', variants: ['бизнесийн зээл', 'бизнес', 'аж ахуйн зээл'] },
        { key: 're_loan', variants: ['үл хөдлөх', 'орон сууц барьцаалсан', 'барьцаалсан зээл', 'үл хөдлөх барьцаалсан зээл'] },
        { key: 'line_loan', variants: ['шугмын зээл', 'шугамын зээл', 'эргэлтийн зээл'] },
        { key: 'trust', variants: ['итгэлцэл', 'хадгаламж шиг', 'хөрөнгө өсгөх'] },
    ];

    const matched = productSynonyms.find(item => includesAny(msg, item.variants));
    return matched?.key || null;
}

// ============================================================
// ðŸ’¬ RULE-BASED Ð§ÐÐ¢Ð‘ÐžÐ¢ (Ð¡Ð°Ð¹Ð¶Ñ€ÑƒÑƒÐ»ÑÐ°Ð½ & Ð‘Ð°Ñ‚Ð°Ð»Ð³Ð°Ð°Ð¶ÑƒÑƒÐ»ÑÐ°Ð½ Ñ…ÑƒÐ²Ð¸Ð»Ð±Ð°Ñ€)
// ============================================================

function chatReply(text, options = []) {
    return options.length ? `${text}\n\n[OPTIONS: ${options.join(', ')}]` : text;
}

function isGreetingIntent(msg) {
    return includesAny(msg, ['hi', 'hello', 'сайн байна уу', 'сайн уу', 'байна уу', 'мэнд', 'хш']);
}

function isResetIntent(msg) {
    return includesAny(msg, ['reset', 'restart', 'эхлэх', 'шинэ чат', 'цэвэрлэх', 'үндсэн цэс', 'main menu', 'menu']);
}

function isBackIntent(msg) {
    return includesAny(msg, ['буцах', 'back']);
}

function isContactIntent(msg) {
    return includesAny(msg, ['contact', 'холбоо', 'холбогдох', 'утас', 'и-мэйл', 'имэйл', 'email', 'mail', 'хаяг', 'байршил']);
}

function isDocumentIntent(msg) {
    return includesAny(msg, ['documents', 'баримт', 'бүрдүүлэх', 'материал', 'шаардлагатай бичиг']);
}

function getUserTypeFromMessage(msg) {
    if (includesAny(msg, ['company', 'байгууллага', 'компани', 'аж ахуйн нэгж'])) return 'company';
    if (includesAny(msg, ['individual', 'иргэн', 'хувь хүн'])) return 'individual';
    return null;
}

function formatDocumentMaterials(docs = []) {
    const cleanDocs = asCleanList(docs);
    if (!cleanDocs.length) {
        return 'Энэ бүтээгдэхүүний бүрдүүлэх баримт бичгийн мэдээлэл админ дээр хараахан бүртгэгдээгүй байна. Дэлгэрэнгүй мэдээлэл авах бол холбоо барина уу.';
    }

    let counter = 1;
    return cleanDocs.map((doc) => {
        if (doc.endsWith(':')) return `\n${doc}`;
        const line = `${counter}. ${doc}`;
        counter += 1;
        return line;
    }).join('\n').trim();
}

function buildAiContext(chat) {
    return JSON.stringify({
        contact: chat.CONTACT_INFO,
        rates: {
            loan_rate_default: chat.loan_rate_default,
            dti_individual: chat.dti_individual,
            dti_org: chat.dti_org,
            trust_rate: chat.trust_rate
        },
        products: chat.PRODUCT_CONTEXT
    }, null, 2).slice(0, 14000);
}

function isAiFallbackAllowed(msg) {
    const normalized = normalizeChatText(msg);
    if (!normalized || normalized.length < 2) return false;

    if (
        getMatchedProductKey(normalized)
        || isLoanIntent(normalized)
        || isTrustIntent(normalized)
        || isCalculatorIntent(normalized)
        || isContactIntent(normalized)
        || isDocumentIntent(normalized)
    ) {
        return true;
    }

    return includesAny(normalized, [
        'scm',
        'solongo',
        'capital',
        'bbsb',
        'nbfi',
        'bank bus',
        'bankbus',
        '\u0441\u043e\u043b\u043e\u043d\u0433\u043e',
        '\u0431\u0431\u0441\u0431',
        '\u0445\u04af\u04af',
        '\u0445\u0443\u0433\u0430\u0446\u0430\u0430',
        '\u0448\u0430\u0430\u0440\u0434\u043b\u0430\u0433\u0430',
        '\u043e\u0440\u043b\u043e\u0433\u043e',
        '\u0443\u0440\u044c\u0434\u0447\u0438\u043b\u0433\u0430\u0430',
        '\u043d\u04e9\u0445\u0446\u04e9\u043b',
        '\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b',
        '\u0431\u0430\u0440\u044c\u0446\u0430\u0430',
        '\u0442\u0430\u0442\u0432\u0430\u0440',
        '\u0445\u044f\u0437\u0433\u0430\u0430\u0440',
        '\u043b\u0438\u043c\u0438\u0442',
        '\u0441\u0430\u043b\u0431\u0430\u0440'
    ]);
}

const AI_FACT_TOKEN_REGEX = /(?:\d+(?:[.,]\d+)?(?:\s*[-\u2013]\s*\d+(?:[.,]\d+)?)?\s*(?:%|\u0445\u0443\u0432\u044c|\u0441\u0430\u0440|\u0441\u0430\u044f|\u0442\u044d\u0440\u0431\u0443\u043c|\u0442\u04e9\u0433\u0440\u04e9\u0433|\u20ae|\u0445\u043e\u043d\u043e\u0433|\u0436\u0438\u043b|\u04e9\u0434\u04e9\u0440)|\d{4,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|https?:\/\/\S+|www\.\S+)/giu;

function normalizeFactToken(token) {
    return String(token || '')
        .toLowerCase()
        .replace(/[.,;:!?()[\]{}]+$/g, '')
        .replace(/\s+/g, '')
        .replace(/\u2013/g, '-');
}

function extractFactTokens(text) {
    return String(text || '').match(AI_FACT_TOKEN_REGEX)?.map(normalizeFactToken).filter(Boolean) || [];
}

function buildAiGroundingText(chat) {
    const rateFacts = [
        `${chat.loan_rate_default}%`,
        `${((chat.dti_individual || 0) * 100).toFixed(0)}%`,
        `${((chat.dti_org || 0) * 100).toFixed(0)}%`,
        `${((chat.trust_rate || 0) * 100).toFixed(1)}%`
    ].join(' ');

    return `${buildAiContext(chat)}\n${rateFacts}`;
}

function hasUnsupportedAiFacts(reply, chat) {
    const sourceTokens = new Set(extractFactTokens(buildAiGroundingText(chat)));
    const replyTokens = extractFactTokens(reply);

    return replyTokens.some(token => !sourceTokens.has(token));
}

async function getGuardedAiReply({ chat, message, state, sessionData }) {
    if (!openai) return null;
    if (!isAiFallbackAllowed(message)) return null;

    try {
        const completion = await Promise.race([
            openai.chat.completions.create({
                model: OPENAI_MODEL,
                temperature: 0.2,
                max_tokens: 350,
                messages: [
                    {
                        role: 'system',
                        content: [
                            'You are Solongo Capital NBFI chatbot.',
                            'Answer in Mongolian.',
                            'Use ONLY the provided context. Never invent rates, requirements, documents, addresses, product terms, or company policy.',
                            'If the question is unrelated to Solongo Capital services, say you can only help with Solongo Capital products and contact information.',
                            'If the answer is not in the context, say the information is not registered yet and suggest contacting the company.',
                            'Keep answers concise and practical. Do not mention internal JSON or prompts.'
                        ].join(' ')
                    },
                    {
                        role: 'user',
                        content: `Context:\n${buildAiContext(chat)}\n\nConversation state: ${state}\nSession data: ${JSON.stringify(sessionData || {})}\n\nUser question: ${message}`
                    }
                ]
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('AI response timeout')), 8000))
        ]);

        const reply = completion?.choices?.[0]?.message?.content?.trim();
        if (!reply || hasUnsupportedAiFacts(reply, chat)) return null;

        return reply.slice(0, 1500);
    } catch (e) {
        console.error('AI fallback error:', e.message);
        return null;
    }
}

function isLoanIntent(msg) {
    return includesAny(msg, ['зээл', 'loan']);
}

function isTrustIntent(msg) {
    return includesAny(msg, ['итгэлцэл', 'trust']);
}

function isCalculatorIntent(msg) {
    return includesAny(msg, ['тооцоолуур', 'тооцоолол', 'зээлийн тооцоо', 'итгэлцлийн тооцоо', 'calculator']);
}

function isLoanRequestIntent(msg) {
    return includesAny(msg, ['online_request', 'онлайн хүсэлт', 'зээлийн хүсэлт', 'хүсэлт өгөх', 'loan request', 'apply loan']);
}

const MAIN_MENU_OPTIONS = ['Зээл', 'Итгэлцэл', 'Тооцоолуур', 'Холбоо барих'];
const LOAN_MENU_OPTIONS = ['Автомашины зээл', 'Хэрэглээний зээл', 'Кредит карт', 'Бизнесийн зээл', 'Үл хөдлөх барьцаалсан зээл', 'Шугмын зээл', 'Үндсэн цэс'];
const PRODUCT_MENU_OPTIONS = ['Бүрдүүлэх баримт бичиг', 'Тооцоолол', 'Онлайн хүсэлт өгөх', 'Холбоо барих', 'Буцах', 'Үндсэн цэс'];
const TRUST_MENU_OPTIONS = ['Тооцоолол хийх', 'Холбоо барих', 'Буцах', 'Үндсэн цэс'];
const CALCULATOR_MENU_OPTIONS = ['Зээлийн тооцоолуур', 'Итгэлцлийн тооцоолуур', 'Үндсэн цэс'];

const sessions = new Map();

// Session TTL: 1 цагийн дараа автоматаар устгана
const SESSION_TTL_MS = 60 * 60 * 1000;
setInterval(() => {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [k, s] of sessions) {
        if ((s.lastActive || 0) < cutoff) sessions.delete(k);
    }
}, 15 * 60 * 1000);

app.post('/api/chat', async (req, res) => {
    try {
        const chat = await getChat();
        const { CONTACT_INFO, PRODUCT_INFO, PRODUCT_DOCS, loan_rate_default, dti_individual, dti_org, trust_rate } = chat;
        const sessionId = req.body?.sessionId || `anon_${req.headers['user-agent']}`;

        if (!sessions.has(sessionId)) {
            sessions.set(sessionId, { state: 'START', data: {} });
        }

        const s = sessions.get(sessionId);
        s.lastActive = Date.now();
        const msg = normalizeChatText(req.body?.message || '');
        const money = parseMoneyMNT(msg);
        const matchedProductKey = getMatchedProductKey(msg);
        const requestedUserType = getUserTypeFromMessage(msg);

        const openMainMenu = (text = 'Сайн байна уу? Би Солонго Капитал ББСБ-ийн санхүүгийн зөвлөх чатбот байна. Та доорх сонголтуудаас сонгоно уу.') => {
            s.state = 'START';
            s.data = {};
            return res.json({ reply: chatReply(text, MAIN_MENU_OPTIONS) });
        };

        const openLoanMenu = (text = 'Манай зээлийн бүтээгдэхүүнүүдээс сонгоно уу.') => {
            s.state = 'LOAN_MENU';
            s.data = {};
            return res.json({ reply: chatReply(text, LOAN_MENU_OPTIONS) });
        };

        const openTrustMenu = (text = 'Итгэлцэл нь таны хөрөнгийг өсгөх үйлчилгээ юм. Дараах сонголтуудаас үргэлжлүүлнэ үү.') => {
            s.state = 'TRUST_INFO';
            s.data = {};
            return res.json({ reply: chatReply(text, TRUST_MENU_OPTIONS) });
        };

        const openCalculatorMenu = () => {
            s.state = 'CALCULATOR_MENU';
            s.data = {};
            return res.json({ reply: chatReply('Аль тооцоолуурыг ашиглах вэ?', CALCULATOR_MENU_OPTIONS) });
        };

        const openProductInfo = (productKey) => {
            const productText = PRODUCT_INFO[productKey];
            if (!productText) {
                return openLoanMenu();
            }

            s.data.productKey = productKey;
            s.state = ['хэрэглээний зээл', 'шугмын зээл', 'cons_loan', 'line_loan'].includes(productKey) ? 'PRODUCT_OPTIONS' : 'TYPE_SELECT';

            if (s.state === 'TYPE_SELECT') {
                return res.json({
                    reply: chatReply(`${productText}\n\nТа Иргэн эсвэл Байгууллагаар сонирхож байна уу?`, ['Иргэн', 'Байгууллага', 'Буцах', 'Үндсэн цэс'])
                });
            }

            return res.json({ reply: chatReply(productText, PRODUCT_MENU_OPTIONS) });
        };

        const replyWithDocuments = (productKey) => {
            const docsByType = PRODUCT_DOCS?.[productKey] || {};
            const docType = requestedUserType
                || s.data.userType
                || (docsByType.individual?.length && !docsByType.company?.length ? 'individual' : null)
                || (docsByType.company?.length && !docsByType.individual?.length ? 'company' : null);

            s.data.productKey = productKey;

            if (!docType && (docsByType.individual?.length || docsByType.company?.length)) {
                s.state = 'TYPE_SELECT';
                s.data.pendingAction = 'documents';
                return res.json({ reply: chatReply('Иргэн эсвэл Байгууллагаар бүрдүүлэх баримт бичиг харах уу?', ['Иргэн', 'Байгууллага', 'Буцах', 'Үндсэн цэс']) });
            }

            const resolvedDocType = docType || 'individual';
            s.data.userType = resolvedDocType;
            delete s.data.pendingAction;
            s.state = 'PRODUCT_OPTIONS';

            const docs = docsByType[resolvedDocType] || [];
            return res.json({
                reply: chatReply(formatDocumentMaterials(docs), ['Тооцоолол', 'Онлайн хүсэлт өгөх', 'Холбоо барих', 'Буцах', 'Үндсэн цэс'])
            });
        };

        if (isResetIntent(msg)) {
            return openMainMenu();
        }

        if (isBackIntent(msg)) {
            if (s.state === 'CALC_AMOUNT' || s.state === 'CALC_TERM') {
                s.state = 'PRODUCT_OPTIONS';
                return res.json({ reply: chatReply('Дараагийн сонголтоо хийнэ үү.', PRODUCT_MENU_OPTIONS) });
            }

            if (s.state === 'T_CALC_AMT' || s.state === 'T_CALC_TERM' || s.state === 'T_CALC_TOPUP') {
                s.state = 'TRUST_INFO';
                return res.json({ reply: chatReply('Итгэлцлийн талаар дараах сонголтуудаас үргэлжлүүлнэ үү.', TRUST_MENU_OPTIONS) });
            }

            if (s.state === 'PRODUCT_OPTIONS' || s.state === 'TYPE_SELECT') {
                return openLoanMenu();
            }

            if (s.state === 'CALCULATOR_MENU') {
                return openMainMenu('Сонголтоо хийнэ үү.');
            }

            return openMainMenu('Сонголтоо хийнэ үү.');
        }

        if (isContactIntent(msg)) {
            return res.json({ reply: chatReply(CONTACT_INFO, ['Залгах', 'Имэйл илгээх', 'Газрын зураг', 'Үндсэн цэс']) });
        }

        if (msg === 'loan_calc' || msg === 'зээлийн тооцоолуур') {
            return openLoanMenu('Зээлийн тооцоолол хийхийн тулд бүтээгдэхүүнээ сонгоно уу.');
        }

        if (msg === 'trust_calc' || msg === 'итгэлцлийн тооцоолуур') {
            return openTrustMenu('Итгэлцлийн тооцооллоо эхлүүлэхийн тулд доорх сонголтуудаас үргэлжлүүлнэ үү.');
        }

        if (matchedProductKey && isDocumentIntent(msg)) {
            return replyWithDocuments(matchedProductKey);
        }

        if (matchedProductKey && ['START', 'LOAN_MENU'].includes(s.state)) {
            return openProductInfo(matchedProductKey);
        }

        if (isLoanRequestIntent(msg)) {
            return res.json({ reply: `${chatReply('Зээлийн хүсэлт бөглөх цэс рүү шилжүүлж байна.', ['Үндсэн цэс'])}\n[ACTION: loan_request]` });
        }

        if (isLoanIntent(msg) && !matchedProductKey) {
            return openLoanMenu();
        }

        if (isTrustIntent(msg)) {
            return openTrustMenu();
        }

        if (isCalculatorIntent(msg) && s.state === 'START') {
            return openCalculatorMenu();
        }

        switch (s.state) {
            case 'START':
                if (isGreetingIntent(msg)) {
                    return openMainMenu('Сайн байна уу? Танд юугаар туслах вэ?');
                }
                break;

            case 'CALCULATOR_MENU':
                if (msg === 'loan_calc' || msg === 'зээлийн тооцоолуур') {
                    return openLoanMenu('Зээлийн тооцоолол хийхийн тулд бүтээгдэхүүнээ сонгоно уу.');
                }
                if (msg === 'trust_calc' || msg === 'итгэлцлийн тооцоолуур') {
                    return openTrustMenu('Итгэлцлийн тооцооллоо эхлүүлэхийн тулд доорх сонголтуудаас үргэлжлүүлнэ үү.');
                }
                return res.json({ reply: chatReply('Аль тооцоолуурыг ашиглах вэ?', CALCULATOR_MENU_OPTIONS) });

            case 'LOAN_MENU':
                if (matchedProductKey) {
                    return openProductInfo(matchedProductKey);
                }
                return res.json({ reply: chatReply('Манай зээлийн бүтээгдэхүүнүүдээс сонгоно уу.', LOAN_MENU_OPTIONS) });

            case 'TYPE_SELECT':
                if (includesAny(msg, ['individual', 'иргэн', 'хувь хүн'])) {
                    s.data.userType = 'individual';
                    if (s.data.pendingAction === 'documents' && s.data.productKey) {
                        return replyWithDocuments(s.data.productKey);
                    }
                    s.state = 'PRODUCT_OPTIONS';
                    return res.json({ reply: chatReply('Сонголтоо хийнэ үү.', PRODUCT_MENU_OPTIONS) });
                }
                if (includesAny(msg, ['company', 'байгууллага', 'компани'])) {
                    s.data.userType = 'company';
                    if (s.data.pendingAction === 'documents' && s.data.productKey) {
                        return replyWithDocuments(s.data.productKey);
                    }
                    s.state = 'PRODUCT_OPTIONS';
                    return res.json({ reply: chatReply('Сонголтоо хийнэ үү.', PRODUCT_MENU_OPTIONS) });
                }
                return res.json({ reply: chatReply('Та Иргэн эсвэл Байгууллагаар сонгоно уу.', ['Иргэн', 'Байгууллага', 'Буцах', 'Үндсэн цэс']) });

            case 'PRODUCT_OPTIONS':
                if (msg === 'documents' || msg.includes('бүрдүүлэх баримт бичиг')) {
                    return replyWithDocuments(s.data.productKey);
                }
                if (msg === 'calculate' || msg.includes('тооцоолол')) {
                    s.state = 'CALC_AMOUNT';
                    return res.json({ reply: 'Зээлийн дүнгээ зөвхөн тоогоор оруулна уу. Жишээ нь: 50000000' });
                }
                if (isLoanRequestIntent(msg)) {
                    return res.json({ reply: `${chatReply('Зээлийн хүсэлт бөглөх цэс рүү шилжүүлж байна.', ['Буцах', 'Үндсэн цэс'])}\n[ACTION: loan_request]` });
                }
                return res.json({ reply: chatReply('Дараагийн сонголтоо хийнэ үү.', PRODUCT_MENU_OPTIONS) });

            case 'CALC_AMOUNT':
                if (money) {
                    s.data.amount = money;
                    s.state = 'CALC_TERM';
                    return res.json({ reply: `Та ${formatMNT(money)} ₮-ийн зээл тооцоолохоор орууллаа. Хэдэн сарын хугацаатай авах вэ? Жишээ нь: 24` });
                }
                return res.json({ reply: 'Уучлаарай, дүнгээ зөвхөн тоогоор бичнэ үү. Жишээ нь: 10000000' });

            case 'CALC_TERM': {
                const term = parseInt(msg.match(/\d+/)?.[0], 10);
                if (term) {
                    const rate = (loan_rate_default || 3.2) / 100;
                    const pow = Math.pow(1 + rate, term);
                    const pmt = Math.round(s.data.amount * (rate * pow) / (pow - 1));
                    const dtiRatio = s.data.userType === 'company' ? (dti_org || 0.20) : (dti_individual || 0.55);
                    const requiredIncome = Math.round(pmt / dtiRatio);
                    const warn = s.data.productKey?.includes('авто') || s.data.productKey?.includes('хэрэглээ') || s.data.productKey === 'car_loan' || s.data.productKey === 'cons_loan'
                        ? '\nАнхааруулга: Урьдчилгаа 45 хувиас дээш, ӨОХ 55 хувиас ихгүй байх шаардлагатай.'
                        : '';
                    const savedAmount = s.data.amount;
                    s.state = 'PRODUCT_OPTIONS';
                    return res.json({
                        reply: chatReply(
                            `Зээлийн жишээ тооцоолол (${(rate * 100).toFixed(1)}% хүү):\n\n- Зээлийн дүн: ${formatMNT(savedAmount)} ₮\n- Сар бүр төлөх: ${formatMNT(pmt)} ₮\n- Нийт төлөх дүн: ${formatMNT(pmt * term)} ₮\n- Сарын доод орлого: ${formatMNT(requiredIncome)} ₮${warn}`,
                            ['Онлайн хүсэлт өгөх', 'Холбоо барих', 'Буцах', 'Үндсэн цэс']
                        )
                    });
                }
                return res.json({ reply: 'Хугацаагаа зөвхөн тоогоор оруулна уу. Жишээ нь: 12' });
            }

            case 'TRUST_INFO':
                if (msg === 'calculate' || includesAny(msg, ['тооцоолол', 'тооцоолуур'])) {
                    s.state = 'T_CALC_AMT';
                    return res.json({ reply: 'Итгэлцэл байршуулж эхлэх дүнгээ зөвхөн тоогоор оруулна уу. Жишээ нь: 10000000' });
                }
                return res.json({ reply: chatReply('Итгэлцлийн талаар дараах сонголтуудаас үргэлжлүүлнэ үү.', TRUST_MENU_OPTIONS) });

            case 'T_CALC_AMT':
                if (money) {
                    s.data.amount = money;
                    s.state = 'T_CALC_TERM';
                    return res.json({ reply: `Та ${formatMNT(money)} ₮ байршуулна гэж орууллаа. Хугацаагаа сараар хэлнэ үү. Хамгийн багадаа 6 сар.` });
                }
                return res.json({ reply: 'Дүнгээ зөвхөн тоогоор бичнэ үү. Жишээ нь: 50000000' });

            case 'T_CALC_TERM': {
                const tTerm = parseInt(msg.match(/\d+/)?.[0], 10);
                if (tTerm >= 6) {
                    s.data.months = tTerm;
                    s.state = 'T_CALC_TOPUP';
                    return res.json({ reply: chatReply('Сар бүр тогтмол дүн нэмэх үү?', ['Үгүй', 'Буцах']) });
                }
                return res.json({ reply: 'Итгэлцлийн хугацаа хамгийн багадаа 6 сар байна. Дахин оруулна уу.' });
            }

            case 'T_CALC_TOPUP': {
                const noTopup = includesAny(msg, ['үгүй', 'ugui', 'no']);
                const topup = noTopup ? 0 : money;

                if (topup === null) {
                    return res.json({ reply: 'Нэмэх дүнгээ зөвхөн тоогоор бичнэ үү эсвэл Үгүй гэж сонгоно уу.' });
                }

                const rate = trust_rate || 0.018;
                let balance = s.data.amount;
                for (let i = 0; i < s.data.months; i += 1) {
                    balance = balance * (1 + rate) + topup;
                }

                const invested = s.data.amount + (topup * s.data.months);
                const interest = balance - invested;
                const tax = interest * 0.10;
                const finalAmount = balance - tax;
                const growth = ((finalAmount - invested) / invested * 100).toFixed(1);
                const savedTrustAmount = s.data.amount;

                s.state = 'TRUST_INFO';
                s.data = {};

                return res.json({
                    reply: chatReply(
                        `Итгэлцлийн тооцоолол (${(rate * 100).toFixed(1)}% хүү):\n\n- Эхний дүн: ${formatMNT(savedTrustAmount)} ₮\n- Сар бүр нэмэх: ${formatMNT(topup)} ₮\n- Эцсийн өсөх дүн: ${formatMNT(finalAmount)} ₮\n- Хүүний орлого: ${formatMNT(interest)} ₮\n- Өсөлтийн хувь: ${growth}%\n\nХүүний орлогоос 10% буюу ${formatMNT(tax)} ₮ татвар суутгагдана.`,
                        ['Тооцоолол хийх', 'Холбоо барих', 'Буцах', 'Үндсэн цэс']
                    )
                });
            }

            default:
                break;
        }

        const aiReply = await getGuardedAiReply({
            chat,
            message: req.body?.message || '',
            state: s.state,
            sessionData: s.data
        });
        if (aiReply) {
            return res.json({ reply: chatReply(aiReply, MAIN_MENU_OPTIONS) });
        }

        return openMainMenu('Таны асуултыг ойлгосонгүй. Доорх сонголтуудаас үргэлжлүүлнэ үү.');
    } catch (e) {
        console.error('Chat error:', e);
        res.status(500).json({ message: 'Error' });
    }
});
// ðŸ” AUTH & 2FA & ADMIN ROUTES
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
            console.log('2FA debug:', { cleanToken, secret: user.twoFASecret?.base32?.substring(0, 6) + '...', serverTime: new Date().toISOString() });
            const verified = speakeasy.totp.verify({ secret: user.twoFASecret.base32, encoding: 'base32', token: cleanToken, window: 4 });
            console.log('2FA verified:', verified);
            if (!verified) return res.status(401).json({ message: '2FA error' });
        }
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/auth/2fa/setup', authenticateUser, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.body.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const user = await User.findById(req.body.userId);
        const secret = speakeasy.generateSecret({ name: `SCM Admin (${user.email})` });
        user.twoFASecret = secret; await user.save();
        QRCode.toDataURL(secret.otpauth_url, (err, url) => res.json({ secret: secret.base32, qrCode: url }));
    } catch (e) { res.status(500).send("Error"); }
});

app.post('/api/auth/2fa/verify', authenticateUser, async (req, res) => {
    try {
        if (req.user._id.toString() !== req.body.userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const user = await User.findById(req.body.userId);
        const verified = speakeasy.totp.verify({ secret: user.twoFASecret.base32, encoding: 'base32', token: req.body.token, window: 1 });
        if (verified) { user.isTwoFAEnabled = true; await user.save(); res.json({ message: 'Success' }); }
        else res.status(400).json({ message: 'Error' });
    } catch (e) { res.status(500).send("Error"); }
});

// ============================================================
// ðŸ“„ LOAN & TRUST & LOG ROUTES
// ============================================================

app.post('/api/loans', (req, res) => {
    upload(req, res, async (err) => {
        try {
            if (err) return res.status(400).json({ message: err.message });
            const files = req.files || [];
            const selfie = files.find(file => file.fieldname === 'file_selfie');
            const body = req.body;

            // Parse JSON fields sent from the public form
            let collateral = {};
            let vehicle = {};
            let guarantors = [];
            let orgCeo = {};
            let orgOwner = {};
            try { if (body.collateralJSON)  collateral  = JSON.parse(body.collateralJSON);  } catch {}
            try { if (body.vehicleJSON)     vehicle     = JSON.parse(body.vehicleJSON);     } catch {}
            try { if (body.guarantorsJSON)  guarantors  = JSON.parse(body.guarantorsJSON);  } catch {}
            try { if (body.orgCeoJSON)      orgCeo      = JSON.parse(body.orgCeoJSON);      } catch {}
            try { if (body.orgOwnerJSON)    orgOwner    = JSON.parse(body.orgOwnerJSON);    } catch {}

            const isVehicle = body.collateralType === 'vehicle';
            const fileDetails = files.map(f => ({ fieldName: f.fieldname, fileName: f.originalname, fileUrl: f.path, mimeType: f.mimetype, size: f.size }));

            // Build applicationData structure compatible with LoanApplicationDetail
            const applicationData = {
                borrowerType: body.userType || 'individual',
                borrower: {
                    lastName:   body.lastname   || '',
                    firstName:  body.firstname  || '',
                    fatherName: body.fatherName || '',
                    regNo:      body.regNo      || '',
                    dob:        body.dob        || '',
                    phone:      body.phone      || '',
                    email:      body.email      || '',
                    address:    body.address    || '',
                    profileImageUrl: selfie?.path || '',
                    citizenship: 'Монгол',
                    gender:         body.gender         || '',
                    idIssueDate:    body.idIssueDate    || '',
                    idExpiryDate:   body.idExpiryDate   || '',
                    employmentType: body.employmentType || '',
                    employer:       body.employer       || '',
                    employedSince:  body.employedSince  || '',
                    monthlyIncome:  body.monthlyIncome  || '',
                    incomeSource:   body.incomeSource   || '',
                },
                org: {
                    orgName:       body.orgName       || '',
                    orgRegNo:      body.orgRegNo      || '',
                    legalForm:     body.legalForm     || '',
                    contactName:   body.contactName   || '',
                    contactPhone:  body.contactPhone  || '',
                    address:       body.orgAddress    || '',
                    foundedDate:   body.foundedDate   || '',
                    employeeCount: body.employeeCount || '',
                    revenueRange:  body.revenueRange  || '',
                    industry:      body.industry      || '',
                    ceo:   orgCeo.firstName  ? { firstName: orgCeo.firstName,  lastName: orgCeo.lastName,  fatherName: orgCeo.fatherName,  regNo: orgCeo.regNo,  phone: orgCeo.phone  } : {},
                    owner: orgOwner.firstName? { firstName: orgOwner.firstName, lastName: orgOwner.lastName, fatherName: orgOwner.fatherName, regNo: orgOwner.regNo, phone: orgOwner.phone } : {},
                    relatedPerson: {},
                },
                emergencyContacts: [{ name: '', relation: '', phone: '' }],
                otherLoans: [],
                creditBureau: {},
                loanRequest: {
                    product:       body.selectedProduct || '',
                    amount:        body.amount ? String(parseInt(body.amount) || 0) : '',
                    term:          body.term   ? String(body.term) : '',
                    purpose:       body.purpose        || '',
                    repaymentSource: body.repaymentSource || '',
                    repaymentStartDate: '',
                    repaymentType: 'equal',
                    graceMonths:   '',
                    collateralType: body.collateralType || 'real_estate',
                },
                // Convert flat collateral/vehicle → collaterals array format
                collaterals: isVehicle
                    ? (vehicle.plateNumber || vehicle.make ? [{
                        type: 'vehicle',
                        files: fileDetails.filter(f => ['file_car_cert','file_car_photos'].includes(f.fieldName)),
                        aiData: null,
                        fields: vehicle,
                        hasPlate: vehicle.plateNumber ? 'yes' : 'no',
                        plateNumber: vehicle.plateNumber || '',
                        ownerRelation: vehicle.ownerRelation || '',
                        valuation: { borrowerAmount: '', officerAmount: '', date: '', sourceFiles: [], sourceLink: '', sourceNotes: '', coverageRate: '', notes: '' },
                        notes: '',
                        auditLog: [],
                      }] : [])
                    : (collateral.certificateNumber || collateral.address ? [{
                        type: 'real_estate',
                        files: fileDetails.filter(f => ['file_prop_cert','file_prop_map'].includes(f.fieldName)),
                        aiData: null,
                        fields: collateral,
                        hasPlate: 'no',
                        plateNumber: '',
                        ownerRelation: collateral.ownerRelation || '',
                        valuation: { borrowerAmount: '', officerAmount: '', date: '', sourceFiles: [], sourceLink: '', sourceNotes: '', coverageRate: '', notes: '' },
                        notes: '',
                        auditLog: [],
                      }] : []),
                // Convert guarantors array format
                guarantors: guarantors.map(g => ({
                    guarantorType: g.guarantorType || 'Хамтран зээлдэгч',
                    personType: 'individual',
                    person: {
                        lastName:   g.lastName   || '',
                        firstName:  g.firstName  || '',
                        fatherName: g.fatherName || '',
                        regNo:      g.regNo      || '',
                        phone:      g.phone      || '',
                        address:    g.address    || '',
                    },
                    org: {},
                    creditBureau: {},
                    collaterals: [],
                })),
                incomeResearch: { bankStatementAnalyses: [], socialInsuranceAnalysis: null },
                otherDocsNotes: '',
            };

            const newLoan = new LoanRequest({
                ...body,
                amount: parseInt(body.amount) || 0,
                selfieUrl: selfie?.path || '',
                fileNames: files.map(f => f.path),
                fileDetails,
                collateral,
                vehicle,
                guarantors: guarantors.map(g => ({ guarantorType: g.guarantorType, lastName: g.lastName, firstName: g.firstName, fatherName: g.fatherName, regNo: g.regNo, phone: g.phone, address: g.address })),
                applicationData,
            });
            await newLoan.save();
            res.status(201).json({ message: 'Success' });
        } catch (e) {
            console.error('Loan submit error:', e.message);
            res.status(500).json({ message: 'Error' });
        }
    });
});

app.get('/api/loans', authenticateUser, async (req, res) => { try { res.json(await LoanRequest.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).send("Error"); } });

app.put('/api/loans/:id', authenticateUser, async (req, res) => {
    try {
        const { adminUser, ...updateData } = req.body;
        const updated = await LoanRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updated);
    } catch (e) { res.status(500).send("Error"); }
});

// Ажилтан шинэ зээлийн хүсэлт үүсгэх
app.post('/api/loans/staff', authenticateUser, async (req, res) => {
    try {
        const loan = await new LoanRequest({
            ...req.body,
            status: 'created',
            createdByStaff: true,
            createdByUser: { userId: String(req.user?._id || ''), name: req.user?.name || '' },
        }).save();
        await createLog(req.user, 'loan_created_by_staff', `${loan.lastname || loan.orgName} - ${loan.amount}`);
        res.status(201).json(loan);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

// Зээлийн хүсэлтэд нэмэлт файл хавсаргах (Cloudinary-д хуулж URL хадгалах)
app.post('/api/loans/:id/files', authenticateUser, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const fieldName = req.body.fieldName || 'legacy';
            const files = (req.files || []).map(f => ({
                fieldName,
                fileName: f.originalname || f.filename || 'file',
                fileUrl: f.path || f.secure_url || f.url || '',
                mimeType: f.mimetype || '',
                size: f.size || 0,
            }));
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            const loan = await LoanRequest.findByIdAndUpdate(
                req.params.id,
                { $push: { fileDetails: { $each: files } } },
                { new: true }
            );
            if (!loan) return res.status(404).json({ message: 'Not found' });
            res.json(loan);
        } catch (e) {
            console.error('File upload error:', e.message);
            res.status(500).json({ message: 'Файл хуулахад алдаа гарлаа: ' + e.message });
        }
    });
});

// Зээлийн хүсэлтийн файл устгах
app.delete('/api/loans/:id/files/:fileId', authenticateUser, async (req, res) => {
    try {
        const loan = await LoanRequest.findByIdAndUpdate(
            req.params.id,
            { $pull: { fileDetails: { _id: req.params.fileId } } },
            { new: true }
        );
        if (!loan) return res.status(404).json({ message: 'Олдсонгүй' });
        res.json(loan);
    } catch (e) {
        res.status(500).json({ message: 'Файл устгахад алдаа гарлаа' });
    }
});

// Зээлийн судалгааг эх хүсэлтийн ID-аар шүүх
app.get('/api/loan-research/by-request/:requestId', authenticateUser, async (req, res) => {
    try {
        const research = await LoanResearch.find({ 'borrower.sourceRequestId': req.params.requestId })
            .sort({ createdAt: -1 }).limit(1);
        res.json(research[0] || null);
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

const parseJsonField = (value, fallback = {}) => {
    try {
        if (!value) return fallback;
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (e) {
        return fallback;
    }
};

const asExposureNumber = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value == null) return 0;
    const cleaned = String(value)
        .replace(/\(([^)]+)\)/g, '-$1')
        .replace(/[^0-9,.-]/g, '')
        .replace(/,/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
};

const cleanExposureText = (value) => String(value || '').trim();

const deriveOverdueBucket = (days) => {
    const n = Number(days || 0);
    if (n <= 0) return 'current';
    if (n <= 30) return '1-30';
    if (n <= 60) return '31-60';
    if (n <= 90) return '61-90';
    return '90+';
};

const deriveClassification = (input, overdueDays) => {
    const explicit = cleanExposureText(input);
    if (explicit) return explicit;
    const days = Number(overdueDays || 0);
    if (days <= 0) return 'Current';
    if (days <= 30) return 'Attention';
    if (days <= 90) return 'Substandard';
    if (days <= 180) return 'Doubtful';
    return 'Loss';
};

const normalizeExposureRow = (row = {}) => {
    const overdueDays = Math.max(0, Math.round(asExposureNumber(row.overdueDays)));
    const principalDebt = Math.max(0, asExposureNumber(row.principalDebt));
    const interestDebt = Math.max(0, asExposureNumber(row.interestDebt));
    const regularizationAmount = Math.max(0, asExposureNumber(row.regularizationAmount));
    const overdueAmount = Math.max(0, asExposureNumber(row.overdueAmount || regularizationAmount || (principalDebt + interestDebt)));
    const outstandingBalance = Math.max(0, asExposureNumber(row.outstandingBalance));
    const originalAmount = Math.max(0, asExposureNumber(row.originalAmount));
    const borrowerName = cleanExposureText(row.borrowerName);
    const regNo = cleanExposureText(row.regNo);
    const loanId = cleanExposureText(row.loanId);
    const productName = cleanExposureText(row.productName);
    const branch = cleanExposureText(row.branch);
    const loanOfficer = cleanExposureText(row.loanOfficer);
    const phone = cleanExposureText(row.phone);
    const collateral = cleanExposureText(row.collateral);
    const currency = cleanExposureText(row.currency) || 'MNT';
    const interestRate = asExposureNumber(row.interestRate);
    const startDate = cleanExposureText(row.startDate);
    const endDate = cleanExposureText(row.endDate);
    const contactNote = cleanExposureText(row.contactNote);
    const lastContactDate = cleanExposureText(row.lastContactDate);
    const explicitKey = cleanExposureText(row.caseKey);
    const caseKey = explicitKey || [regNo, loanId, borrowerName].filter(Boolean).join('::');
    const isOverdue = Boolean(row.isOverdue) || overdueDays > 0 || overdueAmount > 0;
    const overdueBucket = deriveOverdueBucket(overdueDays);
    const classification = deriveClassification(row.classification, overdueDays);

    return {
        caseKey,
        borrowerName,
        regNo,
        loanId,
        productName,
        branch,
        loanOfficer,
        phone,
        collateral,
        currency,
        interestRate,
        startDate,
        endDate,
        originalAmount,
        principalDebt,
        interestDebt,
        regularizationAmount,
        contactNote,
        lastContactDate,
        outstandingBalance,
        overdueAmount,
        overdueDays,
        classification,
        overdueBucket,
        isOverdue,
    };
};

const sortExposureCases = (items = []) => (
    [...items].sort((a, b) => {
        const dayDiff = Number(b.currentOverdueDays || b.overdueDays || 0) - Number(a.currentOverdueDays || a.overdueDays || 0);
        if (dayDiff !== 0) return dayDiff;
        const overdueDiff = Number(b.currentOverdueAmount || b.overdueAmount || 0) - Number(a.currentOverdueAmount || a.overdueAmount || 0);
        if (overdueDiff !== 0) return overdueDiff;
        return Number(b.currentOutstandingBalance || b.outstandingBalance || 0) - Number(a.currentOutstandingBalance || a.outstandingBalance || 0);
    })
);

const buildRecommendedActions = (row = {}) => {
    const days = Number(row.overdueDays || row.currentOverdueDays || 0);
    const amount = Number(row.overdueAmount || row.currentOverdueAmount || 0);
    const actions = [];

    if (days > 0) actions.push('Borrower contact and payment status confirmation');
    if (days >= 7) actions.push('Collect written repayment commitment and follow-up date');
    if (days >= 30) actions.push('Escalate to team lead and verify collateral / guarantor status');
    if (days >= 60 || amount >= 5000000) actions.push('Prepare recovery action plan with weekly monitoring');
    if (days >= 90) actions.push('Move to legal and recovery review');
    if (!actions.length) actions.push('Continue regular monitoring');

    return [...new Set(actions)];
};

const buildActionPlanText = (row = {}, assigneeName = '') => {
    const ownerText = assigneeName ? `Assigned to ${assigneeName}. ` : '';
    const actions = buildRecommendedActions(row);
    return `${ownerText}Priority bucket ${deriveOverdueBucket(row.overdueDays || row.currentOverdueDays || 0)}. ${actions.join('. ')}.`;
};

const buildExposureSummary = (rows = []) => {
    const overdueRows = rows.filter(item => item.isOverdue);
    return {
        totalLoans: rows.length,
        overdueLoans: overdueRows.length,
        overdueBalance: overdueRows.reduce((sum, item) => sum + Number(item.outstandingBalance || 0), 0),
        overdueAmount: overdueRows.reduce((sum, item) => sum + Number(item.overdueAmount || 0), 0),
        newlyOverdueCount: overdueRows.filter(item => item.isNewlyOverdue).length,
        maxOverdueDays: overdueRows.reduce((max, item) => Math.max(max, Number(item.overdueDays || 0)), 0),
    };
};

const normalizeUploadedFile = (file) => file ? ({
    fileName: file.originalname,
    fileUrl: file.path,
    mimeType: file.mimetype,
    size: file.size
}) : null;

app.get('/api/exposure-monitor/latest', authenticateUser, async (req, res) => {
    try {
        const snapshot = await ExposureSnapshot.findOne().sort({ createdAt: -1 }).lean();
        const currentCases = sortExposureCases(await ExposureCase.find({ isCurrentOverdue: true }).lean());
        const newlyOverdueCases = currentCases.filter(item => item.isNewlyOverdue);
        const history = await ExposureSnapshot.find({}, {
            rows: 0
        }).sort({ createdAt: -1 }).limit(24).lean();
        res.json({
            snapshot,
            currentCases,
            newlyOverdueCases,
            history,
        });
    } catch (e) {
        console.error('Exposure latest error:', e.message);
        res.status(500).json({ message: 'Exposure monitor load failed' });
    }
});

app.get('/api/exposure-monitor/snapshots', authenticateUser, async (req, res) => {
    try {
        const snapshots = await ExposureSnapshot.find({}, { rows: 0 }).sort({ createdAt: -1 }).lean();
        res.json(snapshots);
    } catch (e) {
        console.error('Exposure snapshot list error:', e.message);
        res.status(500).json({ message: 'Exposure snapshot list failed' });
    }
});

app.get('/api/exposure-monitor/snapshots/:id', authenticateUser, async (req, res) => {
    try {
        const snapshot = await ExposureSnapshot.findById(req.params.id).lean();
        if (!snapshot) return res.status(404).json({ message: 'Exposure snapshot not found' });
        res.json(snapshot);
    } catch (e) {
        console.error('Exposure snapshot detail error:', e.message);
        res.status(500).json({ message: 'Exposure snapshot detail failed' });
    }
});

app.post('/api/exposure-monitor/snapshots', authenticateUser, (req, res) => {
    exposureUpload(req, res, async (err) => {
        try {
            if (err) return res.status(400).json({ message: err.message });

            const rowsInput = parseJsonField(req.body.rows, []);
            const rows = Array.isArray(rowsInput) ? rowsInput : [];
            if (!rows.length) {
                return res.status(400).json({ message: 'No exposure rows received' });
            }

            const file = req.file || null;
            const reportDate = cleanExposureText(req.body.reportDate);
            const detectedReportDate = cleanExposureText(req.body.detectedReportDate);
            const snapshotLabel = cleanExposureText(req.body.snapshotLabel) || reportDate || detectedReportDate || new Date().toISOString().slice(0, 10);
            const sourceFileName = cleanExposureText(req.body.sourceFileName) || cleanExposureText(file?.originalname);
            const sheetName = cleanExposureText(req.body.sheetName);
            const normalizedRows = rows
                .map(normalizeExposureRow)
                .filter(item => item.caseKey);

            if (!normalizedRows.length) {
                return res.status(400).json({ message: 'Could not detect borrower rows from the uploaded file' });
            }

            const previousSnapshot = await ExposureSnapshot.findOne().sort({ createdAt: -1 }).lean();
            const previousOverdueKeys = previousSnapshot
                ? new Set(
                    (previousSnapshot.rows || [])
                        .filter(item => item.isOverdue)
                        .map(item => item.caseKey)
                )
                : new Set();

            const flaggedRows = normalizedRows.map(item => ({
                ...item,
                isNewlyOverdue: previousSnapshot ? (item.isOverdue && !previousOverdueKeys.has(item.caseKey)) : false,
            }));
            const currentOverdueRows = flaggedRows.filter(item => item.isOverdue);
            const currentOverdueKeys = currentOverdueRows.map(item => item.caseKey);
            const now = new Date();

            if (currentOverdueKeys.length) {
                await ExposureCase.updateMany(
                    { isCurrentOverdue: true, caseKey: { $nin: currentOverdueKeys } },
                    {
                        $set: {
                            isCurrentOverdue: false,
                            isNewlyOverdue: false,
                            status: 'resolved',
                            resolvedAt: now,
                            updatedAt: now,
                        }
                    }
                );
            } else {
                await ExposureCase.updateMany(
                    { isCurrentOverdue: true },
                    {
                        $set: {
                            isCurrentOverdue: false,
                            isNewlyOverdue: false,
                            status: 'resolved',
                            resolvedAt: now,
                            updatedAt: now,
                        }
                    }
                );
            }

            const localFileUrl = file ? `${req.protocol}://${req.get('host')}/uploads/exposure/${file.filename}` : '';

            const snapshot = await new ExposureSnapshot({
                snapshotLabel,
                reportDate,
                detectedReportDate,
                sourceFileName,
                sheetName,
                fileUrl: localFileUrl,
                filePublicId: cleanExposureText(file?.filename || ''),
                mimeType: cleanExposureText(file?.mimetype),
                size: Number(file?.size || 0),
                uploadedBy: {
                    userId: String(req.user?._id || ''),
                    name: req.user?.name || '',
                },
                comparison: {
                    previousSnapshotId: previousSnapshot?._id || null,
                    previousSnapshotLabel: previousSnapshot?.snapshotLabel || '',
                },
                summary: buildExposureSummary(flaggedRows),
                rows: flaggedRows,
            }).save();

            const existingCases = await ExposureCase.find({
                caseKey: { $in: currentOverdueKeys }
            }).lean();
            const existingByKey = new Map(existingCases.map(item => [item.caseKey, item]));

            if (currentOverdueRows.length) {
                const caseWrites = currentOverdueRows.map((row) => {
                    const existing = existingByKey.get(row.caseKey);
                    const recommendedActions = buildRecommendedActions(row);
                    const nextAssignee = existing?.assignee?.name
                        ? existing.assignee
                        : { userId: '', name: cleanExposureText(row.loanOfficer) };
                    const actionMeasures = Array.isArray(existing?.actionMeasures) && existing.actionMeasures.length
                        ? existing.actionMeasures
                        : recommendedActions;
                    const actionPlan = cleanExposureText(existing?.actionPlan) || buildActionPlanText(row, nextAssignee.name);

                    const payload = {
                        borrowerName: row.borrowerName,
                        regNo: row.regNo,
                        loanId: row.loanId,
                        productName: row.productName,
                        branch: row.branch,
                        loanOfficer: row.loanOfficer,
                        phone: row.phone,
                        collateral: row.collateral,
                        currency: row.currency,
                        interestRate: row.interestRate,
                        startDate: row.startDate,
                        endDate: row.endDate,
                        originalAmount: row.originalAmount,
                        principalDebt: row.principalDebt,
                        interestDebt: row.interestDebt,
                        regularizationAmount: row.regularizationAmount,
                        contactNote: row.contactNote,
                        lastContactDate: row.lastContactDate,
                        currentOutstandingBalance: row.outstandingBalance,
                        currentOverdueAmount: row.overdueAmount,
                        currentOverdueDays: row.overdueDays,
                        classification: row.classification,
                        overdueBucket: row.overdueBucket,
                        sourceSnapshot: {
                            snapshotId: snapshot._id,
                            snapshotLabel,
                        },
                        assignee: nextAssignee,
                        actionMeasures,
                        recommendedActions,
                        actionPlan,
                        notes: existing?.notes || '',
                        status: existing?.status && existing.status !== 'resolved' ? existing.status : 'open',
                        isCurrentOverdue: true,
                        isNewlyOverdue: row.isNewlyOverdue,
                        lastSeenAt: now,
                        resolvedAt: null,
                        updatedAt: now,
                    };

                    return {
                        updateOne: {
                            filter: { caseKey: row.caseKey },
                            update: existing
                                ? { $set: payload }
                                : {
                                    $set: payload,
                                    $setOnInsert: {
                                        caseKey: row.caseKey,
                                        firstDetectedAt: now,
                                        createdAt: now,
                                    }
                                },
                            upsert: true,
                        }
                    };
                });

                await ExposureCase.bulkWrite(caseWrites, { ordered: false });
            }

            await createLog(
                req.user,
                'exposure_snapshot_uploaded',
                `${snapshotLabel} - ${sourceFileName || 'manual'} - overdue ${currentOverdueRows.length}`
            );

            const currentCases = sortExposureCases(await ExposureCase.find({ isCurrentOverdue: true }).lean());
            const newlyOverdueCases = currentCases.filter(item => item.isNewlyOverdue);
            const history = await ExposureSnapshot.find({}, { rows: 0 }).sort({ createdAt: -1 }).limit(24).lean();

            res.status(201).json({
                snapshot: snapshot.toObject(),
                previousSnapshot: previousSnapshot
                    ? {
                        _id: previousSnapshot._id,
                        snapshotLabel: previousSnapshot.snapshotLabel,
                        createdAt: previousSnapshot.createdAt,
                    }
                    : null,
                currentCases,
                newlyOverdueCases,
                history,
            });
        } catch (e) {
            console.error('Exposure snapshot save error:', e.message);
            res.status(500).json({ message: 'Exposure snapshot save failed' });
        }
    });
});

app.put('/api/exposure-monitor/cases/:id', authenticateUser, async (req, res) => {
    try {
        const actionMeasures = Array.isArray(req.body.actionMeasures)
            ? req.body.actionMeasures
            : String(req.body.actionMeasures || '')
                .split(/\r?\n|,/)
                .map(item => item.trim())
                .filter(Boolean);

        const update = {
            updatedAt: new Date(),
        };

        if (req.body.assignee && typeof req.body.assignee === 'object') {
            update.assignee = {
                userId: cleanExposureText(req.body.assignee.userId),
                name: cleanExposureText(req.body.assignee.name),
            };
        }
        if (req.body.status) update.status = cleanExposureText(req.body.status);
        if (req.body.actionPlan != null) update.actionPlan = cleanExposureText(req.body.actionPlan);
        if (req.body.notes != null) update.notes = cleanExposureText(req.body.notes);
        if (req.body.actionMeasures != null) update.actionMeasures = actionMeasures;

        const existing = await ExposureCase.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Exposure case not found' });

        if (update.status === 'resolved') {
            update.isCurrentOverdue = false;
            update.isNewlyOverdue = false;
            update.resolvedAt = new Date();
        }

        const next = await ExposureCase.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true }
        );
        res.json(next);
    } catch (e) {
        console.error('Exposure case update error:', e.message);
        res.status(500).json({ message: 'Exposure case update failed' });
    }
});

const statementAnalysisSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['frontSheet', 'monthlySummary', 'transactions', 'incomeSources', 'expenseCategories', 'cashFlowBehaviour', 'notableTransactions', 'analysisReport', 'warnings'],
    properties: {
        frontSheet: {
            type: 'object',
            additionalProperties: false,
            required: [
                'customerName',
                'accountNumber',
                'bankName',
                'periodStart',
                'periodEnd',
                'coveredMonths',
                'startingBalance',
                'endingBalance',
                'totalIncome',
                'totalExpense',
                'netCashFlow',
                'averageMonthlyIncome',
                'averageMonthlyExpense',
                'averageMonthlyNetCashFlow',
                'mainIncomeSource',
                'mainExpensePattern',
                'incomeStability',
                'cashFlowQuality',
                'repaymentSource',
                'keyRisks',
                'spendingBehavior',
                'avgTransactionsPerMonth',
                'hasLoanRepayments',
                'loanRepaymentDetails',
                'cashWithdrawalFrequency'
            ],
            properties: {
                customerName: { type: 'string' },
                accountNumber: { type: 'string' },
                bankName: { type: 'string' },
                periodStart: { type: 'string' },
                periodEnd: { type: 'string' },
                coveredMonths: { type: 'number' },
                startingBalance: { type: 'number' },
                endingBalance: { type: 'number' },
                totalIncome: { type: 'number' },
                totalExpense: { type: 'number' },
                netCashFlow: { type: 'number' },
                averageMonthlyIncome: { type: 'number' },
                averageMonthlyExpense: { type: 'number' },
                averageMonthlyNetCashFlow: { type: 'number' },
                mainIncomeSource: { type: 'string' },
                mainExpensePattern: { type: 'string' },
                incomeStability: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
                cashFlowQuality: { type: 'string', enum: ['strong', 'average', 'weak', 'unknown'] },
                repaymentSource: { type: 'string' },
                keyRisks: { type: 'string' },
                spendingBehavior: { type: 'string' },
                avgTransactionsPerMonth: { type: 'number' },
                hasLoanRepayments: { type: 'string', enum: ['тийм', 'үгүй', 'тодорхойгүй'] },
                loanRepaymentDetails: { type: 'string' },
                cashWithdrawalFrequency: { type: 'string' }
            }
        },
        monthlySummary: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['month', 'income', 'expense', 'netCashFlow', 'startingBalance', 'endingBalance', 'transactionCount'],
                properties: {
                    month: { type: 'string' },
                    income: { type: 'number' },
                    expense: { type: 'number' },
                    netCashFlow: { type: 'number' },
                    startingBalance: { type: 'number' },
                    endingBalance: { type: 'number' },
                    transactionCount: { type: 'number' }
                }
            }
        },
        transactions: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['date', 'description', 'amount', 'direction', 'category', 'month'],
                properties: {
                    date: { type: 'string' },
                    description: { type: 'string' },
                    amount: { type: 'number' },
                    direction: { type: 'string', enum: ['income', 'expense'] },
                    category: { type: 'string' },
                    month: { type: 'string' }
                }
            }
        },
        incomeSources: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['source', 'amount', 'sharePercent', 'frequency'],
                properties: {
                    source: { type: 'string' },
                    amount: { type: 'number' },
                    sharePercent: { type: 'number' },
                    frequency: { type: 'string' }
                }
            }
        },
        expenseCategories: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['category', 'amount', 'sharePercent'],
                properties: {
                    category: { type: 'string' },
                    amount: { type: 'number' },
                    sharePercent: { type: 'number' }
                }
            }
        },
        cashFlowBehaviour: {
            type: 'object',
            additionalProperties: false,
            required: ['incomeBehaviour', 'expenseBehaviour', 'netCashFlowBehaviour', 'conclusion'],
            properties: {
                incomeBehaviour: { type: 'string' },
                expenseBehaviour: { type: 'string' },
                netCashFlowBehaviour: { type: 'string' },
                conclusion: { type: 'string' }
            }
        },
        notableTransactions: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['date', 'description', 'amount', 'direction', 'flagReason'],
                properties: {
                    date: { type: 'string' },
                    description: { type: 'string' },
                    amount: { type: 'number' },
                    direction: { type: 'string', enum: ['income', 'expense'] },
                    flagReason: { type: 'string' }
                }
            }
        },
        analysisReport: {
            type: 'object',
            additionalProperties: false,
            required: ['summaryRows', 'incomeScoring', 'incomeClassification', 'expenseClassification', 'behaviorPatterns', 'creditScoring'],
            properties: {
                // 1. Үзүүлэлт хүснэгт
                summaryRows: {
                    type: 'array',
                    items: {
                        type: 'object', additionalProperties: false,
                        required: ['label', 'value'],
                        properties: { label: { type: 'string' }, value: { type: 'string' } }
                    }
                },
                // 2. Орлогын шалгуур
                incomeScoring: {
                    type: 'array',
                    items: {
                        type: 'object', additionalProperties: false,
                        required: ['criterion', 'assessment', 'detail'],
                        properties: {
                            criterion: { type: 'string' },
                            assessment: { type: 'string', enum: ['Сайн', 'Хэвийн', 'Анхаарах', 'Муу'] },
                            detail: { type: 'string' }
                        }
                    }
                },
                // 3. Орлогын хэнгилал
                incomeClassification: {
                    type: 'array',
                    items: {
                        type: 'object', additionalProperties: false,
                        required: ['type', 'frequency', 'totalAmount', 'sharePercent'],
                        properties: {
                            type: { type: 'string' },
                            frequency: { type: 'string' },
                            totalAmount: { type: 'number' },
                            sharePercent: { type: 'number' }
                        }
                    }
                },
                // 4. Зардлын ангилал
                expenseClassification: {
                    type: 'array',
                    items: {
                        type: 'object', additionalProperties: false,
                        required: ['category', 'frequency', 'totalAmount', 'sharePercent'],
                        properties: {
                            category: { type: 'string' },
                            frequency: { type: 'string' },
                            totalAmount: { type: 'number' },
                            sharePercent: { type: 'number' }
                        }
                    }
                },
                // 5. Бусад хэв шинж
                behaviorPatterns: {
                    type: 'object', additionalProperties: false,
                    required: ['incomePattern', 'expensePattern', 'payrollCycle', 'cashDependency', 'ownerRelatedFlow', 'cashBuffer'],
                    properties: {
                        incomePattern: { type: 'string' },
                        expensePattern: { type: 'string' },
                        payrollCycle: { type: 'string' },
                        cashDependency: { type: 'string' },
                        ownerRelatedFlow: { type: 'string' },
                        cashBuffer: { type: 'string' }
                    }
                },
                // 6. Скоринг
                creditScoring: {
                    type: 'object', additionalProperties: false,
                    required: ['criteria', 'totalScore', 'maxScore'],
                    properties: {
                        criteria: {
                            type: 'array',
                            items: {
                                type: 'object', additionalProperties: false,
                                required: ['criterion', 'assessment', 'score', 'maxScore'],
                                properties: {
                                    criterion: { type: 'string' },
                                    assessment: { type: 'string', enum: ['Сайн', 'Хэвийн', 'Анхаарах', 'Муу', ''] },
                                    score: { type: 'number' },
                                    maxScore: { type: 'number' }
                                }
                            }
                        },
                        totalScore: { type: 'number' },
                        maxScore: { type: 'number' }
                    }
                }
            }
        },
        warnings: {
            type: 'array',
            items: { type: 'string' }
        }
    }
};

const parseAiJson = (text = '') => {
    const cleaned = String(text)
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
    return JSON.parse(cleaned);
};

const normalizeStatementAnalysis = (analysis = {}) => {
    const months = Array.isArray(analysis.monthlySummary) ? analysis.monthlySummary : [];
    const sortedMonths = months
        .map(item => ({
            month: String(item.month || ''),
            income: Number(item.income || 0),
            expense: Number(item.expense || 0),
            netCashFlow: Number(item.netCashFlow || 0),
            startingBalance: Number(item.startingBalance || 0),
            endingBalance: Number(item.endingBalance || 0),
            transactionCount: Number(item.transactionCount || 0),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

    const totalIncome = sortedMonths.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = sortedMonths.reduce((sum, item) => sum + item.expense, 0);
    const netCashFlow = totalIncome - totalExpense;
    const coveredMonths = sortedMonths.length || Number(analysis.frontSheet?.coveredMonths || 0) || 1;

    return {
        ...analysis,
        frontSheet: {
            ...(analysis.frontSheet || {}),
            coveredMonths,
            totalIncome: Number(analysis.frontSheet?.totalIncome || totalIncome),
            totalExpense: Number(analysis.frontSheet?.totalExpense || totalExpense),
            netCashFlow: Number(analysis.frontSheet?.netCashFlow || netCashFlow),
            averageMonthlyIncome: Number(analysis.frontSheet?.averageMonthlyIncome || (totalIncome / coveredMonths)),
            averageMonthlyExpense: Number(analysis.frontSheet?.averageMonthlyExpense || (totalExpense / coveredMonths)),
            averageMonthlyNetCashFlow: Number(analysis.frontSheet?.averageMonthlyNetCashFlow || (netCashFlow / coveredMonths)),
        },
        monthlySummary: sortedMonths,
        transactions: Array.isArray(analysis.transactions) ? analysis.transactions : [],
        incomeSources: Array.isArray(analysis.incomeSources) ? analysis.incomeSources : [],
        expenseCategories: Array.isArray(analysis.expenseCategories) ? analysis.expenseCategories : [],
        notableTransactions: Array.isArray(analysis.notableTransactions) ? analysis.notableTransactions : [],
        analysisReport: analysis.analysisReport || { summaryRows: [], incomeScoring: [], incomeClassification: [], expenseClassification: [], behaviorPatterns: { incomePattern: '', expensePattern: '', payrollCycle: '', cashDependency: '', ownerRelatedFlow: '', cashBuffer: '' }, creditScoring: { criteria: [], totalScore: 0, maxScore: 100 } },
        warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
    };
};

// Cloudinary URL-аас файл татах helper — signed download URL (API endpoint) ашиглан auth bypass
const downloadFromUrl = async (url) => {
    if (!url || !url.includes('res.cloudinary.com')) {
        return axios.get(url, { responseType: 'arraybuffer', timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    }
    // Parse: https://res.cloudinary.com/{cloud}/{type}/upload/v{ver}/{public_id_with_ext}
    const m = url.match(/cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+?)(?:\?|$)/);
    if (!m) return axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    const [, resourceType, rawId] = m;
    // Cloudinary public_id does NOT include extension — strip it
    const extMatch = rawId.match(/^(.+)\.([^.]+)$/);
    const publicId = extMatch ? extMatch[1] : rawId;
    const format   = extMatch ? extMatch[2] : '';
    // private_download_url goes through API (not CDN) — bypasses access restrictions
    const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
        resource_type: resourceType, type: 'upload',
        expires_at: Math.floor(Date.now() / 1000) + 600,
        attachment: false,
    });
    console.log('[DOWNLOAD] Signed URL:', signedUrl.substring(0, 150));
    return axios.get(signedUrl, { responseType: 'arraybuffer', timeout: 60000 });
};

const analyzeStatementsWithAI = async ({ files = [], fileUrls = [], borrower }) => {
    if (!openai) {
        const error = new Error('OPENAI_API_KEY is not configured');
        error.statusCode = 503;
        throw error;
    }
    if (!files.length && !fileUrls.length) {
        const error = new Error('No statement files uploaded');
        error.statusCode = 400;
        throw error;
    }

    const uploadedFiles = await Promise.all(files.map(async (file) => {
        const uploaded = await openai.files.create({
            file: await toFile(file.buffer, file.originalname, { type: file.mimetype || 'application/octet-stream' }),
            purpose: 'user_data'
        });
        return {
            type: 'input_file',
            file_id: uploaded.id
        };
    }));
    const remoteFiles = await Promise.all(fileUrls.filter(Boolean).map(async (url, index) => {
        console.log('[ANALYZE-STMT] Fetching remote file:', url.substring(0, 120));
        const response = await downloadFromUrl(url);
        const fileName = String(url).split('/').pop()?.split('?')[0] || `statement-${index + 1}.pdf`;
        const uploaded = await openai.files.create({
            file: await toFile(Buffer.from(response.data), fileName, { type: response.headers['content-type'] || 'application/octet-stream' }),
            purpose: 'user_data'
        });
        return {
            type: 'input_file',
            file_id: uploaded.id
        };
    }));
    const fileLabels = [
        ...files.map(file => file.originalname),
        ...fileUrls.map(url => String(url).split('/').pop() || url)
    ];

    const response = await openai.responses.create({
        model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        instructions: `Та бол зээлийн судалгааны шинжээч. Дансны хуулгыг зээлийн судалгааны зорилгоор мэргэжлийн түвшинд шинжилж, дараах дүрмүүдийг чанд мөрдөнө:

ОРЛОГЫН АНГИЛАЛ:
- Цалин: тогтмол, ижил эх үүсвэрээс, сар бүр орох
- Бизнесийн орлого: худалдаалалт, үйлчилгээний орлого
- Түрээс: тогтмол гуравдагч этгээдээс орох
- Бэлэн орлогын шинжтэй шилжүүлэг: ATM cash-in, хувь хүнээс ирсэн том дүн
- Нэг удаагийн орлого: тогтмол бус, онцгой шилжүүлэг
- Тодорхойгүй орлого: эх үүсвэр тодорхойгүй

ЗАРЛАГЫН АНГИЛАЛ: өдрийн хэрэглээ, түрээс/тогтмол, зээлийн эргэн төлөлт, бусад ББСБ/банк руу төлөлт, хувь хүнд шилжүүлэг, бизнесийн зардал, бэлэн мөнгоний зарлага, тодорхойгүй.

ЭРСДЭЛИЙН ДОХИО — keyRisks-д заавал тусга:
- Олон ББСБ/банк руу тогтмол гарах шилжүүлэг → далд өрийн ачаалал
- Байнга бэлэн мөнго авах (ATM) → санхүүгийн сахилга бат сул
- Мөрийтэй тоглоом/betting/казино шинжтэй гүйлгээ
- ББСБ-аас ББСБ руу эргэлдэх (давтан дахин санхүүжилт)
- Хугацаа тулсан эргэлт, орлогоосоо хэт өндөр хэрэглээ
- Нэг удаагийн том орлогыг тогтмол мэт харагдуулах оролдлого
- Тодорхойгүй, тайлбаргүй өндөр дүнтэй шилжүүлэг

ЗЭЭЛИЙН ЧАДВАР ТООЦОХ ЗАРЧИМ:
- Зөвхөн давтамжтай, нотлогдох орлогыг "хүлээн зөвшөөрөх" орлогод оруул
- Нэг удаагийн орлогыг тогтмол орлогод бүү оруул
- Хугацаа хэтрэлт, торгуультай гүйлгээ байвал cashFlowQuality-г "weak" гэж дүгнэ
- repaymentSource: орлогын тогтвортой эх үүсвэрийг тодорхой нэрлэ
- incomeStability: "high"/"medium"/"low"/"unknown" утгуудаас аль нэгийг сонго

ЗАН ТӨЛӨВИЙН ДҮГНЭЛТ — шинэ талбарууд:
- spendingBehavior: зарлагын ерөнхий зан төлөвийг монголоор 1-2 өгүүлбэрээр тайлбарла (хэрэглээний хэв маяг, зарлагын тогтвортой байдал, хуримтлалын зан)
- avgTransactionsPerMonth: transactions массиваас сарын дундаж гүйлгээний тоог тооцоол (нийт гүйлгээний тоо ÷ coveredMonths)
- cashWithdrawalFrequency: ATM болон бэлэн мөнгоний авалтын давтамжийг тайлбарла (жишээ: "Сард 3-4 удаа, дундаж 150,000₮") — байхгүй бол ""
- hasLoanRepayments: ББСБ/банк/хувь хүнд тогтмол гарч буй зээлийн эргэн төлөлт илэрвэл "тийм", байхгүй бол "үгүй", тодорхойгүй бол "тодорхойгүй"
- loanRepaymentDetails: hasLoanRepayments="тийм" үед хэний зээл, хэдий хэмжээний сарын төлбөр гэдгийг тайлбарла — байхгүй бол ""

АНХААРАЛ ТАТАХ ГҮЙЛГЭЭ — notableTransactions:
- Дараах төрлийн гүйлгээнүүдийг notableTransactions-д оруул:
  1. Мөрийтэй тоглоом/betting/казино шинжтэй гүйлгээ
  2. ББСБ/МФБ/банк руу тогтмол хэт том дүнгийн шилжүүлэг (далд зээл)
  3. Нэг удаагийн маш том орлого (сарын дундажаас 3 дахин их)
  4. Тодорхойгүй эх үүсвэртэй том дүнгийн орлого (нотлох баримтгүй)
  5. Богино хугацаанд ATM-ээс маш олон удаа бэлэн мөнго авсан
  6. Давтагдах сэжигтэй шилжүүлэг (мөнгө угаалтын шинж)
  7. Хугацаа хэтэрсэн/торгуулийн шинжтэй гүйлгээ
- flagReason-д анхааруулах шалтгааныг монголоор товч бич

ОГНОО УНШИЛТЫН ДҮРЭМ — ЧУХАЛ:
- periodStart: гүйлгээний хүснэгтийн (transactions table) ХАМГИЙН ЭХНИЙ мөрийн огноог "YYYY-MM-DD" форматаар ол
- periodEnd: гүйлгээний хүснэгтийн ХАМГИЙН СҮҮЛИЙН мөрийн огноог "YYYY-MM-DD" форматаар ол
- Баримтын толгой хэсгийн "хугацаа" гэсэн мэдээллийг бус, гүйлгээний жагсаалтын бодит эхлэл/төгсгөлийн огноог авна
- coveredMonths: periodStart-ийн сараас periodEnd-ийн сар хүртэлх нийт сарын тоо (жишээ: 2024-01-05 → 2024-06-28 = 6 сар)
- Огноог файлаас уншиж чадахгүй бол "" буцаа — таамаглаж бүү бөглө

НИЙТ ДҮН ТООЦООЛОХ ДҮРЭМ — ЧУХАЛ:
- transactions массивт гүйлгээний хүснэгтийн БҮХ мөрийг тусдаа оруул (орлого болон зарлага хоёуланг)
- frontSheet.totalIncome = transactions дахь direction="income" бүх гүйлгээний amount-ийн нийлбэр
- frontSheet.totalExpense = transactions дахь direction="expense" бүх гүйлгээний amount-ийн нийлбэр
- Банкны хуулга дээр "Нийт орлого / Нийт зарлага" (Total Credit / Total Debit) хураангуй мөр байвал тэрийг шууд totalIncome/totalExpense болгон ашигла
- monthlySummary дахь income = тухайн сарын орлогын нийлбэр, expense = тухайн сарын зарлагын нийлбэр
- Нэг данснаас нөгөө дансруу шилжүүлэг (өөрийн данс хоорондын) байвал income ба expense хоёуланд тооцохгүй — давхардал үүснэ

ТАЙЛАНГИЙН БҮТЭЦ — analysisReport (бүх хэсгийг монгол хэлээр бөглө):

1. summaryRows — Үзүүлэлтийн хүснэгт (label/value хос). Дараах мөрүүдийг дарааллаар бөглө:
   "Харилцагчийн нэр", "Дансны дугаар", "Банкны хуулгын хамрах хугацаа" (periodStart–periodEnd),
   "Шинжилгээний нийт хугацаа" (X сар), "Эхний үлдэгдэл" (₮), "Эцсийн үлдэгдэл" (₮),
   "Нийт орлого" (₮), "Нийт зарлага" (₮), "Цэвэр мөнгөн урсгал" (₮),
   "Сарын дундаж орлого" (₮), "Сарын дундаж зарлага" (₮), "Сарын дундаж цэвэр урсгал" (₮),
   "Гол орлогын эх үүсвэр", "Гол зарлагын бүтэц", "Мөнгөн урсгалын хэв шинж",
   "Орлогын тогтвортой байдал", "Мөнгөн урсгалын сахилга бат", "Эргэн төлөлтийн эх үүсвэр", "Гол анхаарах эрсдэл"

2. incomeScoring — Орлогын шалгуур (assessment: Сайн/Хэвийн/Анхаарах/Муу):
   - "Орлогын хэмжээ": зээлийн хэрэгцээтэй харьцуулсан орлогын хүрэлцээ
   - "Орлогын давтамж": тогтмол орж ирдэг эсэх, давтамжийн тогтвортой байдал
   - "Цэвэр урсгал": сарын цэвэр мөнгөн урсгал эерэг эсэх
   - "Кассын сахилга": ATM авалт, бэлэн мөнгоний хяналт
   - "Owner-related урсгал": захирал/эзэмшигчид хувийн зориулалтаар гарсан мөнгө
   - "Үлдэгдлийн хамгаалт": дундаж үлдэгдэл хангалттай эсэх (сарын орлогын 10%+)
   - "Ерөнхий bankability": банкны стандарт шаардлага хангах ерөнхий үнэлгээ

3. incomeClassification — Орлогыг төрлөөр ангилах:
   Байгууллагад зориулсан: Үйлчилгээ/зуучлалын орлого, Гэрээ/урьдчилгаа орлого, Захирлын буцаалт, Бусад орлого
   Иргэнд зориулсан: Цалин, Бизнесийн орлого, Түрээсийн орлого, Нэг удаагийн орлого, Тодорхойгүй орлого, Бусад
   frequency: тухайн хугацаанд хэдэн удаа орж ирсэн, totalAmount: нийт дүн, sharePercent: нийт орлогод эзлэх хувь

4. expenseClassification — Зардлыг ангилах:
   Байгууллагад зориулсан: Касс руу таталт, Захирал руу шилжүүлэг, Цалин/урьдчилгаа/бонус, Тоног төхөөрөмж/оффис, Түрээс, Маркетинг/хэвлэл, Хоол/шатахуун/аялал, Хууль/нотариат/өмгөөлөл, Коммунал/хурааmж, Зээлийн эргэн төлөлт, Бусад ангилдаагүй
   Иргэнд зориулсан: Зээлийн эргэн төлөлт, Хоол/хэрэглээ, Коммунал/тогтмол зардал, ATM/бэлэн мөнго, Хувийн шилжүүлэг, Бусад
   frequency, totalAmount, sharePercent адилхан бөглөнө

5. behaviorPatterns — Бусад хэв шинж:
   - incomePattern: орлогын хэв шинжийн 1-2 өгүүлбэр
   - expensePattern: зарлагын хэв шинжийн 1-2 өгүүлбэр
   - payrollCycle: цалин/орлого орох мөчлөг (сарын эхэн/дунд/сүүл, 7 хоногт нэг г.м.)
   - cashDependency: ATM болон бэлэн мөнгоний хамаарал
   - ownerRelatedFlow: захирал/эзэмшигчтэй холбоотой урсгалын үнэлгээ
   - cashBuffer: дундаж үлдэгдлийн хамгаалалтын түвшин

6. creditScoring — Скоринг (нийт 100 оноо):
   criteria дараах бүх шалгуурыг агуулна (assessment: Сайн/Хэвийн/Анхаарах/Муу):
   - "Орлогын хэмжээ" maxScore:15
   - "Орлогын тогтвортой байдал" maxScore:20
   - "Цэвэр мөнгөн урсгал" maxScore:20
   - "Кассын сахилга" maxScore:10
   - "Owner-related урсгал" maxScore:10
   - "Үлдэгдлийн buffer" maxScore:10
   - "Repayment coverage" maxScore:10
   - "Бизнесийн бодит орлого" maxScore:5
   score = тухайн шалгуурын авсан оноо (0–maxScore), totalScore = нийт оноо (0-100), maxScore = 100

ТЕХНИК ДҮРЭМ:
- Бүх тайлбар монгол хэлээр бич
- Мөнгөн дүнг МНТ-ээр тоогоор буцаа (тэмдэгтгүй)
- Давхардсан гүйлгээг нэг удаа тооц
- Сар бүрийг тусдаа мөр болгон monthlySummary-д гарга
- Олдохгүй утгыг зохиомоор бүү бөглө — 0 эсвэл хоосон буцаа
- warnings массивт эрсдэлтэй бүх зүйлийг монголоор нэмэ`,
        input: [{
            role: 'user',
            content: [
                {
                    type: 'input_text',
                    text: `Зээлдэгчийн мэдээлэл: ${JSON.stringify(borrower || {})}\nФайлын тоо: ${files.length + fileUrls.length}\nФайлын нэрс: ${JSON.stringify(fileLabels)}\n\nДараах хуулгыг шинжил:\n1. Гүйлгээний хүснэгтийн ЭХНИЙ болон СҮҮЛИЙН мөрийн БОДИТ огноог periodStart/periodEnd-д тавь\n2. Гүйлгээний хүснэгтийн БҮГДИЙГ transactions-д оруул — орлого болон зарлагыг тус тусад нь\n3. totalIncome = бүх income гүйлгээний нийлбэр, totalExpense = бүх expense гүйлгээний нийлбэр\n4. Хэрэв баримтад "Нийт орлого / Нийт зарлага" хураангуй байвал тэрийг баталгаажуулахад ашигла\n5. Орлого бүрийг зээлийн чадвар тооцоход авч үзэх эсэхийг дүгнэ\n6. Эрсдэлийн дохионуудыг keyRisks болон warnings-д тодорхой бич\n7. cashFlowBehaviour.conclusion-д зээл олгох эцсийн санал бич\n8. spendingBehavior, avgTransactionsPerMonth, cashWithdrawalFrequency, hasLoanRepayments, loanRepaymentDetails талбаруудыг дүрмийн дагуу бөглө\n9. Анхаарал татах бүх гүйлгээг notableTransactions-д оруул\n10. analysisReport-ийн 6 хэсгийг (summaryRows, incomeScoring, incomeClassification, expenseClassification, behaviorPatterns, creditScoring) дүрмийн дагуу монгол хэлээр бөглө`
                },
                ...uploadedFiles,
                ...remoteFiles
            ]
        }],
        text: {
            format: {
                type: 'json_schema',
                name: 'bank_statement_analysis',
                schema: statementAnalysisSchema,
                strict: true
            }
        }
    });

    const analysisResult = normalizeStatementAnalysis(parseAiJson(response.output_text));

    // Cleanup: OpenAI-д upload хийсэн файлуудыг analysis дууссаны дараа устгана
    const allFileIds = [...uploadedFiles, ...remoteFiles].map(f => f.file_id);
    Promise.allSettled(allFileIds.map(id => openai.files.delete(id))).catch(() => {});

    return analysisResult;
};

app.get('/api/loan-research', authenticateUser, async (req, res) => {
    try {
        const researches = await LoanResearch.find().sort({ createdAt: -1 }).limit(100);
        res.json(researches);
    } catch (e) {
        res.status(500).json({ message: 'Error' });
    }
});

// ============================================================
// RAG: Ижил төстэй өмнөх зээлүүд хайх (Vector Search)
// ============================================================
app.post('/api/loan-research/similar', authenticateUser, async (req, res) => {
    try {
        const { borrower = {}, outputs = {}, limit = 5 } = req.body;
        const loanText = generateLoanText(borrower, outputs);
        const queryEmbedding = await generateEmbedding(loanText);

        if (!queryEmbedding) {
            return res.json({ results: [], source: 'none', message: 'Embedding үүсгэхэд алдаа гарлаа.' });
        }

        // MongoDB Atlas Vector Search ($vectorSearch)
        let results = [];
        try {
            results = await LoanResearch.aggregate([
                {
                    $vectorSearch: {
                        index: 'loan_embedding_index',
                        path: 'embedding',
                        queryVector: queryEmbedding,
                        numCandidates: 50,
                        limit: Number(limit) + 1,
                    }
                },
                {
                    $project: {
                        score: { $meta: 'vectorSearchScore' },
                        'borrower.borrowerName': 1,
                        'borrower.borrowerType': 1,
                        'borrower.requestedAmount': 1,
                        'borrower.termMonths': 1,
                        'borrower.classification': 1,
                        'borrower.analystDecision': 1,
                        'borrower.purpose': 1,
                        'outputs.creditScore.calculatedScore': 1,
                        'outputs.creditScore.grade': 1,
                        'outputs.incomeExpense.dti': 1,
                        'outputs.incomeExpense.freeCashFlow': 1,
                        'outputs.collateral.ltvRatio': 1,
                        createdAt: 1,
                    }
                },
                { $limit: Number(limit) + 1 }
            ]);
        } catch (vecErr) {
            // Atlas vector search index байхгүй бол текст хайлтаар fallback
            console.warn('Vector search unavailable, falling back to recent results:', vecErr.message);
            const recent = await LoanResearch.find(
                {},
                {
                    'borrower.borrowerName': 1, 'borrower.borrowerType': 1,
                    'borrower.requestedAmount': 1, 'borrower.termMonths': 1,
                    'borrower.classification': 1, 'borrower.analystDecision': 1,
                    'borrower.purpose': 1,
                    'outputs.creditScore.calculatedScore': 1,
                    'outputs.creditScore.grade': 1,
                    'outputs.incomeExpense.dti': 1,
                    'outputs.incomeExpense.freeCashFlow': 1,
                    'outputs.collateral.ltvRatio': 1,
                    createdAt: 1,
                }
            ).sort({ createdAt: -1 }).limit(Number(limit));
            return res.json({ results: recent, source: 'recent', message: 'Vector search index тохируулаагүй тул сүүлийн судалгаанууд харуулж байна.' });
        }

        // Өөрийгөө хасах (score 1.0 тул)
        const filtered = results.filter(r => r.score < 0.9999).slice(0, Number(limit));
        res.json({ results: filtered, source: 'vector' });
    } catch (e) {
        console.error('Similar loans error:', e.message);
        res.status(500).json({ message: 'Хайлт хийхэд алдаа гарлаа.' });
    }
});

app.post('/api/loan-research/analyze-statement', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const borrower = parseJsonField(req.body.borrower);
            const parsedFileUrls = parseJsonField(req.body.fileUrls, []);
            const fileUrls = Array.isArray(parsedFileUrls) ? parsedFileUrls : [parsedFileUrls].filter(Boolean);
            const analysis = await analyzeStatementsWithAI({ files: req.files || [], fileUrls, borrower });
            res.json(analysis);
        } catch (e) {
            console.error('Statement AI analysis error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Statement analysis failed' });
        }
    });
});


// ============================================================
// HELPER: файлыг зураг эсвэл PDF байдлаас хамаарч content block болгоно
// Зураг → input_image (base64), PDF/бусад → input_file (upload)
// ============================================================
const filesToContentBlocks = async (files = []) => {
    const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const blocks = [];
    const uploadedIds = [];
    for (const f of files) {
        const mime = (f.mimetype || '').toLowerCase();
        if (IMAGE_TYPES.includes(mime)) {
            const b64 = f.buffer.toString('base64');
            blocks.push({ type: 'input_image', image_url: `data:${mime};base64,${b64}` });
        } else {
            const up = await openai.files.create({
                file: await toFile(f.buffer, f.originalname, { type: mime || 'application/octet-stream' }),
                purpose: 'user_data'
            });
            blocks.push({ type: 'input_file', file_id: up.id });
            uploadedIds.push(up.id);
        }
    }
    return { blocks, uploadedIds };
};

// ============================================================
// ИРГЭНИЙ ҮНЭМЛЭХ / ЛАВЛАГАА AI УНШИЛТ
// ============================================================
const idDocumentSchema = {
    type: 'object', additionalProperties: false,
    required: ['lastName','firstName','fatherName','regNo','dob','gender','citizenship','address','issueDate','expiryDate'],
    properties: {
        lastName: { type: 'string' }, firstName: { type: 'string' },
        fatherName: { type: 'string' },
        regNo: { type: 'string' }, dob: { type: 'string' },
        gender: { type: 'string' }, citizenship: { type: 'string' },
        address: { type: 'string' }, issueDate: { type: 'string' },
        expiryDate: { type: 'string' }
    }
};

app.post('/api/loans/analyze-id-document', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions: 'Та бол Монголын KYC мэргэжилтэн. Иргэний үнэмлэх эсвэл оршин суугаа газрын лавлагаанаас мэдээллийг яг таг гарга. lastName = овог (ургийн овог/деэдсийн нэр), firstName = өөрийн нэр, fatherName = эцэг/эхийн нэр. Монголын иргэний үнэмлэхэд эцэгийн нэрийг овог гэсэн хэсгийн доор бичдэг болохоор анхаарна уу. РД-г яг унших ёстой формат (2 үсэг + 8 тоо) -аар гарга. Огноонуудыг YYYY-MM-DD форматаар гарга. Мэдээлэл олдохгүй бол хоосон мөр ашигла.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Иргэний үнэмлэх/лавлагаанаас бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'id_document', schema: idDocumentSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('ID document AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'ID унших алдаа' });
        }
    });
});

// ============================================================
// БАЙГУУЛЛАГЫН ГЭРЧИЛГЭЭ AI
// ============================================================
const orgDocSchema = {
    type: 'object', additionalProperties: false,
    required: ['orgName','orgRegNo','foundedDate','legalForm','industry','address','ceoName','ownerName','registrationAuthority','certificateNumber'],
    properties: {
        orgName: { type: 'string' }, orgRegNo: { type: 'string' },
        foundedDate: { type: 'string' }, legalForm: { type: 'string' },
        industry: { type: 'string' }, address: { type: 'string' },
        ceoName: { type: 'string' }, ownerName: { type: 'string' },
        registrationAuthority: { type: 'string' }, certificateNumber: { type: 'string' }
    }
};

app.post('/api/loans/analyze-org-document', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions: 'Та бол Монгол улсын бизнесийн бүртгэлийн мэргэжилтэн. Улсын бүртгэлийн гэрчилгээ (компанийн бүртгэлийн баримт) -аас бүх мэдээллийг яг таг гарга. Байгууллагын нэрийг бүрэн нэрээр, регистрийн дугаарыг яг унших ёстой форматаар гарга. Огноонуудыг YYYY-MM-DD форматаар. Хуулийн хэлбэр: ХХК, ТББ, ТӨХК г.м. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Байгууллагын бүртгэлийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'org_document', schema: orgDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('Org document AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Байгууллагын гэрчилгээ унших алдаа' });
        }
    });
});

// ============================================================
// ТЭЭВРИЙН ХЭРЭГСЛИЙН БИЧИГ БАРИМТ AI
// ============================================================
const vehicleDocSchema = {
    type: 'object', additionalProperties: false,
    required: ['plateNumber','vehicleType','make','model','year','color','engineNumber','chassisNumber','ownerName','ownerRegNo','registrationDate','technicalPassportNumber'],
    properties: {
        plateNumber: { type: 'string' }, vehicleType: { type: 'string' },
        make: { type: 'string' }, model: { type: 'string' },
        year: { type: 'string' }, color: { type: 'string' },
        engineNumber: { type: 'string' }, chassisNumber: { type: 'string' },
        ownerName: { type: 'string' }, ownerRegNo: { type: 'string' },
        registrationDate: { type: 'string' }, technicalPassportNumber: { type: 'string' }
    }
};

app.post('/api/loans/analyze-vehicle-document', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions: 'Та бол Монгол улсын тээврийн хэрэгслийн бүртгэлийн мэргэжилтэн. Техникийн паспорт эсвэл бүртгэлийн гэрчилгээнээс бүх мэдээллийг яг таг гарга. Улсын дугаарыг яг унших ёстой формат (үсэг + тоо) -оор гарга. Огноонуудыг YYYY-MM-DD форматаар. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Техникийн паспорт/бүртгэлийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'vehicle_document', schema: vehicleDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('Vehicle document AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Техникийн паспорт унших алдаа' });
        }
    });
});

// ============================================================
// ҮҮДЭН ГАЗРЫН ГЭРЧИЛГЭЭ / ҮЛ ХӨДЛӨХ ХӨРӨНГИЙН БАРИМТ AI
// ============================================================
const propertyDocSchema = {
    type: 'object', additionalProperties: false,
    required: ['certificateNumber','propertyType','address','area','ownerName','ownerRegNo','registrationDate','purpose','district','khoroo','blockNumber','apartmentNumber','landArea','buildingYear'],
    properties: {
        certificateNumber: { type: 'string' }, propertyType: { type: 'string' },
        address: { type: 'string' }, area: { type: 'string' },
        ownerName: { type: 'string' }, ownerRegNo: { type: 'string' },
        registrationDate: { type: 'string' }, purpose: { type: 'string' },
        district: { type: 'string' }, khoroo: { type: 'string' },
        blockNumber: { type: 'string' }, apartmentNumber: { type: 'string' },
        landArea: { type: 'string' }, buildingYear: { type: 'string' }
    }
};

app.post('/api/loans/analyze-property-document', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions: 'Та бол Монгол улсын үл хөдлөх хөрөнгийн бүртгэлийн мэргэжилтэн. Эд хөрөнгийн эрхийн гэрчилгээ эсвэл кадастрын зургаас бүх мэдээллийг яг таг гарга. Талбайг м2-ааp, огноонуудыг YYYY-MM-DD форматаар гарга. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Эд хөрөнгийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'property_document', schema: propertyDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('Property document AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Эд хөрөнгийн баримт унших алдаа' });
        }
    });
});

// ============================================================
// ЗЭЭЛИЙН МЭДЭЭЛЛИЙН ЛАВЛАГАА (Credit Bureau Report) AI
// ============================================================
const creditReferenceSchema = {
    type: 'object', additionalProperties: false,
    required: ['registrationNumber','reportDate','creditBureauScore','primaryLoans','coLoans','summary','analysis','finalRating'],
    properties: {
        registrationNumber: { type: 'string' },
        reportDate: { type: 'string' },
        creditBureauScore: { type: ['number','null'] },
        primaryLoans: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['loanType','currency','originalAmount','interestRate','issueDate','dueDate','paidDate','balance','isOverdue','overdueDays','collateralType','institution','estimatedMonthlyPayment'],
                properties: {
                    loanType: { type: 'string' }, currency: { type: 'string' },
                    originalAmount: { type: 'number' }, interestRate: { type: 'number' },
                    issueDate: { type: 'string' }, dueDate: { type: 'string' },
                    paidDate: { type: ['string','null'] }, balance: { type: 'number' },
                    isOverdue: { type: 'boolean' }, overdueDays: { type: 'number' },
                    collateralType: { type: 'string' }, institution: { type: 'string' },
                    estimatedMonthlyPayment: { type: 'number' }
                }
            }
        },
        coLoans: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['loanType','currency','originalAmount','issueDate','dueDate','paidDate','balance','isOverdue','overdueDays','institution','primaryBorrower'],
                properties: {
                    loanType: { type: 'string' }, currency: { type: 'string' },
                    originalAmount: { type: 'number' }, issueDate: { type: 'string' },
                    dueDate: { type: 'string' }, paidDate: { type: ['string','null'] },
                    balance: { type: 'number' }, isOverdue: { type: 'boolean' },
                    overdueDays: { type: 'number' }, institution: { type: 'string' },
                    primaryBorrower: { type: 'string' }
                }
            }
        },
        summary: {
            type: 'object', additionalProperties: false,
            required: ['totalActiveLoans','totalBalance','totalOriginalAmount','hasOverdue','maxOverdueDays','estimatedMonthlyPayment','activeLoansCount','paidLoansCount','institutionSummary'],
            properties: {
                totalActiveLoans: { type: 'number' }, totalBalance: { type: 'number' },
                totalOriginalAmount: { type: 'number' }, hasOverdue: { type: 'boolean' },
                maxOverdueDays: { type: 'number' }, estimatedMonthlyPayment: { type: 'number' },
                activeLoansCount: { type: 'number' }, paidLoansCount: { type: 'number' },
                institutionSummary: { type: 'string' }
            }
        },
        analysis: { type: 'string' },
        finalRating: { type: 'string', enum: ['МАШ САЙН','САЙН','ДУНД','МУУ','МАШ МУУ'] }
    }
};

const analyzeCreditReferenceWithAI = async ({ files = [], fileUrls = [], borrower }) => {
    if (!openai) { const e = new Error('OPENAI_API_KEY is not configured'); e.statusCode = 503; throw e; }
    if (!files.length && !fileUrls.length) { const e = new Error('No credit reference file'); e.statusCode = 400; throw e; }

    const uploadedFiles = await Promise.all(files.map(async (file) => {
        const up = await openai.files.create({
            file: await toFile(file.buffer, file.originalname, { type: file.mimetype || 'application/octet-stream' }),
            purpose: 'user_data'
        });
        return { type: 'input_file', file_id: up.id };
    }));
    const remoteFiles = await Promise.all(fileUrls.filter(Boolean).map(async (url) => {
        console.log('[ANALYZE-CREDIT] Fetching remote file:', url.substring(0, 120));
        const resp = await downloadFromUrl(url);
        const fname = String(url).split('/').pop()?.split('?')[0] || 'credit-ref.pdf';
        const up = await openai.files.create({
            file: await toFile(Buffer.from(resp.data), fname, { type: resp.headers['content-type'] || 'application/octet-stream' }),
            purpose: 'user_data'
        });
        return { type: 'input_file', file_id: up.id };
    }));

    const response = await openai.responses.create({
        model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
        temperature: 0,
        instructions: `Та бол Монголын зээлийн эрсдэлийн мэргэжилтэн. Зээлийн мэдээллийн сангийн лавлагааг (Зээлийн мэдээллийн лавлагаа) нарийвчлан шинжилж бүрэн дүн шинжилгээ хий.

МЭДЭЭЛЭЛ ГАРГАХ ДҮРЭМ:
- primaryLoans: Үндсэн зээлдэгчээр орсон хүснэгтийн БҮХ мөрийг гарга
- coLoans: Хамтран зээлдэгчээр орсон хүснэгтийн БҮХ мөрийг гарга
- Идэвхтэй зээл: үлдэгдэл > 0 ЭСВЭЛ төлөгдсөн огноо хоосон/null
- estimatedMonthlyPayment: идэвхтэй зээлд аннуитетийн томьёогоор тооцоол; төлөгдсөн зээлд 0
- isOverdue: зөвхөн "Тийм" эсвэл overdueDays > 0 байвал true
- Тоон утга олдохгүй бол 0, текст олдохгүй бол хоосон мөр, огноо олдохгүй бол null

SUMMARY ТООЦООЛОЛ:
- totalActiveLoans: идэвхтэй зээлийн нийт анхны дүн
- totalBalance: идэвхтэй зээлийн нийт үлдэгдэл
- estimatedMonthlyPayment: бүх идэвхтэй зээлийн сарын төлбөрийн нийлбэр
- institutionSummary: байгууллагын төрлүүдийн товч нэгтгэл, жишээ нь "2 Банк, 3 ББСБ, 1 Карт"

ANALYSIS БИЧИХ ФОРМАТ (analysis талбарт дараах 10 хэсгийг markdown-аар бич):

## 1. Ерөнхий тойм
Зээлийн лавлагааны огноо, нийт зээлийн тоо, идэвхтэй/хаагдсан тоо, нийт байгууллага.

## 2. Идэвхтэй зээлүүд
Идэвхтэй зээл бүрийн: байгууллага, зээлийн төрөл, анхны дүн, үлдэгдэл, хүү, хугацаа, барьцаа. Нийт үлдэгдэл болон сарын нийт төлбөр.

## 3. Хаагдсан зээлүүд
Төлсөн зээлүүдийн товч жагсаалт. Зөв цагтаа төлсөн эсэх.

## 4. Хугацаа хэтрэлтийн түүх
Хугацаа хэтрэлт байвал: хэдэн зээлд, хамгийн их хэдэн хоног, одоогийн байдал. Байхгүй бол "Хугацаа хэтрэлт байхгүй".

## 5. Өрийн ачаалал
DTI тооцоо (хэрэв орлого мэдэгдэж байвал). Нийт сарын үүрэг. Нийт үлдэгдэл/анхны дүнгийн харьцаа.

## 6. Эрсдэлийн дохиолол
Олон ББСБ дахь зэрэг зээл, хугацаа хэтрэлт, дахин санхүүжилтийн шинж, концентрацийн эрсдэл.

## 7. Эерэг үзүүлэлтүүд
Зөв төлбөрийн түүх, барьцааны бүрхэц, урт хугацааны зээлийн харилцаа.

## 8. Шинэ зээл олгох боломж
Эерэг ба сөрөг талыг жинлэж шинэ зээл олгох боломжийн талаарх санал.

## 9. Эцсийн үнэлгээ
Нэг өгүүлбэрт дүгнэлт. Эрсдэлийн ерөнхий түвшин.

## 10. Зээлийн хүснэгт
Идэвхтэй зээлүүдийн хүснэгт: | Байгууллага | Төрөл | Анхны дүн | Үлдэгдэл | Хүү | Барьцаа | Хугацаа хэтрэлт |

finalRating: МАШ САЙН (хугацаа хэтрэлтгүй, бага ачаалал), САЙН (1-2 удаа хугацаа хэтрэлт), ДУНД (дунд зэргийн ачаалал), МУУ (их хугацаа хэтрэлт), МАШ МУУ (олон эрсдэл давхцсан)`,
        input: [{
            role: 'user',
            content: [
                { type: 'input_text', text: `Зээлдэгч: ${JSON.stringify(borrower || {})}\n\nДараах зээлийн мэдээллийн сангийн лавлагааг шинжилж бүх зээлийн мөрүүдийг гарга. Өрийн нийт ачааллыг зөв тооцоол. Хугацаа хэтрэлт болон эрсдэлийн дохионуудыг institutionSummary-д тусгайлан дурд.` },
                ...uploadedFiles, ...remoteFiles
            ]
        }],
        text: { format: { type: 'json_schema', name: 'credit_reference_analysis', schema: creditReferenceSchema, strict: true } }
    });

    const result = parseAiJson(response.output_text);
    const allIds = [...uploadedFiles, ...remoteFiles].map(f => f.file_id);
    Promise.allSettled(allIds.map(id => openai.files.delete(id))).catch(() => {});
    return result;
};

app.post('/api/loan-research/analyze-credit-reference', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const borrower = parseJsonField(req.body.borrower);
            const parsedUrls = parseJsonField(req.body.fileUrls, []);
            const fileUrls = Array.isArray(parsedUrls) ? parsedUrls : [parsedUrls].filter(Boolean);
            const analysis = await analyzeCreditReferenceWithAI({ files: req.files || [], fileUrls, borrower });
            res.json(analysis);
        } catch (e) {
            console.error('Credit reference AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Credit reference analysis failed' });
        }
    });
});


// ============================================================
// FICO / SAINSCORE AI
// ============================================================
const ficoScoreSchema = {
    type: 'object', additionalProperties: false,
    required: ['customerName','regNo','reportDate','reportNumber','ficoScore','scoreCategory','openLoansCount','closedLoansCount','overdueCount90','overdueCount90Plus','totalActiveBalance','scoreReasons'],
    properties: {
        customerName: { type: 'string' }, regNo: { type: 'string' },
        reportDate: { type: 'string' }, reportNumber: { type: 'string' },
        ficoScore: { type: ['number','null'] }, scoreCategory: { type: 'string' },
        openLoansCount: { type: 'number' }, closedLoansCount: { type: 'number' },
        overdueCount90: { type: 'number' }, overdueCount90Plus: { type: 'number' },
        totalActiveBalance: { type: 'number' },
        scoreReasons: { type: 'array', items: { type: 'string' } }
    }
};

app.post('/api/loans/analyze-fico-document', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'OPENAI_API_KEY тохируулагдаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions: 'You are a Mongolian credit analyst. Read the FICO/Sainscore credit score report. Extract the numerical credit score, score category (МАШ САЙН/САЙН/ДУНД/МУУ/МАШ МУУ or similar), open and closed loan counts, overdue counts at 90 days and 90+ days, total active balance, and score reason codes. Use 0 for missing numbers, empty string for missing text, null for missing score.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Extract FICO/Sainscore credit score data from this document.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'fico_score', schema: ficoScoreSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('FICO AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'FICO analysis failed' });
        }
    });
});

// ============================================================
// НИЙГМИЙН ДААТГАЛ AI
// ============================================================
const socialInsuranceSchema = {
    type: 'object', additionalProperties: false,
    required: [
        'employeeName','regNo','reportDate',
        'totalInsuranceMonths','averageSalary','lastSalary','minSalary','maxSalary',
        'isContinuous','gapMonths',
        'employers','employerChangeCount',
        'salaryTrend','salaryChanges',
        'insuranceItems','summary','analysis','analysisReport'
    ],
    properties: {
        employeeName: { type: 'string' },
        regNo: { type: 'string' },
        reportDate: { type: 'string' },
        totalInsuranceMonths: { type: 'number' },
        averageSalary: { type: 'number' },
        lastSalary: { type: 'number' },
        minSalary: { type: 'number' },
        maxSalary: { type: 'number' },
        // Тасралтгүй байдал
        isContinuous: { type: 'boolean' },
        gapMonths: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['year','month'],
                properties: { year: { type: 'string' }, month: { type: 'string' } }
            }
        },
        // Ажил олгогч
        employers: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['name','registrationNumber','fromYear','fromMonth','toYear','toMonth','monthCount'],
                properties: {
                    name: { type: 'string' }, registrationNumber: { type: 'string' },
                    fromYear: { type: 'string' }, fromMonth: { type: 'string' },
                    toYear: { type: 'string' }, toMonth: { type: 'string' },
                    monthCount: { type: 'number' }
                }
            }
        },
        employerChangeCount: { type: 'number' },
        // Цалингийн өөрчлөлт
        salaryTrend: { type: 'string' }, // 'өсөх', 'буурах', 'тогтвортой', 'хэлбэлзэлтэй'
        salaryChanges: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['year','month','oldSalary','newSalary','changePercent','direction'],
                properties: {
                    year: { type: 'string' }, month: { type: 'string' },
                    oldSalary: { type: 'number' }, newSalary: { type: 'number' },
                    changePercent: { type: 'number' },
                    direction: { type: 'string' } // 'өссөн' | 'буурсан'
                }
            }
        },
        // Сарын дэлгэрэнгүй
        insuranceItems: {
            type: 'array',
            items: {
                type: 'object', additionalProperties: false,
                required: ['year','month','employerName','salary','insuranceAmount','isPaid'],
                properties: {
                    year: { type: 'string' }, month: { type: 'string' },
                    employerName: { type: 'string' },
                    salary: { type: 'number' }, insuranceAmount: { type: 'number' },
                    isPaid: { type: 'boolean' }
                }
            }
        },
        summary: { type: 'string' },
        analysis: { type: 'string' },
        analysisReport: {
            type: 'object',
            additionalProperties: false,
            required: ['summary', 'incomeAnalysis', 'cashFlowAnalysis', 'keyMetrics', 'riskFlags', 'creditRecommendation'],
            properties: {
                summary: { type: 'string' },
                incomeAnalysis: { type: 'string' },
                cashFlowAnalysis: { type: 'string' },
                keyMetrics: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['metric', 'value', 'assessment'],
                        properties: {
                            metric: { type: 'string' },
                            value: { type: 'string' },
                            assessment: { type: 'string', enum: ['good', 'neutral', 'warning', 'risk'] }
                        }
                    }
                },
                riskFlags: { type: 'array', items: { type: 'string' } },
                creditRecommendation: { type: 'string' }
            }
        }
    }
};

app.post('/api/loans/analyze-social-insurance', authenticateUser, (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'OPENAI_API_KEY тохируулагдаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const instructions = [
                'You are a Mongolian credit analyst. Read the Нийгмийн даатгалын шимтгэлийн лавлагаа (social insurance contribution certificate) carefully.',
                'Extract ALL rows sorted chronologically (oldest first).',
                '',
                'EMPLOYERS: Group consecutive rows by employer registration number. For each employer record fromYear/fromMonth, toYear/toMonth, monthCount. employerChangeCount = number of distinct employer registration numbers minus 1.',
                '',
                'CONTINUITY: isContinuous = true if there is NO month gap between the first and last row. To check: sort all rows by year+month, verify every consecutive month is present. gapMonths = list of year+month pairs that are missing. If no gaps, gapMonths = [].',
                '',
                'SALARY CHANGES: salaryChanges = list of months where salary changed significantly (>5%) compared to previous month. Include direction (өссөн/буурсан) and changePercent (absolute %). salaryTrend: compare first 3 months avg vs last 3 months avg — "өсөх" if last > first by >10%, "буурах" if last < first by >10%, "тогтвортой" if within 10%, "хэлбэлзэлтэй" if large swings.',
                '',
                'averageSalary = average of ALL monthly salaries. lastSalary = most recent month salary. minSalary/maxSalary across all months.',
                '',
                'summary: 1 sentence in Mongolian (e.g. "51 сарын тасралтгүй даатгал, нэг ажил олгогч, цалин өссөн хандлагатай").',
                'analysis: 3-5 sentence detailed Mongolian analysis covering: employer stability, continuity, salary growth trend, any risks or highlights for credit assessment.',
                '',
                'analysisReport: Generate a structured 6-section report in Mongolian:',
                '1. summary — 2-3 sentences: total months, employer count, salary range, overall assessment',
                '2. incomeAnalysis — Income analysis: salary stability, trend (rising/falling/stable), last salary vs average, reliability for credit (3-4 sentences)',
                '3. cashFlowAnalysis — Cash flow pattern: regularity of contributions, any gaps, whether income supports loan repayment (2-3 sentences)',
                '4. keyMetrics — Table with these metrics and appropriate assessment (good/neutral/warning/risk):',
                '   - Нийт даатгалын хугацаа (months), Дундаж цалин (₮), Сүүлийн цалин (₮), Хамгийн өндөр цалин (₮), Хамгийн бага цалин (₮), Цалингийн өсөлт хандлага, Ажил олгогч солисон тоо, Тасралтгүй байдал',
                '5. riskFlags — List each risk as a separate string (gaps, employer instability, salary drops, etc). Empty array if no risks.',
                '6. creditRecommendation — Credit recommendation: approve/conditional/reject with reason (2-3 sentences)',
                '',
                'Use 0 for missing numbers, empty string for missing text, true/false for booleans.',
            ].join(' ');
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini',
                temperature: 0,
                instructions,
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Analyze this social insurance certificate completely.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'social_insurance', schema: socialInsuranceSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) {
            console.error('Social insurance AI error:', e.message);
            res.status(e.statusCode || 500).json({ message: e.message || 'Social insurance analysis failed' });
        }
    });
});

// ============================================================
// RAG: Зээлийн судалгааны текст + embedding үүсгэх
// ============================================================
const generateLoanText = (borrower = {}, outputs = {}) => {
    const ie = outputs.incomeExpense || {};
    const cs = outputs.creditScore || {};
    const fs = outputs.frontSheet || {};
    const parts = [
        `Төрөл:${borrower.borrowerType || fs.borrowerType || '-'}`,
        `Зориулалт:${borrower.purpose || fs.purpose || '-'}`,
        `Дүн:${borrower.requestedAmount || fs.requestedAmount || 0}`,
        `Хугацаа:${borrower.termMonths || fs.termMonths || 0}сар`,
        `Хүү:${borrower.monthlyRate || fs.monthlyRate || 0}%`,
        `Орлого:${ie.income || 0}`,
        `Зарлага:${ie.cost || 0}`,
        `DTI:${(ie.dti || 0).toFixed(1)}%`,
        `ЧМУ:${ie.freeCashFlow || 0}`,
        `Скор:${cs.calculatedScore || 0}`,
        `Grade:${cs.grade || '-'}`,
        `Ангилал:${borrower.classification || '-'}`,
        `Шийдвэр:${borrower.analystDecision || '-'}`,
        `Барьцаа:${(outputs.collateral?.items || []).length}ш`,
        `LTV:${outputs.collateral?.ltvRatio != null ? outputs.collateral.ltvRatio.toFixed(1) + '%' : '-'}`,
        `БатланДаагч:${(outputs.guarantorSummary?.items || []).length}ш`,
        `БусадЗээл:${(borrower.otherLoans || []).length}ш`,
        `БусадЗээлҮлдэгдэл:${ie.otherLoanBalance || 0}`,
    ];
    return parts.join(' ');
};

const generateEmbedding = async (text) => {
    if (!openai) return null;
    try {
        const res = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        return res.data?.[0]?.embedding || null;
    } catch (e) {
        console.error('Embedding error:', e.message);
        return null;
    }
};

app.post('/api/loan-research', authenticateUser, (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const borrower = parseJsonField(req.body.borrower);
            const outputs = parseJsonField(req.body.outputs);
            if (!borrower.borrowerName || !borrower.regNo || !borrower.requestedAmount || !borrower.termMonths) {
                return res.status(400).json({ message: 'Required fields are missing' });
            }

            const files = req.files || [];
            const bankStatements = files
                .filter(file => file.fieldname === 'bankStatements')
                .slice(0, 5)
                .map(normalizeUploadedFile);
            const socialInsurance = normalizeUploadedFile(files.find(file => file.fieldname === 'socialInsurance'));
            const creditReference = normalizeUploadedFile(files.find(file => file.fieldname === 'creditReference'));

            const research = await new LoanResearch({
                borrower,
                outputs,
                files: { bankStatements, socialInsurance, creditReference },
                createdBy: {
                    userId: String(req.user?._id || ''),
                    name: req.user?.name || '',
                    role: req.user?.role || ''
                }
            }).save();

            await createLog(req.user, 'loan_research_created', `${borrower.borrowerName} - ${borrower.requestedAmount}`);
            res.status(201).json(research);

            // Background: embedding үүсгэж хадгалах (response-г хойшлуулахгүй)
            const loanText = generateLoanText(borrower, outputs);
            generateEmbedding(loanText).then(embedding => {
                if (embedding) {
                    LoanResearch.findByIdAndUpdate(research._id, { embedding }).catch(() => {});
                }
            });
        } catch (e) {
            res.status(500).json({ message: 'Error' });
        }
    });
});

app.post('/api/trusts', async (req, res) => { try { await new TrustRequest(req.body).save(); res.status(201).json({ message: 'Success' }); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/trusts', authenticateUser, async (req, res) => { try { res.json(await TrustRequest.find().sort({ createdAt: -1 })); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/users', authenticateUser, requireAdmin, async (req, res) => { try { res.json(await User.find().select('-password')); } catch (e) { res.status(500).send("Error"); } });
// Бүх ажилтанд хариуцагч сонгох жагсаалт (нэр + ID л харагдана)
app.get('/api/users/list', authenticateUser, async (req, res) => { try { res.json(await User.find({ isActive: { $ne: false } }).select('_id name role')); } catch (e) { res.status(500).send("Error"); } });

app.post('/api/users', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, roles } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Бүх талбарыг бөглөнө үү' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'И-мэйл бүртгэлтэй байна' });
    const hashed = await bcrypt.hash(password, 10);
    const assignedRoles = Array.isArray(roles) && roles.length ? roles.slice(0, 2) : [];
    const u = await new User({ name, email, password: hashed, role: role || 'employee', roles: assignedRoles }).save();
    res.json({ message: 'Амжилттай', user: { _id: u._id, name: u.name, email: u.email, role: u.role, roles: u.roles } });
  } catch (e) { res.status(500).json({ message: 'Алдаа гарлаа' }); }
});

app.put('/api/users/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { roles } = req.body;
    const update = {};
    if (Array.isArray(roles)) update.roles = roles.slice(0, 2);
    const u = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
    if (!u) return res.status(404).json({ message: 'Хэрэглэгч олдсонгүй' });
    res.json(u);
  } catch (e) { res.status(500).json({ message: 'Алдаа гарлаа' }); }
});

app.delete('/api/users/:id', authenticateUser, requireAdmin, async (req, res) => { try { await User.findByIdAndDelete(req.params.id); res.json({ message: 'Ð£ÑÑ‚Ð³Ð°Ð³Ð´Ð»Ð°Ð°' }); } catch (e) { res.status(500).send("Error"); } });

app.put('/api/trusts/:id', authenticateUser, async (req, res) => { try { const t = await TrustRequest.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(t); } catch (e) { res.status(500).send("Error"); } });

app.get('/api/logs', authenticateUser, requireAdmin, async (req, res) => { try { res.json(await Log.find().sort({ date: -1 }).limit(100)); } catch (e) { res.status(500).send("Error"); } });

// âœ… ÐžÐ”ÐžÐž Ð­ÐÐ” Ð‘Ð›ÐžÐ“Ð˜Ð™Ð API Ð‘ÐÐ™Ð Ð›ÐÐ¥ ÐÐ¡Ð¢ÐžÐ™
app.get('/api/blogs', async (req, res) => {
    try {
        if (req.query.isCustom === 'true') {
            return res.json(await Blog.find({ isCustom: true }).sort({ pubDate: -1 }));
        }
        const limit = parseInt(req.query.limit);
        let blogs = await Blog.find().sort({ pubDate: -1 });

        if (limit === 4) {
            // ðŸ’¡ ÐÒ¯Ò¯Ñ€ Ñ…ÑƒÑƒÐ´Ð°Ñ: Ð­Ñ… ÑÑƒÑ€Ð²Ð°Ð»Ð¶ Ð±Ò¯Ñ€ÑÑÑ Ñ…Ð°Ð¼Ð³Ð¸Ð¹Ð½ ÑÒ¯Ò¯Ð»Ð¸Ð¹Ð½ 1 Ð¼ÑÐ´ÑÑÐ³ Ð°Ð²Ð½Ð°
            const sources = ['Ikon', 'Golomt', 'TavanBogd', 'TDB Securities'];
            let featuredBlogs = [];
            
            sources.forEach(source => {
                const latestFromSource = blogs.find(b => b.source === source);
                if (latestFromSource) featuredBlogs.push(latestFromSource);
            });
            
            return res.json(featuredBlogs.slice(0, 4));
        }

        // ðŸ’¡ Ð‘Ò¯Ñ… Ð¼ÑÐ´ÑÑ: Ð–Ð°Ð³ÑÐ°Ð°Ð»Ñ‚Ñ‹Ð³ ÑÐ°Ð½Ð°Ð¼ÑÐ°Ñ€Ð³Ò¯Ð¹Ð³ÑÑÑ€ Ñ…Ð¾Ð»Ð¸Ð½Ð¾ (Shuffle)
        blogs = blogs.sort(() => Math.random() - 0.5);
        res.json(blogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/blogs', authenticateUser, requireAdmin, async (req, res) => {
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

app.put('/api/blogs/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const updated = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/blogs/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        await Blog.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ð£ÑÑ‚Ð³Ð°Ð³Ð´Ð»Ð°Ð°' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- 1. Ð¡ÐÐÐ¥Ò®Ò®Ð“Ð˜Ð™Ð Ò®Ð—Ò®Ò®Ð›Ð­Ð›Ð¢ API ---
// Ð‘Ò¯Ñ… Ñ‚Ð¾Ð¾Ð³ Ð±Ð°Ð°Ð·Ð°Ð°Ñ Ð°Ð²Ð°Ñ… (ÐÒ¯Ò¯Ñ€ Ñ…ÑƒÑƒÐ´ÑÐ°Ð½Ð´ Ñ…Ð°Ñ€ÑƒÑƒÐ»Ð°Ñ…)
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await Stat.find().sort({ order: 1 });
        res.json(stats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ð¢Ð¾Ð¾Ð³ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÑ… (ÐÐ´Ð¼Ð¸Ð½ Ð¿Ð°Ð½ÐµÐ»Ð°Ð°Ñ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ… Ò¯ÐµÐ´)
app.put('/api/stats/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        await Stat.findByIdAndUpdate(req.params.id, req.body);
        res.json({ message: "ÐÐ¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÐ³Ð´Ð»ÑÑ" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- 2. Ð–Ð£Ð ÐÐœ Ð‘ÐžÐ›ÐžÐ Ð¢ÐÐ™Ð›ÐÐ API ---
app.get('/api/policies', async (req, res) => {
    try {
        const filter = req.query.category ? { category: req.query.category } : {};
        const policies = await Policy.find(filter).sort({ uploadDate: -1 });
        res.json(policies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Ð¤Ð°Ð¹Ð» Ñ…ÑƒÑƒÐ»Ð°Ñ… Ñ‚Ð¾Ñ…Ð¸Ñ€Ð³Ð¾Ð¾ â€” Cloudinary Ñ€ÑƒÑƒ PDF upload
const policyCloudStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'scm_policies',
        resource_type: 'raw',
        allowed_formats: ['pdf'],
    }
});
const uploadPolicy = multer({ storage: policyCloudStorage });

// Ð¨Ð¸Ð½Ñ Ñ„Ð°Ð¹Ð» (PDF) Cloudinary Ñ€ÑƒÑƒ Ñ…ÑƒÑƒÐ»Ð¶, URL-Ð³ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ñ…
app.post('/api/policies', authenticateUser, requireAdmin, uploadPolicy.single('file'), async (req, res) => {
    try {
        const newPolicy = new Policy({
            title: req.body.title,
            category: req.body.category,
            fileName: req.file.originalname,
            fileUrl: req.file.path,   // Cloudinary URL
        });
        await newPolicy.save();
        res.json(newPolicy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ðŸ—‘ Ð¤Ð°Ð¹Ð» ÑƒÑÑ‚Ð³Ð°Ñ… API
app.delete('/api/policies/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) return res.status(404).json({ message: "Ð¤Ð°Ð¹Ð» Ð¾Ð»Ð´ÑÐ¾Ð½Ð³Ò¯Ð¹" });
        // Cloudinary-Ð°Ð°Ñ ÑƒÑÑ‚Ð³Ð°Ñ… (fileUrl Ð±Ð°Ð¹Ð²Ð°Ð»)
        if (policy.fileUrl) {
            try {
                const parts = policy.fileUrl.split('/');
                const publicId = 'scm_policies/' + parts[parts.length - 1].split('.')[0];
                await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
            } catch (e) { /* Cloudinary Ð°Ð»Ð´Ð°Ð° Ð½ÑŒ DB ÑƒÑÑ‚Ð³Ð°Ñ…Ñ‹Ð³ Ð·Ð¾Ð³ÑÐ¾Ð¾Ñ…Ð³Ò¯Ð¹ */ }
        }
        await Policy.findByIdAndDelete(req.params.id);
        res.json({ message: "Ð¤Ð°Ð¹Ð» Ð°Ð¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ ÑƒÑÑ‚Ð»Ð°Ð°" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// ============================================================
// ðŸ—„ï¸ CMS â€” SITE CONFIG (Ð¢ÐµÐºÑÑ‚, Ñ…Ò¯Ò¯, Ñ…Ð¾Ð»Ð±Ð¾Ð¾ Ð±Ð°Ñ€Ð¸Ñ…)
// ============================================================

// ÐÐ½Ñ…Ð½Ñ‹ Ó©Ð³Ó©Ð³Ð´Ó©Ð» Ð¾Ñ€ÑƒÑƒÐ»Ð°Ñ… (Ð½ÑÐ³ ÑƒÐ´Ð°Ð° Ð´ÑƒÑƒÐ´Ð½Ð°)
const seedSiteConfig = async () => {
    const defaults = [
        { key: "contact_phone", value: "75991919, 75999191", label: "Утас", group: "contact" },
        { key: "contact_email", value: "info@scm.mn", label: "Имэйл", group: "contact" },
        { key: "contact_address", value: "Хан-Уул дүүрэг, 20-р хороо, Чингисийн өргөн чөлөө, Мишеел сити төв, М3 цамхаг 1208 тоот", label: "Хаяг", group: "contact" },
        { key: "contact_image", value: "", label: "Холбоо барих хэсгийн зураг", group: "contact" },
        { key: "hero_line1", value: "Бизнесийн", label: "Hero гарчиг (1-р мөр)", group: "hero" },
        { key: "hero_highlight", value: "Өсөлтийг", label: "Hero онцолсон үг", group: "hero" },
        { key: "hero_line2", value: "Дэмжинэ", label: "Hero гарчиг (2-р мөр)", group: "hero" },
        { key: "hero_description", value: "Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож, таны санхүүгийн найдвартай түнш байх болно.", label: "Hero тайлбар текст", group: "hero" },
        { key: "hero_button", value: "Бүтээгдэхүүн үзэх", label: "Hero товчны текст", group: "hero" },
        { key: "about_title", value: "Бид хэн бэ?", label: "Бид хэн бэ гарчиг", group: "about" },
        { key: "about_intro", value: "Солонго Капитал ББСБ ХХК нь харилцагч төвтэй үйлчилгээг эрхэмлэн, санхүүгийн салбарт шинэ жишиг тогтоохоор зорин ажиллаж байна.", label: "Танилцуулгын оршил", group: "about" },
        { key: "about_mission_title", value: "Эрхэм зорилго", label: "Эрхэм зорилго гарчиг", group: "about" },
        { key: "about_mission_text", value: "Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан шийдлээр хангах.", label: "Эрхэм зорилго текст", group: "about" },
        { key: "about_vision_title", value: "Алсын хараа", label: "Алсын хараа гарчиг", group: "about" },
        { key: "about_vision_text", value: "Итгэлд суурилсан, дижитал, хэрэглэгч төвтэй байгууллага болох.", label: "Алсын харааны текст", group: "about" },
        { key: "about_values_title", value: "Үнэ цэнэ", label: "Үнэ цэнэ гарчиг", group: "about" },
        { key: "about_values_text", value: "Шударга ёс, Ил тод байдал, Хамтын ажиллагаа, Инновац.", label: "Үнэ цэнэ текст", group: "about" },
        { key: "financial_section_label", value: "Бидний амжилт", label: "Санхүүгийн хэсгийн дэд гарчиг", group: "financials" },
        { key: "financial_section_title", value: "Санхүүгийн үзүүлэлтүүд", label: "Санхүүгийн хэсгийн гарчиг", group: "financials" },
        { key: "financial_section_desc", value: "Бид богино хугацааны өндөр ашигт бус, урт хугацаанд тогтвортой, хүртээмжтэй санхүүгийн экосистемийг бүтээхийг зорьдог.", label: "Санхүүгийн хэсгийн тайлбар", group: "financials" },
        { key: "financial_date", value: "2026 оны 3 сарын 31-ний байдлаар", label: "Тайлангийн огноо", group: "financials" },
        { key: "loan_rate_min", value: 2.5, label: "Зээлийн хүү (доод, %)", group: "rates" },
        { key: "loan_rate_max", value: 3.5, label: "Зээлийн хүү (дээд, %)", group: "rates" },
        { key: "loan_rate_default", value: 3.2, label: "Зээлийн хүү (чатботын тооцоолол, %)", group: "rates" },
        { key: "loan_max_term", value: 96, label: "Зээлийн хамгийн дээд хугацаа (сар)", group: "rates" },
        { key: "trust_rate", value: 1.8, label: "Итгэлцлийн хүү (сарын, %)", group: "rates" },
        { key: "dti_individual", value: 55, label: "ӨОХ харьцаа — Иргэн (%)", group: "rates" },
        { key: "dti_org", value: 20, label: "ӨОХ харьцаа — Байгууллага (%)", group: "rates" },
        { key: "ceo_name", value: "Б.Золбоо", label: "Захирлын нэр", group: "ceo" },
        { key: "ceo_title", value: "Гүйцэтгэх захирал", label: "Захирлын албан тушаал", group: "ceo" },
        { key: "ceo_image", value: "/board/zolboo.jpg", label: "Захирлын зургийн зам", group: "ceo" },
        { key: "ceo_headline", value: "Итгэлцэл дээр Ирээдүйг бүтээнэ", label: "Мэндчилгээний гарчиг", group: "ceo" },
        { key: "ceo_message", value: "Эрхэм харилцагч, хүндэт түншүүдэд та бүхний амар амгаланг айлтгая.", label: "Мэндчилгээний текст", group: "ceo" },
        { key: "ceo_signature", value: "/signature.png", label: "Гарын үсгийн зураг", group: "ceo" },
        { key: "theme_mode", value: "dark", label: "Горим (dark/light)", group: "theme" },
        { key: "theme_type", value: "default", label: "Дэвсгэрийн төрөл (default/color/image)", group: "theme" },
        { key: "theme_color", value: "#003B5C", label: "Дэвсгэрийн өнгө", group: "theme" },
        { key: "theme_image", value: "", label: "Дэвсгэрийн зураг", group: "theme" },
        { key: "theme_image_home", value: "", label: "Нүүр хэсгийн зураг", group: "theme" },
        { key: "theme_image_about", value: "", label: "Бид хэн бэ хэсгийн зураг", group: "theme" },
        { key: "theme_image_financials", value: "", label: "Санхүүгийн хэсгийн зураг", group: "theme" },
        { key: "theme_image_governance", value: "", label: "Засаглалын хэсгийн зураг", group: "theme" },
        { key: "theme_image_products", value: "", label: "Бүтээгдэхүүний хэсгийн зураг", group: "theme" },
        { key: "theme_image_blog", value: "", label: "Блогийн хэсгийн зураг", group: "theme" },
        { key: "theme_image_contact", value: "", label: "Холбоо барих хэсгийн зураг", group: "theme" },
        { key: "shareholder_name", value: "Б.Гөлгөөн", label: "Хувьцаа эзэмшигчийн нэр", group: "shareholder" },
        { key: "shareholder_percent", value: "100", label: "Эзэмшлийн хувь (%)", group: "shareholder" },
        { key: "shareholder_description", value: "Солонго Капитал ББСБ ХХК нь Монгол Улсын иргэний 100% өмчлөлд байдаг, дотоодын хөрөнгө оруулалттай компани юм.", label: "Тайлбар", group: "shareholder" },
    ];
    await Promise.all(defaults.map(d =>
        SiteConfig.findOneAndUpdate({ key: d.key }, { $setOnInsert: { value: d.value, label: d.label, group: d.group } }, { upsert: true })
    ));
    console.log('SiteConfig seed done.');
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
            { name: 'Б.Гөлгөөн', role: 'ТУЗ-ын дарга', experience: 'Уул уурхай, олборлолтын салбарт 20 гаран жилийн ажлын туршлагатай.', imagePath: '/board/dulguun.jpg', memberType: 'board', order: 1 },
            { name: 'Б.Золбоо', role: 'ТУЗ-ын гишүүн, Гүйцэтгэх захирал', experience: 'Банк санхүүгийн салбарт 18 жилийн ажлын туршлагатай.', imagePath: '/board/zolboo.jpg', memberType: 'board', order: 2 },
            { name: 'Ц.Отгонбилэг', role: 'ТУЗ-ын гишүүн, Ерөнхий захирал', experience: 'Банк санхүүгийн салбарт 23 жилийн ажлын туршлагатай.', imagePath: '/board/otgonbileg.jpg', memberType: 'board', order: 3 },
            { name: 'Б.Ганзориг', role: 'ТУЗ-ын хамааралгүй гишүүн', experience: 'Банк санхүү, маркетинг, медиа салбарт 22 жилийн туршлагатай.', imagePath: '/board/ganzorig.jpg', memberType: 'board', order: 4 },
            { name: 'Д.Энхтүвшин', role: 'ТУЗ-ын нарийн бичгийн дарга', experience: 'Банк санхүү, эм хангалт нийлүүлэлтийн салбарт 18 жилийн туршлагатай.', imagePath: '/board/enkhtuvshin.jpg', memberType: 'board', order: 5 },
        ]);
    }
    console.log('TeamMember seed done.');
};

const seedProductContent = async () => {
    const defaults = [
        {
            productKey: 'biz_loan', order: 1, title: 'Бизнесийн зээл',
            shortDesc: 'Бизнесийн өсөлтийг хурдасгах стратегийн санхүүжилт.',
            description: 'Бизнесийн үйл ажиллагаагаа өргөжүүлэх, эргэлтийн хөрөнгө нэмэгдүүлэх, шинэ тоног төхөөрөмж болон үйлдвэрлэлийн хүчин чадлаа сайжруулахад зориулагдсан зээл. Танай бизнесийн онцлог, мөнгөн урсгалд нийцсэн бүтэцтэйгээр санхүүжилтийг шийдэнэ.',
            chatbotText: '🏢 Бизнесийн зээл:\n500 сая төгрөг хүртэл, ЖДҮ-ийн санхүүжилт.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-60 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн хэмжээ: 500 сая хүртэл', 'Хугацаа: 1-60 сар хүртэл', 'Хүү: 2.5% - 3.5%'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажиллаасан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] },
            organization: { conditions: ['Зээлийн хэмжээ: 1.5 тэрбум хүртэл', 'Хугацаа: 1-60 сар хүртэл', 'Хүү: 2.5% - 3.5%'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }
        },
        {
            productKey: 'car_loan', order: 2, title: 'Автомашины зээл',
            shortDesc: 'Шуурхай шийдвэрлэлт.',
            description: 'Автомашин худалдан авах болон автомашин барьцаалсан зээлийн үйлчилгээ.',
            chatbotText: '🚗 Автомашины зээл:\nШинэ хуучин автомашин авах, мөн унаж явсан машинаа барьцаалан зээл авах боломжтой.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-60 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            purchase: { label: 'Автомашины зээл', individual: { conditions: ['Хугацаа 1-ээс 60 сар хүртэл', 'Зээлийн хүү 2.5%-аас 3.5% хүртэл', 'Урьдчилгаа төлбөр 45%-аас багагүй', 'Зээлийн хэмжээ барьцаа хөрөнгийн зах зээлийн үнэлгээний 60% хүртэл', 'Өр орлогын харьцаа 55% ихгүй'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажиллаасан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }, organization: { conditions: ['Зээл: Үнэлгээний 80%', 'Хугацаа: 1-96 сар хүртэл', 'Зээлийн хүү: 2.5%-3.5%'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] } },
            collateral: { label: 'Автомашин барьцаалсан зээл', individual: { conditions: ['Зээл: Үнэлгээний 50%', 'Зээлийн хүү: 2.8% - 3.5%', 'Хугацаа: 1-24 сар хүртэл', 'Өр орлогын харьцаа 55% ихгүй'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажиллаасан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх', 'Автомашин нь өөрийнх нь нэр дээр'] }, organization: { conditions: ['Зээл: Үнэлгээний 50%', 'Зээлийн хүү: 2.8% - 3.5%', 'Хугацаа: 1-24 сар'], requirements: ['Монгол Улсад бизнес эрхлэхээр бүртгүүлсэн Монгол Улсын иргэн болон байгууллага байх', 'Эрхэлж буй бизнесийн чиглэлээр Монгол Улсын нутаг дэвсгэрт 1-ээс доошгүй жилийн хугацаанд тогтвортой үйл ажиллагаа явуулсан байх', 'Холбогдох байгууллагаас авсан үйл ажиллагаа явуулах тусгай зөвшөөрөлтэй, хуулийн шаардлага хангасан бичиг баримттай байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх', 'Автомашин нь тухайн байгууллагын нэр дээр байх'] } }
        },
        {
            productKey: 'cons_loan', order: 3, title: 'Хэрэглэлийн зээл',
            shortDesc: 'Иргэдийн хувийн хэрэгцээнд зориулсан зээл.',
            description: 'Иргэдийн хувийн хэрэгцээнд зориулсан, шуурхай шийдвэртэй, уян хатан нөхцөлтэй зээл.',
            chatbotText: '💰 Хэрэглэлийн зээл:\nБүх төрлийн хэрэглэл, лизингийн зээл.\n- Хүү: сарын 2.5-3.5%\n- Хугацаа: 1-36 сар.',
            bgImageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['300 сая хүртэл', 'Зээлийн хүү: 2.5% - 3.5%', 'Хугацаа: 1-36 сар хүртэлх', 'Өр орлогын харьцаа 55% ихгүй байх'], requirements: ['18 нас хүрсэн, Монгол Улсын иргэн байх', 'Ажил олгогч байгууллагадаа 6 сараас доошгүй хугацаанд ажиллаасан, НДШ төлсөн байх эсвэл хувийн бизнесийн орлоготой, 6 сараас доошгүй хугацаанд үйл ажиллагаа явуулсан байх', 'Чанаргүй зээлийн түүхгүй байх', 'Зээлээ эргэн төлөх санхүүгийн чадамжтай байх', 'Барьцаа хөрөнгө нь шаардлага хангасан байх'] }
        },
        {
            productKey: 'trust', order: 4, title: 'Итгэлцэл',
            shortDesc: 'Өндөр өгөөж.',
            description: 'Таны мөнгөн хөрөнгийг найдвартай өсгөх, өндөр өгөөжтэй хөрөнгө оруулалтын үйлчилгээ.',
            chatbotText: '💎 Итгэлцэл:\nТаны хөрөнгийг ашигтайгаар өсгөх үйлчилгээ.\n- Хүү: сарын 1.8%\n- Хугацаа: 6 сараас дээш.',
            bgImageUrl: 'https://images.unsplash.com/photo-1565514020176-db8217350024?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'
        },
        {
            productKey: 'credit_card', order: 5, title: 'Кредит карт',
            shortDesc: 'Санхүүгийн эрх чөлөө.',
            description: 'ApplePay болон GooglePay-д холбогдсон Олон улсын эрхтэй зээлийн Платинум МастерКарт.',
            chatbotText: '💳 Кредит карт:\nPlatinum Master карт. 100 сая хүртэлх лимит, 55 хоног хүүгүй.',
            bgImageUrl: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн эрх: 300 сая хүртэл'], requirements: ['Тогтмол орлоготой байх ба ББСБ-наас шаарддаг бусад шаардлагыг хангасан байх.'] },
            organization: { conditions: ['Зээлийн эрх: 500 сая хүртэл'], requirements: ['Бизнесийн тогтмол орлоготой байх ба байгууллагын батлан даалттайгаар хэдэн ч ажилтан, эрх бүхий этгээдэд ашиглах боломжтой'] }
        },
        {
            productKey: 're_loan', order: 6, title: 'Үл хөдлөх барьцаалсан зээл',
            shortDesc: 'Томоохон хэмжээний санхүүжилт.',
            description: 'Таны гэнэтийн санхүүгийн хэрэгцээг түргэн шуурхай шийдэх зорилгоор таны өөрийн өмчлөлийн үл хөдлөх хөрөнгийг барьцаалан олгох зээл.',
            chatbotText: '🏠 Үл хөдлөх барьцаалсан зээл:\n1 тэрбум төгрөг хүртэл, зах зээлийн үнэлгээний 70% хүртэл.',
            bgImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            headerImageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80',
            individual: { conditions: ['Зээлийн хэмжээ: 1 тэрбум төгрөг хүртэлх', 'Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй', 'Зээлийн хүү: 2.5% - 3.5%', 'Зээлийн хугацаа: 1-24 сар хүртэлх'], requirements: ['Үл хөдлөх хөрөнгийн гэрчилгээ', 'Бизнесийн болон цалингийн тогтмол орлоготой байх', 'Кредит скорингийн оноо хангалттай байх'] },
            organization: { conditions: ['Зээлийн хэмжээ: 1.5 тэрбум төгрөг хүртэлх', 'Барьцаа хөрөнгийн үнэлгээ: Зээлийн дүнгийн 60% ихгүй', 'Зээлийн хүү: 2.5% - 3.5%', 'Зээлийн хугацаа: 1-24 сар хүртэлх'], requirements: ['Байгууллагын өмчлөлийн үл хөдлөх хөрөнгө байх', 'Бизнесийн тогтмол орлоготой байх', 'Кредит скорингийн хангалттай оноотой байх'] }
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
            { $set: d },
            { upsert: true }
        )
    ));
    console.log('ProductContent seed done.');
};

const seedFormConfig = async () => {
    const loanFields = [
        { fieldKey: 'lastname', label: 'Овог', placeholder: 'Овгоо оруулна уу', isRequired: true, isEnabled: true, order: 1 },
        { fieldKey: 'firstname', label: 'Нэр', placeholder: 'Нэрээ оруулна уу', isRequired: true, isEnabled: true, order: 2 },
        { fieldKey: 'regNo', label: 'Регистрийн дугаар', placeholder: 'АА00000000', isRequired: true, isEnabled: true, order: 3 },
        { fieldKey: 'phone', label: 'Утасны дугаар', placeholder: '8 оронтой дугаар', isRequired: true, isEnabled: true, order: 4 },
        { fieldKey: 'email', label: 'Имэйл', placeholder: 'email@example.com', isRequired: false, isEnabled: true, order: 5 },
        { fieldKey: 'address', label: 'Хаяг', placeholder: 'Дүүрэг, хороо, гудамж', isRequired: true, isEnabled: true, order: 6 },
        { fieldKey: 'amount', label: 'Зээлийн дүн', placeholder: '10,000,000', isRequired: true, isEnabled: true, order: 7 },
        { fieldKey: 'term', label: 'Хугацаа (сар)', placeholder: '12', isRequired: true, isEnabled: true, order: 8 },
    ];
    const trustFields = [
        { fieldKey: 'lastname', label: 'Овог', placeholder: 'Овгоо оруулна уу', isRequired: true, isEnabled: true, order: 1 },
        { fieldKey: 'firstname', label: 'Нэр', placeholder: 'Нэрээ оруулна уу', isRequired: true, isEnabled: true, order: 2 },
        { fieldKey: 'phone', label: 'Утасны дугаар', placeholder: '8 оронтой дугаар', isRequired: true, isEnabled: true, order: 3 },
        { fieldKey: 'email', label: 'Имэйл', placeholder: 'email@example.com', isRequired: false, isEnabled: true, order: 4 },
        { fieldKey: 'amount', label: 'Байршуулах дүн', placeholder: '10,000,000', isRequired: true, isEnabled: true, order: 5 },
    ];
    await FormConfig.findOneAndUpdate({ formId: 'loan' }, { $set: { formId: 'loan', fields: loanFields } }, { upsert: true });
    await FormConfig.findOneAndUpdate({ formId: 'trust' }, { $set: { formId: 'trust', fields: trustFields } }, { upsert: true });
    console.log('FormConfig seed done.');
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
    console.log('Stat seed done.');
};

const seedAdmin = async () => {
    const count = await User.countDocuments();
    if (count === 0) {
        const hashed = await bcrypt.hash('Admin@2024!', 10);
        await User.create({ name: 'Admin', email: 'admin@scm.mn', password: hashed, role: 'admin', isActive: true });
        console.log('Default admin created: admin@scm.mn / Admin@2024!');
    }
};

mongoose.connect(MONGO_URI).then(async () => {
    console.log('MongoDB connected.');
    await seedAdmin();
    await seedSiteConfig();
    // One-time cleanup: delete all garbled/duplicate team member records
    // then reseed fresh. Flag stored in SiteConfig to run only once.
    const teamCleaned = await SiteConfig.findOne({ key: '_team_reset_v1' });
    if (!teamCleaned) {
        await TeamMember.deleteMany({});
        console.log('Team members reset — reseeding clean.');
        await SiteConfig.create({ key: '_team_reset_v1', value: 'done', label: 'internal migration', group: 'internal' });
    }
    await seedTeamMembers();
    await seedProductContent();
    await seedFormConfig();
    await seedStats();
    // Force-update financial_date to current period value
    await SiteConfig.findOneAndUpdate(
        { key: 'financial_date' },
        { $set: { value: '2026 оны 3 сарын 31-ний байдлаар' } }
    );
    // Scrape news in the background after MongoDB connects.
    scrapeNews().catch(e => console.error('scrapeNews error:', e));
}).catch(e => console.error(e));

// ============================================================
// CMS API: SiteConfig
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

app.put('/api/config/:key', authenticateUser, requireAdmin, async (req, res) => {
    try {
        await SiteConfig.findOneAndUpdate(
            { key: req.params.key },
            { value: req.body.value, updatedAt: new Date() }
        );
        res.json({ message: 'ÐÐ¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÐ³Ð´Ð»ÑÑ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

const KEY_GROUP_MAP = {
    theme_mode: 'theme', theme_type: 'theme', theme_color: 'theme', theme_image: 'theme',
    theme_image_home: 'theme', theme_image_about: 'theme', theme_image_financials: 'theme',
    theme_image_governance: 'theme', theme_image_products: 'theme', theme_image_blog: 'theme',
    theme_image_contact: 'theme',
    contact_image: 'contact',
};

app.post('/api/config/bulk', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const updates = req.body;
        await Promise.all(Object.entries(updates).map(([key, value]) => {
            const group = KEY_GROUP_MAP[key];
            const update = { value, updatedAt: new Date() };
            if (group) update.group = group;
            return SiteConfig.findOneAndUpdate({ key }, update, { upsert: true });
        }));
        chatbotCache = null; // refresh cache on next chatbot request
        res.json({ message: 'ÐÐ¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð³Ð´Ð»Ð°Ð°' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// CMS API: ProductContent
// ============================================================

// Image upload endpoint
app.post('/api/upload', authenticateUser, requireAdmin, (req, res) => {
    upload(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Ð¤Ð°Ð¹Ð» Ð±Ð°Ð¹Ñ…Ð³Ò¯Ð¹' });
        res.json({ url: req.files[0].path });
    });
});

app.get('/api/products/content', async (req, res) => {
    try {
        res.json(await ProductContent.find().sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/products/content', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const product = new ProductContent(req.body);
        await product.save();
        chatbotCache = null;
        res.json(product);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/products/content/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const result = await ProductContent.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ message: 'Ð‘Ò¯Ñ‚ÑÑÐ³Ð´ÑÑ…Ò¯Ò¯Ð½ Ð¾Ð»Ð´ÑÐ¾Ð½Ð³Ò¯Ð¹' });
        chatbotCache = null;
        res.json({ message: 'Ð£ÑÑ‚Ð³Ð°Ð³Ð´Ð»Ð°Ð°' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/products/content/:key', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const { _id, __v, ...updateData } = req.body;
        await ProductContent.findOneAndUpdate(
            { productKey: req.params.key },
            { $set: { ...updateData, updatedAt: new Date() } },
            { new: true }
        );
        chatbotCache = null;
        res.json({ message: 'ÐÐ¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ ÑˆÐ¸Ð½ÑÑ‡Ð»ÑÐ³Ð´Ð»ÑÑ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// CMS API: TeamMember
// ============================================================

app.get('/api/team', async (req, res) => {
    try {
        res.json(await TeamMember.find({ isActive: true }).sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/team/all', authenticateUser, requireAdmin, async (req, res) => {
    try {
        res.json(await TeamMember.find().sort({ order: 1 }));
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/team', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const member = new TeamMember(req.body);
        await member.save();
        res.status(201).json(member);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/team/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const updated = await TeamMember.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        res.json(updated);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/team/:id', authenticateUser, requireAdmin, async (req, res) => {
    try {
        await TeamMember.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ð£ÑÑ‚Ð³Ð°Ð³Ð´Ð»Ð°Ð°' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ============================================================
// CMS API: FormConfig
// ============================================================

app.get('/api/form-config/:formId', async (req, res) => {
    try {
        const config = await FormConfig.findOne({ formId: req.params.formId });
        res.json(config);
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/form-config/:formId', authenticateUser, requireAdmin, async (req, res) => {
    try {
        await FormConfig.findOneAndUpdate(
            { formId: req.params.formId },
            { fields: req.body.fields, updatedAt: new Date() }
        );
        res.json({ message: 'ÐÐ¼Ð¶Ð¸Ð»Ñ‚Ñ‚Ð°Ð¹ Ñ…Ð°Ð´Ð³Ð°Ð»Ð°Ð³Ð´Ð»Ð°Ð°' });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

app.use('/uploads', express.static(localUploadsDir));

const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// ─────────────────────────────────────────────
// PERMISSIONS MATRIX CONFIG
// ─────────────────────────────────────────────
app.get('/api/config/permissions', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const doc = await SiteConfig.findOne({ key: 'permissions_matrix' });
    res.json(doc ? JSON.parse(doc.value) : {});
  } catch (e) { res.status(500).json({}); }
});

app.put('/api/config/permissions', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await SiteConfig.findOneAndUpdate(
      { key: 'permissions_matrix' },
      { key: 'permissions_matrix', value: JSON.stringify(req.body) },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: 'Алдаа гарлаа' }); }
});

// ─────────────────────────────────────────────
// COMMITTEE SETTINGS CONFIG
// ─────────────────────────────────────────────
app.get('/api/config/committee', authenticateUser, async (req, res) => {
  try {
    const doc = await SiteConfig.findOne({ key: 'committee_settings' });
    res.json(doc ? JSON.parse(doc.value) : { requiredApprovers: 1, approvers: [] });
  } catch (e) { res.status(500).json({ requiredApprovers: 1, approvers: [] }); }
});

app.put('/api/config/committee', authenticateUser, requireAdmin, async (req, res) => {
  try {
    await SiteConfig.findOneAndUpdate(
      { key: 'committee_settings' },
      { key: 'committee_settings', value: JSON.stringify(req.body) },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: 'Алдаа гарлаа' }); }
});

// ============================================================
// PUBLIC AI ENDPOINTS (no auth — for website loan application)
// ============================================================
app.post('/api/public/analyze-id', (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'AI тохируулаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini', temperature: 0,
                instructions: 'Та бол Монголын KYC мэргэжилтэн. Иргэний үнэмлэх эсвэл оршин суугаа газрын лавлагаанаас мэдээллийг яг таг гарга. lastName = овог (ургийн овог/деэдсийн нэр), firstName = өөрийн нэр, fatherName = эцэг/эхийн нэр. РД-г яг унших ёстой формат (2 үсэг + 8 тоо) -аар гарга. Огноонуудыг YYYY-MM-DD форматаар гарга. Мэдээлэл олдохгүй бол хоосон мөр ашигла.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Иргэний үнэмлэх/лавлагаанаас бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'id_document', schema: idDocumentSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) { res.status(500).json({ message: e.message || 'ID унших алдаа' }); }
    });
});

app.post('/api/public/analyze-org', (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'AI тохируулаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini', temperature: 0,
                instructions: 'Та бол Монгол улсын бизнесийн бүртгэлийн мэргэжилтэн. Улсын бүртгэлийн гэрчилгээнээс бүх мэдээллийг яг таг гарга. Огноонуудыг YYYY-MM-DD. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Байгууллагын бүртгэлийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'org_document', schema: orgDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) { res.status(500).json({ message: e.message || 'Гэрчилгээ унших алдаа' }); }
    });
});

app.post('/api/public/analyze-vehicle', (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'AI тохируулаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini', temperature: 0,
                instructions: 'Та бол Монгол улсын тээврийн хэрэгслийн бүртгэлийн мэргэжилтэн. Техникийн паспорт/гэрчилгээнээс бүх мэдээллийг яг таг гарга. Огноонуудыг YYYY-MM-DD. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Техникийн паспорт/бүртгэлийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'vehicle_document', schema: vehicleDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) { res.status(500).json({ message: e.message || 'Техникийн паспорт унших алдаа' }); }
    });
});

app.post('/api/public/analyze-property', (req, res) => {
    analyzeUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });
        try {
            const files = req.files || [];
            if (!files.length) return res.status(400).json({ message: 'Файл олдсонгүй' });
            if (!openai) return res.status(503).json({ message: 'AI тохируулаагүй' });
            const { blocks, uploadedIds } = await filesToContentBlocks(files);
            const response = await openai.responses.create({
                model: process.env.OPENAI_STATEMENT_MODEL || 'gpt-4.1-mini', temperature: 0,
                instructions: 'Та бол Монгол улсын үл хөдлөх хөрөнгийн бүртгэлийн мэргэжилтэн. Эд хөрөнгийн эрхийн гэрчилгээ/кадастрын зургаас бүх мэдээллийг яг таг гарга. Талбайг м2-ааp, огноонуудыг YYYY-MM-DD форматаар. Мэдээлэл олдохгүй бол хоосон мөр.',
                input: [{ role: 'user', content: [{ type: 'input_text', text: 'Эд хөрөнгийн гэрчилгээнээс бүх мэдээллийг гарга.' }, ...blocks] }],
                text: { format: { type: 'json_schema', name: 'property_document', schema: propertyDocSchema, strict: true } }
            });
            const result = parseAiJson(response.output_text);
            Promise.allSettled(uploadedIds.map(id => openai.files.delete(id))).catch(() => {});
            res.json(result);
        } catch (e) { res.status(500).json({ message: e.message || 'Эд хөрөнгийн баримт унших алдаа' }); }
    });
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}.`));

