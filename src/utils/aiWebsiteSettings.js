import { isSupabaseConfigured, supabase } from './supabase.js';

const LOCAL_KEY = 'bes-ai-website-launcher-v1';
const EVENT_NAME = 'bes-ai-websites-updated';
const SETTINGS_TABLE = 'ai_website_settings';
const WORKSPACE_KEY = 'english-hub';

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
    kind: tool.kind === 'external-app' ? 'external-app' : 'ai',
    groupId: ['plan', 'create', 'assess', 'manage'].includes(tool.groupId) ? tool.groupId : 'create',
    requestId: String(tool.requestId || ''),
    submittedBy: String(tool.submittedBy || ''),
    approvedAt: String(tool.approvedAt || ''),
    accent: String(tool.accent || ''),
  };
}

function normalizeSnapshot(value = {}) {
  const sourceTools = Array.isArray(value) ? value : (Array.isArray(value.tools) ? value.tools : []);
  return {
    tools: sourceTools
      .map(normalizeAiWebsiteTool)
      .filter((tool) => tool.name && safeAiWebsiteUrl(tool.url)),
    updatedAt: String(value.updatedAt || value.updated_at || new Date().toISOString()),
    updatedBy: String(value.updatedBy || value.updated_by_email || value.updated_by || ''),
    source: String(value.source || 'local'),
    error: String(value.error || ''),
    setupRequired: Boolean(value.setupRequired),
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

function isMissingSettingsTable(error) {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || error || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || message.includes('ai_website_settings') && (
      message.includes('does not exist')
      || message.includes('schema cache')
      || message.includes('could not find the table')
    );
}

function cloudSnapshotFromRow(row = {}) {
  return normalizeSnapshot({
    tools: Array.isArray(row.tools) ? row.tools : [],
    updatedAt: row.updated_at || row.created_at,
    updatedBy: row.updated_by_email || row.updated_by || '',
    source: 'supabase',
    error: '',
    setupRequired: false,
  });
}

async function readCloudSnapshot() {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('workspace_key,tools,updated_by,updated_by_email,created_at,updated_at')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle();
  if (error) throw error;
  return data ? cloudSnapshotFromRow(data) : null;
}

async function writeCloudSnapshot(user, snapshot) {
  const now = snapshot.updatedAt || new Date().toISOString();
  const row = {
    workspace_key: WORKSPACE_KEY,
    tools: snapshot.tools,
    updated_by: user?.id || null,
    updated_by_email: user?.email || null,
    updated_at: now,
  };
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(row, { onConflict: 'workspace_key' })
    .select('workspace_key,tools,updated_by,updated_by_email,created_at,updated_at')
    .single();
  if (error) throw error;
  return cloudSnapshotFromRow(data || row);
}

async function publishLocalMigration(user, local) {
  if (!canManageAiWebsites(user) || !local.tools.length || !supabase) return null;
  const clean = normalizeSnapshot({
    tools: local.tools,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id || user.email || '',
  });
  const saved = await writeCloudSnapshot(user, clean);
  return writeAiWebsiteSettingsLocal({ ...saved, source: 'supabase-migrated' });
}

export async function loadAiWebsiteSettings(user) {
  const local = readAiWebsiteSettingsLocal();
  if (!user || !isSupabaseConfigured || !supabase) return local;

  try {
    const cloud = await readCloudSnapshot();
    if (!cloud) {
      const migrated = await publishLocalMigration(user, local);
      return migrated || writeAiWebsiteSettingsLocal({
        tools: [],
        source: 'supabase-empty',
        updatedAt: new Date().toISOString(),
        error: '',
        setupRequired: false,
      });
    }
    return writeAiWebsiteSettingsLocal(cloud);
  } catch (error) {
    console.warn('[AI websites] Supabase load failed; using local cache', error);
    const missingTable = isMissingSettingsTable(error);
    return writeAiWebsiteSettingsLocal({
      ...local,
      source: 'local-fallback',
      setupRequired: missingTable,
      error: missingTable
        ? 'Supabase chưa có bảng ai_website_settings. Hãy chạy tệp supabase/ai_website_settings.sql một lần.'
        : 'Không thể tải cấu hình website AI từ Supabase. Hệ thống đang dùng bản lưu gần nhất trên thiết bị.',
    });
  }
}

export async function saveAiWebsiteSettings(user, tools) {
  if (!canManageAiWebsites(user)) throw new Error('Chỉ Admin hoặc TTCM được quản lý website dùng chung.');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase chưa được cấu hình nên chưa thể lưu website dùng chung.');
  }

  const clean = normalizeSnapshot({
    tools,
    updatedAt: new Date().toISOString(),
    updatedBy: user.id || user.email || '',
  });
  const previous = readAiWebsiteSettingsLocal();
  writeAiWebsiteSettingsLocal({ ...clean, source: 'pending-supabase', error: '', setupRequired: false });

  try {
    const saved = await writeCloudSnapshot(user, clean);
    const snapshot = writeAiWebsiteSettingsLocal(saved);
    return { snapshot, cloud: true };
  } catch (error) {
    writeAiWebsiteSettingsLocal(previous);
    console.error('[AI websites] Supabase save failed', error);
    if (isMissingSettingsTable(error)) {
      throw new Error('Supabase chưa có bảng ai_website_settings. Cần chạy tệp supabase/ai_website_settings.sql trong SQL Editor một lần.');
    }
    if (String(error?.code || '') === '42501' || /row-level security|permission denied/i.test(String(error?.message || ''))) {
      throw new Error('Supabase đã từ chối quyền ghi. Chỉ tài khoản Admin hoặc TTCM đã được duyệt mới có thể lưu cấu hình.');
    }
    throw new Error(`Không thể lưu website dùng chung vào Supabase${error?.message ? `: ${error.message}` : '.'}`);
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
        table: SETTINGS_TABLE,
        filter: `workspace_key=eq.${WORKSPACE_KEY}`,
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
