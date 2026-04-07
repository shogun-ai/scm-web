import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
    fieldKey: { type: String, required: true },
    label: { type: String, required: true },
    placeholder: { type: String, default: '' },
    isRequired: { type: Boolean, default: false },
    isEnabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
}, { _id: false });

const FormConfigSchema = new mongoose.Schema({
    formId: { type: String, required: true, unique: true }, // 'loan' | 'trust'
    fields: [FieldSchema],
    updatedAt: { type: Date, default: Date.now }
});

const FormConfig = mongoose.model('FormConfig', FormConfigSchema);
export default FormConfig;
