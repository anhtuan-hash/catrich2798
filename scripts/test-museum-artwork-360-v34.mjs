import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const viewer=fs.readFileSync('src/features/immersive-gallery/v3/Exhibit360Viewer.jsx','utf8');
const museum=fs.readFileSync('src/features/immersive-gallery/v3/MuseumScene.jsx','utf8');
test('Cinema 3D uses a single in-scene mesh while 2D/legacy retain the old inspector',()=>{
 assert.match(museum,/onSelect=\{open3DExhibit\}/);
 assert.match(museum,/cinema&&threeD/);
 assert.match(museum,/focusPhase=\{cinema\?focus.phase:'idle'\}/);
 assert.match(museum,/selected&&\!\(cinema&&threeD\)/);
 assert.match(museum,/onClick=\{\(\)=>openExhibit\(e.id\)\}/);
 assert.match(museum,/Exhibit360Viewer key=\{selected.id\}/);
 assert.match(museum,/data-testid="museum-artwork-inspector"/);
});
test('real WebGL orbit uses camera rotation, zoom, auto-rotate and reset',()=>{
 for(const feature of ['OrbitControls','enableRotate','enableZoom','autoRotate={spin}','minDistance','maxDistance','setReset(n=>n+1)']){
  assert.ok(viewer.includes(feature),'Expected orbit feature '+feature);
 }
 assert.match(viewer,/data-testid="exhibit-360-canvas"/);
});
test('original artwork and privacy-respecting media fallback stay available',()=>{
 assert.match(viewer,/getGalleryAssetUrl/);
 assert.match(viewer,/CuratedModel/);
 assert.match(viewer,/referrerPolicy="no-referrer"/);
 assert.match(viewer,/onError=\{\(\)=>setLoadError\(true\)\}/);
 assert.match(viewer,/supportsWebGL===false/);
 assert.match(viewer,/not a 360° panorama/);
 assert.doesNotMatch(viewer,/fetch\(|localStorage|sessionStorage|eval\(/);
});
test('keyboard exit and accessible dialog focus handling are available',()=>{
 assert.match(museum,/event.key==='Escape'/);
 assert.match(museum,/event.key!=='Tab'/);
 assert.match(museum,/aria-modal="true"/);
 assert.match(museum,/closeRef.current\?\.focus/);
 assert.match(viewer,/aria-pressed=\{spin\}/);
});
