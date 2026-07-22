const CLOUD_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(import.meta.env.VITE_DEPARTMENT_CLOUD_ENABLED || '').trim().toLowerCase(),
);
const CLOUD_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const CLOUD_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const CONFIGURED_DEPARTMENT_ID = String(import.meta.env.VITE_DEPARTMENT_ID || '');
const DEV_ACCESS_TOKEN = String(import.meta.env.VITE_DEPARTMENT_DEV_ACCESS_TOKEN || '');

const COLLECTION_TYPES = Object.freeze({
  tasks: 'tasks',
  records: 'records',
  plans: 'plans',
  calendar: 'calendar',
  meetings: 'meetings',
  evidence: 'evidence',
  reportHistory: 'report_history',
  notifications: 'notifications',
});

const SAVE_TIMERS = new Map();

export const isDepartmentCloudConfigured = Boolean(
  CLOUD_ENABLED && CLOUD_URL && CLOUD_ANON_KEY && CONFIGURED_DEPARTMENT_ID,
);

export function createLocalDepartmentContext() {
  return {
    mode: 'local',
    status: 'local',
    role: 'department_head',
    roleLabel: 'TTCM',
    displayName: 'Demo Teacher Admin',
    email: '',
    departmentId: CONFIGURED_DEPARTMENT_ID || null,
    accessToken: '',
    canManage: true,
    message: CLOUD_ENABLED
      ? 'Supabase chưa đủ cấu hình. Dữ liệu đang được lưu cục bộ trên thiết bị này.'
      : 'Dữ liệu đang được lưu cục bộ trên thiết bị này.',
    collections: {},
  };
}

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function extractAccessToken(value) {
  if (!value) return '';
  const parsed = typeof value === 'string' ? safeParse(value) : value;
  if (!parsed) return '';
  if (typeof parsed.access_token === 'string') return parsed.access_token;
  if (typeof parsed.currentSession?.access_token === 'string') return parsed.currentSession.access_token;
  if (typeof parsed.session?.access_token === 'string') return parsed.session.access_token;
  if (Array.isArray(parsed) && typeof parsed[0]?.access_token === 'string') return parsed[0].access_token;
  return '';
}

function readAccessToken() {
  if (DEV_ACCESS_TOKEN) return DEV_ACCESS_TOKEN;
  if (typeof window === 'undefined') return '';

  try {
    const injected = extractAccessToken(window.__BRIAN_SUPABASE_SESSION__);
    if (injected) return injected;

    const explicit = localStorage.getItem('brian-department-session')
      || localStorage.getItem('brian-supabase-session')
      || localStorage.getItem('brian-department-access-token');
    if (explicit && !explicit.trim().startsWith('{')) return explicit.trim();
    const explicitToken = extractAccessToken(explicit);
    if (explicitToken) return explicitToken;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !/^sb-.*-auth-token$/.test(key)) continue;
      const token = extractAccessToken(localStorage.getItem(key));
      if (token) return token;
    }
  } catch (error) {
    console.warn('[Department cloud] could not inspect browser session', error);
  }

  return '';
}

async function request(path, { method = 'GET', body, accessToken, prefer } = {}) {
  const response = await fetch(`${CLOUD_URL}${path}`, {
    method,
    headers: {
      apikey: CLOUD_ANON_KEY,
      Authorization: `Bearer ${accessToken || CLOUD_ANON_KEY}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const error = new Error(detail || `Supabase request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? safeParse(text) ?? text : null;
}

function roleLabel(role) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'department_head') return 'TTCM';
  if (role === 'teacher') return 'Giáo viên';
  return 'Chỉ xem';
}

function groupEntities(rows = []) {
  const collections = {};
  rows.forEach((row) => {
    if (!row?.entity_type || !row?.payload) return;
    if (!collections[row.entity_type]) collections[row.entity_type] = [];
    if (row.external_id === '__empty__' || row.payload.__department_empty === true) return;
    collections[row.entity_type].push(row.payload);
  });
  return collections;
}

export async function initializeDepartmentCloud() {
  if (!isDepartmentCloudConfigured) return createLocalDepartmentContext();

  const accessToken = readAccessToken();
  if (!accessToken) {
    return {
      ...createLocalDepartmentContext(),
      mode: 'signed_out',
      status: 'warning',
      role: 'viewer',
      roleLabel: 'Chưa đăng nhập',
      canManage: false,
      message: 'Đã bật Supabase cho Tổ chuyên môn nhưng chưa nhận được phiên đăng nhập Brian.',
    };
  }

  try {
    const user = await request('/auth/v1/user', { accessToken });
    const membershipQuery = new URLSearchParams({
      select: 'department_id,role,display_name,email,active',
      user_id: `eq.${user.id}`,
      department_id: `eq.${CONFIGURED_DEPARTMENT_ID}`,
      active: 'eq.true',
      limit: '1',
    });
    const memberships = await request(`/rest/v1/department_members?${membershipQuery}`, { accessToken });
    const membership = Array.isArray(memberships) ? memberships[0] : null;

    if (!membership) {
      return {
        ...createLocalDepartmentContext(),
        mode: 'forbidden',
        status: 'error',
        role: 'viewer',
        roleLabel: 'Chưa được cấp quyền',
        displayName: user.user_metadata?.full_name || user.email || 'Người dùng Brian',
        email: user.email || '',
        accessToken,
        canManage: false,
        message: 'Tài khoản này chưa được thêm vào danh sách thành viên Tổ chuyên môn.',
      };
    }

    const entityQuery = new URLSearchParams({
      select: 'entity_type,external_id,payload,updated_at',
      department_id: `eq.${membership.department_id}`,
      order: 'created_at.asc',
    });
    const rows = await request(`/rest/v1/department_entities?${entityQuery}`, { accessToken });
    const role = membership.role || 'viewer';

    return {
      mode: 'cloud',
      status: 'online',
      role,
      roleLabel: roleLabel(role),
      displayName: membership.display_name || user.user_metadata?.full_name || user.email || 'Người dùng Brian',
      email: membership.email || user.email || '',
      departmentId: membership.department_id,
      accessToken,
      canManage: role === 'admin' || role === 'department_head',
      message: role === 'teacher'
        ? 'Đã kết nối Supabase. Giáo viên đang sử dụng quyền chỉ xem.'
        : 'Đã kết nối và đồng bộ dữ liệu Supabase.',
      collections: groupEntities(Array.isArray(rows) ? rows : []),
    };
  } catch (error) {
    console.error('[Department cloud] initialization failed', error);
    return {
      ...createLocalDepartmentContext(),
      mode: 'offline',
      status: 'error',
      role: 'viewer',
      roleLabel: 'Mất kết nối',
      canManage: false,
      message: 'Không thể kết nối Supabase. Ứng dụng giữ bản sao cục bộ ở chế độ chỉ xem.',
      error: error.message,
    };
  }
}

export function collectionFromContext(context, key, fallback) {
  const type = COLLECTION_TYPES[key] || key;
  const collections = context?.collections;
  if (!collections || !Object.prototype.hasOwnProperty.call(collections, type)) return fallback;
  return Array.isArray(collections[type]) ? collections[type] : fallback;
}

export function scheduleDepartmentCollectionSave(context, key, items, delay = 650) {
  if (context?.mode !== 'cloud' || !context.canManage || !context.departmentId || !context.accessToken) return;
  const entityType = COLLECTION_TYPES[key] || key;
  const timerKey = `${context.departmentId}:${entityType}`;
  window.clearTimeout(SAVE_TIMERS.get(timerKey));
  SAVE_TIMERS.set(timerKey, window.setTimeout(async () => {
    try {
      await request('/rest/v1/rpc/department_replace_collection', {
        method: 'POST',
        accessToken: context.accessToken,
        body: {
          p_department_id: context.departmentId,
          p_entity_type: entityType,
          p_items: Array.isArray(items) ? items : [],
        },
      });
    } catch (error) {
      console.error(`[Department cloud] failed to save ${entityType}`, error);
      window.dispatchEvent(new CustomEvent('department-cloud-error', {
        detail: { entityType, message: error.message },
      }));
    } finally {
      SAVE_TIMERS.delete(timerKey);
    }
  }, delay));
}

export function shouldBlockReadOnlyMutation(target) {
  const control = target?.closest?.('button,input,textarea,select,label');
  if (!control) return false;
  if (control.closest('.app-header') || control.closest('.global-notification-drawer')) return false;

  const aria = control.getAttribute?.('aria-label') || '';
  const normalizedAria = aria.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const text = `${aria} ${control.textContent || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/^(tim|loc|sap xep)/.test(normalizedAria)) return false;
  if (control.tagName === 'SELECT' && /(loc|sap xep|che do)/.test(text)) return false;
  if (control.matches?.('input[type="search"]')) return false;
  if (control.matches?.('input[type="checkbox"],input[type="range"],input[type="file"],input[type="date"],input[type="time"],textarea')) return true;
  if (control.tagName === 'SELECT') return true;
  return /(tao|them|nop|chinh sua|xoa|duyet|xac minh|luu|gui|bat dau|hoan thanh|yeu cau|ket thuc|danh dau)/.test(text)
    || control.classList?.contains('danger')
    || control.classList?.contains('success')
    || control.classList?.contains('warning')
    || control.classList?.contains('primary');
}
