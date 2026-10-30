import { LOAN_PRODUCTS } from '../shared/loanFormConfig.js';

export const QUICK_FILE_FIELDS = ['file_id', 'file_address', 'file_social', 'file_bank', 'file_credit', 'file_car_photos', 'file_prop_map'];
export const REQUEST_STATUSES = ['pending', 'created', 'assigned', 'data_collection', 'studying', 'assessment', 'committee', 'returned', 'approved', 'rejected', 'resolved', 'closed', 'disbursed'];
const PRODUCT_IDS = new Set(LOAN_PRODUCTS.map(item => item.id));
const managerRoles = ['admin', 'director'];
const staffRoles = [...managerRoles, 'loan_officer', 'finance_manager'];
export const rolesOf = user => [...new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])].filter(Boolean))];
export const isRequestManager = user => rolesOf(user).some(role => managerRoles.includes(role));
export const isRequestStaff = user => rolesOf(user).some(role => staffRoles.includes(role));
export const requestScope = user => isRequestManager(user) ? {} : { 'assignee.userId': String(user?._id || '') };
export const canAccessRequest = (user, loan) => isRequestStaff(user) && (isRequestManager(user) || String(loan?.assignee?.userId || '') === String(user?._id || ''));

export class IntakeError extends Error {
  constructor(message, status = 400, errors = {}) { super(message); this.status = status; this.errors = errors; }
}
const text = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function validateQuickIntake(body = {}) {
  const errors = {};
  const borrowerType = text(body.borrowerType, 20);
  const firstName = text(body.firstName, 100);
  const contactName = text(body.contactName, 100);
  const orgName = text(body.orgName, 200);
  const phone = text(body.phone, 30).replace(/[\s()-]/g, '');
  const email = text(body.email, 254).toLowerCase();
  const loanType = text(body.loanType, 60);
  const amount = Number(body.amount);
  const term = Number(body.term);
  const repaymentSource = text(body.repaymentSource, 1000);
  if (!['individual', 'organization'].includes(borrowerType)) errors.borrowerType = 'Хүсэлт гаргагчийн төрлийг сонгоно уу.';
  if (borrowerType === 'individual' && !firstName) errors.firstName = 'Нэрээ оруулна уу.';
  if (borrowerType === 'organization' && !contactName) errors.contactName = 'Холбоо барих хүний нэрийг оруулна уу.';
  if (borrowerType === 'organization' && !orgName) errors.orgName = 'Байгууллагын нэрийг оруулна уу.';
  if (!/^\+?\d{8,15}$/.test(phone)) errors.phone = 'Утасны дугаараа зөв оруулна уу.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'И-мэйл хаягаа зөв оруулна уу.';
  if (!PRODUCT_IDS.has(loanType)) errors.loanType = 'Зээлийн төрлөө сонгоно уу.';
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12) errors.amount = 'Зээлийн дүнгээ зөв оруулна уу.';
  if (!Number.isInteger(term) || term < 1 || term > 120) errors.term = 'Хугацаа 1–120 сар байна.';
  if (!repaymentSource) errors.repaymentSource = 'Зээл төлөх эх үүсвэрээ оруулна уу.';
  if (body.consent !== true && body.consent !== 'true') errors.consent = 'Мэдээлэл боловсруулах зөвшөөрөл шаардлагатай.';
  if (Object.keys(errors).length) throw new IntakeError('Мэдээллээ шалгана уу.', 400, errors);
  const collateralType = ['vehicle', 'real_estate', 'account_revenue', 'contract', 'none'].includes(body.collateralType) ? body.collateralType : 'none';
  return { userType: borrowerType, firstname: firstName, lastname: text(body.lastName, 100), contactName, orgName, phone, contactPhone: borrowerType === 'organization' ? phone : '', email, selectedProduct: loanType, amount, term, purpose: text(body.purpose, 1000), repaymentSource, collateralType, status: 'pending', source: 'web', createdByStaff: false };
}

export function validateRequestPatch(body = {}, loan = {}, manager = false) {
  const allowed = ['status', 'note', 'assigneeId'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw new IntakeError('Зөвшөөрөгдөөгүй талбар байна.');
  const finalStatuses = ['approved', 'rejected', 'resolved', 'closed', 'disbursed'];
  if (!manager && finalStatuses.includes(loan.status) && body.status !== 'committee') throw new IntakeError('Шийдвэрлэсэн хүсэлтийг өөрчлөх эрхгүй байна.', 403);
  if (finalStatuses.includes(loan.status) && body.status && !finalStatuses.includes(body.status) && body.status !== 'committee') throw new IntakeError('Шийдвэрийг эхлээд хорооны эрхээр дахин хяналтад оруулна уу.', 403);
  if (body.status === 'disbursed' && !['approved', 'resolved', 'disbursed'].includes(loan.status)) throw new IntakeError('Зөвшөөрөгдсөн хүсэлтэд олголт бүртгэнэ.');
  const patch = {};
  if (Object.hasOwn(body, 'status')) {
    if (!REQUEST_STATUSES.includes(body.status)) throw new IntakeError('Төлөв буруу байна.');
    if (!manager && !['assigned', 'data_collection', 'studying', 'assessment', 'committee', 'returned', 'approved', 'rejected', 'resolved'].includes(body.status)) throw new IntakeError('Энэ төлөвт шилжүүлэх эрхгүй байна.', 403);
    patch.status = body.status;
  }
  if (Object.hasOwn(body, 'note')) {
    if (typeof body.note !== 'string' || body.note.length > 2000) throw new IntakeError('Тайлбар 2000 тэмдэгтээс хэтрэхгүй байна.');
    patch.approvalNote = body.note.trim();
  }
  if (['returned', 'rejected'].includes(patch.status) && !patch.approvalNote) throw new IntakeError('Буцаах эсвэл татгалзах шалтгааныг бичнэ үү.');
  if (Object.hasOwn(body, 'assigneeId')) {
    if (!manager) throw new IntakeError('Хуваарилах эрхгүй байна.', 403);
    if (typeof body.assigneeId !== 'string' || (body.assigneeId && !/^[a-f\d]{24}$/i.test(body.assigneeId))) throw new IntakeError('Ажилтны ID буруу байна.');
    patch.assigneeId = body.assigneeId;
  }
  if (!Object.keys(patch).length) throw new IntakeError('Өөрчлөлт оруулна уу.');
  return patch;
}

export function createIntakeLimiter({ max = 5, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const time = now();
    for (const [key, value] of attempts) if (value.reset <= time) attempts.delete(key);
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const value = attempts.get(key) || { count: 0, reset: time + windowMs };
    if (value.count >= max || (!attempts.has(key) && attempts.size >= 10000)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((value.reset - time) / 1000))));
      return res.status(429).json({ message: 'Олон хүсэлт илгээсэн байна. Түр хүлээгээд дахин оролдоно уу.' });
    }
    value.count += 1;
    attempts.set(key, value);
    next();
  };
}

export function quickApplicationData(payload, fileDetails) {
  const person = { firstName: payload.firstname, lastName: payload.lastname, phone: payload.phone, email: payload.email };
  const collaterals = [];
  for (const [type, fieldName] of [['vehicle', 'file_car_photos'], ['real_estate', 'file_prop_map']]) {
    const files = fileDetails.filter(file => file.fieldName === fieldName);
    if (files.length) collaterals.push({ type, files, fields: {}, valuation: {}, notes: '', auditLog: [] });
  }
  return { borrowerType: payload.userType, borrower: person, org: { orgName: payload.orgName, contactName: payload.contactName, contactPhone: payload.contactPhone, email: payload.email }, loanRequest: { product: payload.selectedProduct, amount: String(payload.amount), term: String(payload.term), purpose: payload.purpose, repaymentSource: payload.repaymentSource, collateralType: payload.collateralType }, collaterals, guarantors: [], otherLoans: [], creditBureau: {}, incomeResearch: { bankStatementAnalyses: [], socialInsuranceAnalysis: null }, consents: { dataProcessing: true, acceptedAt: new Date() }, intake: { version: 'quick-v1', documentsOptional: true } };
}

export function isAllowedLoanRemoteUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password && url.port === '';
  } catch { return false; }
}

export function automationWriteQuery(id, snapshot) {
  return { _id: id, ...(snapshot ? { applicationData: structuredClone(snapshot) } : {}) };
}

export function assertLinkedResearchAccess(user, loan, write = false) {
  if (loan?.intakeVersion !== 'quick-v1') return;
  if (!canAccessRequest(user, loan)) throw new IntakeError('Хүсэлт олдсонгүй.', 404);
  if (write && !isRequestManager(user) && ['approved', 'rejected', 'resolved', 'closed', 'disbursed'].includes(loan.status)) throw new IntakeError('Шийдвэрлэсэн хүсэлтийг өөрчлөх эрхгүй байна.', 403);
}

export function researchVisibilityStages(user) {
  if (isRequestManager(user)) return [];
  return [
    { $lookup: { from: 'loanrequests', let: { sourceId: { $convert: { input: '$borrower.sourceRequestId', to: 'objectId', onError: null, onNull: null } } }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$sourceId'] }, intakeVersion: 'quick-v1' } }, { $project: { 'assignee.userId': 1 } }], as: '_quickRequest' } },
    { $match: { $or: [{ '_quickRequest.0': { $exists: false } }, ...(isRequestStaff(user) ? [{ '_quickRequest.assignee.userId': String(user._id) }] : [])] } },
    { $unset: '_quickRequest' },
  ];
}

export function validateIntakeFiles(files) {
  if (!Array.isArray(files) || files.length > 12) throw new IntakeError('Нийт 12 хүртэл файл оруулна уу.');
  let total = 0;
  for (const file of files) {
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length > 10 * 1024 * 1024) throw new IntakeError('Файл тус бүр 10 МБ-аас бага байна.');
    const bytes = file.buffer;
    const valid = file.mimetype === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-' : file.mimetype === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : file.mimetype === 'image/webp' && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!valid) throw new IntakeError('Файлын төрөл зөвшөөрөгдөөгүй байна.');
    total += bytes.length;
  }
  if (total > 50 * 1024 * 1024) throw new IntakeError('Нийт файлын хэмжээ 50 МБ-аас хэтрэхгүй байна.');
  return files;
}

export function registerLoanIntakeRoutes({ app, multer, cloudinary, LoanRequest, User, authenticateUser, committeeAction, userHasPermission, automate, createLog }) {
  const limiter = createIntakeLimiter();
  // Memory parsing permits field/file validation before anything is persisted remotely.
  const parseUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 12, fields: 18, fieldSize: 4000, parts: 30 }, fileFilter: (_req, file, cb) => ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? cb(null, true) : cb(new IntakeError('Файлын төрөл зөвшөөрөгдөөгүй байна.')) }).fields(QUICK_FILE_FIELDS.map(name => ({ name, maxCount: name === 'file_bank' ? 4 : 3 })));
  const parseStaffUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 12, fields: 2, fieldSize: 200, parts: 14 } }).fields([{ name: 'files', maxCount: 12 }, ...QUICK_FILE_FIELDS.map(name => ({ name, maxCount: 12 }))]);
  const requireStaff = (req, res, next) => isRequestStaff(req.user) ? next() : res.status(403).json({ message: 'Хүсэлт харах эрхгүй байна.' });
  const fail = (res, error) => res.status(error instanceof IntakeError ? error.status : 500).json({ message: error instanceof IntakeError ? error.message : 'Хүсэлтийг боловсруулахад алдаа гарлаа.', ...(error instanceof IntakeError && Object.keys(error.errors).length ? { errors: error.errors } : {}) });
  const validId = id => /^[a-f\d]{24}$/i.test(id || '');
  const uploadPrivate = file => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'scm_loan_private', resource_type: 'raw', type: 'authenticated' }, (error, result) => error ? reject(error) : resolve({ fieldName: file.fieldname, fileName: file.originalname.slice(0, 200), fileUrl: cloudinary.url(result.public_id, { resource_type: 'raw', type: 'authenticated', sign_url: true, secure: true }), publicId: result.public_id, deliveryType: 'authenticated', mimeType: file.mimetype, size: file.size }));
    stream.end(file.buffer);
  });
  app.post('/api/loans/quick', limiter, (req, res) => {
    parseUpload(req, res, async error => {
      if (error) return res.status(400).json({ message: 'Файл тус бүр 10 МБ-аас бага, нийт 12 хүртэл PDF, JPG, PNG эсвэл WEBP файл оруулна уу.' });
      const persisted = [];
      let saved = false;
      try {
        const payload = validateQuickIntake(req.body);
        const files = Object.values(req.files || {}).flat();
        validateIntakeFiles(files);
        for (const file of files) persisted.push(await uploadPrivate(file));
        const loan = new LoanRequest({ ...payload, intakeVersion: 'quick-v1', fileDetails: persisted, fileNames: persisted.map(file => file.fileUrl), applicationData: quickApplicationData(payload, persisted) });
        loan.applicationReference = `SCM-${new Date().getFullYear()}-${loan._id.toString().slice(-6).toUpperCase()}`;
        await loan.save();
        saved = true;
        automate(loan._id);
        res.status(201).json({ applicationReference: loan.applicationReference });
      } catch (error) {
        if (!saved) await Promise.allSettled(persisted.map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw', type: 'authenticated' })));
        fail(res, error);
      }
    });
  });
  // Intercept only new requests; retain the existing legacy upload contract.
  app.post('/api/loans/:id/files', authenticateUser, (req, res, next) => {
    if (!req.quickLoan) return next();
    if (!canAccessRequest(req.user, req.quickLoan)) return res.status(404).json({ message: 'Хүсэлт олдсонгүй.' });
    if (!isRequestManager(req.user) && ['approved', 'rejected', 'resolved', 'closed', 'disbursed'].includes(req.quickLoan.status)) return res.status(403).json({ message: 'Шийдвэрлэсэн хүсэлтийг өөрчлөх эрхгүй байна.' });
    parseStaffUpload(req, res, async error => {
      const persisted = [];
      let saved = false;
      try {
        if (error) throw new IntakeError('Файл тус бүр 10 МБ-аас бага, нийт 12 хүртэл файл оруулна уу.');
        const files = validateIntakeFiles(Object.values(req.files || {}).flat());
        if (!files.length) throw new IntakeError('Файл оруулна уу.');
        for (const file of files) {
          const fieldName = file.fieldname === 'files' ? req.body.fieldName : file.fieldname;
          if (!QUICK_FILE_FIELDS.includes(fieldName)) throw new IntakeError('Баримтын төрөл буруу байна.');
          persisted.push(await uploadPrivate({ ...file, fieldname: fieldName }));
        }
        const updateQuery = { _id: req.params.id, ...requestScope(req.user), ...(!isRequestManager(req.user) ? { status: { $nin: ['approved', 'rejected', 'resolved', 'closed', 'disbursed'] } } : {}) };
        const loan = await LoanRequest.findOneAndUpdate(updateQuery, { $push: { fileDetails: { $each: persisted }, fileNames: { $each: persisted.map(file => file.fileUrl) } }, $inc: { workflowRevision: 1 } }, { new: true });
        if (!loan) throw new IntakeError('Хүсэлт олдсонгүй.', 404);
        saved = true;
        automate(loan._id);
        res.json(loan);
      } catch (error) {
        if (!saved) await Promise.allSettled(persisted.map(file => cloudinary.uploader.destroy(file.publicId, { resource_type: 'raw', type: 'authenticated' })));
        fail(res, error);
      }
    });
  });
  app.get('/api/loan-requests/assignees', authenticateUser, requireStaff, async (req, res) => {
    if (!isRequestManager(req.user)) return res.status(403).json({ message: 'Хуваарилах эрхгүй байна.' });
    try { res.json(await User.find({ isActive: true, $or: [{ role: { $in: staffRoles } }, { roles: { $in: staffRoles } }] }).select('_id name role roles').limit(200).lean()); } catch (error) { fail(res, error); }
  });
  app.get('/api/loan-requests', authenticateUser, requireStaff, async (req, res) => {
    try {
      const page = Math.min(100000, Math.max(1, parseInt(req.query.page, 10) || 1));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const query = requestScope(req.user);
      if (req.query.mine === 'true') query['assignee.userId'] = String(req.user._id);
      if (req.query.status && req.query.status !== 'all') {
        if (!REQUEST_STATUSES.includes(req.query.status)) throw new IntakeError('Төлөв буруу байна.');
        query.status = req.query.status;
      }
      const search = text(req.query.search, 80);
      if (search) {
        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = ['firstname', 'lastname', 'orgName', 'phone', 'contactPhone', 'applicationReference'].map(key => ({ [key]: regex }));
      }
      const [items, total] = await Promise.all([LoanRequest.find(query).select('_id applicationReference userType firstname lastname orgName contactName phone contactPhone email selectedProduct amount term repaymentSource purpose status source assignee approvalNote createdAt aiLoanOfficer.status complianceReview.status applicationData.autoIntake.status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), LoanRequest.countDocuments(query)]);
      res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) { fail(res, error); }
  });
  app.get('/api/loan-requests/:id', authenticateUser, requireStaff, async (req, res) => {
    try {
      if (!validId(req.params.id)) throw new IntakeError('Хүсэлтийн ID буруу байна.');
      const loan = await LoanRequest.findOne({ _id: req.params.id, ...requestScope(req.user) }).lean();
      if (!loan) throw new IntakeError('Хүсэлт олдсонгүй.', 404);
      res.json(loan);
    } catch (error) { fail(res, error); }
  });
  app.post('/api/loan-requests/:id/intake-automation', authenticateUser, requireStaff, async (req, res) => {
    try {
      if (!validId(req.params.id)) throw new IntakeError('Хүсэлтийн ID буруу байна.');
      const query = { _id: req.params.id, intakeVersion: 'quick-v1', ...requestScope(req.user) };
      if (!isRequestManager(req.user)) query.status = { $nin: ['approved', 'rejected', 'resolved', 'closed', 'disbursed'] };
      query['applicationData.autoIntake.status'] = { $nin: ['pending', 'running'] };
      const queued = await LoanRequest.findOneAndUpdate(query, { $set: { 'applicationData.autoIntake.status': 'pending', 'applicationData.autoIntake.note': 'Баримтын AI шинжилгээг дахин ажиллуулахаар дараалалд орууллаа.' } }, { new: true });
      if (!queued) {
        const loan = await LoanRequest.findOne({ _id: req.params.id, intakeVersion: 'quick-v1', ...requestScope(req.user) }).lean();
        if (!loan) throw new IntakeError('Хүсэлт олдсонгүй.', 404);
        assertLinkedResearchAccess(req.user, loan, true);
        throw new IntakeError('AI шинжилгээ ажиллаж байна. Дууссаны дараа дахин оролдоно уу.', 409);
      }
      automate(queued._id);
      res.status(202).json({ queued: true });
    } catch (error) { fail(res, error); }
  });
  app.patch('/api/loan-requests/:id', authenticateUser, requireStaff, async (req, res) => {
    try {
      if (!validId(req.params.id)) throw new IntakeError('Хүсэлтийн ID буруу байна.');
      const query = { _id: req.params.id, ...requestScope(req.user) };
      const loan = await LoanRequest.findOne(query).lean();
      if (!loan) throw new IntakeError('Хүсэлт олдсонгүй.', 404);
      const patch = validateRequestPatch(req.body, loan, isRequestManager(req.user));
      if (patch.status) {
        const action = committeeAction(patch.status, loan.status);
        if (action && !await userHasPermission(req.user, 'los_committee', action, 'full')) throw new IntakeError('Шийдвэр гаргах эрхгүй байна.', 403);
        if (['closed', 'disbursed'].includes(patch.status) && !['approved', 'rejected', 'resolved', 'closed', 'disbursed'].includes(loan.status)) throw new IntakeError('Шийдвэр гараагүй хүсэлтийг хаах боломжгүй.');
      }
      if (Object.hasOwn(patch, 'assigneeId')) {
        if (patch.assigneeId) {
          const staff = await User.findById(patch.assigneeId).select('_id name role roles isActive').lean();
          if (!staff?.isActive || !isRequestStaff(staff)) throw new IntakeError('Идэвхтэй зээлийн ажилтан сонгоно уу.');
          patch.assignee = { userId: String(staff._id), name: staff.name };
          if (!patch.status && ['pending', 'created', 'returned'].includes(loan.status)) patch.status = 'assigned';
        } else patch.assignee = { userId: '', name: '' };
        delete patch.assigneeId;
      }
      query.status = loan.status;
      query.workflowRevision = loan.workflowRevision === undefined ? { $exists: false } : loan.workflowRevision;
      const updated = await LoanRequest.findOneAndUpdate(query, { $set: patch, $inc: { workflowRevision: 1 } }, { new: true, runValidators: true });
      if (!updated) throw new IntakeError('Хүсэлт өөрчлөгдсөн байна. Дахин ачаална уу.', 409);
      await createLog(req.user, 'loan_request_workflow_updated', `${loan._id}: ${loan.status} -> ${updated.status}`);
      res.json(updated);
    } catch (error) { fail(res, error); }
  });
}
