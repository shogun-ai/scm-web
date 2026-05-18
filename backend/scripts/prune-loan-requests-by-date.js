import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

[
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
].forEach((envPath) => dotenv.config({ path: envPath }));

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const CUTOFF_DATE = process.env.CUTOFF_DATE || process.env.KEEP_DATE || '2026-05-14';
const CONFIRM_DELETE = process.env.CONFIRM_DELETE === 'YES';

const LoanRequestSchema = new mongoose.Schema({}, { strict: false, collection: 'loanrequests' });
const LoanResearchSchema = new mongoose.Schema({}, { strict: false, collection: 'loanresearches' });

const LoanRequest = mongoose.models.LoanRequest || mongoose.model('LoanRequest', LoanRequestSchema);
const LoanResearch = mongoose.models.LoanResearch || mongoose.model('LoanResearch', LoanResearchSchema);

const buildUlaanbaatarDayStart = (dateString) => {
  const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error('CUTOFF_DATE must be YYYY-MM-DD');
  const [, year, month, day] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1, 16, 0, 0, 0));
};

const fmt = (date) => date.toISOString();

async function main() {
  if (!MONGO_URI) throw new Error('MONGO_URI or MONGODB_URI is required');

  const cutoffUtc = buildUlaanbaatarDayStart(CUTOFF_DATE);
  await mongoose.connect(MONGO_URI);

  const keepQuery = { createdAt: { $gte: cutoffUtc } };
  const deleteQuery = { createdAt: { $exists: true, $lt: cutoffUtc } };
  const missingCreatedAtQuery = { createdAt: { $exists: false } };

  const [total, keepCount, deleteCount, missingCreatedAtCount] = await Promise.all([
    LoanRequest.countDocuments({}),
    LoanRequest.countDocuments(keepQuery),
    LoanRequest.countDocuments(deleteQuery),
    LoanRequest.countDocuments(missingCreatedAtQuery),
  ]);

  const deleteSamples = await LoanRequest.find(deleteQuery)
    .select('_id createdAt lastname firstname orgName phone amount status')
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  const deleteIds = await LoanRequest.find(deleteQuery).select('_id').lean();
  const deleteIdStrings = deleteIds.map((item) => String(item._id));
  const linkedResearchCount = deleteIdStrings.length
    ? await LoanResearch.countDocuments({ 'borrower.sourceRequestId': { $in: deleteIdStrings } })
    : 0;

  console.log(JSON.stringify({
    mode: CONFIRM_DELETE ? 'DELETE' : 'DRY_RUN',
    deleteBeforeDateUlaanbaatar: CUTOFF_DATE,
    deleteBeforeUtc: fmt(cutoffUtc),
    loanRequests: { total, keepCount, deleteCount, missingCreatedAtCount },
    linkedLoanResearchToDelete: linkedResearchCount,
    deleteSamples,
  }, null, 2));

  if (!CONFIRM_DELETE) {
    console.log('Dry run only. Re-run with CONFIRM_DELETE=YES to delete.');
    return;
  }

  const [researchResult, loanResult] = await Promise.all([
    deleteIdStrings.length
      ? LoanResearch.deleteMany({ 'borrower.sourceRequestId': { $in: deleteIdStrings } })
      : Promise.resolve({ deletedCount: 0 }),
    LoanRequest.deleteMany(deleteQuery),
  ]);

  console.log(JSON.stringify({
    deletedLoanRequests: loanResult.deletedCount,
    deletedLinkedLoanResearch: researchResult.deletedCount,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
