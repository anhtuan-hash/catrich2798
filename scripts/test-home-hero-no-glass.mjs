import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const load = p => readFileSync(new URL(p,root),'utf8');
const published = JSON.parse(load('public/hero/hero-current.json'));
const renderer = load('src/components/HomeHeroExperience2026.jsx');
const style = load('src/styles/HomeHeroExperience2026.css');
const cms = load('src/utils/homepageHeroCms.js');
const home = load('src/pages/Home.jsx');
assert.equal(published.config.overlay.enabled, false,'published homepage Hero has no glass/white protection overlay');
assert.equal(published.config.background.type,'image','existing media remains an image');
assert.equal(published.config.background.opacity,100,'original uploaded picture is fully opaque');
assert.equal(published.config.background.brightness,100,'do not artificially bleach/darken original picture');
assert.equal(published.config.background.blur,0,'original background picture is not blurred');
assert.ok(published.config.background.url.startsWith('/hero/media/'),'original static published asset preserved');
assert.ok(renderer.includes('activeConfig.overlay.enabled ? <div className="hero-cms__overlay" /> : null'),
  'renderer respects Admin overlay setting; disabling overlay does not break editor');
assert.ok(renderer.includes('bes-home-hero-remote-check-v2'),\n  'one-time previous 10-minute public Hero cache is invalidated on refresh');\nassert.ok(renderer.includes('HomeHeroCmsEditor') && renderer.includes('previewConfig || settings.published'),
  'editable Hero and preview remain intact');
assert.ok(style.includes('opacity:var(--media-opacity,1)') && style.includes('filter:brightness(var(--media-brightness,1)) blur(var(--media-blur,0))'),
  'background rendering still follows independently configured source media');
assert.ok(cms.includes('HOME_HERO_STATIC_PATH') && cms.includes('/hero/hero-current.json'),
  'production static Hero pipeline remains unchanged');
assert.ok(home.includes('HomeApproved') && home.includes('HomeHeroCmsOverlayFix.css'),
  'Home route still loads its original Hero/editor pipeline');
console.log('BRIAN homepage Hero clear-photo publication PASS');
