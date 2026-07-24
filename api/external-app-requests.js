import { createClient } from '@supabase/supabase-js';

const TABLE = 'permission_requests';
const SETTINGS_TABLE = 'ai_website_settings';
const WORKSPACE_KEY = 'english-hub';
const PREFIX = 'external-web-app:';
const KIND = 'external-app';
const ALLOWED_STATUS = new Set(['pending', 'approved', 'rejected', 'cancelled']);
const MANAGER_ROLES = new Set([
  'admin', 'ttcm', 'to_truong', 'tổ trưởng', 'department_leader',
  'department leader', 'subject_leader', 'subject leader', 'leader', 'head',
]);

function env(name, fallback = '') {
  return String(process.env[name] || fallback || '').trim();
}

function json(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return '';
    if (/^(localhost|127\.|0\.0\.0\.0|\[?::1\]?$)/i.test(url.hostname)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeApp(value = {}) {
  const name = cleanText(value.name, 80);
  return {
    name,
    url: safeUrl(value.url),
    icon: cleanText(value.icon || name.slice(0, 2) || 'WEB', 3).toUpperCase(),
    description: cleanText(value.description, 220),
    groupId: ['plan', 'create', 'assess', 'manage'].includes(value.groupId) ? value.groupId : 'create',
  };
}

function normalizeEmbedView(value = {}) {
  const cropWidth = clamp(value.cropWidth, 18, 100, 88);
  const cropHeight = clamp(value.cropHeight, 18, 100, 78);
  const cropX = clamp(value.cropX, 0, 100 - cropWidth, (100 - cropWidth) / 2);
  const cropY = clamp(value.cropY, 0, 100 - cropHeight, (100 - cropHeight) / 2);
  return {
    zoom: clamp(value.zoom, 0.4, 2.4, 1),
    offsetX: clamp(value.offsetX, 0, 70, 0),
    offsetY: clamp(value.offsetY, 0, 85, 0),
    previewHeight: clamp(value.previewHeight, 420, 900, 620),
    canvasHeight: clamp(value.canvasHeight, 1000, 2600, 1600),
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  };
}

function parseRequestApp(request = {}) {
  try {
    return normalizeApp(JSON.parse(String(request.message || '{}')));
  } catch {
    return normalizeApp({ name: request.item_title, description: request.message });
  }
}

function hasPublishPermission(profile = {}) {
  const permissions = profile.permissions;
  const allowed = Array.isArray(permissions)
    ? permissions
    : Array.isArray(permissions?.allowed) ? permissions.allowed : [];
  return allowed.some((value) => [
    'department:publish', 'department:manage', 'admin:users', 'route:admin',
  ].includes(String(value || '').toLowerCase()));
}

function isManager(profile = {}) {
  const roleText = `${profile.role || ''} ${profile.position || ''}`.toLowerCase().trim();
  const roleMatch = [...MANAGER_ROLES].some((role) => roleText.includes(role));
  return Boolean(profile.approved !== false && (roleMatch || hasPublishPermission(profile)));
}

function withTimeout(promise, ms = 12000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Yêu cầu tới Supabase quá thời gian. Vui lòng thử lại.')), ms);
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
    db.from('profiles').select('id,email,full_name,role,approved,permissions').eq('id', authData.user.id).maybeSingle(),
  );
  if (profileError) throw Object.assign(new Error(profileError.message), { status: 403 });

  return {
    user: authData.user,
    profile: profile || {
      id: authData.user.id,
      email: authData.user.email || '',
      full_name: authData.user.user_metadata?.full_name || authData.user.email || 'Teacher',
      role: 'teacher',
      approved: true,
      permissions: { mode: 'all', allowed: [] },
    },
    db,
    hasServiceRole: Boolean(serviceKey),
  };
}

function externalFilter(query) {
  return query.or(`item_type.eq.${KIND},permission_id.like.${PREFIX}%`);
}

function requestAppUrl(request = {}) {
  try {
    return safeUrl(JSON.parse(String(request.message || '{}')).url);
  } catch {
    return '';
  }
}

async function approveRequest(session, req, res) {
  const id = cleanText(req.body?.id, 80);
  if (!id) return json(res, 400, { ok: false, message: 'Yêu cầu không hợp lệ.' });

  const [requestResult, settingsResult] = await withTimeout(Promise.all([
    session.db
      .from(TABLE)
      .select('id,requester_id,requester_email,requester_name,item_title,item_type,status,message')
      .eq('id', id)
      .single(),
    session.db
      .from(SETTINGS_TABLE)
      .select('workspace_key,tools,updated_at')
      .eq('workspace_key', WORKSPACE_KEY)
      .maybeSingle(),
  ]), 9000);

  if (requestResult.error) throw Object.assign(new Error(requestResult.error.message), { status: 400 });
  if (settingsResult.error) throw Object.assign(new Error(settingsResult.error.message), { status: 400 });

  const request = requestResult.data;
  const app = parseRequestApp(request);
  if (!app.name || !app.url) return json(res, 400, { ok: false, message: 'Yêu cầu không có tên hoặc URL hợp lệ.' });

  const currentTools = Array.isArray(settingsResult.data?.tools) ? settingsResult.data.tools : [];
  const duplicate = currentTools.find((tool) => tool?.kind === KIND && safeUrl(tool?.url) === app.url);
  const now = new Date().toISOString();
  const approvedTool = {
    ...(duplicate || {}),
    id: duplicate?.id || `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: app.name,
    url: app.url,
    icon: app.icon,
    description: app.description,
    audience: 'all',
    enabled: true,
    pinned: false,
    kind: KIND,
    groupId: app.groupId,
    requestId: request.id,
    submittedBy: request.requester_email || request.requester_name || '',
    approvedAt: now,
    embedView: normalizeEmbedView(req.body?.embedView || {}),
  };
  const nextTools = [
    ...currentTools.filter((tool) => tool?.id !== duplicate?.id),
    approvedTool,
  ];

  const [settingsWrite, requestWrite] = await withTimeout(Promise.all([
    session.db
      .from(SETTINGS_TABLE)
      .upsert({
        workspace_key: WORKSPACE_KEY,
        tools: nextTools,
        updated_by: session.user.id,
        updated_by_email: session.user.email || session.profile.email || '',
        updated_at: now,
      }, { onConflict: 'workspace_key' })
      .select('tools,updated_at')
      .single(),
    session.db
      .from(TABLE)
      .update({ status: 'approved', updated_at: now })
      .eq('id', id)
      .select('id,status,updated_at')
      .single(),
  ]), 10000);

  if (settingsWrite.error) throw Object.assign(new Error(settingsWrite.error.message), { status: 400 });
  if (requestWrite.error) throw Object.assign(new Error(requestWrite.error.message), { status: 400 });

  return json(res, 200, {
    ok: true,
    approvedTool,
    tools: Array.isArray(settingsWrite.data?.tools) ? settingsWrite.data.tools : nextTools,
    updatedAt: settingsWrite.data?.updated_at || now,
    request: requestWrite.data,
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const session = await authenticate(req);

    if (req.method === 'GET') {
      const mode = String(req.query?.mode || 'mine');
      if (mode === 'all' && !isManager(session.profile)) {
        return json(res, 403, { ok: false, message: 'Chỉ TTCM hoặc Admin được xem toàn bộ yêu cầu.' });
      }
      if (mode === 'all' && !session.hasServiceRole) {
        return json(res, 503, { ok: false, message: 'Vercel chưa có SUPABASE_SERVICE_ROLE_KEY nên TTCM chưa thể đọc yêu cầu của giáo viên.' });
      }

      let query = session.db
        .from(TABLE)
        .select('id,requester_id,requester_email,requester_name,permission_id,item_title,item_type,status,message,created_at,updated_at')
        .order('created_at', { ascending: false });
      query = externalFilter(query);
      if (mode !== 'all') query = query.eq('requester_id', session.user.id);

      const { data, error } = await withTimeout(query);
      if (error) throw Object.assign(new Error(error.message), { status: 400 });
      return json(res, 200, { ok: true, requests: data || [], manager: isManager(session.profile) });
    }

    if (req.method === 'POST') {
      const app = normalizeApp(req.body?.app || req.body || {});
      if (!app.name) return json(res, 400, { ok: false, message: 'Vui lòng nhập tên ứng dụng.' });
      if (!app.url) return json(res, 400, { ok: false, message: 'Chỉ chấp nhận website HTTPS hợp lệ.' });

      const { data: pendingRows, error: existingError } = await withTimeout(
        externalFilter(session.db.from(TABLE)
          .select('id,status,message,created_at')
          .eq('requester_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50)),
      );
      if (existingError) throw Object.assign(new Error(existingError.message), { status: 400 });
      const duplicate = (pendingRows || []).find((request) => requestAppUrl(request) === app.url);
      if (duplicate) {
        return json(res, 200, { ok: true, alreadyPending: true, request: duplicate, message: 'Website này đã có yêu cầu chờ duyệt.' });
      }

      const requestId = `${PREFIX}${session.user.id}:${Date.now()}`;
      const payload = {
        requester_id: session.user.id,
        requester_email: session.user.email || session.profile.email || '',
        requester_name: session.profile.full_name || session.user.user_metadata?.full_name || session.user.email || 'Teacher',
        permission_id: requestId,
        item_title: app.name,
        item_type: KIND,
        message: JSON.stringify({ ...app, version: 2 }),
        status: 'pending',
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await withTimeout(
        session.db.from(TABLE).insert(payload).select('id,status,created_at').single(),
      );
      if (error) throw Object.assign(new Error(error.message), { status: 400 });
      return json(res, 201, { ok: true, request: data, message: 'Đã gửi TTCM duyệt.' });
    }

    if (req.method === 'PATCH') {
      if (!isManager(session.profile)) {
        return json(res, 403, { ok: false, message: 'Chỉ TTCM hoặc Admin được cập nhật yêu cầu.' });
      }
      if (!session.hasServiceRole) {
        return json(res, 503, { ok: false, message: 'Vercel chưa có SUPABASE_SERVICE_ROLE_KEY nên chưa thể duyệt yêu cầu.' });
      }

      if (cleanText(req.body?.action, 20) === 'approve') {
        return approveRequest(session, req, res);
      }

      const id = cleanText(req.body?.id, 80);
      const status = cleanText(req.body?.status, 20);
      if (!id || !ALLOWED_STATUS.has(status)) return json(res, 400, { ok: false, message: 'Yêu cầu hoặc trạng thái không hợp lệ.' });

      const { data, error } = await withTimeout(
        session.db.from(TABLE)
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('id,status,updated_at')
          .single(),
      );
      if (error) throw Object.assign(new Error(error.message), { status: 400 });
      return json(res, 200, { ok: true, request: data });
    }

    return json(res, 405, { ok: false, message: 'Method not allowed.' });
  } catch (error) {
    console.error('[external-app-requests]', error);
    return json(res, Number(error?.status) || 500, { ok: false, message: error?.message || 'Không thể xử lý yêu cầu ứng dụng.' });
  }
}
