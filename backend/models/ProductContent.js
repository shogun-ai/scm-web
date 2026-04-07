import mongoose from 'mongoose';

const ConditionSchema = new mongoose.Schema({ text: String }, { _id: false });

const UserTypeSchema = new mongoose.Schema({
    conditions: [String],
    requirements: [String]
}, { _id: false });

const ProductContentSchema = new mongoose.Schema({
    productKey: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    shortDesc: String,
    description: String,
    chatbotText: String,
    individual: UserTypeSchema,
    organization: UserTypeSchema,
    // Автомашины зээлийн тусгай хэсгүүд
    purchase: {
        label: String,
        individual: UserTypeSchema,
        organization: UserTypeSchema
    },
    collateral: {
        label: String,
        individual: UserTypeSchema,
        organization: UserTypeSchema
    },
    bgImageUrl: { type: String, default: '' },
    headerImageUrl: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

const ProductContent = mongoose.model('ProductContent', ProductContentSchema);
export default ProductContent;
