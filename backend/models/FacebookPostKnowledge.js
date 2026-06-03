import mongoose from 'mongoose';

const FacebookPostKnowledgeSchema = new mongoose.Schema({
    postId: { type: String, required: true, unique: true },
    adId: { type: String, default: '' },
    adName: { type: String, default: '' },
    adEffectiveStatus: { type: String, default: '' },
    creativeId: { type: String, default: '' },
    message: { type: String, default: '' },
    permalinkUrl: { type: String, default: '' },
    thumbnailUrl: { type: String, default: '' },
    createdTime: { type: Date },
    statusType: { type: String, default: '' },
    isPublished: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    replyKnowledge: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    syncedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const FacebookPostKnowledge = mongoose.model('FacebookPostKnowledge', FacebookPostKnowledgeSchema);
export default FacebookPostKnowledge;
