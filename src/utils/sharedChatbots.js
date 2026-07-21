import { isSupabaseConfigured, supabase } from './supabase.js';
import { isDepartmentLeaderRole } from './roles.js';

export const SHARED_CHATBOT_TABLE = 'independent_chatbot_settings';
export const SHARED_CHATBOT_ROW_ID = 'global';
export const SHARED_CHATBOT_EVENT = 'bes-shared-chatbot-settings-updated';
export const SHARED_CHATBOT_MAX = 20;
export const SHARED_CHATBOT_LOCAL_KEY = 'bes-shared-chatbots-v12-fallback';

export const DEFAULT_SHARED_CHATBOTS = Object.freeze([
  Object.freeze({
    id: 'notrack-ai',
    name: 'NoTrack AI',
    url: 'https://notrack.ai/',
    enabled: true,
    isDefault: true,
    sortOrder: 0,
  }),
]);

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `chatbot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeChatbotUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('URL is required.');
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('URL must be a valid HTTP or HTTPS address.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS chatbot URLs are allowed.');
  }
  parsed.hash = '';
  return parsed.toString();
}

function normalizeOne(item, index) {
  const name = String(item?.name || '').trim().slice(0, 80);
  if (!name) throw new Error(`Chatbot ${index + 1} needs a name.`);
  return {
    id: String(item?.id || makeId()).trim().slice(0, 120),
    name,
    url: normalizeChatbotUrl(item?.url),
    enabled: item?.enabled !== false,
    isDefault: item?.isDefault === true,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
  };
}

export function normalizeSharedChatbots(items, { allowEmpty = false } = {}) {
  const source = Array.isArray(items) ? items.slice(0, SHARED_CHATBOT_MAX) : [];
  if (!source.length) {
    if (allowEmpty) return [];
    return DEFAULT_SHARED_CHATBOTS.map((item) => ({ ...item }));
  }

  const ids = new Set();
  const normalized = source.map((item, index) => {
    const next = normalizeOne(item, index);
    if (ids.has(next.id)) next.id = makeId();
    ids.add(next.id);
    return next;
  }).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const hasEnabled = normalized.some((item) => item.enabled);
  const safeItems = hasEnabled
    ? normalized
    : normalized.map((item, index) => ({ ...item, enabled: index === 0 }));
  const enabled = safeItems.filter((item) => item.enabled);
  const requestedDefault = safeItems.find((item) => item.isDefault && item.enabled);
  const defaultId = requestedDefault?.id || enabled[0]?.id || safeItems[0]?.id;

  return safeItems.map((item, index) => ({
    ...item,
    isDefault: item.id === defaultId,
    sortOrder: index,
  }));
}

export function isSharedChatbotManager(user) {
  return Boolean(user?.approved === true && isDepartmentLeaderRole(user?.role));
}

function readLocalFallback() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SHARED_CHATBOT_LOCAL_KEY) || 'null');
    return normalizeSharedChatbots(parsed?.chatbots || parsed);
  } catch {
    return DEFAULT_SHARED_CHATBOTS.map((item) => ({ ...item }));
  }
}

function writeLocalFallback(chatbots) {
  const normalized = normalizeSharedChatbots(chatbots);
  try {
    localStorage.setItem(SHARED_CHATBOT_LOCAL_KEY, JSON.stringify({
      chatbots: normalized,
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Local fallback is best-effort.
  }
  return normalized;
}

function dispatch(chatbots, source = 'local') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SHARED_CHATBOT_EVENT, {
    detail: { chatbots, source },
  }));
}

export async function loadSharedChatbots() {
  const fallback = readLocalFallback();
  if (!isSupabaseConfigured || !supabase) {
    return {
      chatbots: fallback,
      cloudReady: false,
      source: 'local',
      message: 'Supabase is not configured. Using the browser fallback.',
    };
  }

  const { data, error } = await supabase
    .from(SHARED_CHATBOT_TABLE)
    .select('id,chatbots,updated_at,updated_by')
    .eq('id', SHARED_CHATBOT_ROW_ID)
    .maybeSingle();

  if (error) {
    return {
      chatbots: fallback,
      cloudReady: false,
      source: 'local',
      message: error.message,
    };
  }

  const normalized = normalizeSharedChatbots(data?.chatbots);
  writeLocalFallback(normalized);
  return {
    chatbots: normalized,
    cloudReady: true,
    source: 'cloud',
    updatedAt: data?.updated_at || null,
  };
}

export async function saveSharedChatbots(user, items) {
  if (!isSharedChatbotManager(user)) {
    throw new Error('Only an approved TTCM or administrator can change shared chatbot settings.');
  }

  const normalized = writeLocalFallback(items);
  dispatch(normalized, 'local');

  if (!isSupabaseConfigured || !supabase) {
    return {
      chatbots: normalized,
      cloudReady: false,
      source: 'local',
      message: 'Saved on this browser only because Supabase is not configured.',
    };
  }

  const payload = {
    id: SHARED_CHATBOT_ROW_ID,
    chatbots: normalized,
    updated_by: user?.id || user?.authId || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(SHARED_CHATBOT_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select('id,chatbots,updated_at,updated_by')
    .single();

  if (error) {
    return {
      chatbots: normalized,
      cloudReady: false,
      source: 'local',
      message: error.message,
    };
  }

  const saved = normalizeSharedChatbots(data?.chatbots);
  writeLocalFallback(saved);
  dispatch(saved, 'cloud');
  return {
    chatbots: saved,
    cloudReady: true,
    source: 'cloud',
    updatedAt: data?.updated_at || null,
  };
}

export function subscribeSharedChatbots(callback) {
  if (typeof window === 'undefined') return () => {};

  const onLocal = (event) => {
    const chatbots = event?.detail?.chatbots;
    if (Array.isArray(chatbots)) callback(normalizeSharedChatbots(chatbots), event?.detail?.source || 'local');
  };
  const onStorage = (event) => {
    if (event.key !== SHARED_CHATBOT_LOCAL_KEY) return;
    callback(readLocalFallback(), 'local');
  };

  window.addEventListener(SHARED_CHATBOT_EVENT, onLocal);
  window.addEventListener('storage', onStorage);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel(`bes-shared-chatbots-${SHARED_CHATBOT_ROW_ID}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: SHARED_CHATBOT_TABLE,
          filter: `id=eq.${SHARED_CHATBOT_ROW_ID}`,
        },
        async () => {
          const result = await loadSharedChatbots();
          callback(result.chatbots, result.source);
        },
      )
      .subscribe();
  }

  return () => {
    window.removeEventListener(SHARED_CHATBOT_EVENT, onLocal);
    window.removeEventListener('storage', onStorage);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export function getSharedChatbotUserScope(user) {
  return String(user?.id || user?.authId || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-')
    .slice(0, 120);
}

export function readSharedChatbotPreference(user) {
  const scope = getSharedChatbotUserScope(user);
  try {
    const parsed = JSON.parse(localStorage.getItem(`bes-chatbot-drawer:${scope}`) || '{}');
    return {
      activeId: String(parsed.activeId || ''),
      open: parsed.open === true,
      size: ['compact', 'standard', 'wide'].includes(parsed.size) ? parsed.size : 'standard',
    };
  } catch {
    return { activeId: '', open: false, size: 'standard' };
  }
}

export function saveSharedChatbotPreference(user, preference) {
  const scope = getSharedChatbotUserScope(user);
  try {
    localStorage.setItem(`bes-chatbot-drawer:${scope}`, JSON.stringify({
      activeId: String(preference?.activeId || ''),
      open: preference?.open === true,
      size: ['compact', 'standard', 'wide'].includes(preference?.size) ? preference.size : 'standard',
      updatedAt: new Date().toISOString(),
    }));
  } catch {
    // Personal UI preference is best-effort.
  }
}
