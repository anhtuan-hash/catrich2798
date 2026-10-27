import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getFocusSourceAvailability, getFocusYoutubeIds, resolveFocusSessionScene,
} from '../src/components/BrianFocus/focusSourceSelection.js';

const site={title:'Climate Rescue',url:'https://arcade.padlet.com/game/123'};
const youtubeId='Gwg_KYNgu6Y';
const data=Object.freeze({
  mediaType:'website',mediaPath:'',mediaFit:'cover',
  webScenes:[site],webLayout:'quad',
  youtubeUrl:'https://www.youtube.com/watch?v='+youtubeId,
  updatedAt:'2026-10-28T00:05:00+07:00',
});
assert.deepEqual(getFocusSourceAvailability(data),{websites:1,videos:1});
assert.deepEqual(getFocusYoutubeIds(data),[youtubeId]);
const web=resolveFocusSessionScene(data,'website');
assert.equal(web.mediaType,'website');
assert.deepEqual(web.webScenes,[site]);
assert.equal(web.webLayout,'quad');
assert.equal(resolveFocusSessionScene(data,'ask').mediaType,'default',
  'opening the chooser must not start an active YouTube scene');
const yt=resolveFocusSessionScene(data,'youtube');
assert.equal(yt.mediaType,'youtube');
assert.equal(yt.mediaPath,'youtube:'+youtubeId);
assert.deepEqual(yt.playlistIds,[youtubeId]);
assert.equal(data.mediaType,'website','local selection must never write to global scene');
assert.equal(resolveFocusSessionScene({mediaType:'default'},'original').mediaType,'default');
assert.deepEqual(getFocusSourceAvailability({}),{websites:0,videos:0});
assert.equal(resolveFocusSessionScene({},'youtube').mediaType,'default');
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const owner=read('src/components/BrianFocus/BrianFocus.jsx');
const overlay=read('src/components/BrianFocus/FocusOverlay.jsx');
const webjsx=read('src/components/BrianFocus/FocusWebScenes.jsx');
const css=read('src/components/BrianFocus/BrianFocusWebScenes.css');
const picker=read('src/components/BrianFocus/FocusSourcePicker.jsx');
assert.match(owner,/setSourceChoice\('ask'\)/);
assert.match(owner,/focusOpen: open && sourceChoice === 'youtube'/);
assert.match(owner,/scene:youtubePlayerScene/);
assert.match(owner,/onSourceChoice=\{setSourceChoice\}/);
assert.match(owner,/onScenePublished=\{onScenePublished\}/);
assert.match(owner,/youtubeSession.mounted && youtubePlayerScene.mediaType === 'youtube'/);
assert.match(overlay,/sourceChoice === 'ask'/);
assert.match(overlay,/onClockVisibilityChange=\{setWebClockVisible\}/);
assert.match(overlay,/bfc-overlay--web-clock-hidden/);
assert.match(webjsx,/onClockVisibilityChange\?\.\(!clockVisible\)/);
assert.match(webjsx,/Ẩn đồng hồ/);
assert.match(webjsx,/Hiện đồng hồ/);
assert.match(css,/bfc-overlay--web-clock-hidden/);
assert.match(css,/visibility:hidden!important/);
assert.match(picker,/aria-modal="true"/);
assert.match(picker,/window.addEventListener\('keydown', onKeyDown, true\)/);
assert.match(picker,/onSelect\('website'\)/);
assert.match(picker,/onSelect\('youtube'\)/);
console.log('PASS: Focus source chooser, shared playlist preservation, clock toggle, keyboard trap, and per-session mode.');
