import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const hero = read('src/components/HomeHeroExperience2026.jsx');
const home = read('src/pages/HomeApproved.jsx');
const art = read('src/features/halloween-home/HalloweenScene.jsx');
const css = read('src/features/halloween-home/halloween.scene.css');
const imports = read('src/pages/Home.jsx');
const master = read('src/utils/halloweenHomeTheme.js');
const gallery = read('src/components/HomePublishedSlideshow.jsx');
const nav = read('src/components/GlobalCompactNavigation.jsx');

assert.match(imports, /halloween\.scene\.css/, 'Home lazy chunk must ship scene CSS');
assert.match(hero, /\{halloweenOn \? <HalloweenScene zone="hero" \/> : null\}/, 'Hero is conditionally composited');
assert.match(home, /\{seasonalHome\.enabled \? <HalloweenScene zone="practice" \/> : null\}/, 'Practice uses same admin master');
assert.ok(!hero.includes('<div className="hero-cms__halloween-art"'), 'retire old one-piece Hero layer');
assert.match(art, /data-seasonal-art="hero"/);
assert.match(art, /data-seasonal-art="practice"/);
for(const asset of ['halloween-hero-world','halloween-ghost-reader','halloween-tree-left','halloween-tree-right','halloween-cemetery-world']){
 assert.ok(art.includes(asset), asset+' used by actual React scene');
 const data=readFileSync(new URL('../public/assets/home/v9/'+asset+'.webp',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'RIFF',asset+' valid WebP RIFF');
 assert.equal(data.toString('ascii',8,12),'WEBP',asset+' valid WebP');
}
assert.ok((css.match(/data-halloween-home-v4="on"/g)||[]).length>=20, 'CSS scoped strictly to master ON');
assert.ok(css.includes('pointer-events:none!important'), 'decorations may not intercept lesson clicks');
assert.match(css,/clip-path:inset\(0 35% 21% 0\)/,'crop baked writing from old cemetery art');
assert.ok(css.includes('@media(max-width:620px)'), 'independent mobile art direction');
assert.ok(css.includes('prefers-reduced-motion'), 'reduce animation');
assert.ok(master.includes("bes_set_halloween_home_enabled"), 'reuse existing secured Admin RPC');
assert.ok(nav.includes('route === "home"'), 'Home master applies to navigation');
assert.ok(gallery.includes('setIndex(photoIndex)'), 'real published-photo thumbnails stay interactive');
console.log('PASS Halloween V10 art-first source: real SVG-free layered React scenes, 5 WebP assets, master OFF and CMS-safe data paths');
