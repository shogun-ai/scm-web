import mongoose from 'mongoose';

const SiteConfigSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    label: { type: String, required: true },
    group: { type: String, required: true }, // 'contact' | 'hero' | 'about' | 'rates' | 'ceo' | 'chatbot'
    updatedAt: { type: Date, default: Date.now }
});

const SiteConfig = mongoose.model('SiteConfig', SiteConfigSchema);
export default SiteConfig;
