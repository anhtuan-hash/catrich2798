import { loadActivityState, openActivityCenter, ACTIVITY_CENTER_EVENT } from './activityCenter.js';
import { loadBank, loadHistory, loadPrompts, LIBRARY_EVENT } from '../../utils/library.js';
import { loadResourceLibrary, RESOURCE_EVENT } from '../../utils/resourceLibrary.js';
import { isAdminRole, isDepartmentLeaderRole } from '../../utils/roles.js';

export const UNIVERSAL_SEARCH_INDEX_EVENT = 'brian:universal-search-index-updated';
export const UNIVERSAL_SEARCH_TARGET_KEY = 'brian-universal-search-target-v12.12';

const MAX_INDEX_ENTRIES = 720;
const MAX_INDEX_TEXT = 6000;

function clean(value, limit = MAX_INDEX_TEXT) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean).map((item) => clean(item, 300)) : [];
}

function timestamp(value) {
  const number = typeof value === 'number' ? value : new Date(value || 0).getTime();
  return Number.isFinite(number) ? number : 0;
}

function resourceVisibleToUser(item, user) {
  if (!item || item.deletedAt) return false;
  const userId = String(user?.id || '');
  const email = String(user?.email || '').toLowerCase();
  const owner = String(item.uploaderId || '');
  const ownerEmail = String(item.uploaderName || '').toLowerCase();
  const leader = isAdminRole(user?.role) || isDepartmentLeaderRole(user?.role);
  if (leader) return true;
  if (userId && owner && userId === owner) return true;
  if (email && ownerEmail && email === ownerEmail) return true;
  if (!user) return item.status === 'approved' && item.visibility === 'public';
  return item.status === 'approved' && item.visibility !== 'private';
}

function common(entry) {
  return {
    kind: 'content',
    priority: 3,
    workspaceId: 'resources',
    color: '#2878D0',
    updatedAt: 0,
    excerpt: '',
    sourceLabel: '',
    ...entry,
  };
}

function historyEntries(language) {
  return loadHistory().map((item) => {
    const title = clean(item.title || item.sourceAppTitle || item.toolTitle || (language === 'vi' ? 'Nội dung đã lưu' : 'Saved output'), 180);
    const content = clean(item.content || item.description || '', MAX_INDEX_TEXT);
    return common({
      id: `content:history:${item.id}`,
      contentType: 'history',
      contentId: String(item.id || ''),
      title,
      subtitle: content.slice(0, 220) || (language === 'vi' ? 'Kết quả AI hoặc hoạt động đã lưu.' : 'Saved AI output or activity.'),
      excerpt: content.slice(0, 900),
      icon: '◷',
      color: '#CC7621',
      sourceLabel: language === 'vi' ? 'Lịch sử thư viện' : 'Library history',
      updatedAt: timestamp(item.updatedAt || item.createdAt),
      keywords: `${title} ${content} ${list(item.tags).join(' ')} ${item.sourceApp || ''} ${item.sourceAppTitle || ''} ${item.toolTitle || ''}`,
      priority: 7,
    });
  });
}

function promptEntries(language) {
  return loadPrompts().map((item) => {
    const title = clean(item.title || (language === 'vi' ? 'Prompt đã lưu' : 'Saved prompt'), 180);
    const body = clean(item.body || item.prompt || '', MAX_INDEX_TEXT);
    return common({
      id: `content:prompt:${item.id}`,
      contentType: 'prompt',
      contentId: String(item.id || ''),
      title,
      subtitle: body.slice(0, 220) || clean(item.category),
      excerpt: body.slice(0, 900),
      icon: '💬',
      color: '#6255D9',
      sourceLabel: language === 'vi' ? 'Bộ prompt' : 'Prompt library',
      updatedAt: timestamp(item.updatedAt || item.createdAt),
      keywords: `${title} ${body} ${item.category || ''} prompt mẫu tái sử dụng reusable`,
      priority: 6,
    });
  });
}

function bankEntries(language) {
  return loadBank().map((item) => {
    const question = clean(item.question || (language === 'vi' ? 'Câu hỏi' : 'Question'), 600);
    const options = list(item.options).join(' ');
    const explanation = clean(item.explanation || '', 1200);
    return common({
      id: `content:question:${item.id}`,
      contentType: 'question',
      contentId: String(item.id || ''),
      title: question.slice(0, 180),
      subtitle: `${item.level || 'B2-C1'}${item.topic ? ` · ${clean(item.topic, 100)}` : ''}${item.source ? ` · ${clean(item.source, 100)}` : ''}`,
      excerpt: `${question} ${options} ${explanation}`.slice(0, 900),
      icon: '❓',
      color: '#CC7621',
      workspaceId: 'assessment',
      sourceLabel: language === 'vi' ? 'Ngân hàng câu hỏi' : 'Question bank',
      updatedAt: timestamp(item.updatedAt || item.createdAt),
      keywords: `${question} ${options} ${item.answer || ''} ${explanation} ${item.level || ''} ${item.topic || ''} ${item.source || ''}`,
      priority: 5,
    });
  });
}

function resourceEntries(user, language) {
  const store = loadResourceLibrary();
  return (store.items || []).filter((item) => resourceVisibleToUser(item, user)).map((item) => {
    const title = clean(item.title || item.fileName || (language === 'vi' ? 'Học liệu' : 'Resource'), 180);
    const indexed = clean(item.extractedText || '', MAX_INDEX_TEXT);
    const description = clean(item.aiSummary || item.description || '', 1600);
    const metadata = [item.category, item.grade, item.schoolYear, item.unitName, item.cefr, ...list(item.skills), ...list(item.tags), item.source].filter(Boolean).join(' ');
    return common({
      id: `content:resource:${item.cloudId || item.id}`,
      contentType: 'resource',
      contentId: String(item.cloudId || item.id || ''),
      title,
      subtitle: description.slice(0, 220) || clean(item.fileName || metadata, 220),
      excerpt: `${description} ${indexed}`.trim().slice(0, 1000),
      icon: String(item.fileName || '').split('.').pop()?.slice(0, 4).toUpperCase() || '▥',
      color: '#2878D0',
      sourceLabel: language === 'vi' ? 'Kho học liệu' : 'Resource library',
      updatedAt: timestamp(item.updatedAt || item.createdAt),
      keywords: `${title} ${item.fileName || ''} ${description} ${indexed} ${metadata}`,
      priority: item.featured ? 10 : 8,
      resourceCategory: item.category || '',
    });
  });
}

function activityEntries(user, language) {
  return loadActivityState(user).items.map((item) => common({
    id: `content:activity:${item.id}`,
    contentType: 'activity',
    contentId: String(item.id || ''),
    activityCategory: item.category,
    title: clean(item.title || (language === 'vi' ? 'Hoạt động' : 'Activity'), 180),
    subtitle: clean(item.body || item.status || '', 220),
    excerpt: clean(item.body || '', 900),
    icon: item.icon || '◎',
    color: item.tone === 'danger' ? '#D13438' : item.tone === 'warning' ? '#CC7621' : item.tone === 'success' ? '#14866D' : '#315FC4',
    workspaceId: item.category === 'work' ? 'management' : item.category === 'ai' ? 'ai' : 'system',
    sourceLabel: language === 'vi' ? 'Trung tâm hoạt động' : 'Activity Center',
    updatedAt: timestamp(item.createdAt),
    keywords: `${item.title || ''} ${item.body || ''} ${item.category || ''} ${item.status || ''} ${item.source || ''}`,
    priority: item.read ? 2 : 6,
  }));
}

export function buildUniversalSearchEntries({ user = null, language = 'vi' } = {}) {
  const entries = [
    ...resourceEntries(user, language),
    ...historyEntries(language),
    ...promptEntries(language),
    ...bankEntries(language),
    ...activityEntries(user, language),
  ];
  return entries
    .filter((entry) => entry.contentId && entry.title)
    .filter((entry, index, collection) => collection.findIndex((candidate) => candidate.id === entry.id) === index)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0) || Number(b.priority || 0) - Number(a.priority || 0))
    .slice(0, MAX_INDEX_ENTRIES);
}

export function subscribeUniversalSearchIndex(onChange) {
  if (typeof window === 'undefined') return () => {};
  let timer = 0;
  const emit = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      onChange?.();
      window.dispatchEvent(new CustomEvent(UNIVERSAL_SEARCH_INDEX_EVENT));
    }, 80);
  };
  const events = [LIBRARY_EVENT, RESOURCE_EVENT, ACTIVITY_CENTER_EVENT];
  events.forEach((eventName) => window.addEventListener(eventName, emit));
  window.addEventListener('storage', emit);
  return () => {
    window.clearTimeout(timer);
    events.forEach((eventName) => window.removeEventListener(eventName, emit));
    window.removeEventListener('storage', emit);
  };
}

function rememberTarget(entry) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(UNIVERSAL_SEARCH_TARGET_KEY, JSON.stringify({
      contentType: entry.contentType,
      contentId: entry.contentId,
      title: entry.title,
      updatedAt: Date.now(),
    }));
  } catch { /* optional */ }
}

export function openUniversalSearchEntry(entry) {
  if (!entry || typeof window === 'undefined') return;
  rememberTarget(entry);
  if (entry.contentType === 'activity') {
    const tab = { notification: 'notifications', work: 'work', sync: 'sync', history: 'history', ai: 'ai', system: 'overview' }[entry.activityCategory] || 'overview';
    openActivityCenter(tab);
    return;
  }
  if (entry.contentType === 'resource') {
    window.location.hash = `#/resource-library?resource=${encodeURIComponent(entry.contentId)}`;
    return;
  }
  const tab = entry.contentType === 'prompt' ? 'prompts' : entry.contentType === 'question' ? 'bank' : 'history';
  window.location.hash = `#/library?tab=${tab}&item=${encodeURIComponent(entry.contentId)}`;
}

export function readUniversalSearchTarget() {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(UNIVERSAL_SEARCH_TARGET_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
