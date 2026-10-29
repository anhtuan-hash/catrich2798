import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
const read=p=>readFileSync(p,'utf8');
const html=read('src/components/HomeHeroExperience2026.jsx');
const css=read('src/features/halloween-home/halloween.v9.css');
const home=read('src/pages/Home.jsx');
const gallery=read('src/components/HomePublishedSlideshow.jsx');
const expected=[
'halloween-black-cat.webp','halloween-cemetery-world.webp',
'halloween-footer-candles.webp','halloween-footer-scene.webp',
'halloween-gallery-frame.webp','halloween-gallery-ghost.webp',
'halloween-ghost-reader.webp','halloween-grade10-ghost.webp',
'halloween-grade11-pumpkin.webp','halloween-grade12-witchhat.webp',
'halloween-hanging-lanterns.webp','halloween-hero-world.webp',
'halloween-pumpkin-main.webp','halloween-tree-left.webp',
'halloween-tree-right.webp','halloween-wooden-sign.webp'];
for(const file of expected){
 const p=join('public/assets/home/v9',file);
 const bytes=readFileSync(p);
 assert.ok(bytes.length>=1000,'asset too small '+file);
 assert.equal(bytes.toString('ascii',0,4),'RIFF','bad RIFF '+file);
 assert.equal(bytes.toString('ascii',8,12),'WEBP','bad WebP '+file);
}
assert.ok(home.includes("import '../features/halloween-home/halloween.v9.css'"),'single consolidated v9 seasonal CSS entrypoint');
for(const older of ['HalloweenFullHomeV6VisualRepair.css','HalloweenMockupParityV7.css','HalloweenIllustratedV8.css']){
 assert.ok(!home.includes("import '../styles/"+older+"'"),'obsolete stacked CSS should be unmounted '+older);
}
assert.ok(html.includes('<span>Happy</span><span>Halloween!</span>'), 'independent title lines');
const scene=read('src/features/halloween-home/HalloweenScene.jsx');
const sceneCss=read('src/features/halloween-home/halloween.scene.css');
assert.ok(html.includes('<HalloweenScene zone="hero" />'),'Hero uses art-first React layers');
assert.ok(scene.includes('halloween-ghost-reader') && scene.includes('halloween-hero-world'),'real layered art with independent character');
assert.ok(sceneCss.includes('.halloween-scene__reader'),'dedicated responsive scene CSS');
assert.ok(html.includes('Khám phá không gian dạy học tiếng Anh'),'respect Vietnamese locale');
assert.ok(css.includes('white-space:nowrap!important'),'do not break the title');
for(const image of ['halloween-hero-world.webp','halloween-ghost-reader.webp','halloween-gallery-ghost.webp','halloween-pumpkin-main.webp','halloween-hanging-lanterns.webp']){
 assert.ok(css.includes('/assets/home/v9/'+image),'art must be integrated in live CSS '+image);
}
assert.ok(css.includes('data-halloween-home-v4="on"') && sceneCss.includes('data-halloween-home-v4="on"'),'ON only, no residual OFF styles');
assert.ok(gallery.includes('setIndex(photoIndex)'),'real gallery thumbnails still interactive');
assert.ok(gallery.includes('mode={selected.transition}'),'album transition remains author-controlled');
console.log('PASS Halloween V9 source: 16 valid WebP assets, scoped styles, two-line Hero, locale, real content');
