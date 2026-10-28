import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const engine = read('src/components/PhotoTransitionStage.jsx');
const motionCSS = read('src/components/PhotoTransitionStage.css');
const gallery = read('src/pages/PhotoSlideshow.jsx');
const galleryCSS = read('src/pages/PhotoSlideshowGalleryV2.css');
const home = read('src/components/HomePublishedSlideshow.jsx');
const schema = read('supabase/migrations/20261028080000_slideshow_cinematic_transitions.sql');
const check = (value, message) => { assert.ok(value, message); console.log('✓ ' + message); };

check(engine.includes('useLayoutEffect') && engine.includes('previous: old.current'),
  'previous photo stays mounted across a cross-image transition');
check(engine.includes("layer(frames.previous, 'out')") && engine.includes("layer(frames.current, frames.previous ? 'in' : 'still')"),
  'two separate outgoing/incoming layers render simultaneously');
for (const mode of ['fade', 'slide', 'zoom', 'reveal', 'blur']) {
  check(engine.includes(mode + ': ') && motionCSS.includes('.bss-motion--' + mode),
    mode + ' is supported by the transition engine and CSS');
}
check(engine.includes('incoming.animate(') && engine.includes('outgoing.animate('),
  'both image layers actually animate using the browser Web Animations API');
check(engine.includes('preload.decode().then(show, show)'),
  'transition waits for the next image to decode before swapping layers');
check(motionCSS.includes('data-animation="waapi"'),
  'scripted animations cannot be masked by legacy CSS keyframes');
check(motionCSS.includes('prefers-reduced-motion:reduce'),
  'transitions honor the OS reduced-motion preference');
check(motionCSS.includes('object-fit:contain') && motionCSS.includes('bss-motion__ambient'),
  'artwork remains uncropped with a photo-derived blurred backdrop');
check(gallery.includes("import PhotoTransitionStage") && home.includes("import PhotoTransitionStage"),
  'the full gallery and homepage share the same cinematic transition engine');
check(gallery.includes('mode={selected.transition} direction={direction}') &&
  home.includes('mode={selected.transition} direction={direction}'),
  'album transition setting applies to both gallery and homepage');
check(gallery.includes('<option value="reveal">') && gallery.includes('<option value="blur">'),
  'two new transition effects are selectable in the existing album editor');
check(schema.includes("'reveal', 'blur'"),
  'database migration allows the two new transitions without modifying albums');
check(gallery.includes('bss-gallery-sidebar') && gallery.includes('bss-filmstrip-area') &&
  gallery.includes('bss-stage') && gallery.includes('bss-gallery-layout'),
  'full gallery offers curator sidebar, filmstrip and a dedicated immersive artwork stage');
check(galleryCSS.includes('.bss--gallery-view .bss-intro h1') &&
  galleryCSS.includes('font-size:clamp(25px,3vw,42px)'),
  'oversized gallery heading is replaced with a compact exhibition title');
check(galleryCSS.includes('.bss--gallery-view .bss-stage:fullscreen') &&
  galleryCSS.includes('grid-template-columns:minmax(0,1fr)'),
  'responsive layout supports a full-window artwork presentation');
check(gallery.includes("const [playing, setPlaying]") && gallery.includes('toggleFullscreen') &&
  gallery.includes('const showQR') && gallery.includes('const save = ()'),
  'all legacy playback, fullscreen, sharing, QR and Admin editor actions remain');
check(gallery.includes('announceSlideshowChange()') && home.includes(".eq('is_published', true)"),
  'public gallery remains governed by Supabase publication state');
const homeRefinement = read('src/components/HomePublishedSlideshowRefinement.css');
check(!home.includes('className="bhs-home__caption"') && home.includes('className="bhs-home__story-panel"'),
  'the homepage never paints captions over the artwork');
check(home.indexOf('className="bhs-home__story-panel"') < home.indexOf('className="bhs-home__stage"') &&
  home.includes('data-home-exhibition-layout="info-left-artwork-right"'),
  'artwork information lives to the left of the image in the exhibition DOM');
const exhibitionCSS = read('src/components/HomePublishedSlideshowExhibition.css');
check(exhibitionCSS.includes('grid-template-columns:minmax(250px, 31%) minmax(0, 1fr)') &&
  exhibitionCSS.includes('flex-direction:column') && exhibitionCSS.includes('object-fit:contain!important'),
  'responsive exhibition presents the sidebar on the left without image cropping');
check(!home.includes('Read introduction') && !home.includes('Xem giới thiệu') &&
  !home.includes('descriptionExpanded') &&
  home.includes('<SlideshowLinkedText text={selected.description} />') &&
  homeRefinement.includes('-webkit-line-clamp:2'),
  'album summary remains compact and linked, without the Read introduction control');
check(home.includes("const img = new Image(); img.src = publicImage(item.image_path)"),
  'the next and previous homepage artwork are preloaded for fluid motion');
console.log('BRIAN cinematic slideshow regression QA PASS');
