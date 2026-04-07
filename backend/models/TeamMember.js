import mongoose from 'mongoose';

const TeamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    imagePath: { type: String, default: '' },
    memberType: { type: String, default: 'management' }, // 'management' | 'board'
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    experience: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
});

const TeamMember = mongoose.model('TeamMember', TeamMemberSchema);
export default TeamMember;
