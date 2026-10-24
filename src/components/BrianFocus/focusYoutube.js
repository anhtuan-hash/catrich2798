// A Focus scene stores only a YouTube video ID, never an untrusted iframe URL.
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

export function videoIdFromFocusPath(path) {
  const match = /^youtube:([A-Za-z0-9_-]{11})$/.exec(String(path || ''));
  return match?.[1] || '';
}

export function buildFocusYoutubeEmbedUrl(videoId, {
  autoplay = true, controls = false, origin = '',
} = {}) {
  if (!VIDEO_ID.test(String(videoId || ''))) throw new Error('YouTube video ID invalid.');
  const url = new URL('https://www.youtube-nocookie.com/embed/' + videoId);
  url.searchParams.set('autoplay', autoplay ? '1' : '0');
  url.searchParams.set('mute', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', controls ? '1' : '0');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('loop', '1');
  url.searchParams.set('playlist', videoId);
  url.searchParams.set('rel', '0');
  if (origin && /^https?:\/\//.test(origin)) url.searchParams.set('origin', origin);
  return url.toString();
}

const PLAYER_COMMANDS = new Set(['playVideo', 'pauseVideo', 'stopVideo', 'mute', 'unMute']);
export function commandFocusYoutubePlayer(iframe, command) {
  if (!iframe?.contentWindow || !PLAYER_COMMANDS.has(command)) return false;
  iframe.contentWindow.postMessage(JSON.stringify({
    event: 'command', func: command, args: [],
  }), 'https://www.youtube-nocookie.com');
  return true;
}
