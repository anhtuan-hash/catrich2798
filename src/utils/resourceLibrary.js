import { supabase, isSupabaseConfigured } from './supabase.js';

const KEY = 'bes-resource-library-v10-80';
export const RESOURCE_EVENT = 'bes-resource-library-updated';

const seedCategories = [
  { id: 'books', nameVi: 'Sách & tài liệu tham khảo', name: 'Books & references', folder: '01_SACH_VA_TAI_LIEU_THAM_KHAO' },
  { id: 'lesson-plans', nameVi: 'Giáo án', name: 'Lesson plans', folder: '02_GIAO_AN' },
  { id: 'worksheets', nameVi: 'Worksheets', name: 'Worksheets', folder: '03_WORKSHEETS' },
  { id: 'tests', nameVi: 'Đề kiểm tra', name: 'Tests', folder: '04_DE_KIEM_TRA' },
  { id: 'slides', nameVi: 'Slides bài giảng', name: 'Teaching slides', folder: '05_SLIDES_BAI_GIANG' },
  { id: 'media', nameVi: 'Audio & Video', name: 'Audio & video', folder: '06_AUDIO_VIDEO' },
  { id: 'professional', nameVi: 'Tài liệu chuyên môn', name: 'Professional resources', folder: '07_TAI_LIEU_CHUYEN_MON' },
  { id: 'games', nameVi: 'Trò chơi & hoạt động', name: 'Games & activities', folder: '08_TRO_CHOI_VA_HOAT_DONG' },
  { id: 'forms', nameVi: 'Biểu mẫu', name: 'Templates', folder: '09_BIEU_MAU' },
  { id: 'internal', nameVi: 'Tài liệu nội bộ', name: 'Internal resources', folder: '10_TAI_LIEU_NOI_BO' },
];

function fresh() {
  return { version: 1, categories: seedCategories, items: [], collections: [], comments: [], favorites: [], activity: [], drive: { connected: false, rootFolderName: 'BRIAN ENGLISH – KHO HỌC LIỆU TỔ TIẾNG ANH' } };
}

export function loadResourceLibrary() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null');
    return parsed && Array.isArray(parsed.items) ? { ...fresh(), ...parsed, categories: parsed.categories?.length ? parsed.categories : seedCategories } : fresh();
  } catch { return fresh(); }
}

export function saveResourceLibrary(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(RESOURCE_EVENT, { detail: data }));
  return data;
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

function fromCloudRow(row) {
  return {
    id: row.id, cloudId: row.id, title: row.title, description: row.description || '', category: row.category_id || 'professional',
    grade: row.grade || '', cefr: row.cefr || '', skills: row.skills || [], tags: row.tags || [], source: row.source || '',
    copyright: row.copyright_status || 'internal', visibility: row.visibility || 'department', allowDownload: row.allow_download !== false,
    status: row.status || 'pending', uploaderId: row.uploader_id, uploaderName: row.uploader_name || '', mimeType: row.mime_type || '',
    fileName: row.file_name || '', size: Number(row.file_size || 0), driveFileId: row.drive_file_id || '', driveWebViewLink: row.drive_web_view_link || '',
    driveDownloadLink: row.drive_download_link || '', aiSummary: row.ai_summary || '', aiUses: row.ai_uses || [], extractedText: row.extracted_text || '',
    checksum: row.checksum || '', version: row.version_number || 1, parentResourceId: row.parent_resource_id || null,
    createdAt: row.created_at, updatedAt: row.updated_at, approvedAt: row.approved_at, approvedBy: row.approved_by,
    views: row.views || 0, downloads: row.downloads || 0, storageMode: 'cloud',
  };
}

export async function upsertResourceCloud(item) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, reason: 'local' };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, reason: 'auth' };
  const row = {
    id: item.cloudId || undefined, title: item.title, description: item.description || '', category_id: item.category,
    grade: item.grade || '', cefr: item.cefr || '', skills: item.skills || [], tags: item.tags || [], source: item.source || '',
    copyright_status: item.copyright || 'internal', visibility: item.visibility || 'department', allow_download: item.allowDownload !== false,
    status: item.status || 'pending', uploader_id: auth.user.id, uploader_name: item.uploaderName || auth.user.email || '',
    mime_type: item.mimeType || '', file_name: item.fileName || '', file_size: item.size || 0, drive_file_id: item.driveFileId || null,
    drive_web_view_link: item.driveWebViewLink || null, drive_download_link: item.driveDownloadLink || null, ai_summary: item.aiSummary || '',
    ai_uses: item.aiUses || [], extracted_text: String(item.extractedText || '').slice(0, 60000), checksum: item.checksum || '',
    version_number: item.version || 1, parent_resource_id: item.parentResourceId || null,
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
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
