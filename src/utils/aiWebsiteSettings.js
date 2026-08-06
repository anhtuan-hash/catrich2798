import { isSupabaseConfigured, supabase } from './supabase.js';

const LOCAL_KEY = 'bes-ai-website-launcher-v1';
const EVENT_NAME = 'bes-ai-websites-updated';
const SETTINGS_TABLE = 'ai_website_settings';
const WORKSPACE_KEY = 'english-hub';
const CLOUD_CACHE_MAX_AGE = 6 * 60 * 60 * 1000;
let realtimeSubscriptionSerial = 0;
let cloudSnapshotCache = null;
let cloudSnapshotCachedAt = 0;
let cloudSnapshotResolved = false;
let cloudSnapshotPromise = null;

export function safeAiWebsiteUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeEmbedView(value = {}) {
  const cropWidth = clampNumber(value.cropWidth, 18, 100, 88);
  const cropHeight = clampNumber(value.cropHeight, 18, 100, 78);
  const cropX = clampNumber(value.cropX, 0, 100 - cropWidth, (100 - cropWidth) / 2);
  const cropY = clampNumber(value.cropY, 0, 100 - cropHeight, (100 - cropHeight) / 2);
  return {
    zoom: clampNumber(value.zoom, 0.4, 2.4, 1),
    offsetX: clampNumber(value.offsetX, 0, 70, 0),
    offsetY: clampNumber(value.offsetY, 0, 85, 0),
    previewHeight: clampNumber(value.previewHeight, 420, 900, 620),
    canvasHeight: clampNumber(value.canvasHeight, 1000, 2600, 1600),
    cropX,
    cropY,
    cropWidth,
    cropHeight,
  };
}

function normalizeExternalEmbedConfig(value = {}, sourceUrl = '') {
  const source = safeAiWebsiteUrl(sourceUrl);
  const requested = safeAiWebsiteUrl(value?.embedUrl);
  return {
    embedUrl: requested || source,
    hideBrianHeader: Boolean(value?.hideBrianHeader),
    hideBrianFooter: Boolean(value?.hideBrianFooter),
    allowFullscreen: value?.allowFullscreen !== false,
  };
}

function sourceTypeOf(tool = {}, kind = 'ai') {
  if (kind === 'external-app' && (tool.sourceType === 'html' || tool.htmlContent)) return 'html';
  return 'url';
}

export function normalizeAiWebsiteTool(tool = {}, index = 0) {
  const name = String(tool.name || '').trim();
  const kind = tool.kind === 'external-app' ? 'external-app' : 'ai';
  const sourceType = sourceTypeOf(tool, kind);
  const htmlContent = sourceType === 'html' ? String(tool.htmlContent || '') : '';
  return {
    id: String(tool.id || `ai-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    name,
    url: sourceType === 'url' ? String(tool.url || '').trim() : '',
    sourceType,
    htmlContent,
    htmlContentOmitted: Boolean(tool.htmlContentOmitted && !htmlContent),
    fileName: sourceType === 'html' ? String(tool.fileName || `${name || 'application'}.html`).trim().slice(0, 140) : '',
    contentHash: sourceType === 'html' ? String(tool.contentHash || '').trim().slice(0, 128) : '',
    icon: String(tool.icon || (sourceType === 'html' ? 'HTM' : name.slice(0, 2) || 'AI')).trim().slice(0, 3).toUpperCase(),
    description: String(tool.description || '').trim(),
    audience: ['all', 'admin', 'leader', 'teacher'].includes(tool.audience) ? tool.audience : 'all',
    enabled: tool.enabled !== false,
    pinned: Boolean(tool.pinned),
    kind,
    groupId: ['plan', 'create', 'assess', 'manage'].includes(tool.groupId) ? tool.groupId : 'create',
    requestId: String(tool.requestId || ''),
    submittedBy: String(tool.submittedBy || ''),
    approvedAt: String(tool.approvedAt || ''),
    accent: String(tool.accent || ''),
    embedView: normalizeEmbedView(tool.embedView),
    embedConfig: kind === 'external-app'
      ? normalizeExternalEmbedConfig(tool.embedConfig, tool.url)
      : undefined,
  };
}

function validNormalizedTool(tool = {}) {
  if (!tool.name) return false;
  if (tool.kind === 'external-app' && tool.sourceType === 'html') {
    return Boolean(tool.htmlContent || tool.htmlContentOmitted);
  }
  return Boolean(safeAiWebsiteUrl(tool.url));
}

function normalizeSnapshot(value = {}) {
  const sourceTools = Array.isArray(value) ? value : (Array.isArray(value.tools) ? value.tools : []);
  return {
    tools: sourceTools
      .map(normalizeAiWebsiteTool)
      .filter(validNormalizedTool),
    updatedAt: String(value.updatedAt || value.updated_at || new Date().toISOString()),
    updatedBy: String(value.updatedBy || value.updated_by_email || value.updated_by || ''),
    source: String(value.source || 'local'),
    error: String(value.error || ''),
    setupRequired: Boolean(value.setupRequired),
  };
}

export function readAiWebsiteSettingsLocal() {
  if (typeof window === 'undefined') return normalizeSnapshot();
  try { return normalizeSnapshot(JSON.parse(window.localStorage.getItem(LOCAL_KEY) || '[]')); }
  catch { return normalizeSnapshot(); }
}

function compactLocalSnapshot(snapshot) {
  return {
    ...snapshot,
    tools: (snapshot.tools || []).map((tool) => (
      tool.kind === 'external-app' && tool.sourceType === 'html' && tool.htmlContent
        ? { ...tool, htmlContent: '', htmlContentOmitted: true }
        : tool
    )),
  };
}

function writeAiWebsiteSettingsLocal(snapshot) {
  const clean = normalizeSnapshot(snapshot);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(clean));
    } catch {
      try { window.localStorage.setItem(LOCAL_KEY, JSON.stringify(compactLocalSnapshot(clean))); } catch { /* optional cache */ }
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: clean }));
  }
  return clean;
}

function rememberCloudSnapshot(snapshot) {
  cloudSnapshotCache = snapshot ? normalizeSnapshot(snapshot) : null;
  cloudSnapshotCachedAt = Date.now();
  cloudSnapshotResolved = true;
  return cloudSnapshotCache;
}

function invalidateCloudSnapshotCache() {
  cloudSnapshotCache = null;
  cloudSnapshotCachedAt = 0;
  cloudSnapshotResolved = false;
  cloudSnapshotPromise = null;
}

export function getAiWebsiteAudience(user) {
  const role = `${user?.role || ''} ${user?.position || ''}`.toLowerCase();
  if (role.includes('admin')) return 'admin';
  if (role.includes('ttcm') || role.includes('tổ trưởng') || role.includes('to_truong') || role.includes('department') || role.includes('subject') || role.includes('leader') || role.includes('head')) return 'leader';
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
  return code === '42P01' || code === 'PGRST205' || message.includes('ai_website_settings') && (message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find the table'));
}

function cloudSnapshotFromRow(row = {}) {
  return normalizeSnapshot({ tools: Array.isArray(row.tools) ? row.tools : [], updatedAt: row.updated_at || row.created_at, updatedBy: row.updated_by_email || row.updated_by || '', source: 'supabase', error: '', setupRequired: false });
}

async function readCloudSnapshot({ force = false } = {}) {
  if (!force && cloudSnapshotResolved && Date.now() - cloudSnapshotCachedAt < CLOUD_CACHE_MAX_AGE) {
    return cloudSnapshotCache;
  }
  if (cloudSnapshotPromise) return cloudSnapshotPromise;

  let task;
  task = supabase
    .from(SETTINGS_TABLE)
    .select('workspace_key,tools,updated_by,updated_by_email,created_at,updated_at')
    .eq('workspace_key', WORKSPACE_KEY)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) throw error;
      return rememberCloudSnapshot(data ? cloudSnapshotFromRow(data) : null);
    })
    .finally(() => {
      if (cloudSnapshotPromise === task) cloudSnapshotPromise = null;
    });
  cloudSnapshotPromise = task;
  return task;
}

async function writeCloudSnapshot(user, snapshot) {
  const now = snapshot.updatedAt || new Date().toISOString();
  const row = { workspace_key: WORKSPACE_KEY, tools: snapshot.tools, updated_by: user?.id || null, updated_by_email: user?.email || null, updated_at: now };
  const { data, error } = await supabase.from(SETTINGS_TABLE).upsert(row, { onConflict: 'workspace_key' }).select('workspace_key,tools,updated_by,updated_by_email,created_at,updated_at').single();
  if (error) throw error;
  return rememberCloudSnapshot(cloudSnapshotFromRow(data || row));
}

async function publishLocalMigration(user, local) {
  if (!canManageAiWebsites(user) || !local.tools.length || !supabase) return null;
  const clean = normalizeSnapshot({ tools: local.tools, updatedAt: new Date().toISOString(), updatedBy: user.id || user.email || '' });
  const saved = await writeCloudSnapshot(user, clean);
  return writeAiWebsiteSettingsLocal({ ...saved, source: 'supabase-migrated' });
}

export async function loadAiWebsiteSettings(user, { force = false } = {}) {
  const local = readAiWebsiteSettingsLocal();
  if (!user || !isSupabaseConfigured || !supabase) return local;
  try {
    const cloud = await readCloudSnapshot({ force });
    if (!cloud) {
      const migrated = await publishLocalMigration(user, local);
      return migrated || writeAiWebsiteSettingsLocal({ tools: [], source: 'supabase-empty', updatedAt: new Date().toISOString(), error: '', setupRequired: false });
    }
    return writeAiWebsiteSettingsLocal(cloud);
  } catch (error) {
    console.warn('[AI websites] Supabase load failed; using local cache', error);
    const missingTable = isMissingSettingsTable(error);
    return writeAiWebsiteSettingsLocal({ ...local, source: 'local-fallback', setupRequired: missingTable, error: missingTable ? 'Supabase chưa có bảng ai_website_settings. Hãy chạy tệp supabase/ai_website_settings.sql một lần.' : 'Không thể tải cấu hình website AI từ Supabase. Hệ thống đang dùng bản lưu gần nhất trên thiết bị.' });
  }
}

export async function saveAiWebsiteSettings(user, tools) {
  if (!canManageAiWebsites(user)) throw new Error('Chỉ Admin hoặc TTCM được quản lý website dùng chung.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình nên chưa thể lưu website dùng chung.');
  const sourceTools = Array.isArray(tools) ? tools : [];
  const clean = normalizeSnapshot({ tools: sourceTools, updatedAt: new Date().toISOString(), updatedBy: user.id || user.email || '' });
  if (clean.tools.length !== sourceTools.length) throw new Error('Danh sách có ứng dụng thiếu tên, URL hoặc nội dung HTML hợp lệ nên chưa được lưu.');
  const previous = readAiWebsiteSettingsLocal();
  writeAiWebsiteSettingsLocal({ ...clean, source: 'pending-supabase', error: '', setupRequired: false });
  try {
    const saved = await writeCloudSnapshot(user, clean);
    if (saved.tools.length !== clean.tools.length) throw new Error('Supabase trả lại danh sách không đầy đủ; thay đổi chưa được xác nhận.');
    const snapshot = writeAiWebsiteSettingsLocal(saved);
    return { snapshot, cloud: true };
  } catch (error) {
    writeAiWebsiteSettingsLocal(previous);
    console.error('[AI websites] Supabase save failed', error);
    if (isMissingSettingsTable(error)) throw new Error('Supabase chưa có bảng ai_website_settings. Cần chạy tệp supabase/ai_website_settings.sql trong SQL Editor một lần.');
    if (String(error?.code || '') === '42501' || /row-level security|permission denied/i.test(String(error?.message || ''))) throw new Error('Supabase đã từ chối quyền ghi. Chỉ tài khoản Admin hoặc TTCM đã được duyệt mới có thể lưu cấu hình.');
    throw new Error(`Không thể lưu website dùng chung vào Supabase${error?.message ? `: ${error.message}` : '.'}`);
  }
}

function realtimeTopicFor(user) {
  realtimeSubscriptionSerial += 1;
  const identity = String(user?.id || user?.email || 'session').replace(/[^a-z0-9_-]/gi, '-').slice(0, 48);
  return `bes-ai-websites-${identity}-${Date.now().toString(36)}-${realtimeSubscriptionSerial.toString(36)}`;
}

export function subscribeAiWebsiteSettings(user, listener) {
  if (typeof window === 'undefined') return () => {};
  const safeListener = typeof listener === 'function' ? listener : () => {};
  const localHandler = (event) => safeListener(normalizeSnapshot(event?.detail || readAiWebsiteSettingsLocal()));
  const storageHandler = (event) => {
    if (event.key !== LOCAL_KEY) return;
    invalidateCloudSnapshotCache();
    safeListener(readAiWebsiteSettingsLocal());
  };
  window.addEventListener(EVENT_NAME, localHandler);
  window.addEventListener('storage', storageHandler);

  let channel = null;
  if (user && isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel(realtimeTopicFor(user))
        .on('postgres_changes', { event: '*', schema: 'public', table: SETTINGS_TABLE, filter: `workspace_key=eq.${WORKSPACE_KEY}` }, (payload) => {
          const row = payload?.new && Object.keys(payload.new).length ? payload.new : null;
          if (row?.workspace_key === WORKSPACE_KEY) {
            const snapshot = rememberCloudSnapshot(cloudSnapshotFromRow(row));
            writeAiWebsiteSettingsLocal(snapshot);
            return;
          }
          invalidateCloudSnapshotCache();
          loadAiWebsiteSettings(user, { force: true }).catch((error) => console.warn('[AI websites] realtime refresh failed', error));
        });
      channel.subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[AI websites] realtime unavailable (${status}); local and manual refresh remain active.`);
        }
      });
    } catch (error) {
      channel = null;
      console.warn('[AI websites] realtime subscription skipped; local and manual refresh remain active', error);
    }
  }

  return () => {
    window.removeEventListener(EVENT_NAME, localHandler);
    window.removeEventListener('storage', storageHandler);
    if (channel && supabase) {
      try {
        const removal = supabase.removeChannel(channel);
        removal?.catch?.((error) => console.warn('[AI websites] realtime cleanup failed', error));
      } catch (error) {
        console.warn('[AI websites] realtime cleanup skipped', error);
      }
    }
  };
}
