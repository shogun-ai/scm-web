import mongoose from 'mongoose';

const noticeSchema = new mongoose.Schema({
    id: { type: String, required: true, match: /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/ },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 2000 },
    isPublished: { type: Boolean, required: true },
    order: { type: Number, required: true, min: 0, max: 1000000, validate: Number.isSafeInteger },
}, { _id: false, strict: 'throw' });

const safetyNoticeConfigSchema = new mongoose.Schema({
    _id: { type: String, enum: ['homepage'] },
    notices: { type: [noticeSchema], default: [], validate: value => value.length <= 30 && new Set(value.map(notice => notice.id)).size === value.length },
    revision: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
}, { timestamps: true, strict: 'throw', collection: 'safety_notice_config' });

export default mongoose.models.SafetyNoticeConfig || mongoose.model('SafetyNoticeConfig', safetyNoticeConfigSchema);
