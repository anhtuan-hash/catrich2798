import { isSupabaseConfigured, supabase } from './supabase.js';

const LOCAL_KEY = 'bes-ai-website-launcher-v1';
const EVENT_NAME = 'bes-ai-websites-updated';
const SNAPSHOT_KEY = '__english_hub_ai_websites__';

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

async function publishLocalMigration(user, local) {
  if (!canManageAiWebsites(user) || !local.tools.length || !supabase) return null;
  const now = new Date().toISOString();
  const payload = { tools: local.tools, updatedAt: now, updatedBy: user.id || user.email || '' };
  const { error } = await supabase.from('department_workspace_snapshots').upsert({
    school_year: SNAPSHOT_KEY,
    semester: 'system',
    payload,
    updated_by: user.id || null,
    updated_by_email: user.email || null,
    updated_at: now,
  }, { onConflict: 'school_year' });
  if (error) throw error;
  return writeAiWebsiteSettingsLocal({ ...payload, source: 'cloud-migrated' });
}

export async function loadAiWebsiteSettings(user) {
  const local = readAiWebsiteSettingsLocal();
  if (!user || !isSupabaseConfigured || !supabase) return local;

  try {
    const { data, error } = await supabase
      .from('department_workspace_snapshots')
      .select('payload,updated_by_email,updated_at')
      .eq('school_year', SNAPSHOT_KEY)
      .maybeSingle();
    if (error) throw error;

    if (!data?.payload) {
      const migrated = await publishLocalMigration(user, local);
      return migrated || writeAiWebsiteSettingsLocal({ tools: [], source: 'cloud-empty', updatedAt: new Date().toISOString() });
    }

    return writeAiWebsiteSettingsLocal({
      ...data.payload,
      updatedAt: data.updated_at || data.payload.updatedAt,
      updatedBy: data.updated_by_email || data.payload.updatedBy,
      source: 'cloud',
      error: '',
    });
  } catch (error) {
    console.warn('[AI websites] cloud load failed; using local cache', error);
    return writeAiWebsiteSettingsLocal({ ...local, source: 'local-fallback', error: String(error?.message || error) });
  }
}

export async function saveAiWebsiteSettings(user, tools) {
  if (!canManageAiWebsites(user)) throw new Error('Chỉ Admin hoặc TTCM được quản lý website AI.');
  const now = new Date().toISOString();
  const clean = normalizeSnapshot({ tools, updatedAt: now, updatedBy: user.id || user.email || '' });
  const previous = readAiWebsiteSettingsLocal();
  writeAiWebsiteSettingsLocal({ ...clean, source: isSupabaseConfigured ? 'pending-cloud' : 'local' });

  if (!isSupabaseConfigured || !supabase) return { snapshot: clean, cloud: false };

  const { error } = await supabase.from('department_workspace_snapshots').upsert({
    school_year: SNAPSHOT_KEY,
    semester: 'system',
    payload: { tools: clean.tools, updatedAt: now, updatedBy: user.id || user.email || '' },
    updated_by: user.id || null,
    updated_by_email: user.email || null,
    updated_at: now,
  }, { onConflict: 'school_year' });

  if (error) {
    writeAiWebsiteSettingsLocal(previous);
    throw error;
  }

  return { snapshot: await loadAiWebsiteSettings(user), cloud: true };
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
        table: 'department_workspace_snapshots',
        filter: `school_year=eq.${SNAPSHOT_KEY}`,
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
