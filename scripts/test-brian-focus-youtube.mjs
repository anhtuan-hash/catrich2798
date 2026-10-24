import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseFocusYoutubeId,
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
assert.equal(commandFocusYoutubePlayer(frame,'stealCredentials'),false);

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const service = read('src/components/BrianFocus/focusSceneService.js');
const editor = read('src/components/BrianFocus/FocusSceneEditor.jsx');
const overlay = read('src/components/BrianFocus/FocusOverlay.jsx');
const player = read('src/components/BrianFocus/FocusYoutubeBackground.jsx');
const stylesheet = read('src/components/BrianFocus/BrianFocusScene.css');
assert.match(service,/mediaType === 'youtube'/);
assert.match(service,/parseFocusYoutubeId\(draft\.youtubeUrl/);
assert.match(service,/mediaPath = 'youtube:' \+/);
assert.match(editor,/id="bfc-youtube-url"/);
assert.match(editor,/youtubePreviewUrl/);
assert.match(editor,/Lưu & đồng bộ/);
assert.match(overlay,/FocusYoutubeBackground scene={scene}/);
assert.match(player,/sandbox="allow-scripts allow-same-origin allow-presentation"/);
assert.match(player,/referrerPolicy="strict-origin-when-cross-origin"/);
assert.match(player,/commandFocusYoutubePlayer/);
assert.match(player,/aria-label={vi \? 'Điều khiển video YouTube'/);
assert.match(stylesheet,/\.bfc-youtube-controls/);
assert.match(stylesheet,/\.bfc-scene-editor__youtube-field/);
console.log('PASS: Brian Focus YouTube URL parsing, trusted embedding, controls and synced UI integration.');
