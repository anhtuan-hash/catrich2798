import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseFocusYoutubeId, parseFocusYoutubePlaylist,
  playlistIdsFromFocusPath, FOCUS_YOUTUBE_PLAYLIST_MAX,
  videoIdFromFocusPath,
  buildFocusYoutubeEmbedUrl,
  commandFocusYoutubePlayer,
} from '../src/components/BrianFocus/focusYoutube.js';

const id = 'dQw4w9WgXcQ';
for (const link of [
  id,
  'https://www.youtube.com/watch?v=' + id,
  'https://m.youtube.com/watch?v=' + id + '&t=20',
  'https://music.youtube.com/watch?v=' + id,
  'https://youtu.be/' + id + '?si=1234',
  'https://www.youtube.com/shorts/' + id,
  'https://www.youtube.com/live/' + id,
  'https://www.youtube.com/embed/' + id,
  'https://www.youtube-nocookie.com/embed/' + id,
]) {
  assert.equal(parseFocusYoutubeId(link), id, 'Valid link rejected: ' + link);
}
for (const invalid of [
  '', 'https://youtube.com.evil.invalid/watch?v=' + id,
  'https://fake-youtube.com/watch?v=' + id,
  'javascript:alert(1)',
  'https://youtube.com/playlist?list=PLsomething',
  'https://youtu.be/too-short',
  'https://www.youtube.com/watch?v=' + id + 'malicious',
  'https://www.youtube.com/other/' + id,
  'https://evil.invalid/?v=' + id,
]) {
  assert.throws(() => parseFocusYoutubeId(invalid), Error, 'Invalid input accepted: ' + invalid);
}
assert.equal(videoIdFromFocusPath('youtube:' + id), id);
assert.equal(videoIdFromFocusPath('focus/' + id), '');
assert.equal(videoIdFromFocusPath('youtube:' + id + '/evil'), '');
const id2 = 'aBcD1234_Xy', id3 = 'ZyXw9876_Ab';
const ordered = parseFocusYoutubePlaylist([
  'https://youtu.be/' + id,
  'https://www.youtube.com/watch?v=' + id2,
  'https://www.youtube.com/shorts/' + id3,
  'https://youtu.be/' + id,
].join('\n'));
assert.deepEqual(ordered, [id,id2,id3], 'Playlist order must survive and duplicates should be ignored');
assert.equal(FOCUS_YOUTUBE_PLAYLIST_MAX,30);
assert.deepEqual(playlistIdsFromFocusPath('youtube:' + ordered.join(',')), ordered);
assert.equal(videoIdFromFocusPath('youtube:' + ordered.join(',')), id);
assert.deepEqual(playlistIdsFromFocusPath('youtube:' + id + ',' + id),[], 'Duplicate persisted IDs rejected');
assert.deepEqual(playlistIdsFromFocusPath('youtube:' + id + ',javascript:alert(1)'),[], 'Untrusted ID rejected');
assert.throws(() => parseFocusYoutubePlaylist('https://evil.invalid/watch?v=' + id2));
assert.throws(() => parseFocusYoutubePlaylist(Array.from({length:31},(_,i)=>id2)));
const playlistUrl = new URL(buildFocusYoutubeEmbedUrl(id, {
  playlistIds:ordered, origin:'https://esl-brian.vercel.app'
}));
assert.equal(playlistUrl.pathname,'/embed/' + id);
assert.equal(playlistUrl.searchParams.get('playlist'), id2 + ',' + id3,
  'First track must not appear twice in the playlist');
assert.equal(playlistUrl.searchParams.get('loop'),'1');
assert.equal(playlistUrl.searchParams.get('enablejsapi'),'1');
assert.throws(() => buildFocusYoutubeEmbedUrl(id,{playlistIds:[id2,id]}));

const url = new URL(buildFocusYoutubeEmbedUrl(id, { origin: 'https://esl-brian.vercel.app' }));
assert.equal(url.hostname, 'www.youtube-nocookie.com');
assert.equal(url.pathname, '/embed/' + id);
assert.equal(url.searchParams.get('autoplay'), '1');
assert.equal(url.searchParams.get('mute'), '1');
assert.equal(url.searchParams.get('loop'), '1');
assert.equal(url.searchParams.get('playlist'), id);
assert.equal(url.searchParams.get('enablejsapi'), '1');
assert.equal(url.searchParams.get('origin'), 'https://esl-brian.vercel.app');
assert.equal(new URL(buildFocusYoutubeEmbedUrl(id, { autoplay:false, controls:true })).searchParams.get('autoplay'), '0');
let sent = null;
const frame = { contentWindow: { postMessage: (message, target) => { sent = { message, target }; } } };
assert.equal(commandFocusYoutubePlayer(frame,'playVideo'),true);
assert.deepEqual(JSON.parse(sent.message), { event:'command',func:'playVideo',args:[] });
assert.equal(sent.target,'https://www.youtube-nocookie.com');
assert.equal(commandFocusYoutubePlayer(frame,'nextVideo'),true);
assert.deepEqual(JSON.parse(sent.message),{event:'command',func:'nextVideo',args:[]});
assert.equal(commandFocusYoutubePlayer(frame,'previousVideo'),true);
assert.equal(commandFocusYoutubePlayer(frame,'stealCredentials'),false);

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const service = read('src/components/BrianFocus/focusSceneService.js');
const editor = read('src/components/BrianFocus/FocusSceneEditor.jsx');
const overlay = read('src/components/BrianFocus/FocusOverlay.jsx');
const player = read('src/components/BrianFocus/FocusYoutubeBackground.jsx');
const persistent = read('src/components/BrianFocus/usePersistentFocusYoutube.jsx');
const root = read('src/components/BrianFocus/BrianFocus.jsx');
const bgStyle = read('src/components/BrianFocus/BrianFocusPersistentYoutube.css');
const stylesheet = read('src/components/BrianFocus/BrianFocusScene.css');
assert.match(service,/mediaType === 'youtube'/);
assert.match(service,/parseFocusYoutubePlaylist\(draft\.youtubeUrl/);
assert.match(service,/mediaPath = 'youtube:' \+ ids\.join/);
assert.match(editor,/<textarea id="bfc-youtube-url"/);
assert.match(editor,/changeYoutubeOrder/);
assert.match(editor,/bfc-scene-editor__playlist/);
assert.match(editor,/youtubeIds\.length/);
assert.match(editor,/youtubePreviewUrl/);
assert.match(editor,/Lưu & đồng bộ/);
assert.match(overlay,/<FocusYoutubeBackground\s+scene={displayScene}/);
assert.match(overlay,/const displayScene = (?:personalDim === null \? scene|\{ \.\.\.scene, dimPercent: dim \})/);
assert.match(overlay,/handleSoundscapeActive/);
assert.match(persistent,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
assert.match(persistent,/referrerPolicy="strict-origin-when-cross-origin"/);
assert.match(persistent,/commandFocusYoutubePlayer/);
assert.match(persistent,/playlistIdsFromFocusPath/);
assert.match(persistent,/playlistIds: playlist/);
assert.match(persistent,/send\('nextVideo'\)/);
assert.match(player,/aria-label={vi \? 'Điều khiển YouTube chạy nền'/);
assert.match(stylesheet,/\.bfc-youtube-controls/);
assert.match(stylesheet,/\.bfc-scene-editor__youtube-field/);
assert.match(root,/persistentYoutubePlayer/);
assert.match(root,/youtubeSession\.mounted/);
assert.match(persistent,/explicitlyStopped/);
assert.match(persistent,/stopVideo/);
assert.match(player,/Tắt hẳn video YouTube/);
assert.match(player,/playlistIdsFromFocusPath/);
assert.match(player,/controls\?\.next/);
assert.match(bgStyle,/\.bfc-overlay\.bfc-overlay--youtube/);
assert.match(bgStyle,/\.bfc-persistent-youtube\.is-background \{opacity:0;\}/);
const migration = read('supabase/migrations/20261024174300_brian_focus_youtube_playlist.sql');
assert.match(migration,/\(,\[A-Za-z0-9_-\]\{11\}\)\{0,29\}/);
assert.match(migration,/focus_media_consistency/);
console.log('PASS: Focus YouTube ordered playlist, URL validation, shared settings and continuous persistent playback.');
