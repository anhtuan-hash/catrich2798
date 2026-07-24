import { isSupabaseConfigured, supabase } from './supabase.js';

const LOCAL_KEY = 'bes-ai-website-launcher-v1';
const EVENT_NAME = 'bes-ai-websites-updated';
const WORK_TABLE = 'work_hub_items';
const SOURCE_MODULE = 'english-hub-ai-websites';
const SYSTEM_CONFIG_KIND = 'ai_websites';
const HIDDEN_WORK_DATE = '2000-01-01T00:00:00.000Z';

export function safeAiWebsiteUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

export function normalizeAiWebsiteTool(tool = {}, index = 0) {
  const name = String(tool.name || '').trim();
  return {
    id: String(tool.id || `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    name,
    url: String(tool.url || '').trim(),
    icon: String(tool.icon || name.slice(0, 2) || 'AI').trim().slice(0, 3).toUpperCase(),
    description: String(tool.description || '').trim(),
    audience: ['all', 'admin', 'leader', 'teacher'].includes(tool.audience) ? tool.audience : 'all',
    enabled: tool.enabled !== false,
    pinned: Boolean(tool.pinned),
  };
}

function normalizeSnapshot(value = {}) {
  const sourceTools = Array.isArray(value) ? value : (Array.isArray(value.tools) ? value.tools : []);
  return {
    tools: sourceTools
      .map(normalizeAiWebsiteTool)
      .filter((tool) => tool.name && safeAiWebsiteUrl(tool.url)),
    updatedAt: String(value.updatedAt || value.updated_at || new Date().toISOString()),
    updatedBy: String(value.updatedBy || value.updated_by || ''),
    source: String(value.source || 'local'),
    error: String(value.error || ''),
  };
}

export function readAiWebsiteSettingsLocal() {
  if (typeof window === 'undefined') return normalizeSnapshot();
  try {
    return normalizeSnapshot(JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '[]'));
  } catch {
    return normalizeSnapshot();
  }
}

function writeAiWebsiteSettingsLocal(snapshot) {
  const clean = normalizeSnapshot(snapshot);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(clean)); } catch { /* optional cache */ }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clean }));
  }
  return clean;
}

export function getAiWebsiteAudience(user) {
  const role = `${user?.role || ''} ${user?.position || ''}`.toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (
    role.includes('ttcm') || role.includes('tổ trưởng') || role.includes('to_truong') ||
    role.includes('department') || role.includes('subject') || role.includes('leader') || role.includes('head')
  ) return 'leader';
  return 'teacher';
}

export function canManageAiWebsites(user) {
  const audience = getAiWebsiteAudience(user);
  return audience === 'admin' || audience === 'leader';
}

export function aiWebsiteVisibleForUser(tool, user) {
  if (!tool?.enabled) return false;
  const audience = getAiWebsiteAudience(user);
  return tool.audience === 'all' || tool.audience === audience || audience === 'admin';
}

function parseRowPayload(row = {}) {
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  if (metadata.system_config === SYSTEM_CONFIG_KIND && Array.isArray(metadata.tools)) {
    return normalizeSnapshot({
      tools: metadata.tools,
      updatedAt: metadata.config_updated_at || metadata.updatedAt || row.created_at || row.updated_at,
      updatedBy: metadata.config_updated_by || metadata.updatedBy || row.created_by || '',
      source: 'cloud-work-hub',
      error: '',
    });
  }

  try {
    const parsed = JSON.parse(String(row.description || ''));
    if (parsed?.system_config === SYSTEM_CONFIG_KIND || Array.isArray(parsed?.tools)) {
      return normalizeSnapshot({ ...parsed, source: 'cloud-work-hub', error: '' });
    }
  } catch { /* legacy description is optional */ }
  return null;
}

async function readSharedCloudSnapshot() {
  const { data, error } = await supabase
    .from(WORK_TABLE)
    .select('id,metadata,description,created_at,updated_at,created_by,owner_id')
    .eq('source_module', SOURCE_MODULE)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  for (const row of data || []) {
    const snapshot = parseRowPayload(row);
    if (snapshot) return { snapshot, row };
  }
  return { snapshot: null, row: null };
}

function buildSharedRow(user, clean) {
  const now = clean.updatedAt || new Date().toISOString();
  const updatedBy = user.id || user.email || '';
  const metadata = {
    system_config: SYSTEM_CONFIG_KIND,
    schema_version: 2,
    hidden_from_work_hub: true,
    tools: clean.tools,
    config_updated_at: now,
    config_updated_by: updatedBy,
  };
  return {
    title: '\u200B',
    description: '',
    item_type: 'task',
    status: 'archived',
    priority: 'normal',
    visibility: 'public',
    owner_id: user.id,
    created_by: user.id,
    assignee_ids: [],
    watcher_ids: [],
    due_at: null,
    source_module: SOURCE_MODULE,
    metadata,
    updated_at: HIDDEN_WORK_DATE,
  };
}

async function publishSharedCloudSnapshot(user, clean) {
  const row = buildSharedRow(user, clean);
  const existing = await readSharedCloudSnapshot();

  if (existing.row?.id) {
    const { error: updateError } = await supabase
      .from(WORK_TABLE)
      .update({
        title: row.title,
        description: row.description,
        metadata: row.metadata,
        visibility: 'public',
        status: 'archived',
        due_at: null,
        updated_at: HIDDEN_WORK_DATE,
      })
      .eq('id', existing.row.id);
    if (!updateError) return true;
  }

  const { error: insertError } = await supabase.from(WORK_TABLE).insert(row);
  if (insertError) throw insertError;
  return true;
}

async function publishLocalMigration(user, local) {
  if (!canManageAiWebsites(user) || !local.tools.length || !supabase) return null;
  const now = new Date().toISOString();
  const clean = normalizeSnapshot({ tools: local.tools, updatedAt: now, updatedBy: user.id || user.email || '' });
  await publishSharedCloudSnapshot(user, clean);
  return writeAiWebsiteSettingsLocal({ ...clean, source: 'cloud-migrated', error: '' });
}

export async function loadAiWebsiteSettings(user) {
  const local = readAiWebsiteSettingsLocal();
  if (!user || !isSupabaseConfigured || !supabase) return local;

  try {
    const cloud = await readSharedCloudSnapshot();
    if (!cloud.snapshot) {
      const migrated = await publishLocalMigration(user, local);
      return migrated || writeAiWebsiteSettingsLocal({
        tools: local.tools,
        source: local.tools.length ? 'local-cache' : 'cloud-empty',
        updatedAt: local.updatedAt || new Date().toISOString(),
        error: '',
      });
    }
    return writeAiWebsiteSettingsLocal(cloud.snapshot);
  } catch (error) {
    console.warn('[AI websites] shared work-hub load failed; using local cache', error);
    return writeAiWebsiteSettingsLocal({
      ...local,
      source: 'local-fallback',
      error: 'Không thể tải cấu hình dùng chung. Hệ thống đang dùng bản lưu gần nhất trên thiết bị.',
    });
  }
}

export async function saveAiWebsiteSettings(user, tools) {
  if (!canManageAiWebsites(user)) throw new Error('Chỉ Admin hoặc TTCM được quản lý website AI.');
  const now = new Date().toISOString();
  const clean = normalizeSnapshot({ tools, updatedAt: now, updatedBy: user.id || user.email || '' });
  const previous = readAiWebsiteSettingsLocal();
  writeAiWebsiteSettingsLocal({ ...clean, source: isSupabaseConfigured ? 'pending-cloud' : 'local', error: '' });

  if (!isSupabaseConfigured || !supabase) return { snapshot: clean, cloud: false };

  try {
    await publishSharedCloudSnapshot(user, clean);
    const snapshot = await loadAiWebsiteSettings(user);
    return { snapshot, cloud: true };
  } catch (error) {
    writeAiWebsiteSettingsLocal(previous);
    console.error('[AI websites] shared save failed', error);
    throw new Error('Không thể đồng bộ website AI qua Trung tâm công việc. Vui lòng tải lại trang rồi thử lại.');
  }
}

export function subscribeAiWebsiteSettings(user, listener) {
  if (typeof window === 'undefined') return () => {};
  const localHandler = (event) => listener(normalizeSnapshot(event?.detail || readAiWebsiteSettingsLocal()));
  const storageHandler = (event) => {
    if (event.key === LOCAL_KEY) listener(readAiWebsiteSettingsLocal());
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (user && isSupabaseConfigured && supabase) {
    channel = supabase
      .channel(`bes-ai-websites-${String(user.id || 'session')}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: WORK_TABLE,
        filter: `source_module=eq.${SOURCE_MODULE}`,
      }, () => {
        loadAiWebsiteSettings(user)
          .then(listener)
          .catch((error) => console.warn('[AI websites] realtime refresh failed', error));
      })
      .subscribe();
  }

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) supabase.removeChannel(channel).catch(() => {});
  };
}
