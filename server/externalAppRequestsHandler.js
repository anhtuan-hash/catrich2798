import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const TABLE = 'permission_requests';
const SETTINGS_TABLE = 'ai_website_settings';
const WORKSPACE_KEY = 'english-hub';
const PREFIX = 'external-web-app:';
const KIND = 'external-app';
const SOURCE_URL = 'url';
const SOURCE_HTML = 'html';
const MAX_HTML_BYTES = 2_000_000;
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

function cleanFileName(value, fallback = 'application.html') {
  const source = cleanText(value || fallback, 140)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '');
  return source || fallback;
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

function rawHtml(value) {
  return String(value || '').replace(/^\uFEFF/, '');
}

function htmlByteLength(value) {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function looksLikeHtml(value) {
  const html = String(value || '').trim();
  return Boolean(html && /<!doctype\s+html|<html(?:\s|>)|<head(?:\s|>)|<body(?:\s|>)/i.test(html));
}

function htmlHash(value) {
  const html = rawHtml(value);
  return html ? createHash('sha256').update(html, 'utf8').digest('hex') : '';
}

function sourceTypeOf(value = {}) {
  if (value.sourceType === SOURCE_HTML || value.htmlContent) return SOURCE_HTML;
  return SOURCE_URL;
}

function normalizeApp(value = {}) {
  const name = cleanText(value.name, 80);
  const sourceType = sourceTypeOf(value);
  const htmlContent = sourceType === SOURCE_HTML ? rawHtml(value.htmlContent) : '';
  const url = sourceType === SOURCE_URL ? safeUrl(value.url) : '';
  return {
    name,
    sourceType,
    url,
    embedUrl: sourceType === SOURCE_URL ? safeUrl(value.embedUrl) : '',
    htmlContent,
    fileName: sourceType === SOURCE_HTML
      ? cleanFileName(value.fileName, `${name || 'application'}.html`)
      : '',
    contentHash: sourceType === SOURCE_HTML ? htmlHash(htmlContent) : '',
    icon: cleanText(value.icon || (sourceType === SOURCE_HTML ? 'HTM' : name.slice(0, 2) || 'WEB'), 3).toUpperCase(),
    description: cleanText(value.description, 220),
    groupId: ['plan', 'create', 'assess', 'manage'].includes(value.groupId) ? value.groupId : 'create',
  };
}

function validateApp(app = {}) {
  if (!app.name) return 'Vui lòng nhập tên ứng dụng.';
  if (app.sourceType === SOURCE_HTML) {
    if (!app.htmlContent) return 'Vui lòng chọn file HTML.';
    if (htmlByteLength(app.htmlContent) > MAX_HTML_BYTES) return 'File HTML vượt quá 2 MB. Hãy giảm dung lượng trước khi gửi.';
    if (!looksLikeHtml(app.htmlContent)) return 'File đã chọn không có cấu trúc HTML hợp lệ.';
    return '';
  }
  if (!app.url) return 'Chỉ chấp nhận website HTTPS hợp lệ.';
  return '';
}

function appIdentity(app = {}) {
  if (app.sourceType === SOURCE_HTML) return app.contentHash ? `html:${app.contentHash}` : '';
  return app.url ? `url:${app.url}` : '';
}

function normalizeEmbedView(value = {}) {
  const cropWidth = clamp(value.cropWidth, 18, 100, 100);
  const cropHeight = clamp(value.cropHeight, 18, 100, 100);
  const cropX = clamp(value.cropX, 0, 100 - cropWidth, 0);
  const cropY = clamp(value.cropY, 0, 100 - cropHeight, 0);
  return {
    zoom: clamp(value.zoom, 0.4, 2.4, 1),
    offsetX: clamp(value.offsetX, 0, 70, 0),
    offsetY: clamp(value.offsetY, 0, 85, 0),
    previewHeight: clamp(value.previewHeight, 420, 900, 900),
    canvasHeight: clamp(value.canvasHeight, 1000, 2600, 1000),
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  };
}

function normalizeEmbedConfig(value = {}, app = {}) {
  const sourceUrl = app.sourceType === SOURCE_URL ? safeUrl(app.url) : '';
  return {
    embedUrl: app.sourceType === SOURCE_URL
      ? (safeUrl(value?.embedUrl) || safeUrl(app.embedUrl) || sourceUrl)
      : '',
    hideBrianHeader: Boolean(value?.hideBrianHeader),
    hideBrianFooter: Boolean(value?.hideBrianFooter),
    allowFullscreen: value?.allowFullscreen !== false,
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

function requestAppIdentity(request = {}) {
  return appIdentity(parseRequestApp(request));
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
  const validationError = validateApp(app);
  if (validationError) return json(res, 400, { ok: false, message: validationError });

  const currentTools = Array.isArray(settingsResult.data?.tools) ? settingsResult.data.tools : [];
  const identity = appIdentity(app);
  const duplicate = currentTools.find((tool) => tool?.kind === KIND && appIdentity(normalizeApp(tool)) === identity);
  const now = new Date().toISOString();
  const approvedTool = {
    ...(duplicate || {}),
    id: duplicate?.id || `${app.sourceType === SOURCE_HTML ? 'html' : 'web'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: app.name,
    sourceType: app.sourceType,
    url: app.url,
    embedUrl: app.embedUrl,
    htmlContent: app.htmlContent,
    fileName: app.fileName,
    contentHash: app.contentHash,
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
    embedConfig: normalizeEmbedConfig(req.body?.embedConfig || {}, app),
    embedView: normalizeEmbedView({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      previewHeight: 900,
      canvasHeight: 1000,
      cropX: 0,
      cropY: 0,
      cropWidth: 100,
      cropHeight: 100,
    }),
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
  ]), 12000);

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

export default async function externalAppRequestsHandler(req, res) {
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
      const validationError = validateApp(app);
      if (validationError) return json(res, 400, { ok: false, message: validationError });

      const { data: pendingRows, error: existingError } = await withTimeout(
        externalFilter(session.db.from(TABLE)
          .select('id,status,message,created_at')
          .eq('requester_id', session.user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(50)),
      );
      if (existingError) throw Object.assign(new Error(existingError.message), { status: 400 });
      const identity = appIdentity(app);
      const duplicate = (pendingRows || []).find((request) => requestAppIdentity(request) === identity);
      if (duplicate) {
        return json(res, 200, {
          ok: true,
          alreadyPending: true,
          request: duplicate,
          message: app.sourceType === SOURCE_HTML
            ? 'File HTML này đã có yêu cầu chờ duyệt.'
            : 'Website này đã có yêu cầu chờ duyệt.',
        });
      }

      const requestId = `${PREFIX}${session.user.id}:${Date.now()}`;
      const payload = {
        requester_id: session.user.id,
        requester_email: session.user.email || session.profile.email || '',
        requester_name: session.profile.full_name || session.user.user_metadata?.full_name || session.user.email || 'Teacher',
        permission_id: requestId,
        item_title: app.name,
        item_type: KIND,
        message: JSON.stringify({ ...app, version: 4 }),
        status: 'pending',
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await withTimeout(
        session.db.from(TABLE).insert(payload).select('id,status,created_at').single(),
        12000,
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
