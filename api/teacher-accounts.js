import { createClient } from '@supabase/supabase-js';

const INTERNAL_DOMAIN = 'accounts.brianenglish.studio';
const MAX_BATCH = 50;
const CONCURRENCY = 5;

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function cleanText(value, max = 160) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeUsername(value) {
  return cleanText(value, 64)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 32);
}

function internalEmail(username) {
  return `${username}@${INTERNAL_DOMAIN}`;
}

function validUsername(username) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

function validPassword(value) {
  const password = String(value ?? '');
  return password.length >= 8 && password.length <= 128;
}

function validContactEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!email) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function isMissingColumn(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return error?.code === '42703' || message.includes('column') && (message.includes('does not exist') || message.includes('schema cache'));
}

function withTimeout(promise, ms = 15000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Yêu cầu Supabase quá thời gian.'), { status: 504 })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function readProfile(db, user) {
  const baseQuery = await withTimeout(
    db.from('profiles')
      .select('id,email,full_name,school,role,approved,permissions')
      .eq('id', user.id)
      .maybeSingle(),
  );
  if (baseQuery.error) throw Object.assign(new Error(baseQuery.error.message), { status: 403 });
  const base = baseQuery.data || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || '',
    school: user.user_metadata?.school || '',
    role: user.user_metadata?.role || 'teacher',
    approved: true,
    permissions: { mode: 'all', allowed: [] },
  };

  const extendedQuery = await withTimeout(
    db.from('profiles')
      .select('username,contact_email,auth_mode,must_change_password')
      .eq('id', user.id)
      .maybeSingle(),
  ).catch(() => ({ data: null, error: null }));

  return { ...base, ...(extendedQuery.error ? {} : extendedQuery.data || {}) };
}

function hasAdminPermission(profile = {}) {
  const allowed = Array.isArray(profile.permissions)
    ? profile.permissions
    : Array.isArray(profile.permissions?.allowed) ? profile.permissions.allowed : [];
  return profile.approved !== false && (
    String(profile.role || '').toLowerCase() === 'admin'
    || allowed.includes('route:admin')
    || allowed.includes('admin:users')
  );
}

async function authenticate(req) {
  const supabaseUrl = env('SUPABASE_URL', env('VITE_SUPABASE_URL'));
  const anonKey = env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY'));
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey) throw Object.assign(new Error('Vercel chưa được cấu hình kết nối Supabase.'), { status: 503 });
  if (!serviceKey) throw Object.assign(new Error('Vercel chưa có SUPABASE_SERVICE_ROLE_KEY để quản trị tài khoản.'), { status: 503 });

  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw Object.assign(new Error('Phiên đăng nhập không hợp lệ.'), { status: 401 });

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await withTimeout(authClient.auth.getUser(token));
  if (authError || !authData?.user) throw Object.assign(new Error('Phiên đăng nhập đã hết hạn.'), { status: 401 });

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const profile = await readProfile(adminClient, authData.user);
  return { user: authData.user, profile, db: adminClient };
}

async function updateProfileCompat(db, userId, fullPayload, minimalPayload) {
  const full = await withTimeout(db.from('profiles').upsert(fullPayload, { onConflict: 'id' }));
  if (!full.error) return null;
  if (!isMissingColumn(full.error)) return full.error;
  const minimal = await withTimeout(db.from('profiles').upsert(minimalPayload, { onConflict: 'id' }));
  return minimal.error || null;
}

async function processAccount(session, item, index) {
  const username = normalizeUsername(item?.username);
  const password = String(item?.password ?? '');
  const fullName = cleanText(item?.fullName || item?.full_name, 120) || username;
  const school = cleanText(item?.school, 160);

  if (!validUsername(username)) {
    return { index, username, ok: false, message: 'Tên đăng nhập cần 3–32 ký tự, chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.' };
  }
  if (!validPassword(password)) {
    return { index, username, ok: false, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' };
  }

  const email = internalEmail(username);
  const userMetadata = {
    full_name: fullName,
    school,
    username,
    auth_mode: 'username',
    must_change_password: true,
    contact_email: '',
  };
  const { data: created, error: createError } = await withTimeout(session.db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  }), 20000);

  if (createError || !created?.user?.id) {
    const raw = String(createError?.message || 'Không thể tạo tài khoản Auth.');
    const duplicate = /already|registered|exists|duplicate/i.test(raw);
    return {
      index,
      username,
      internalEmail: email,
      ok: false,
      message: duplicate ? 'Tên đăng nhập đã tồn tại.' : raw,
    };
  }

  const userId = created.user.id;
  const now = new Date().toISOString();
  const fullProfile = {
    id: userId,
    email,
    username,
    contact_email: null,
    full_name: fullName,
    school,
    role: 'teacher',
    approved: true,
    auth_mode: 'username',
    must_change_password: true,
    permissions: { mode: 'all', allowed: [] },
    updated_at: now,
  };
  const minimalProfile = {
    id: userId,
    email,
    full_name: fullName,
    school,
    role: 'teacher',
    approved: true,
    permissions: { mode: 'all', allowed: [] },
    updated_at: now,
  };
  const profileError = await updateProfileCompat(session.db, userId, fullProfile, minimalProfile);
  if (profileError) {
    await session.db.auth.admin.deleteUser(userId).catch(() => null);
    return { index, username, internalEmail: email, ok: false, message: profileError.message };
  }

  return { index, username, fullName, internalEmail: email, ok: true };
}

async function bulkCreate(session, payload) {
  const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  if (!accounts.length) return { status: 400, body: { ok: false, message: 'Danh sách tài khoản đang trống.' } };
  if (accounts.length > MAX_BATCH) return { status: 400, body: { ok: false, message: `Mỗi lần chỉ tạo tối đa ${MAX_BATCH} tài khoản.` } };

  const normalized = accounts.map((item, index) => ({ item, index, username: normalizeUsername(item?.username) }));
  const duplicates = new Set();
  const seen = new Set();
  normalized.forEach(({ username }) => {
    if (username && seen.has(username)) duplicates.add(username);
    seen.add(username);
  });

  const results = new Array(accounts.length);
  for (let start = 0; start < normalized.length; start += CONCURRENCY) {
    const chunk = normalized.slice(start, start + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(({ item, index, username }) => (
      duplicates.has(username)
        ? Promise.resolve({ index, username, ok: false, message: 'Tên đăng nhập bị trùng trong danh sách.' })
        : processAccount(session, item, index)
    )));
    chunkResults.forEach((result) => { results[result.index] = result; });
  }

  const createdCount = results.filter((item) => item?.ok === true).length;
  return {
    status: createdCount ? 200 : 400,
    body: {
      ok: createdCount > 0,
      createdCount,
      failedCount: results.length - createdCount,
      results,
      message: createdCount ? `Đã tạo ${createdCount} tài khoản.` : 'Không tạo được tài khoản nào.',
    },
  };
}

async function resetPassword(session, payload) {
  const username = normalizeUsername(payload.username);
  const password = String(payload.password ?? '');
  if (!validUsername(username)) return { status: 400, body: { ok: false, message: 'Tên đăng nhập không hợp lệ.' } };
  if (!validPassword(password)) return { status: 400, body: { ok: false, message: 'Mật khẩu cần từ 8 đến 128 ký tự.' } };

  const email = internalEmail(username);
  const { data: target, error: targetError } = await withTimeout(
    session.db.from('profiles').select('id,email').eq('email', email).maybeSingle(),
  );
  if (targetError || !target?.id) return { status: 404, body: { ok: false, message: 'Không tìm thấy tài khoản giáo viên.' } };

  const { data: authTarget } = await withTimeout(session.db.auth.admin.getUserById(target.id));
  const metadata = { ...(authTarget?.user?.user_metadata || {}), must_change_password: true };
  const { error: resetError } = await withTimeout(session.db.auth.admin.updateUserById(target.id, {
    password,
    user_metadata: metadata,
  }), 20000);
  if (resetError) return { status: 400, body: { ok: false, message: resetError.message } };

  const profileUpdate = await withTimeout(
    session.db.from('profiles').update({ must_change_password: true, updated_at: new Date().toISOString() }).eq('id', target.id),
  );
  if (profileUpdate.error && !isMissingColumn(profileUpdate.error)) {
    return { status: 400, body: { ok: false, message: profileUpdate.error.message } };
  }
  return { status: 200, body: { ok: true, username } };
}

async function updateContactEmail(session, payload) {
  const contactEmail = validContactEmail(payload.contactEmail);
  if (!contactEmail) return { status: 400, body: { ok: false, message: 'Email liên hệ không hợp lệ.' } };

  const duplicateCheck = await withTimeout(
    session.db.from('profiles').select('id').ilike('contact_email', contactEmail).neq('id', session.user.id).maybeSingle(),
  ).catch(() => ({ data: null, error: null }));
  if (!duplicateCheck.error && duplicateCheck.data?.id) {
    return { status: 409, body: { ok: false, message: 'Email này đã được dùng cho tài khoản khác.' } };
  }

  const metadata = { ...(session.user.user_metadata || {}), contact_email: contactEmail };
  const { error: metadataError } = await withTimeout(
    session.db.auth.admin.updateUserById(session.user.id, { user_metadata: metadata }),
  );
  if (metadataError) return { status: 400, body: { ok: false, message: metadataError.message } };

  const profileUpdate = await withTimeout(
    session.db.from('profiles').update({ contact_email: contactEmail, updated_at: new Date().toISOString() }).eq('id', session.user.id),
  );
  if (profileUpdate.error && !isMissingColumn(profileUpdate.error)) {
    return { status: 400, body: { ok: false, message: profileUpdate.error.message } };
  }
  return { status: 200, body: { ok: true, contactEmail } };
}

async function passwordChanged(session) {
  const metadata = { ...(session.user.user_metadata || {}), must_change_password: false };
  const { error: authError } = await withTimeout(
    session.db.auth.admin.updateUserById(session.user.id, { user_metadata: metadata }),
  );
  if (authError) return { status: 400, body: { ok: false, message: authError.message } };

  const profileUpdate = await withTimeout(
    session.db.from('profiles').update({ must_change_password: false, updated_at: new Date().toISOString() }).eq('id', session.user.id),
  );
  if (profileUpdate.error && !isMissingColumn(profileUpdate.error)) {
    return { status: 400, body: { ok: false, message: profileUpdate.error.message } };
  }
  return { status: 200, body: { ok: true } };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Method not allowed.' });

  try {
    const session = await authenticate(req);
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const action = cleanText(payload.action, 40) || 'get_self';

    if (action === 'get_self') {
      return json(res, 200, {
        ok: true,
        profile: {
          id: session.user.id,
          username: session.profile.username || session.user.user_metadata?.username || '',
          contactEmail: session.profile.contact_email || session.user.user_metadata?.contact_email || '',
          authMode: session.profile.auth_mode || session.user.user_metadata?.auth_mode || 'email',
          mustChangePassword: session.profile.must_change_password === true || session.user.user_metadata?.must_change_password === true,
          fullName: session.profile.full_name || session.user.user_metadata?.full_name || '',
        },
      });
    }

    if (action === 'update_contact_email') {
      const result = await updateContactEmail(session, payload);
      return json(res, result.status, result.body);
    }
    if (action === 'password_changed') {
      const result = await passwordChanged(session);
      return json(res, result.status, result.body);
    }

    if (!hasAdminPermission(session.profile)) {
      return json(res, 403, { ok: false, message: 'Chỉ Admin được quản lý tài khoản giáo viên.' });
    }

    if (action === 'reset_password') {
      const result = await resetPassword(session, payload);
      return json(res, result.status, result.body);
    }
    if (action === 'bulk_create') {
      const result = await bulkCreate(session, payload);
      return json(res, result.status, result.body);
    }
    return json(res, 400, { ok: false, message: 'Unknown action.' });
  } catch (error) {
    console.error('[teacher-accounts]', error);
    return json(res, Number(error?.status) || 500, {
      ok: false,
      message: error?.message || 'Không thể xử lý tài khoản giáo viên.',
    });
  }
}
