import { isSupabaseConfigured, supabase } from './supabase.js';
import { getPermissionItem } from './permissions.js';

export const PERMISSION_REQUESTS_EVENT = 'bes-permission-requests-updated';
export const PERMISSION_REQUESTS_TABLE = 'permission_requests';

const REQUEST_CACHE_MAX_AGE = 5 * 60 * 1000;
const requestCache = new Map();
const requestPromises = new Map();
let requestCacheGeneration = 0;

function invalidatePermissionRequestCache() {
  requestCacheGeneration += 1;
  requestCache.clear();
  requestPromises.clear();
}

function dispatchRequests() {
  invalidatePermissionRequestCache();
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PERMISSION_REQUESTS_EVENT));
}

function readRequestCache(key) {
  const cached = requestCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.storedAt >= REQUEST_CACHE_MAX_AGE) {
    requestCache.delete(key);
    return null;
  }
  return cached.items;
}

async function loadRequestList(key, queryFactory, { force = false } = {}) {
  const cached = !force ? readRequestCache(key) : null;
  if (cached) return cached;
  if (!force && requestPromises.has(key)) return requestPromises.get(key);

  const generation = requestCacheGeneration;
  let task;
  task = Promise.resolve()
    .then(queryFactory)
    .then(({ data, error }) => {
      if (error) throw error;
      const items = data || [];
      if (generation === requestCacheGeneration) {
        requestCache.set(key, { items, storedAt: Date.now() });
      }
      return items;
    })
    .finally(() => {
      if (requestPromises.get(key) === task) requestPromises.delete(key);
    });
  requestPromises.set(key, task);
  return task;
}

function titleForItem(item, language = 'vi') {
  if (!item) return '';
  return language === 'vi' ? item.titleVi || item.title || item.id : item.title || item.titleVi || item.id;
}

function typeForItem(item) {
  if (!item) return 'tool';
  return item.type || item.section || (item.route ? 'route' : 'tool');
}

export async function requestPermission({ user, permissionId, item = null, message = '', language = 'vi' }) {
  if (!isSupabaseConfigured) return { ok: false, message: language === 'vi' ? 'Chưa cấu hình Supabase.' : 'Supabase is not configured.' };
  if (!user?.id) return { ok: false, message: language === 'vi' ? 'Vui lòng đăng nhập để xin quyền.' : 'Please sign in to request access.' };
  if (!permissionId) return { ok: false, message: language === 'vi' ? 'Không xác định được quyền cần xin.' : 'Permission id is missing.' };

  const permissionItem = item || getPermissionItem(permissionId) || { id: permissionId, title: permissionId, titleVi: permissionId, type: 'route' };

  const existing = await supabase
    .from(PERMISSION_REQUESTS_TABLE)
    .select('id,status')
    .eq('requester_id', user.id)
    .eq('permission_id', permissionId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (existing.error && existing.error.code !== 'PGRST116') return { ok: false, message: existing.error.message };
  if (existing.data) {
    return {
      ok: true,
      alreadyPending: true,
      message: language === 'vi' ? 'Bạn đã gửi yêu cầu quyền này. Vui lòng chờ admin duyệt.' : 'You already requested this access. Please wait for admin approval.',
    };
  }

  const payload = {
    requester_id: user.id,
    requester_email: user.email || '',
    requester_name: user.name || user.email || 'Teacher',
    permission_id: permissionId,
    item_title: titleForItem(permissionItem, language),
    item_type: typeForItem(permissionItem),
    message: String(message || '').trim(),
    status: 'pending',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(PERMISSION_REQUESTS_TABLE)
    .insert(payload)
    .select('id,status')
    .maybeSingle();

  if (error) return { ok: false, message: error.message };
  dispatchRequests();
  return {
    ok: true,
    request: data,
    message: language === 'vi' ? 'Đã gửi yêu cầu. Admin sẽ thấy yêu cầu này trong trang Quản trị.' : 'Request sent. Admins will see it on the Admin page.',
  };
}

export async function getMyPermissionRequests(userId, { force = false } = {}) {
  if (!isSupabaseConfigured || !userId) return [];
  const key = `mine:${String(userId)}`;
  return loadRequestList(key, () => supabase
    .from(PERMISSION_REQUESTS_TABLE)
    .select('id,permission_id,item_title,item_type,status,message,created_at,updated_at')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false }), { force });
}

export async function getPermissionRequests({ force = false } = {}) {
  if (!isSupabaseConfigured) return [];
  return loadRequestList('all', () => supabase
    .from(PERMISSION_REQUESTS_TABLE)
    .select('id,requester_id,requester_email,requester_name,permission_id,item_title,item_type,status,message,created_at,updated_at')
    .order('created_at', { ascending: false }), { force });
}

export async function updatePermissionRequestStatus(id, status) {
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase is not configured.' };
  const cleanStatus = ['pending', 'approved', 'rejected', 'cancelled'].includes(status) ? status : 'pending';
  const { error } = await supabase
    .from(PERMISSION_REQUESTS_TABLE)
    .update({ status: cleanStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  dispatchRequests();
  return { ok: true };
}
