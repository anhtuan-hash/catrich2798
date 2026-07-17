import { isSupabaseConfigured, supabase } from './supabase.js';
import { isAdminRole } from './roles.js';

const TABLE_NAME = 'independent_chatbot_settings';
const RECORD_ID = 'default';
const STORAGE_KEY = 'brian-independent-ai-chatbot-url';
const META_KEY = 'brian-independent-ai-chatbot-settings-v2';
const EVENT_NAME = 'bes-independent-chatbot-settings-change';

function envUrl() {
  return String(import.meta.env?.VITE_INDEPENDENT_CHATBOT_URL || '').trim();
}

export function normalizeChatbotUrl(value, { allowEmpty = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw && allowEmpty) return '';
  if (!raw) throw new Error('empty');
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
  return parsed.toString();
}

function normalizeSnapshot(value = {}) {
  let url = '';
  try {
    url = normalizeChatbotUrl(value.url || value.chatbot_url || '', { allowEmpty: true });
  } catch {
    url = '';
  }
  return {
    url,
    updatedAt: String(value.updatedAt || value.updated_at || ''),
    updatedBy: String(value.updatedBy || value.updated_by || ''),
    source: String(value.source || 'local'),
    error: String(value.error || ''),
  };
}

export function readChatbotSettingsLocal() {
  if (typeof window === 'undefined') return normalizeSnapshot({ url: envUrl(), source: 'env' });
  try {
    const meta = JSON.parse(window.localStorage.getItem(META_KEY) || '{}');
    const legacy = window.localStorage.getItem(STORAGE_KEY)?.trim() || '';
    return normalizeSnapshot({
      ...meta,
      url: meta.url || legacy || envUrl(),
      source: meta.source || (legacy ? 'legacy-local' : envUrl() ? 'env' : 'local'),
    });
  } catch {
    return normalizeSnapshot({ url: envUrl(), source: envUrl() ? 'env' : 'local' });
  }
}

function writeChatbotSettingsLocal(value) {
  const snapshot = normalizeSnapshot(value);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(META_KEY, JSON.stringify(snapshot));
      if (snapshot.url) window.localStorage.setItem(STORAGE_KEY, snapshot.url);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep the active in-memory value when browser storage is unavailable.
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }));
  }
  return snapshot;
}

export function subscribeChatbotSettingsLocal(listener) {
  if (typeof window === 'undefined') return () => {};
  const onChange = (event) => listener(normalizeSnapshot(event?.detail || readChatbotSettingsLocal()));
  const onStorage = (event) => {
    if (![STORAGE_KEY, META_KEY].includes(event.key)) return;
    listener(readChatbotSettingsLocal());
  };
  window.addEventListener(EVENT_NAME, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

export async function loadSharedChatbotSettings(user) {
  const local = readChatbotSettingsLocal();
  if (!user || !isSupabaseConfigured || !supabase || user.provider !== 'supabase') return local;
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id,chatbot_url,updated_by,updated_at')
      .eq('id', RECORD_ID)
      .maybeSingle();
    if (error) throw error;
    const cloud = normalizeSnapshot({
      url: data?.chatbot_url || envUrl(),
      updatedAt: data?.updated_at || '',
      updatedBy: data?.updated_by || '',
      source: 'cloud',
    });
    return writeChatbotSettingsLocal(cloud);
  } catch (error) {
    console.warn('[IndependentChatbot] shared settings load failed; using cached value', error);
    return writeChatbotSettingsLocal({
      ...local,
      source: 'local-fallback',
      error: String(error?.message || error),
    });
  }
}

function assertAdmin(user) {
  if (!user || !isAdminRole(user.role)) throw new Error('admin-only');
}

export async function saveSharedChatbotSettings(user, value) {
  assertAdmin(user);
  const url = normalizeChatbotUrl(value);
  const previous = readChatbotSettingsLocal();
  const updatedAt = new Date().toISOString();
  const pending = writeChatbotSettingsLocal({
    url,
    updatedAt,
    updatedBy: user.id || '',
    source: isSupabaseConfigured && user.provider === 'supabase' ? 'pending-cloud' : 'local-admin',
  });

  if (!isSupabaseConfigured || !supabase || user.provider !== 'supabase') {
    return { settings: pending, cloud: false };
  }

  const { error } = await supabase.from(TABLE_NAME).upsert({
    id: RECORD_ID,
    chatbot_url: url,
    updated_by: user.id || null,
    updated_at: updatedAt,
  }, { onConflict: 'id' });

  if (error) {
    writeChatbotSettingsLocal(previous);
    throw error;
  }
  return { settings: await loadSharedChatbotSettings(user), cloud: true };
}

export async function clearSharedChatbotSettings(user) {
  assertAdmin(user);
  const previous = readChatbotSettingsLocal();
  const updatedAt = new Date().toISOString();
  const pending = writeChatbotSettingsLocal({
    url: '',
    updatedAt,
    updatedBy: user.id || '',
    source: isSupabaseConfigured && user.provider === 'supabase' ? 'pending-cloud' : 'local-admin',
  });

  if (!isSupabaseConfigured || !supabase || user.provider !== 'supabase') {
    return { settings: pending, cloud: false };
  }

  const { error } = await supabase.from(TABLE_NAME).upsert({
    id: RECORD_ID,
    chatbot_url: '',
    updated_by: user.id || null,
    updated_at: updatedAt,
  }, { onConflict: 'id' });

  if (error) {
    writeChatbotSettingsLocal(previous);
    throw error;
  }
  return { settings: await loadSharedChatbotSettings(user), cloud: true };
}

export function subscribeSharedChatbotSettings(user, listener) {
  const unsubscribeLocal = subscribeChatbotSettingsLocal(listener);
  if (!user || !isSupabaseConfigured || !supabase || user.provider !== 'supabase') return unsubscribeLocal;
  const channel = supabase
    .channel(`bes-independent-chatbot-settings-${String(user.id || 'session')}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: TABLE_NAME,
      filter: `id=eq.${RECORD_ID}`,
    }, () => {
      loadSharedChatbotSettings(user).then(listener).catch((error) => console.warn('[IndependentChatbot] realtime refresh failed', error));
    })
    .subscribe();

  return () => {
    unsubscribeLocal();
    supabase.removeChannel(channel).catch(() => {});
  };
}
