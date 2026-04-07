import mongoose from 'mongoose';

const StatSchema = new mongoose.Schema({
    label: { type: String, required: true },
    value: { type: String, required: true },
    order: { type: Number, default: 0 }
});

// Энэ мөр байхгүй болохоор алдаа заагаад байгаа юм:
const Stat = mongoose.model('Stat', StatSchema);
export default Stat;