#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const check = (label, condition) => {
  if (!condition) failures.push(label);
};
const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';

const retiredFiles = [
  'api/dictionary.js',
  'api/shared-music-access.js',
  'api/shared-music-drive-action.js',
  'api/shared-music-file.js',
  'api/shared-music-upload.js',
  'public/audio/brian-soft-loop.wav',
  'public/bes-theme-v3/theme-boot.js',
  'public/bes-theme-v3/theme-system.css',
  'public/bes-theme-v4/theme-boot.js',
  'public/bes-theme-v4/theme-runtime.js',
  'src/components/GlobalMusicPlayer.jsx',
  'src/components/QuickDictionaryBubble.jsx',
  'src/components/UnifiedUtilityRail.jsx',
  'src/utils/sharedMusic.js',
  'src/utils/themeSystem.js',
];
retiredFiles.forEach((path) => check(`Retired file still exists: ${path}`, !fs.existsSync(path)));

const index = read('index.html');
const main = read('src/main.jsx');
const navigation = read('src/components/GlobalCompactNavigation.jsx');
const settings = read('src/pages/Settings.jsx');
const palette = read('src/components/GlobalCommandPalette.jsx');
const appearance = read('public/bes-appearance-v1163/appearance-engine.js');
const serviceWorker = read('public/sw.js');
const games = read('src/pages/Games.jsx');
const readingStyles = read('src/pages/ReadingStudioAccordionLibrary.css');
const releaseMetadata = `${read('public/version.json')}\n${read('public/release-manifest.json')}`;

check('Light-only bootstrap is missing', index.includes('brian-light-only-boot'));
check('Legacy theme boot is still loaded', !/theme-(?:boot|runtime)\.js|bes-theme-v3/.test(index));
check('Music or dictionary runtime is still mounted', !/GlobalMusicPlayer|QuickDictionaryBubble|UnifiedUtilityRail/.test(main));
check('Navigation still exposes a color-mode selector', !/themeMode|setTheme|brian-nav__theme/.test(navigation));
check('Command palette still exposes a color-mode command', !/command:theme|Toggle light\/dark|chế độ sáng\/tối/.test(palette));
check('Settings still exposes retired controls', !/Background music|Nhạc nền|settings-m3-segmented|applyTheme|musicSettings/.test(settings));
check('Appearance runtime still supports automatic dark mode', !/prefers-color-scheme:\s*dark|data-setting="theme"|theme:\s*['"](?:dark|system|auto-time|oled)/.test(appearance));
check('Service worker still contains shared-music handling', !/shared-music|MEDIA_CACHE|cacheFirstSupabaseMedia/.test(serviceWorker));
check('Game Hub still exposes its standalone dim-mode toggle', !/games-v44-soft-dark/.test(games));
check('A page still follows the device dark preference directly', !/prefers-color-scheme:\s*dark/.test(readingStyles));
check('Release metadata still advertises background music', !/sharedBackgroundMusic/.test(releaseMetadata));

if (failures.length) {
  console.error(`Retired UI feature audit FAILED (${failures.length})`);
  failures.forEach((failure) => console.error(`✗ ${failure}`));
  process.exit(1);
}

console.log(`Retired UI feature audit PASS (${retiredFiles.length + 11} checks)`);
