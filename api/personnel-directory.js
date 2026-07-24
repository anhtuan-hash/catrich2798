import { createClient } from '@supabase/supabase-js';

const SETTINGS_TABLE = 'ai_website_settings';
const PROFILE_TABLE = 'profiles';
const REQUEST_TABLE = 'permission_requests';
const WORKSPACE_KEY = 'personnel-directory-v1';
const REQUEST_KIND = 'personnel-profile-change';
const REQUEST_PREFIX = 'personnel-profile-change:';

const TEACHER_EDITABLE_FIELDS = new Set([
  'fullName', 'preferredName', 'contactEmail', 'phone', 'gender', 'dateOfBirth',
  'address', 'school', 'qualification', 'degree', 'subjects', 'gradeLevels',
  'homeroomClass', 'emergencyContactName', 'emergencyContactPhone', 'notes',
]);

const RECORD_FIELDS = [
  'employeeCode', 'fullName', 'preferredName', 'contactEmail', 'phone', 'gender',
  'dateOfBirth', 'address', 'department', 'position', 'employmentType',
  'employmentStatus', 'startDate', 'qualification', 'degree', 'subjects',
  'gradeLevels', 'homeroomClass', 'school', 'emergencyContactName',
  'emergencyContactPhone', 'notes',
];

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function text(value, max = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function dateValue(value) {
  const clean = text(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : '';
}

function arrayValue(value, maxItems = 30) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[,;\n]/g);
  return [...new Set(source.map((item) => text(item, 80)).filter(Boolean))].slice(0, maxItems);
}

function normalizeRecord(value = {}, id = '') {
  return {
    id: text(value.id || id, 80),
    employeeCode: text(value.employeeCode, 40),
    fullName: text(value.fullName, 120),
    preferredName: text(value.preferredName, 80),
    loginEmail: text(value.loginEmail, 180).toLowerCase(),
    contactEmail: text(value.contactEmail, 180).toLowerCase(),
    phone: text(value.phone, 30),
    gender: ['Nam', 'Nữ', 'Khác', 'Không công khai'].includes(value.gender) ? value.gender : '',
    dateOfBirth: dateValue(value.dateOfBirth),
    address: text(value.address, 240),
    department: text(value.department, 100),
    position: text(value.position, 100),
    employmentType: ['Biên chế', 'Hợp đồng', 'Thỉnh giảng', 'Khác'].includes(value.employmentType) ? value.employmentType : '',
    employmentStatus: ['active', 'leave', 'inactive'].includes(value.employmentStatus) ? value.employmentStatus : 'active',
    startDate: dateValue(value.startDate),
    qualification: text(value.qualification, 180),
    degree: text(value.degree, 240),
    subjects: arrayValue(value.subjects),
    gradeLevels: arrayValue(value.gradeLevels, 20),
    homeroomClass: text(value.homeroomClass, 40),
    school: text(value.school, 160),
    emergencyContactName: text(value.emergencyContactName, 120),
    emergencyContactPhone: text(value.emergencyContactPhone, 30),
    notes: text(value.notes, 700),
    updatedAt: text(value.updatedAt, 40),
    updatedBy: text(value.updatedBy, 180),
  };
}

function defaultRecord(profile = {}) {
  return normalizeRecord({
    id: profile.id,
    fullName: profile.full_name || String(profile.email || '').split('@')[0] || 'Giáo viên',
    loginEmail: profile.email || '',
    contactEmail: profile.email || '',
    school: profile.school || '',
    department: 'Tổ Tiếng Anh',
    position: 'Giáo viên',
    employmentStatus: profile.approved === true ? 'active' : 'inactive',
  }, profile.id);
}

function mergeProfileRecord(profile, stored) {
  const base = defaultRecord(profile);
  const clean = normalizeRecord({ ...base, ...(stored || {}) }, profile.id);
  return {
    ...clean,
    id: profile.id,
    loginEmail: String(profile.email || clean.loginEmail || '').toLowerCase(),
    fullName: clean.fullName || profile.full_name || base.fullName,
    school: clean.school || profile.school || '',
    accountApproved: profile.approved === true,
    accountRole: profile.role || 'teacher',
    accountCreatedAt: profile.created_at || '',
    accountUpdatedAt: profile.updated_at || '',
  };
}

function isAdmin(profile = {}) {
  const role = `${profile.role || ''}`.toLowerCase();
  const permissions = Array.isArray(profile.permissions?.allowed) ? profile.permissions.allowed : [];
  return profile.approved !== false && (role === 'admin' || permissions.includes('route:admin') || permissions.includes('admin:users'));
}

function withTimeout(promise, ms = 12000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Yêu cầu dữ liệu quá thời gian. Vui lòng thử lại.')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function authenticate(req) {
  const supabaseUrl = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const anonKey = env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey) throw Object.assign(new Error('Supabase server chưa được cấu hình.'), { status: 503 });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw Object.assign(new Error('Phiên đăng nhập không hợp lệ.'), { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await withTimeout(authClient.auth.getUser(token));
  if (authError || !authData?.user) throw Object.assign(new Error('Phiên đăng nhập đã hết hạn.'), { status: 401 });

  const db = createClient(supabaseUrl, serviceKey || anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: serviceKey ? undefined : { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: profile, error: profileError } = await withTimeout(
    db.from(PROFILE_TABLE)
      .select('id,email,full_name,school,role,approved,permissions,created_at,updated_at')
      .eq('id', authData.user.id)
      .maybeSingle(),
  );
  if (profileError) throw Object.assign(new Error(profileError.message), { status: 403 });
  if (!profile) throw Object.assign(new Error('Không tìm thấy hồ sơ tài khoản.'), { status: 403 });

  return { user: authData.user, profile, db, hasServiceRole: Boolean(serviceKey) };
}

async function readStoredRecords(db) {
  const { data, error } = await db
    .from(SETTINGS_TABLE)
    .select('workspace_key,tools,updated_at,updated_by_email')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle();
  if (error) throw error;
  const records = Array.isArray(data?.tools) ? data.tools.map((item) => normalizeRecord(item, item?.id)).filter((item) => item.id) : [];
  return { records, updatedAt: data?.updated_at || '', updatedBy: data?.updated_by_email || '' };
}

async function writeStoredRecords(session, records) {
  const now = new Date().toISOString();
  const clean = records.map((item) => normalizeRecord(item, item?.id)).filter((item) => item.id);
  const { data, error } = await session.db
    .from(SETTINGS_TABLE)
    .upsert({
      workspace_key: WORKSPACE_KEY,
      tools: clean,
      updated_by: session.user.id,
      updated_by_email: session.user.email || session.profile.email || '',
      updated_at: now,
    }, { onConflict: 'workspace_key' })
    .select('tools,updated_at')
    .single();
  if (error) throw error;
  return { records: Array.isArray(data?.tools) ? data.tools : clean, updatedAt: data?.updated_at || now };
}

function parseChangeRequest(row = {}) {
  let payload = {};
  try { payload = JSON.parse(String(row.message || '{}')); } catch { payload = {}; }
  return {
    ...row,
    proposed: payload.proposed && typeof payload.proposed === 'object' ? payload.proposed : {},
    reason: text(payload.reason, 500),
    current: payload.current && typeof payload.current === 'object' ? payload.current : {},
  };
}

function requestQuery(db) {
  return db.from(REQUEST_TABLE)
    .select('id,requester_id,requester_email,requester_name,permission_id,item_title,item_type,status,message,created_at,updated_at')
    .or(`item_type.eq.${REQUEST_KIND},permission_id.like.${REQUEST_PREFIX}%`)
    .order('created_at', { ascending: false });
}

function normalizeProposed(value = {}, teacherOnly = true) {
  const output = {};
  const allowed = teacherOnly ? TEACHER_EDITABLE_FIELDS : new Set(RECORD_FIELDS);
  for (const key of allowed) {
    if (!(key in value)) continue;
    if (key === 'subjects' || key === 'gradeLevels') output[key] = arrayValue(value[key]);
    else if (key === 'dateOfBirth' || key === 'startDate') output[key] = dateValue(value[key]);
    else if (key === 'gender') output[key] = ['Nam', 'Nữ', 'Khác', 'Không công khai'].includes(value[key]) ? value[key] : '';
    else output[key] = text(value[key], key === 'notes' ? 700 : 240);
  }
  return output;
}

async function loadDirectory(session) {
  const admin = isAdmin(session.profile);
  if (admin && !session.hasServiceRole) {
    throw Object.assign(new Error('Vercel chưa có SUPABASE_SERVICE_ROLE_KEY nên Admin chưa thể quản lý toàn bộ nhân sự.'), { status: 503 });
  }

  const profilesPromise = admin
    ? session.db.from(PROFILE_TABLE)
        .select('id,email,full_name,school,role,approved,permissions,created_at,updated_at')
        .neq('role', 'admin')
        .order('full_name', { ascending: true })
    : session.db.from(PROFILE_TABLE)
        .select('id,email,full_name,school,role,approved,permissions,created_at,updated_at')
        .eq('id', session.user.id);

  const requestsPromise = admin
    ? requestQuery(session.db)
    : requestQuery(session.db).eq('requester_id', session.user.id);

  const [profilesResult, stored, requestsResult] = await withTimeout(Promise.all([
    profilesPromise,
    readStoredRecords(session.db),
    requestsPromise,
  ]), 12000);

  if (profilesResult.error) throw profilesResult.error;
  if (requestsResult.error) throw requestsResult.error;

  const storedMap = new Map(stored.records.map((record) => [record.id, record]));
  const records = (profilesResult.data || []).map((profile) => mergeProfileRecord(profile, storedMap.get(profile.id)));
  return {
    admin,
    records,
    requests: (requestsResult.data || []).map(parseChangeRequest),
    updatedAt: stored.updatedAt,
    updatedBy: stored.updatedBy,
  };
}

async function saveRecord(session, body) {
  if (!isAdmin(session.profile)) throw Object.assign(new Error('Chỉ Admin được cập nhật hồ sơ nhân sự.'), { status: 403 });
  const userId = text(body.userId, 80);
  if (!userId) throw Object.assign(new Error('Thiếu tài khoản giáo viên.'), { status: 400 });

  const [{ data: profile, error: profileError }, stored] = await withTimeout(Promise.all([
    session.db.from(PROFILE_TABLE)
      .select('id,email,full_name,school,role,approved,created_at,updated_at')
      .eq('id', userId)
      .single(),
    readStoredRecords(session.db),
  ]));
  if (profileError) throw profileError;

  const patch = normalizeProposed(body.record || {}, false);
  const current = stored.records.find((item) => item.id === userId) || defaultRecord(profile);
  const next = normalizeRecord({
    ...current,
    ...patch,
    id: userId,
    loginEmail: profile.email,
    updatedAt: new Date().toISOString(),
    updatedBy: session.user.email || session.profile.email || '',
  }, userId);
  const nextRecords = [...stored.records.filter((item) => item.id !== userId), next];
  const write = await writeStoredRecords(session, nextRecords);

  const profilePatch = {};
  if (patch.fullName) profilePatch.full_name = patch.fullName;
  if ('school' in patch) profilePatch.school = patch.school;
  if (Object.keys(profilePatch).length) {
    profilePatch.updated_at = new Date().toISOString();
    const { error } = await session.db.from(PROFILE_TABLE).update(profilePatch).eq('id', userId);
    if (error) throw error;
  }

  return { ok: true, record: mergeProfileRecord({ ...profile, ...profilePatch }, next), updatedAt: write.updatedAt };
}

async function submitChange(session, body) {
  const proposed = normalizeProposed(body.proposed || {}, true);
  if (!Object.keys(proposed).length) throw Object.assign(new Error('Chưa có nội dung thay đổi.'), { status: 400 });

  const { data: pending, error: pendingError } = await requestQuery(session.db)
    .eq('requester_id', session.user.id)
    .eq('status', 'pending')
    .limit(1);
  if (pendingError) throw pendingError;
  if (pending?.length) throw Object.assign(new Error('Bạn đang có một đề nghị chỉnh sửa chờ Admin xử lý.'), { status: 409 });

  const directory = await loadDirectory(session);
  const current = directory.records[0] || defaultRecord(session.profile);
  const now = new Date().toISOString();
  const payload = {
    requester_id: session.user.id,
    requester_email: session.user.email || session.profile.email || '',
    requester_name: session.profile.full_name || session.user.email || 'Giáo viên',
    permission_id: `${REQUEST_PREFIX}${session.user.id}:${Date.now()}`,
    item_title: 'Đề nghị chỉnh sửa hồ sơ nhân sự',
    item_type: REQUEST_KIND,
    status: 'pending',
    message: JSON.stringify({ current, proposed, reason: text(body.reason, 500), requestedAt: now }),
    updated_at: now,
  };
  const { data, error } = await session.db.from(REQUEST_TABLE).insert(payload).select('*').single();
  if (error) throw error;
  return { ok: true, request: parseChangeRequest(data) };
}

async function reviewChange(session, body) {
  if (!isAdmin(session.profile)) throw Object.assign(new Error('Chỉ Admin được duyệt đề nghị.'), { status: 403 });
  const requestId = text(body.requestId, 80);
  const decision = body.decision === 'approved' ? 'approved' : 'rejected';
  const { data: request, error } = await session.db.from(REQUEST_TABLE)
    .select('*').eq('id', requestId).single();
  if (error) throw error;
  if (request.status !== 'pending') throw Object.assign(new Error('Yêu cầu này đã được xử lý.'), { status: 409 });

  let record = null;
  if (decision === 'approved') {
    const parsed = parseChangeRequest(request);
    const result = await saveRecord(session, { userId: request.requester_id, record: parsed.proposed });
    record = result.record;
  }
  const { data: updated, error: updateError } = await session.db.from(REQUEST_TABLE)
    .update({ status: decision, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .select('*')
    .single();
  if (updateError) throw updateError;
  return { ok: true, request: parseChangeRequest(updated), record };
}

async function setAccountState(session, body) {
  if (!isAdmin(session.profile)) throw Object.assign(new Error('Chỉ Admin được thay đổi trạng thái tài khoản.'), { status: 403 });
  const userId = text(body.userId, 80);
  const approved = Boolean(body.approved);
  const { data, error } = await session.db.from(PROFILE_TABLE)
    .update({ approved, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id,email,full_name,school,role,approved,created_at,updated_at')
    .single();
  if (error) throw error;
  return { ok: true, profile: data };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const session = await authenticate(req);
    if (req.method === 'GET') return json(res, 200, { ok: true, ...(await loadDirectory(session)) });
    if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed.' });

    const action = text(req.body?.action, 40);
    if (action === 'save-record') return json(res, 200, await saveRecord(session, req.body));
    if (action === 'submit-change') return json(res, 201, await submitChange(session, req.body));
    if (action === 'review-change') return json(res, 200, await reviewChange(session, req.body));
    if (action === 'set-account-state') return json(res, 200, await setAccountState(session, req.body));
    return json(res, 400, { ok: false, message: 'Hành động không hợp lệ.' });
  } catch (error) {
    console.error('[personnel-directory]', error);
    return json(res, Number(error?.status) || 500, { ok: false, message: error?.message || 'Không thể xử lý dữ liệu nhân sự.' });
  }
}
