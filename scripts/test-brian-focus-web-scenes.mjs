import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeFocusWebUrl, parseFocusWebInput, normalizeFocusWebScenes,
  validateFocusWebScenes, normalizeFocusWebLayout,
} from '../src/components/BrianFocus/focusWebScenes.js';

const app='https://esl-brian.vercel.app';
const url='https://arcade.padlet.com/game/123';
assert.equal(normalizeFocusWebUrl(url,app),url);
assert.equal(normalizeFocusWebUrl('<iframe src="' + url + '" width="800"></iframe>',app),url);
assert.equal(normalizeFocusWebLayout('quad'),'quad');
assert.equal(normalizeFocusWebLayout('bad'),'single');
assert.deepEqual(parseFocusWebInput(url+'\n'+url,app).map(x=>x.url),[url]);
assert.deepEqual(normalizeFocusWebScenes([{title:'Demo',url},{title:'Second',url}],app),[{title:'Demo',url}]);
for(const invalid of ['javascript:alert(1)','data:text/html,x','http://example.com',
  'https://localhost/test','https://127.0.0.1','https://[::1]/',
  'https://user:pass@example.com/', app+'/#/tool/brian-team',
  'https://something.local/']) {
  assert.throws(()=>normalizeFocusWebUrl(invalid,app),Error,invalid);
}
assert.throws(()=>parseFocusWebInput(Array.from({length:31},(_,i)=>
  'https://example.com/item/'+i).join('\n'),app));
assert.throws(()=>validateFocusWebScenes([{title:'one',url},{title:'two',url}],app));
assert.equal(validateFocusWebScenes([{title:'Classroom game',url}],app).length,1);
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const service=read('src/components/BrianFocus/focusSceneService.js');
const editor=read('src/components/BrianFocus/FocusWebsiteEditor.jsx');
const stage=read('src/components/BrianFocus/FocusWebScenes.jsx');
const overlay=read('src/components/BrianFocus/FocusOverlay.jsx');
const css=read('src/components/BrianFocus/BrianFocusWebScenes.css');
const migration=read('supabase/migrations/20261027093000_brian_focus_interactive_web_scenes.sql');
assert.match(service,/web_scenes: validateFocusWebScenes/);
assert.match(service,/mediaType === 'website'/);
assert.match(service,/web_scenes,web_layout,youtube_playlist_backup/);
assert.match(service,/youtube_playlist_backup: mediaPath/);
assert.match(editor,/parseFocusWebInput/);
assert.match(editor,/bfc-scene-editor__website-field/);
assert.match(stage,/sandbox="allow-scripts allow-forms allow-same-origin allow-popups"/);
assert.match(stage,/is-interactive/);
assert.match(stage,/node\.requestFullscreen\(\)/);
assert.match(stage,/document\.exitFullscreen\(\)/);
assert.match(stage,/fullscreenchange/);
assert.match(stage,/window\.addEventListener\('keydown', onEscape, true\)/);
assert.match(stage,/stopPropagation\(\)/);
assert.match(stage,/bfc-web-scenes__panel-fullscreen/);
assert.match(stage,/bfc-web-scenes__fullscreen/);
assert.match(stage,/is-fallback-expanded/);
assert.match(stage,/nativeFullscreenNode/);
assert.match(css,/:fullscreen/);
assert.match(css,/is-fallback-expanded/);
assert.match(stage,/target="_blank"/);
assert.match(overlay,/<FocusWebScenes/);
assert.match(css,/pointer-events:auto/);
assert.match(migration,/focus_media_consistency/);
assert.match(migration,/web_scenes jsonb/);
assert.match(read('scripts/test-brian-focus-youtube.mjs'),/FOCUS_YOUTUBE_PLAYLIST_MAX,30/);
console.log('PASS: Focus Web Scenes HTTPS validation, multi-web layouts, per-site fullscreen (native and fallback), editor and YouTube isolation.');
