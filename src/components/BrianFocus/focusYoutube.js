// A Focus scene stores a validated list of YouTube IDs, never untrusted iframe URLs.
export const FOCUS_YOUTUBE_PLAYLIST_MAX = 30;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com',
  'www.youtube-nocookie.com', 'youtube-nocookie.com',
  'youtu.be', 'www.youtu.be',
]);

export function parseFocusYoutubeId(value) {
  const input = String(value || '').trim();
  if (VIDEO_ID.test(input)) return input;
  let url;
  try { url = new URL(input); } catch { throw new Error('Hãy nhập liên kết video YouTube hợp lệ.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error('Chỉ chấp nhận liên kết youtube.com hoặc youtu.be.');
  }

  const path = url.pathname.split('/').filter(Boolean);
  const host = url.hostname.toLowerCase();
  let id = '';
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    if (path.length === 1) id = path[0];
  } else if (path[0] === 'watch') {
    id = url.searchParams.get('v') || '';
  } else if (['shorts', 'live', 'embed', 'v'].includes(path[0]) && path.length >= 2) {
    id = path[1];
  }
  if (!VIDEO_ID.test(id)) throw new Error('Không tìm thấy mã video YouTube hợp lệ trong liên kết.');
  return id;
}

/**
 * Accept pasted URLs (one per line, space, comma or semicolon separated).
 * Remove duplicates preserving order and report invalid items; no arbitrary
 * external origins are accepted, even for pasted playlist batches.
 */
export function parseFocusYoutubePlaylist(value) {
  const tokens = Array.isArray(value) ? value : String(value || '').split(/[\s,;]+/);
  const entries = tokens.map(v => String(v || '').trim()).filter(Boolean);
  if (!entries.length) throw new Error('Hãy dán ít nhất một liên kết video YouTube.');
  if (entries.length > FOCUS_YOUTUBE_PLAYLIST_MAX) {
    throw new Error('Danh sách hỗ trợ tối đa ' + FOCUS_YOUTUBE_PLAYLIST_MAX + ' video.');
  }
  const result = [];
  const seen = new Set();
  for (let i = 0; i < entries.length; i++) {
    let id;
    try { id = parseFocusYoutubeId(entries[i]); }
    catch { throw new Error('Liên kết số ' + (i + 1) + ' chưa hợp lệ. Chỉ dùng video YouTube.'); }
    if (!seen.has(id)) { seen.add(id); result.push(id); }
  }
  return result;
}

/** Backward compatible: youtube:ID (legacy) and youtube:ID,ID,... (playlist). */
export function playlistIdsFromFocusPath(path) {
  const input = String(path || '');
  const match = /^youtube:([A-Za-z0-9_-]{11}(?:,[A-Za-z0-9_-]{11}){0,29})$/.exec(input);
  if (!match || input.length > 512) return [];
  const ids = match[1].split(',');
  return new Set(ids).size === ids.length ? ids : [];
}

export function videoIdFromFocusPath(path) {
  return playlistIdsFromFocusPath(path)[0] || '';
}

export function buildFocusYoutubeEmbedUrl(videoId, {
  autoplay = true, controls = false, origin = '', playlistIds = null,
} = {}) {
  if (!VIDEO_ID.test(String(videoId || ''))) throw new Error('YouTube video ID invalid.');
  const ids = playlistIds === null ? [videoId] : parseFocusYoutubePlaylist(playlistIds);
  if (ids[0] !== videoId) throw new Error('Playlist first video must match the embed video.');
  const url = new URL('https://www.youtube-nocookie.com/embed/' + videoId);
  url.searchParams.set('autoplay', autoplay ? '1' : '0');
  url.searchParams.set('mute', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', controls ? '1' : '0');
  url.searchParams.set('enablejsapi', '1');
  // The embedded initial VIDEO_ID plays first; playlist parameter contains
  // only subsequent IDs, avoiding a duplicate of the first track.
  url.searchParams.set('loop', '1');
  url.searchParams.set('playlist', ids.length > 1 ? ids.slice(1).join(',') : videoId);
  url.searchParams.set('rel', '0');
  if (origin && /^https?:\/\//.test(origin)) url.searchParams.set('origin', origin);
  return url.toString();
}

const PLAYER_COMMANDS = new Set(['playVideo', 'pauseVideo', 'stopVideo', 'mute', 'unMute', 'nextVideo', 'previousVideo']);
export function commandFocusYoutubePlayer(iframe, command) {
  if (!iframe?.contentWindow || !PLAYER_COMMANDS.has(command)) return false;
  iframe.contentWindow.postMessage(JSON.stringify({
    event: 'command', func: command, args: [],
  }), 'https://www.youtube-nocookie.com');
  return true;
}
