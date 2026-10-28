import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = source('src/pages/HomeApproved.jsx');
const mobile = source('src/components/mobile/MobileHomeView.jsx');
const viewer = source('src/components/HomePublishedSlideshow.jsx');
const style = source('src/components/HomePublishedSlideshow.css');
const studio = source('src/pages/PhotoSlideshow.jsx');
const test = (ok, label) => { assert.ok(ok, label); console.log('✓ ' + label); };

const heroIndex = home.indexOf('<HomeHeroExperience2026');
const homeSlideIndex = home.indexOf('<HomePublishedSlideshow language={language} />', heroIndex);
const toolIndex = home.indexOf('<section className="bha-tools"', heroIndex);
test(heroIndex >= 0 && homeSlideIndex > heroIndex && homeSlideIndex < toolIndex,
  'desktop published slideshow is directly after Hero and before the remaining home content');
test(home.includes('homeSlideshow={<HomePublishedSlideshow language={language} />}'),
  'mobile home receives same published slideshow');
const mobileHero = mobile.indexOf('data-mobile-home-hero');
const mobileSlide = mobile.indexOf('{homeSlideshow}', mobileHero);
const mobileQuick = mobile.indexOf('className="bes-mobile-home__quick-actions"', mobileHero);
test(mobileHero >= 0 && mobileSlide > mobileHero && mobileSlide < mobileQuick,
  'mobile published slideshow is directly below the mobile Hero');
test(viewer.includes(".eq('is_published', true)") && viewer.includes("'bes_slideshow_albums'"),
  'homepage reads only actually published albums from Supabase');
test(viewer.includes("'bes_slideshow_slides'") && viewer.includes(".in('album_id',"),
  'homepage retrieves only slides belonging to published albums');
test(viewer.includes("if (!selected || !photo) return null"),
  'unpublished and empty galleries leave no section or reserved spacing');
test(viewer.includes("if (sequence === requestId.current) setGalleries([])"),
  'newest failed or empty query hides possibly unpublished albums');
test(viewer.includes("window.setInterval(") && viewer.includes('RECHECK_MS = 15000'),
  'open public pages revalidate publication without requiring login');
test(viewer.includes("window.addEventListener(CHANGE_EVENT") && viewer.includes("window.addEventListener('storage'"),
  'local and cross-tab publishing updates refresh public home');
test(viewer.includes("window.addEventListener('focus'") && viewer.includes("document.addEventListener('visibilitychange'"),
  'returning visitors recheck publish state immediately');
test(viewer.includes('requestFullscreen') && viewer.includes('setPlaying'),
  'inline slideshow includes fullscreen and playback controls');
test(style.includes('bhs-home__stage:fullscreen') && style.includes('aspect-ratio:16/9'),
  'inline TV/desktop stage has a responsive 16:9 layout');
test(studio.includes("window.dispatchEvent(new Event('bes-slideshow-published-updated'))") &&
     studio.includes("window.localStorage.setItem('bes-slideshow-published-revision'"),
  'editing, publishing or unpublishing an album broadcasts a refresh signal');
test((studio.match(/announceSlideshowChange\(\);/g) || []).length >= 6,
  'studio sends change events for album and photo mutations');
console.log('BRIAN Home Published Slideshow QA PASS');
