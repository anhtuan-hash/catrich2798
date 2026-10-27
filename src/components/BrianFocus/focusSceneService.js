import { supabase, isSupabaseConfigured } from '../../utils/supabase.js';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import { parseFocusYoutubePlaylist, playlistIdsFromFocusPath, videoIdFromFocusPath } from './focusYoutube.js';
import { normalizeFocusWebScenes, normalizeFocusWebLayout, validateFocusWebScenes } from './focusWebScenes.js';

export const FOCUS_BUCKET = 'brian-focus-backgrounds';
export const FOCUS_DEFAULT = Object.freeze({
  mediaType: 'default', mediaPath: '', youtubeUrl: '', playlistIds: [], dimPercent: 24, mediaFit: 'cover', updatedAt: '',
});
const ACCEPT = Object.freeze({
  'image/jpeg': ['image', 'jpg', 8 * 1024 * 1024],
  'image/png': ['image', 'png', 8 * 1024 * 1024],
  'image/webp': ['image', 'webp', 8 * 1024 * 1024],
  'image/gif': ['image', 'gif', 8 * 1024 * 1024],
  'video/mp4': ['video', 'mp4', 50 * 1024 * 1024],
  'video/webm': ['video', 'webm', 50 * 1024 * 1024],
  'text/html': ['html', 'html', 512 * 1024],
});

export const canEditFocusScene = user => isDepartmentLeaderRole(user?.role) && user?.provider === 'supabase';

export function parseFocusScene(row) {
  const webProps = {
    webScenes: normalizeFocusWebScenes(row?.web_scenes,
      typeof window === 'undefined' ? '' : window.location.origin),
    webLayout: normalizeFocusWebLayout(row?.web_layout),
  };
  if (row?.media_type === 'website' && webProps.webScenes.length) {
    return {
      ...webProps, mediaType: 'website', mediaPath: '', youtubeUrl: '', playlistIds: [],
      dimPercent: Math.max(0, Math.min(85, Number(row.dim_percent) || 0)),
      mediaFit: row.media_fit === 'contain' ? 'contain' : 'cover',
      updatedAt: row.updated_at || '',
    };
  }
  if (row?.media_type === 'youtube' && videoIdFromFocusPath(row.media_path)) {
    const ids = playlistIdsFromFocusPath(row.media_path);
    return {
      ...webProps,
      mediaType: 'youtube', mediaPath: 'youtube:' + ids.join(','),
      youtubeUrl: ids.map(id => 'https://www.youtube.com/watch?v=' + id).join('\n'),
      playlistIds: ids,
      dimPercent: Math.max(0, Math.min(85, Number(row.dim_percent) || 0)),
      mediaFit: row.media_fit === 'contain' ? 'contain' : 'cover',
      updatedAt: row.updated_at || '',
    };
  }
  if (!row || !['image', 'video', 'html'].includes(row.media_type) || !String(row.media_path || '').startsWith('focus/')) {
    return {
      ...FOCUS_DEFAULT, ...webProps,
      dimPercent: Number.isFinite(Number(row?.dim_percent)) ? Math.max(0, Math.min(85, Number(row.dim_percent))) : 24,
      mediaFit: row?.media_fit === 'contain' ? 'contain' : 'cover',
      updatedAt: row?.updated_at || '',
    };
  }
  return {
    ...webProps,
    mediaType: row.media_type,
    mediaPath: String(row.media_path),
    mediaFit: row.media_fit === 'contain' ? 'contain' : 'cover',
    dimPercent: Math.max(0, Math.min(85, Number(row.dim_percent) || 0)),
    updatedAt: row.updated_at || '',
  };
}

export async function loadFocusScene() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Chưa kết nối máy chủ.');
  const { data, error } = await supabase.from('brian_focus_settings')
    .select('id,media_type,media_path,media_fit,dim_percent,web_scenes,web_layout,updated_at')
    .eq('id', 'global').maybeSingle();
  if (error) throw error;
  return parseFocusScene(data);
}

export function validateFocusFile(file) {
  const declared = String(file?.type || '').toLowerCase();
  const ext = String(file?.name || '').split('.').pop().toLowerCase();
  const type = declared || (ext === 'html' ? 'text/html' : ext === 'jpg' ? 'image/jpeg' :
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' :
    ext === 'mp4' ? 'video/mp4' : ext === 'webm' ? 'video/webm' : '');
  const rule = ACCEPT[type];
  if (!rule) throw new Error('Chỉ hỗ trợ JPG, PNG, WebP, GIF, MP4, WebM hoặc HTML.');
  if (!file?.size || file.size > rule[2]) {
    throw new Error(rule[0] === 'video' ? 'Video phải nhỏ hơn 50 MB.' :
      rule[0] === 'html' ? 'Tệp HTML phải nhỏ hơn 512 KB.' : 'Ảnh phải nhỏ hơn 8 MB.');
  }
  return { mediaType: rule[0], extension: rule[1], contentType: type };
}

export async function saveFocusScene(user, draft, file) {
  if (!canEditFocusScene(user)) throw new Error('Chỉ Admin hoặc TTCM được thay đổi nền dùng chung.');
  if (!supabase || !isSupabaseConfigured) throw new Error('Cần kết nối Supabase để đồng bộ cho mọi tài khoản.');
  let uploadedPath = '';
  let mediaType = draft.mediaType;
  let mediaPath = draft.mediaPath;
  if (file) {
    const validated = validateFocusFile(file);
    mediaType = validated.mediaType;
    mediaPath = 'focus/' + crypto.randomUUID() + '.' + validated.extension;
    const { error } = await supabase.storage.from(FOCUS_BUCKET).upload(mediaPath, file, {
      contentType: validated.contentType, cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    uploadedPath = mediaPath;
  } else if (mediaType === 'youtube') {
    // Save only validated video IDs, in order, in the existing shared settings
    // row. Same RLS, Realtime and updated_by checks as the previous single URL.
    const ids = parseFocusYoutubePlaylist(draft.youtubeUrl || playlistIdsFromFocusPath(draft.mediaPath));
    mediaPath = 'youtube:' + ids.join(',');
  } else if (mediaType === 'website') {
    validateFocusWebScenes(draft.webScenes,
      typeof window === 'undefined' ? '' : window.location.origin);
    mediaPath = '';
  } else if (mediaType === 'default') {
    mediaPath = '';
  }
  if (!['default', 'youtube', 'website'].includes(mediaType) && !String(mediaPath).startsWith('focus/')) {
    throw new Error('Hãy chọn ảnh, video hoặc tệp HTML trước khi công bố.');
  }
  try {
    const { data, error } = await supabase.from('brian_focus_settings')
      .update({
        media_type: mediaType,
        media_path: mediaPath,
        ...(mediaType === 'website' ? {
          web_scenes: validateFocusWebScenes(draft.webScenes,
            typeof window === 'undefined' ? '' : window.location.origin),
          web_layout: normalizeFocusWebLayout(draft.webLayout),
        } : {}),
        media_fit: draft.mediaFit === 'contain' ? 'contain' : 'cover',
        dim_percent: Math.max(0, Math.min(85, Math.round(Number(draft.dimPercent) || 0))),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', 'global')
      .select('id,media_type,media_path,media_fit,dim_percent,web_scenes,web_layout,updated_at').single();
    if (error) throw error;
    if (!data) throw new Error('Máy chủ chưa xác nhận công bố.');
    return parseFocusScene(data);
  } catch (error) {
    if (uploadedPath) await supabase.storage.from(FOCUS_BUCKET).remove([uploadedPath]).catch(() => {});
    throw error;
  }
}

const HTML_CSP = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; base-uri \'none\'; form-action \'none\'; connect-src \'none\'; frame-src \'none\'; img-src data: blob:; media-src data: blob:; font-src data:; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'">';
export function sandboxFocusHtml(source) {
  const raw = String(source || '');
  // The iframe uses sandbox="allow-scripts" without allow-same-origin;
  // this policy also blocks network, external scripts, frames, forms and navigation.
  return /<head\b[^>]*>/i.test(raw)
    ? raw.replace(/<head\b[^>]*>/i, match => match + HTML_CSP)
    : '<!doctype html><html><head>' + HTML_CSP + '</head><body>' + raw + '</body></html>';
}

export async function resolveFocusSceneMedia(scene) {
  if (['default', 'youtube', 'website'].includes(scene?.mediaType) || !scene?.mediaPath) return { src: '', html: '' };
  if (!supabase || !scene.mediaPath.startsWith('focus/')) throw new Error('Đường dẫn nền không hợp lệ.');
  if (scene.mediaType === 'html') {
    const { data, error } = await supabase.storage.from(FOCUS_BUCKET).download(scene.mediaPath);
    if (error) throw error;
    if (data.size > 512 * 1024) throw new Error('HTML vượt giới hạn an toàn.');
    return { src: '', html: sandboxFocusHtml(await data.text()) };
  }
  const { data, error } = await supabase.storage.from(FOCUS_BUCKET).createSignedUrl(scene.mediaPath, 3600);
  if (error) throw error;
  return { src: data.signedUrl, html: '' };
}

export function subscribeFocusScene(callback) {
  if (!supabase || typeof callback !== 'function') return () => {};
  const channel = supabase.channel('bes-focus-scene-' + Math.random().toString(36).slice(2))
    .on('postgres_changes', {
      schema: 'public', table: 'brian_focus_settings', event: '*', filter: 'id=eq.global',
    }, () => callback())
    .subscribe();
  return () => { supabase.removeChannel(channel).catch(() => {}); };
}
