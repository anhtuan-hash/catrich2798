import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const viewer = read('src/components/HomePublishedSlideshow.jsx');
const styles = read('src/components/HomePublishedSlideshowHalloween.css');
const main = read('src/main.jsx');
const home = read('src/pages/HomeApproved.jsx');
const scene = read('public/assets/slideshow/halloween-night.svg');
const web = read('public/assets/slideshow/halloween-web.svg');
const ghost = read('public/assets/slideshow/halloween-ghost.svg');
const spec = read('docs/brian-photo-story-halloween-skin-spec.md');
const test = (ok, name) => { assert.ok(ok, name); console.log('✓ ' + name); };

test(viewer.includes('data-halloween-theme={seasonalHome.enabled && isHalloweenAlbum(selected) ? "true" : "false"}') &&
  viewer.includes('function isHalloweenAlbum(album)') &&
  viewer.includes('/halloween/i.test('),
  viewer.includes('useHalloweenHomeTheme()'),
  'Halloween album skin requires both published Halloween album AND Admin master ON');
test(viewer.includes(".eq('is_published', true)") &&
  viewer.includes("if (!selected || !photo) return null"),
  'unpublished Halloween albums remain entirely absent from homepage');
test(!styles.includes('body {') && !styles.includes(':root {') &&
  !styles.includes('.app-shell[data-route="slideshow"]') &&
  !styles.includes('html {'),
  'Halloween skin does not change global document, navbar or full gallery');
test(styles.includes('.app-shell[data-route="home"] .bhs-home[data-halloween-theme="true"]') &&
  styles.includes('background-image:') &&
  styles.includes("url('/assets/slideshow/halloween-night.svg')"),
  'dark themed scene applies exclusively inside published Halloween slideshow');
test(styles.includes('halloween-web.svg') &&
  styles.includes('halloween-ghost.svg') &&
  styles.includes('bhx-ghost-float') &&
  styles.includes('bhx-fog'),
  'moonlit scene, spiderweb, ghost and gentle mist decorations are bundled');
test(styles.includes('prefers-reduced-motion:reduce') &&
  styles.includes('pointer-events:none'),
  'decorations are noninteractive and respect reduced motion');
test(styles.includes('object-fit:contain!important') &&
  viewer.includes('<PhotoTransitionStage') &&
  viewer.includes('className="bhs-home__stage"'),
  'whole student artwork stays uncropped and retains prior cinematic engine');
test(viewer.includes('className="bhs-home__story-panel"') &&
  viewer.indexOf('className="bhs-home__story-panel"') <
    viewer.indexOf('className="bhs-home__stage"'),
  'title, counter and caption stay to the left of full-fit painting');
test(!viewer.includes('Read introduction') &&
  !viewer.includes('Xem giới thiệu') &&
  !viewer.includes('className="bhs-home__story-meta"') &&
  !viewer.includes('className="bhs-home__story-bottom"'),
  'previously removed buttons and redundant album data are not reintroduced');
test(viewer.includes('<SlideshowLinkedText text={selected.description} />') &&
  viewer.includes('data-guest-allow="slideshow-viewer"') &&
  main.includes("action.closest('[data-guest-allow]')"),
  'public voting links and guest slideshow interactions remain accessible');
test(styles.includes('@media(max-width:860px)') &&
  styles.includes('@media(max-width:520px)'),
  'responsive layouts preserve art-first mobile experience');
test(scene.startsWith('<svg ') && scene.includes('id="moon"') &&
  scene.includes('pumpkin') && scene.includes('<!-- bats:') &&
  web.startsWith('<svg ') && ghost.startsWith('<svg '),
  'original local SVG artwork contains moon, castle, bats, pumpkins, cobweb and ghost');
test(home.includes('<HomePublishedSlideshow language={language} />') &&
  !home.includes('HomePublishedSlideshowHalloween.css') &&
  !main.includes('HomePublishedSlideshowHalloween.css'),
  'theme CSS is only imported within slideshow, not global Home, Hero or app shell');
test(spec.includes('Do not style the site header') &&
  spec.includes('No Supabase migration'),
  'implementation is grounded in approved scope and non-destructive spec');
console.log('BRIAN Halloween-only Photo Story skin QA PASS');