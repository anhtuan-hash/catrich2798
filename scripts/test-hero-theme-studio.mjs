import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    return '';
  }
};

const governance = read('src/components/GlobalHeroGovernance.jsx');
const panel = read('src/components/HeroThemeStudioAdminPanel.jsx');
const settings = read('src/utils/heroThemeStudioSettings.js');
const css = read('src/components/HeroThemeStudioAdminPanel.css');
const sql = read('supabase/hero_theme_studio.sql');
const vercel = read('vercel.json');

const checks = [
  ['Hero registry exposes stable route keys', governance, /HERO_THEME_REGISTRY[\s\S]*home[\s\S]*dashboard[\s\S]*apps[\s\S]*games[\s\S]*news[\s\S]*library[\s\S]*homeroom[\s\S]*settings[\s\S]*admin/],
  ['Governance assigns stable hero id and theme key', governance, /brianHeroId[\s\S]*brianHeroThemeKey/],
  ['Theme overlay preserves the original hero background', governance, /bes-hero-theme-layer[\s\S]*bes-hero-theme-active/],
  ['Published theme is loaded and realtime changes are subscribed', governance, /loadHeroThemeStudioSettings[\s\S]*subscribeToHeroThemeStudioSettings/],
  ['Settings use dedicated Supabase table, workspace and storage bucket', settings, /hero_theme_studio_settings[\s\S]*english-hub[\s\S]*hero-theme-studio/],
  ['Only admin roles can manage Hero Theme Studio', settings, /canManageHeroThemeStudio[\s\S]*isAdminRole/],
  ['Settings support draft, publish, history and rollback', settings, /saveHeroThemeStudioDraft[\s\S]*publishHeroThemeStudioTheme[\s\S]*rollbackHeroThemeStudioTheme/],
  ['Image upload validates and optimizes raster input', settings, /uploadHeroThemeStudioImage[\s\S]*image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp[\s\S]*createImageBitmap/],
  ['Admin can target all heroes or selected hero keys', panel, /targetMode[\s\S]*all[\s\S]*selected[\s\S]*heroKeys/],
  ['Admin exposes overlay, position, blur and parallax controls', panel, /overlay[\s\S]*position[\s\S]*blur[\s\S]*parallax/],
  ['Admin exposes preview, publish, rollback and reset-to-original actions', panel, /Preview[\s\S]*Xuất bản[\s\S]*Hoàn tác[\s\S]*Nền gốc/],
  ['Panel styling is isolated under Hero Theme Studio namespace', css, /\.hero-theme-studio/],
  ['Supabase SQL provisions RLS, storage and realtime', sql, /create table if not exists public\.hero_theme_studio_settings[\s\S]*public\.is_admin\(\)[\s\S]*hero-theme-studio[\s\S]*supabase_realtime/],
  ['Vercel build runs the Hero Theme Studio contract', vercel, /test-hero-theme-studio\.mjs/],
];

let failed = 0;
for (const [label, source, pattern] of checks) {
  const pass = Boolean(source) && pattern.test(source);
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${label}`);
  if (!pass) failed += 1;
}

if (failed) {
  console.error(`\nHero Theme Studio contract failed: ${failed}/${checks.length} checks.`);
  process.exit(1);
}

console.log(`\nHero Theme Studio contract passed: ${checks.length}/${checks.length}.`);
