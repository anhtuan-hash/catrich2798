import { RELEASE_INFO } from '../data/release.js';
import { isSupabaseConfigured, supabase } from './supabase.js';

const STORAGE_KEY = 'bes-feature-flags-v1';
const SNAPSHOT_KEY = 'bes-feature-flags-snapshots-v1';
const EVENT_NAME = 'bes-feature-flags-updated';
const CLOUD_TABLE = 'bes_release_settings';
const CLOUD_ROW_ID = 'feature-flags';

export const FEATURE_FLAG_DEFINITIONS = [
  { id: 'customLauncher', vi: 'Launcher tùy biến', en: 'Custom Launcher', descVi: 'Kéo thả, ghim, ẩn và nhóm ứng dụng.', desc: 'Drag, pin, hide and group applications.', defaultRollout: 'all' },
  { id: 'workspaceTabs', vi: 'Workspace Tabs', en: 'Workspace Tabs', descVi: 'Mở và khôi phục nhiều ứng dụng theo tab.', desc: 'Open and restore multiple apps as tabs.', defaultRollout: 'all' },
  { id: 'contentTransfer', vi: 'Luồng dữ liệu liên ứng dụng', en: 'Cross-app transfer', descVi: 'Gửi nội dung giữa các ứng dụng.', desc: 'Transfer content between applications.', defaultRollout: 'all' },
  { id: 'aiBubble', vi: 'Bong bóng Brian AI', en: 'Brian AI bubble', descVi: 'Trợ lí AI nổi trên toàn site.', desc: 'Floating AI assistant across the site.', defaultRollout: 'all' },
  { id: 'aiActions', vi: 'Hành động AI', en: 'AI Actions', descVi: 'Cho phép AI chuẩn bị và thực hiện tác vụ có xác nhận.', desc: 'Allow confirmed AI action plans.', defaultRollout: 'all' },
  { id: 'voiceMode', vi: 'Chế độ giọng nói', en: 'Voice Mode', descVi: 'Nhập và nghe phản hồi bằng giọng nói.', desc: 'Voice input and spoken responses.', defaultRollout: 'all' },
  { id: 'newsroomReader', vi: 'Newsroom Reader Mode', en: 'Newsroom Reader Mode', descVi: 'Trình đọc báo toàn màn hình.', desc: 'Full-screen news reader.', defaultRollout: 'all' },
  { id: 'uploadSecurity', vi: 'Upload Security Gateway', en: 'Upload Security Gateway', descVi: 'Kiểm tra file trước khi tải lên.', desc: 'Validate files before upload.', defaultRollout: 'all' },
];

const VALID_ROLLOUTS = new Set(['off', 'admin', 'leaders', 'all']);

function safeParse(raw, fallback) {
  try { return JSON.parse(raw) ?? fallback; } catch { return fallback; }
}

export function defaultFeatureFlags() {
  return {
    schemaVersion: 1,
    releaseVersion: RELEASE_INFO.version,
    updatedAt: new Date().toISOString(),
    flags: Object.fromEntries(FEATURE_FLAG_DEFINITIONS.map((item) => [item.id, item.defaultRollout])),
  };
}

export function normalizeFeatureFlags(raw) {
  const base = defaultFeatureFlags();
  const input = raw && typeof raw === 'object' ? raw : {};
  const flags = { ...base.flags };
  for (const def of FEATURE_FLAG_DEFINITIONS) {
    const value = input.flags?.[def.id];
    flags[def.id] = VALID_ROLLOUTS.has(value) ? value : def.defaultRollout;
  }
  return {
    schemaVersion: 1,
    releaseVersion: String(input.releaseVersion || base.releaseVersion),
    updatedAt: String(input.updatedAt || base.updatedAt),
    flags,
  };
}


function persistLocal(config) {
  if (typeof window === 'undefined') return false;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); return true; } catch { return false; }
}

function emitUpdate(config) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: config }));
}

export function getFeatureFlags() {
  if (typeof window === 'undefined') return defaultFeatureFlags();
  return normalizeFeatureFlags(safeParse(window.localStorage.getItem(STORAGE_KEY), null));
}

export function saveFeatureFlags(next, { snapshot = true, actor = null } = {}) {
  if (typeof window === 'undefined') return normalizeFeatureFlags(next);
  const current = getFeatureFlags();
  if (snapshot) createFeatureFlagSnapshot(current, actor, 'before-update');
  const normalized = normalizeFeatureFlags({ ...next, updatedAt: new Date().toISOString(), releaseVersion: RELEASE_INFO.version });
  persistLocal(normalized);
  emitUpdate(normalized);
  window.dispatchEvent(new CustomEvent('bes-audit', { detail: { action: 'feature_flags_updated', category: 'release', status: 'success', metadata: { flags: normalized.flags } } }));
  return normalized;
}


export async function loadFeatureFlagsFromCloud() {
  const local = getFeatureFlags();
  if (!isSupabaseConfigured || !supabase) return { config: local, cloud: false, source: 'local', error: null };
  try {
    const { data, error } = await supabase.from(CLOUD_TABLE).select('config, updated_at').eq('id', CLOUD_ROW_ID).maybeSingle();
    if (error) throw error;
    if (!data?.config) return { config: local, cloud: false, source: 'local-empty-cloud', error: null };
    const normalized = normalizeFeatureFlags(data.config);
    persistLocal(normalized);
    emitUpdate(normalized);
    return { config: normalized, cloud: true, source: 'cloud', error: null };
  } catch (error) {
    return { config: local, cloud: false, source: 'local-fallback', error };
  }
}

export async function saveFeatureFlagsToCloud(next, { snapshot = true, actor = null } = {}) {
  const normalized = saveFeatureFlags(next, { snapshot, actor });
  if (!isSupabaseConfigured || !supabase) return { config: normalized, cloud: false, source: 'local', error: null };
  try {
    const { error } = await supabase.from(CLOUD_TABLE).upsert({ id: CLOUD_ROW_ID, config: normalized }, { onConflict: 'id' });
    if (error) throw error;
    return { config: normalized, cloud: true, source: 'cloud', error: null };
  } catch (error) {
    return { config: normalized, cloud: false, source: 'local-fallback', error };
  }
}

export function setFeatureRollout(id, rollout, actor = null) {
  if (!FEATURE_FLAG_DEFINITIONS.some((item) => item.id === id)) throw new Error(`Unknown feature flag: ${id}`);
  if (!VALID_ROLLOUTS.has(rollout)) throw new Error(`Invalid rollout: ${rollout}`);
  const current = getFeatureFlags();
  return saveFeatureFlags({ ...current, flags: { ...current.flags, [id]: rollout } }, { actor });
}

function roleOf(user) {
  return String(user?.role || '').trim().toLowerCase();
}

export function isFeatureEnabled(id, user = null, config = getFeatureFlags()) {
  const rollout = config.flags?.[id] || 'off';
  const role = roleOf(user);
  if (rollout === 'all') return true;
  if (rollout === 'admin') return role === 'admin';
  if (rollout === 'leaders') return ['admin', 'ttcm', 'to_truong', 'department_leader', 'subject_leader', 'leader'].includes(role);
  return false;
}

export function subscribeFeatureFlags(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => callback?.(normalizeFeatureFlags(event.detail || getFeatureFlags()));
  const storageHandler = (event) => { if (event.key === STORAGE_KEY) callback?.(getFeatureFlags()); };
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);
  let channel = null;
  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase.channel('bes-release-feature-flags-v1087').on('postgres_changes', {
        event: '*', schema: 'public', table: CLOUD_TABLE, filter: `id=eq.${CLOUD_ROW_ID}`,
      }, (payload) => {
        if (!payload?.new?.config) return;
        const normalized = normalizeFeatureFlags(payload.new.config);
        persistLocal(normalized);
        callback?.(normalized);
      }).subscribe();
    } catch { channel = null; }
  }
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => null);
  };
}

export function createFeatureFlagSnapshot(config = getFeatureFlags(), actor = null, reason = 'manual') {
  if (typeof window === 'undefined') return null;
  const snapshots = listFeatureFlagSnapshots();
  const item = {
    id: `flag-snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    actor: String(actor?.email || actor?.id || actor || 'local-admin'),
    reason,
    config: normalizeFeatureFlags(config),
  };
  window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify([item, ...snapshots].slice(0, 12)));
  return item;
}

export function listFeatureFlagSnapshots() {
  if (typeof window === 'undefined') return [];
  const raw = safeParse(window.localStorage.getItem(SNAPSHOT_KEY), []);
  return Array.isArray(raw) ? raw.filter((item) => item?.id && item?.config).slice(0, 12) : [];
}

export function restoreFeatureFlagSnapshot(id, actor = null) {
  const item = listFeatureFlagSnapshots().find((entry) => entry.id === id);
  if (!item) throw new Error('Snapshot not found.');
  createFeatureFlagSnapshot(getFeatureFlags(), actor, 'before-rollback');
  const restored = saveFeatureFlags(item.config, { snapshot: false, actor });
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes-audit', { detail: { action: 'feature_flags_rollback', category: 'release', status: 'success', metadata: { snapshotId: id } } }));
  return restored;
}

export async function restoreFeatureFlagSnapshotToCloud(id, actor = null) {
  const restored = restoreFeatureFlagSnapshot(id, actor);
  return saveFeatureFlagsToCloud(restored, { snapshot: false, actor });
}

export function resetFeatureFlags(actor = null) {
  return saveFeatureFlags(defaultFeatureFlags(), { actor });
}
