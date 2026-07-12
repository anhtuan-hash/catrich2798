import { supabase, isSupabaseConfigured } from './supabase.js';
import { RESOURCE_CATEGORY_FALLBACK, normaliseResourceCategory } from '../features/resource-library/resourceCategories.js';

const KEY = 'bes-resource-library-v10-81';
export const RESOURCE_EVENT = 'bes-resource-library-updated';

const seedCategories = RESOURCE_CATEGORY_FALLBACK.map((category) => ({
  id: category.slug,
  slug: category.slug,
  nameVi: category.name_vi,
  name: category.name_en,
  folder: category.drive_folder_name,
  icon: category.icon,
  tone: category.tone,
  sortOrder: category.sort_order,
}));

function fresh() {
  return {
    version: 2,
    categories: seedCategories,
    items: [],
    collections: [],
    comments: [],
    favorites: [],
    activity: [],
    drive: { connected: false, rootFolderName: 'BRIAN ENGLISH – KHO HỌC LIỆU TỔ TIẾNG ANH' },
  };
}

function resolveStoredCategory(primary, legacy) {
  const primaryValue = String(primary || '').trim().toLowerCase();
  const legacyValue = String(legacy || '').trim();
  return normaliseResourceCategory(primaryValue && primaryValue !== 'other' ? primaryValue : legacyValue || primaryValue);
}

function normaliseStoredItem(item) {
  return {
    ...item,
    category: resolveStoredCategory(item?.category, item?.categoryId || item?.category_id),
    schoolYear: item?.schoolYear || item?.school_year || '',
    unitName: item?.unitName || item?.unit_name || '',
    featured: Boolean(item?.featured || item?.is_featured),
  };
}

export function loadResourceLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (parsed && Array.isArray(parsed.items)) {
      return {
        ...fresh(),
        ...parsed,
        version: 2,
        categories: seedCategories,
        items: parsed.items.map(normaliseStoredItem),
      };
    }

    // One-time migration from the V10.80 local key.
    const legacy = JSON.parse(localStorage.getItem('bes-resource-library-v10-80') || 'null');
    if (legacy && Array.isArray(legacy.items)) {
      const migrated = {
        ...fresh(),
        ...legacy,
        version: 2,
        categories: seedCategories,
        items: legacy.items.map(normaliseStoredItem),
      };
      localStorage.setItem(KEY, JSON.stringify(migrated));
      return migrated;
    }

    return fresh();
  } catch {
    return fresh();
  }
}

export function saveResourceLibrary(data) {
  const next = {
    ...fresh(),
    ...data,
    version: 2,
    categories: seedCategories,
    items: Array.isArray(data?.items) ? data.items.map(normaliseStoredItem) : [],
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(RESOURCE_EVENT, { detail: next }));
  return next;
}

export function updateResourceLibrary(mutator) {
  const next = structuredClone(loadResourceLibrary());
  mutator(next);
  return saveResourceLibrary(next);
}

export function resourceId(prefix = 'res') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function syncResourcesFromCloud() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'Supabase chưa cấu hình' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, reason: 'Chưa đăng nhập' };
  const { data, error } = await supabase.from('resource_items').select('*').order('created_at', { ascending: false });
  if (error) return { ok: false, reason: error.message };
  updateResourceLibrary((store) => {
    const localOnly = store.items.filter((item) => item.storageMode === 'local' && !item.cloudId);
    store.items = [...(data || []).map(fromCloudRow), ...localOnly];
  });
  return { ok: true, count: data?.length || 0 };
}

export async function fetchResourceCategoryOverview() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, rows: [], reason: 'Supabase chưa cấu hình' };
  const { data, error } = await supabase
    .from('resource_category_overview')
    .select('*')
    .order('sort_order', { ascending: true });
  return error ? { ok: false, rows: [], reason: error.message } : { ok: true, rows: data || [] };
}

function fromCloudRow(row) {
  return {
    id: row.id,
    cloudId: row.id,
    title: row.title,
    description: row.description || '',
    category: resolveStoredCategory(row.category, row.category_id),
    grade: row.grade || '',
    schoolYear: row.school_year || '',
    unitName: row.unit_name || '',
    cefr: row.cefr || '',
    skills: row.skills || [],
    tags: row.tags || [],
    source: row.source || '',
    copyright: row.copyright_status || 'internal',
    visibility: row.visibility || 'department',
    allowDownload: row.allow_download !== false,
    status: row.status || 'pending',
    featured: Boolean(row.is_featured),
    uploaderId: row.uploader_id,
    uploaderName: row.uploader_name || '',
    mimeType: row.mime_type || '',
    fileName: row.file_name || '',
    size: Number(row.file_size || 0),
    driveFileId: row.drive_file_id || '',
    driveWebViewLink: row.drive_web_view_link || '',
    driveDownloadLink: row.drive_download_link || '',
    aiSummary: row.ai_summary || '',
    aiUses: row.ai_uses || [],
    extractedText: row.extracted_text || '',
    checksum: row.checksum || '',
    version: row.version_number || 1,
    parentResourceId: row.parent_resource_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    views: Number(row.views || 0),
    downloads: Number(row.downloads || 0),
    storageMode: 'cloud',
  };
}

export async function upsertResourceCloud(item) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, reason: 'auth' };
  const category = normaliseResourceCategory(item.category);
  const row = {
    id: item.cloudId || undefined,
    title: item.title,
    description: item.description || '',
    category,
    // Keep the legacy text column populated for older code and indexes.
    category_id: category,
    grade: item.grade || '',
    school_year: item.schoolYear || '',
    unit_name: item.unitName || '',
    cefr: item.cefr || '',
    skills: item.skills || [],
    tags: item.tags || [],
    source: item.source || '',
    copyright_status: item.copyright || 'internal',
    visibility: item.visibility || 'department',
    allow_download: item.allowDownload !== false,
    status: item.status || 'pending',
    is_featured: Boolean(item.featured),
    uploader_id: auth.user.id,
    uploader_name: item.uploaderName || auth.user.email || '',
    mime_type: item.mimeType || '',
    file_name: item.fileName || '',
    file_size: item.size || 0,
    drive_file_id: item.driveFileId || null,
    drive_web_view_link: item.driveWebViewLink || null,
    drive_download_link: item.driveDownloadLink || null,
    ai_summary: item.aiSummary || '',
    ai_uses: item.aiUses || [],
    extracted_text: String(item.extractedText || '').slice(0, 60000),
    checksum: item.checksum || '',
    version_number: item.version || 1,
    parent_resource_id: item.parentResourceId || null,
  };
  const { data, error } = await supabase.from('resource_items').upsert(row).select().single();
  return error ? { ok: false, reason: error.message } : { ok: true, item: fromCloudRow(data) };
}

export async function getAccessToken() {
  if (!supabase) return '';
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || '';
}

export async function sha256(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
