import { isSupabaseConfigured, supabase } from './supabase.js';
import { moveToTrash } from './trash.js';

export const HISTORY_KEY = 'bet-v4-history';
export const PROMPTS_KEY = 'bet-v4-prompts';
export const BANK_KEY = 'bet-v4-question-bank';
export const LIBRARY_EVENT = 'bet-library-updated';
export const LIBRARY_SYNC_EVENT = 'bes-library-sync-state';
export const LIBRARY_TABLE = 'library_items';
export const LIBRARY_SCHEMA_VERSION = 2;

const KEY_TO_TYPE = {
  [HISTORY_KEY]: 'history',
  [PROMPTS_KEY]: 'prompt',
  [BANK_KEY]: 'question',
};
const TYPE_TO_KEY = Object.fromEntries(Object.entries(KEY_TO_TYPE).map(([key, type]) => [type, key]));

let currentOwner = { id: 'guest', email: '', provider: 'local', name: 'Guest' };
let suppressCloudWrite = false;
let syncState = { status: 'local', message: '', lastSyncedAt: '' };
const syncTimers = new Map();

function safeOwnerToken(value) {
  return String(value || 'guest').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || 'guest';
}

function scopedStorageKey(key) {
  return `${key}::${safeOwnerToken(currentOwner.id || currentOwner.email || 'guest')}`;
}

function setSyncState(next) {
  syncState = { ...syncState, ...next };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIBRARY_SYNC_EVENT, { detail: syncState }));
  }
}

export function getLibrarySyncState() {
  return { ...syncState };
}

export function getLibraryOwner() {
  return { ...currentOwner };
}

function isCloudOwner() {
  return Boolean(isSupabaseConfigured && supabase && currentOwner?.id && currentOwner.provider === 'supabase');
}

function migrateLegacyStorage() {
  if (!currentOwner?.id || currentOwner.id === 'guest') return;
  const markerKey = 'bes-library-legacy-migrated-owner-v10-63';
  const migratedOwner = localStorage.getItem(markerKey);
  if (migratedOwner && migratedOwner !== currentOwner.id) return;
  let migrated = false;
  for (const key of [HISTORY_KEY, PROMPTS_KEY, BANK_KEY]) {
    const scoped = scopedStorageKey(key);
    if (localStorage.getItem(scoped) !== null) continue;
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      localStorage.setItem(scoped, legacy);
      migrated = true;
    }
  }
  if (migrated || !migratedOwner) localStorage.setItem(markerKey, currentOwner.id);
}

function upgradeLocalSchema() {
  const now = new Date().toISOString();
  const history = readList(HISTORY_KEY).map((item) => ({
    ...item,
    ownerId: item.ownerId || currentOwner.id,
    ownerEmail: item.ownerEmail || currentOwner.email,
    visibility: item.visibility || 'private',
    schemaVersion: item.schemaVersion || LIBRARY_SCHEMA_VERSION,
    updatedAt: item.updatedAt || item.createdAt || now,
    sourceApp: item.sourceApp || item.toolSlug || item.type || item.kind || 'brian-english-studio',
    sourceAppTitle: item.sourceAppTitle || item.toolTitle || 'Brian English Studio',
    templateId: item.templateId || item.activityData?.templateId || item.activityData?.template || item.activityData?.type || '',
    playable: item.playable === true || Boolean(item.activityData),
  }));
  const prompts = readList(PROMPTS_KEY).map((item) => ({
    ...item,
    ownerId: item.ownerId || currentOwner.id,
    ownerEmail: item.ownerEmail || currentOwner.email,
    visibility: item.visibility || 'private',
    schemaVersion: item.schemaVersion || LIBRARY_SCHEMA_VERSION,
    updatedAt: item.updatedAt || item.createdAt || now,
    sourceApp: item.sourceApp || 'prompt-studio',
  }));
  const bank = readList(BANK_KEY).map((item) => ({
    ...item,
    ownerId: item.ownerId || currentOwner.id,
    ownerEmail: item.ownerEmail || currentOwner.email,
    visibility: item.visibility || 'private',
    schemaVersion: item.schemaVersion || LIBRARY_SCHEMA_VERSION,
    updatedAt: item.updatedAt || item.createdAt || now,
    sourceApp: item.sourceApp || 'question-bank',
  }));
  writeLocalList(HISTORY_KEY, history);
  writeLocalList(PROMPTS_KEY, prompts);
  writeLocalList(BANK_KEY, bank);
}

export async function setLibraryStorageUser(user) {
  currentOwner = user?.id
    ? { id: user.id, email: user.email || '', provider: user.provider || 'local', name: user.name || 'Teacher' }
    : { id: 'guest', email: '', provider: 'local', name: 'Guest' };
  migrateLegacyStorage();
  upgradeLocalSchema();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIBRARY_EVENT, { detail: { owner: currentOwner.id } }));
  }
  if (isCloudOwner()) return syncLibraryFromCloud();
  setSyncState({ status: 'local', message: 'Local library', lastSyncedAt: '' });
  return { ok: true, mode: 'local' };
}

export function uid(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readList(key) {
  try {
    const data = JSON.parse(localStorage.getItem(scopedStorageKey(key)) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLocalList(key, list) {
  const clean = Array.isArray(list) ? list : [];
  const targetKey = scopedStorageKey(key);
  try {
    localStorage.setItem(targetKey, JSON.stringify(clean));
  } catch (error) {
    if (key !== HISTORY_KEY) throw error;
    // Preserve exact replay for recent items and compact older standalone HTML.
    const compacted = clean.slice(0, 160).map((item, index) => {
      if (index < 24 || !item?.activityData?.standaloneHtml) return item;
      return { ...item, activityData: { ...item.activityData, standaloneHtml: '' } };
    });
    localStorage.setItem(targetKey, JSON.stringify(compacted));
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LIBRARY_EVENT, { detail: { key, owner: currentOwner.id } }));
  }
}

function rowFromItem(itemType, item) {
  return {
    user_id: currentOwner.id,
    id: item.id,
    item_type: itemType,
    payload: item,
    created_at: item.createdAt || new Date().toISOString(),
    updated_at: item.updatedAt || item.createdAt || new Date().toISOString(),
  };
}

async function upsertCloudItems(itemType, items) {
  if (!isCloudOwner() || !items.length) return { ok: true, skipped: true };
  const rows = items.filter((item) => item?.id).map((item) => rowFromItem(itemType, item));
  if (!rows.length) return { ok: true, skipped: true };
  const { error } = await supabase.from(LIBRARY_TABLE).upsert(rows, { onConflict: 'user_id,id' });
  if (error) throw error;
  return { ok: true };
}

function scheduleCloudSync(key) {
  if (suppressCloudWrite || !isCloudOwner()) return;
  window.clearTimeout(syncTimers.get(key));
  const timer = window.setTimeout(async () => {
    try {
      setSyncState({ status: 'syncing', message: 'Syncing library…' });
      await upsertCloudItems(KEY_TO_TYPE[key], readList(key));
      setSyncState({ status: 'synced', message: 'Library synced', lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      setSyncState({ status: 'error', message: error?.message || 'Library sync failed' });
    }
  }, 450);
  syncTimers.set(key, timer);
}

export function writeList(key, list) {
  writeLocalList(key, list);
  scheduleCloudSync(key);
}

export function loadHistory() {
  return readList(HISTORY_KEY);
}

export function loadPrompts() {
  return readList(PROMPTS_KEY);
}

export function loadBank() {
  return readList(BANK_KEY);
}

function ownerFields() {
  return {
    ownerId: currentOwner.id,
    ownerEmail: currentOwner.email,
    visibility: 'private',
    schemaVersion: LIBRARY_SCHEMA_VERSION,
  };
}

export function addHistoryEntry(entry) {
  const current = loadHistory();
  const now = new Date().toISOString();
  const activityData = entry?.activityData || null;
  const sourceApp = entry?.sourceApp || entry?.toolSlug || entry?.type || entry?.kind || 'brian-english-studio';
  const item = {
    id: uid('history'),
    createdAt: now,
    updatedAt: now,
    kind: 'ai-output',
    toolSlug: '',
    toolTitle: 'Brian English Tools',
    sourceApp,
    sourceAppTitle: entry?.sourceAppTitle || entry?.toolTitle || 'Brian English Studio',
    templateId: entry?.templateId || activityData?.templateId || activityData?.template || activityData?.type || '',
    title: 'Untitled',
    content: '',
    tags: [],
    activityData,
    playable: Boolean(activityData),
    ...ownerFields(),
    ...entry,
  };
  item.sourceApp = item.sourceApp || sourceApp;
  item.sourceAppTitle = item.sourceAppTitle || item.toolTitle || 'Brian English Studio';
  item.templateId = item.templateId || item.activityData?.templateId || item.activityData?.template || item.activityData?.type || '';
  item.playable = Boolean(item.activityData) || item.playable === true;
  writeList(HISTORY_KEY, [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 240));
  return item;
}

export function savePromptEntry(prompt) {
  const current = loadPrompts();
  const now = new Date().toISOString();
  const item = {
    id: uid('prompt'),
    createdAt: now,
    updatedAt: now,
    title: 'Untitled prompt',
    body: '',
    category: 'General',
    sourceApp: prompt?.sourceApp || 'prompt-studio',
    ...ownerFields(),
    ...prompt,
  };
  writeList(PROMPTS_KEY, [item, ...current.filter((existing) => existing.id !== item.id)].slice(0, 240));
  return item;
}

export function addBankItems(items) {
  const now = new Date().toISOString();
  const clean = (Array.isArray(items) ? items : [])
    .filter((item) => item && String(item.question || '').trim())
    .map((item) => ({
      id: item.id || uid('q'),
      createdAt: item.createdAt || now,
      updatedAt: now,
      type: 'mcq',
      level: 'B2-C1',
      topic: '',
      source: '',
      sourceApp: item.sourceApp || 'question-bank',
      question: '',
      options: [],
      answer: '',
      explanation: '',
      ...ownerFields(),
      ...item,
    }));
  if (!clean.length) return [];
  const ids = new Set(clean.map((item) => item.id));
  writeList(BANK_KEY, [...clean, ...loadBank().filter((item) => !ids.has(item.id))].slice(0, 1000));
  return clean;
}

export function updateHistoryEntry(id, patch = {}) {
  const now = new Date().toISOString();
  let updated = null;
  const next = loadHistory().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, updatedAt: now };
    return updated;
  });
  if (updated) writeList(HISTORY_KEY, next);
  return updated;
}

export function deleteFromList(key, id) {
  const current = readList(key);
  const removed = current.find((item) => item.id === id);
  if (removed) {
    moveToTrash({
      title: removed.title || removed.question || removed.name || 'Library item',
      kind: KEY_TO_TYPE[key] || 'library',
      source: 'teacher-library',
      payload: removed,
      restoreData: { type: 'library', key, item: removed },
      metadata: { ownerId: currentOwner.id, ownerEmail: currentOwner.email },
    });
  }
  writeLocalList(key, current.filter((item) => item.id !== id));
  scheduleCloudSync(key);
  if (isCloudOwner()) {
    supabase.from(LIBRARY_TABLE).delete().eq('user_id', currentOwner.id).eq('id', id)
      .then(({ error }) => { if (error) setSyncState({ status: 'error', message: error.message }); });
  }
}

export function clearList(key) {
  const current = readList(key);
  current.slice(0, 240).forEach((item) => moveToTrash({
    title: item.title || item.question || item.name || 'Library item',
    kind: KEY_TO_TYPE[key] || 'library',
    source: 'teacher-library',
    payload: item,
    restoreData: { type: 'library', key, item },
    metadata: { ownerId: currentOwner.id, ownerEmail: currentOwner.email, batch: true },
  }));
  writeLocalList(key, []);
  if (isCloudOwner()) {
    supabase.from(LIBRARY_TABLE).delete().eq('user_id', currentOwner.id).eq('item_type', KEY_TO_TYPE[key])
      .then(({ error }) => { if (error) setSyncState({ status: 'error', message: error.message }); });
  }
}

function mergeItems(localItems, cloudItems) {
  const map = new Map();
  [...cloudItems, ...localItems].forEach((item) => {
    if (!item?.id) return;
    const existing = map.get(item.id);
    const currentTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
    const existingTime = new Date(existing?.updatedAt || existing?.createdAt || 0).getTime();
    if (!existing || currentTime >= existingTime) map.set(item.id, item);
  });
  return [...map.values()].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

export async function syncLibraryFromCloud() {
  if (!isCloudOwner()) return { ok: true, mode: 'local' };
  setSyncState({ status: 'syncing', message: 'Syncing library…' });
  try {
    const { data, error } = await supabase
      .from(LIBRARY_TABLE)
      .select('id,item_type,payload,created_at,updated_at')
      .eq('user_id', currentOwner.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    suppressCloudWrite = true;
    for (const key of [HISTORY_KEY, PROMPTS_KEY, BANK_KEY]) {
      const type = KEY_TO_TYPE[key];
      const cloudItems = rows.filter((row) => row.item_type === type).map((row) => ({
        ...(row.payload || {}),
        id: row.id,
        createdAt: row.payload?.createdAt || row.created_at,
        updatedAt: row.payload?.updatedAt || row.updated_at,
      }));
      const localItems = readList(key);
      const merged = mergeItems(localItems, cloudItems);
      writeLocalList(key, merged);
      const cloudIds = new Set(cloudItems.map((item) => item.id));
      await upsertCloudItems(type, merged.filter((item) => !cloudIds.has(item.id)));
    }
    suppressCloudWrite = false;
    const lastSyncedAt = new Date().toISOString();
    setSyncState({ status: 'synced', message: 'Library synced', lastSyncedAt });
    return { ok: true, mode: 'cloud', count: rows.length };
  } catch (error) {
    suppressCloudWrite = false;
    setSyncState({ status: 'error', message: error?.message || 'Library sync failed' });
    return { ok: false, message: error?.message || String(error) };
  }
}

export function exportJson(filename, data) {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

export function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(text) {
  return String(text || 'brian-english-tools')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'brian-english-tools';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

export function buildPrintableHtml(title, content) {
  const safeTitle = escapeHtml(title || 'Brian English Output');
  const safeContent = escapeHtml(content || '').replace(/\n/g, '<br>');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>@font-face{font-family:BrianGesco;src:url('/bes-fonts/brian-personal-font.ttf?v=12.0.0') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}
body{font-family:BrianGesco,Inter,Arial,sans-serif;line-height:1.65;color:#111827;margin:0;background:#f3f6fb}.page{max-width:900px;margin:30px auto;background:#fff;padding:42px;border-radius:0;box-shadow:none;border:1px solid #b9d2e8}h1{font-size:34px;margin:0 0 18px;color:#0f172a}pre{white-space:pre-wrap;font:inherit}.meta{color:#64748b;margin-bottom:24px}@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}
</style>
</head>
<body><main class="page"><h1>${safeTitle}</h1><p class="meta">Created with Brian English Studio V1.0</p><pre>${safeContent}</pre></main></body>
</html>`;
}

export function buildWordDoc(title, content) {
  const safeTitle = escapeHtml(title || 'Brian English Output');
  const safeContent = escapeHtml(content || '').replace(/\n/g, '<br>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><h1>${safeTitle}</h1><p><em>Created with Brian English Studio V1.0</em></p><div>${safeContent}</div></body></html>`;
}

export function exportAsHtml(title, content) {
  downloadFile(`${slugify(title)}.html`, buildPrintableHtml(title, content), 'text/html;charset=utf-8');
}

export function exportAsWord(title, content) {
  downloadFile(`${slugify(title)}.doc`, buildWordDoc(title, content), 'application/msword;charset=utf-8');
}

function normalizeOptionText(text) {
  return String(text || '').replace(/^[-–—•\s]*/g, '').replace(/^[A-Da-d][).:\-]\s*/i, '').trim();
}

function cleanQuestionText(text) {
  return String(text || '')
    .replace(/^[-–—•\s]*/g, '')
    .replace(/^(?:question|câu)\s*\d{1,3}\s*(?:[).:-]|\.\s*)?\s*(?:\([^)]+\)\s*)?/i, '')
    .replace(/^\d{1,3}\s*[).:-]\s*(?:\([^)]+\)\s*)?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAnswerLetter(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const direct = raw.match(/^[A-D]/i)?.[0];
  if (direct) return direct.toUpperCase();
  const picked = raw.match(/(?:chọn|chon|answer|đáp\s*án|dap\s*an|correct(?:\s+answer)?)\s*[:：-]?\s*([A-D])/i)?.[1];
  return picked ? picked.toUpperCase() : '';
}

function parseAnswerKey(text) {
  const map = {};
  const answerText = String(text || '');
  const answerSection = answerText.split(/(?:answer\s*key|đáp\s*án|dap\s*an|keys?)\s*[:\n]/i).slice(1).join('\n') || answerText;
  const patterns = [
    /(?:^|\n|\s)(\d{1,3})\s*[).:-]?\s*([A-D])(?:\s|$|[,;])/gi,
    /(?:question|câu|cau)\s*(\d{1,3})\s*[:.\-–]?\s*(?:\([^)]+\)\s*)?(?:answer|đáp\s*án|dap\s*an|chọn|chon)?\s*[:\-–]?\s*([A-D])/gi,
    /(?:answer|đáp\s*án|dap\s*an)\s*(?:for)?\s*(?:question|câu|cau)?\s*(\d{1,3})\s*[:\-–]\s*([A-D])/gi,
    /(?:^|\n)\s*(?:câu|cau|question)?\s*(\d{1,3})\s*[:.)-]\s*(?:chọn|chon)\s*([A-D])\b/gi,
  ];
  for (const pattern of patterns) {
    for (const match of answerSection.matchAll(pattern)) map[Number(match[1])] = match[2].toUpperCase();
  }
  return map;
}

function splitInlineOptions(line) {
  const text = String(line || '');
  const marker = /(?:^|\s|\|)([A-Da-d])\s*[).:：-]\s+/g;
  const positions = [];
  let match;
  while ((match = marker.exec(text))) {
    positions.push({ letter: match[1].toUpperCase(), index: match.index, end: marker.lastIndex });
  }
  if (positions.length < 2) return null;
  const question = text.slice(0, positions[0].index).replace(/\|+$/g, '').trim();
  const options = positions.map((pos, idx) => {
    const next = positions[idx + 1]?.index ?? text.length;
    return text.slice(pos.end, next).replace(/\|+$/g, '').trim();
  });
  return { question, options };
}

function splitOptionOnlyLine(line) {
  const split = splitInlineOptions(line);
  if (!split) return null;
  return split.options.map((option) => option.replace(/(?:answer|đáp\s*án|dap\s*an|chọn|chon)\s*[:\-]?\s*[A-Da-d]\s*$/i, '').trim());
}

function extractAnswerAtEnd(text) {
  return normalizeAnswerLetter(String(text || '').match(/(?:answer|đáp\s*án|dap\s*an|chọn|chon|correct\s*answer)\s*[:\-]?\s*([A-Da-d])\s*$/i)?.[1] || '');
}

function getBestMcqText(text) {
  const raw = String(text || '').replace(/\r/g, '');
  const section = raw.match(/(?:^|\n)\s*(?:#+\s*)?GOOGLE FORM QUESTIONS\s*\n([\s\S]*)/i);
  return section ? section[1] : raw;
}

export function parseMcqFromText(text, meta = {}) {
  const raw = getBestMcqText(text);
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean);
  const answerMap = parseAnswerKey(text);
  const questions = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    const inferredAnswer = current.answer || answerMap[current.number] || '';
    const options = current.options.map(normalizeOptionText).filter(Boolean);
    if (current.question && options.length >= 2) {
      questions.push({
        ...meta,
        question: cleanQuestionText(current.question),
        options,
        answer: normalizeAnswerLetter(inferredAnswer),
        explanation: String(current.explanation || '').trim(),
      });
    }
    current = null;
  };

  for (const originalLine of lines) {
    let line = originalLine.replace(/^\|+|\|+$/g, '').trim();
    if (!line || /^[-|\s]+$/.test(line)) continue;
    if (/^(?:#|\*\*)?\s*(?:matrix|ma\s*trận|instructions?|hướng\s*dẫn)\b/i.test(line)) continue;
    if (/^(?:#|\*\*)?\s*(?:answer\s*key|đáp\s*án|dap\s*an)\s*$/i.test(line)) continue;

    const inline = line.match(/^(?:(?:question|câu|cau)\s*)?(\d{1,3})\s*(?:[).:-]|\.\s*)\s*(?:\([^)]+\)\s*)?(.+)/i);
    if (inline) {
      const rest = inline[2];
      const inlineSplit = splitInlineOptions(rest);
      if (inlineSplit && inlineSplit.options.length >= 2) {
        const cleanOptions = inlineSplit.options.map((option) => String(option || '').replace(/(?:answer|đáp\s*án|dap\s*an|chọn|chon)\s*[:\-]?\s*[A-Da-d]\s*$/i, '').trim());
        pushCurrent();
        current = {
          number: Number(inline[1]),
          question: inlineSplit.question,
          options: cleanOptions,
          answer: extractAnswerAtEnd(rest) || answerMap[Number(inline[1])] || '',
          explanation: '',
        };
        continue;
      }
      if (!/^\s*[A-Da-d][).:：-]/.test(rest) && rest.length > 4 && !/^lời\s*giải|^phương\s*pháp|^cách\s*giải/i.test(rest)) {
        pushCurrent();
        current = { number: Number(inline[1]), question: rest, options: [], answer: answerMap[Number(inline[1])] || '', explanation: '' };
        continue;
      }
    }

    const qWord = line.match(/^(?:question|câu|cau)\s*(\d{1,3})\s*(?:[:.)-]|\.\s*)\s*(?:\([^)]+\)\s*)?(.+)/i);
    if (qWord) {
      pushCurrent();
      current = { number: Number(qWord[1]), question: qWord[2], options: [], answer: answerMap[Number(qWord[1])] || '', explanation: '' };
      continue;
    }

    const optionLine = splitOptionOnlyLine(line);
    if (optionLine && current) {
      current.options.push(...optionLine);
      const answerAtEnd = extractAnswerAtEnd(line);
      if (answerAtEnd) current.answer = answerAtEnd;
      continue;
    }

    const optionMatch = line.match(/^([A-Da-d])\s*[).:：-]\s+(.+)/);
    if (optionMatch && current) {
      current.options.push(optionMatch[2]);
      continue;
    }

    const answerMatch = line.match(/^(?:answer|đáp\s*án|dap\s*an|correct\s*answer|chọn|chon)\s*[:\-]?\s*([A-Da-d])/i);
    if (answerMatch && current) {
      current.answer = answerMatch[1].toUpperCase();
      continue;
    }

    const explainMatch = line.match(/^(?:explanation|giải\s*thích|rationale)\s*[:\-]\s*(.+)/i);
    if (explainMatch && current) {
      current.explanation = current.explanation ? `${current.explanation} ${explainMatch[1]}` : explainMatch[1];
      continue;
    }

    if (current && current.options.length === 0 && !/^(?:#+|---|\*)/.test(line) && line.length < 220) {
      current.question = `${current.question} ${line}`.trim();
    } else if (current && current.explanation && !/^(?:#+|---|\*)/.test(line)) {
      current.explanation = `${current.explanation} ${line}`.trim();
    }
  }
  pushCurrent();
  return questions;
}

export function addQuestionsFromTextToBank(text, meta = {}) {
  return addBankItems(parseMcqFromText(text, meta));
}

export function addQuestionsFromActivity(activity, meta = {}) {
  if (!activity || !Array.isArray(activity.questions)) return [];
  const items = activity.questions.map((q) => ({
    ...meta,
    question: q.question,
    options: q.options,
    answer: typeof q.answerIndex === 'number' ? String.fromCharCode(65 + q.answerIndex) : q.answer || '',
    explanation: q.explanation || '',
  }));
  return addBankItems(items);
}

export function bankToText(items, includeAnswer = true) {
  return (items || []).map((item, index) => {
    const options = (item.options || []).map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n');
    return `${index + 1}. ${item.question}\n${options}${includeAnswer ? `\nAnswer: ${item.answer || ''}` : ''}${item.explanation ? `\nExplanation: ${item.explanation}` : ''}`;
  }).join('\n\n');
}
