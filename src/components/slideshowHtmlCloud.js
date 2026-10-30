import { supabase } from '../utils/supabase.js';

// HTML is intentionally stored as plain text in a PRIVATE bucket.
// It is only executed in the existing iframe sandbox (no allow-same-origin).
const BUCKET = 'brian-slideshow-html';
const TABLE = 'bes_slideshow_html_files';
export const MAX_CLOUD_HTML_BYTES = 8 * 1024 * 1024;

export async function listCloudHtmlFiles(albumId) {
  if (!albumId) return [];
  const { data, error } = await supabase.from(TABLE)
    .select('id,album_id,name,storage_path,file_size,created_at')
    .eq('album_id', albumId).order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id, albumId: row.album_id, name: row.name,
    storagePath: row.storage_path, size: row.file_size,
    createdAt: Date.parse(row.created_at) || Date.now(),
    position: Date.parse(row.created_at) || Date.now(),
    scope: 'cloud'
  }));
}

export async function uploadCloudHtmlFile({ albumId, name, html, size }) {
  if (!albumId || !html?.trim()) throw new Error('File HTML không hợp lệ.');
  const actualSize = new Blob([html]).size;
  if (!actualSize || actualSize > MAX_CLOUD_HTML_BYTES) throw new Error('HTML vượt quá 8 MB.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Vui lòng đăng nhập tài khoản TTCM hoặc Admin để lưu lên web.');
  const id = crypto.randomUUID();
  const storagePath = albumId + '/' + id + '.html';
  // Keep text/html away from directly navigable storage URLs.
  const file = new Blob([html], { type: 'text/plain' });
  const { error: uploadError } = await supabase.storage.from(BUCKET)
    .upload(storagePath, file, { contentType: 'text/plain', cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from(TABLE).insert({
    id, album_id: albumId, name: String(name || 'activity.html').slice(0, 180),
    storage_path: storagePath, file_size: size || actualSize,
    created_by: auth.user.id
  }).select('id,album_id,name,storage_path,file_size,created_at').single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return {
    id: data.id, albumId: data.album_id, name: data.name,
    storagePath: data.storage_path, size: data.file_size,
    createdAt: Date.parse(data.created_at) || Date.now(),
    position: Date.parse(data.created_at) || Date.now(), scope: 'cloud'
  };
}

export async function downloadCloudHtmlFile(file) {
  if (!file?.storagePath) throw new Error('Không tìm thấy file trên web.');
  const { data, error } = await supabase.storage.from(BUCKET).download(file.storagePath);
  if (error) throw error;
  return data.text();
}

export async function deleteCloudHtmlFile(file) {
  if (!file?.storagePath) return;
  // Remove the file first to avoid leaving a publicly listed, unplayable record.
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([file.storagePath]);
  if (storageError) throw storageError;
  const { error: rowError } = await supabase.from(TABLE).delete().eq('id', file.id);
  if (rowError) throw rowError;
}
