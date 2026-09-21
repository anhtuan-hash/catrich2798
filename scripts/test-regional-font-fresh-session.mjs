import fs from 'node:fs';
import assert from 'node:assert/strict';

const appBootstrap = fs.readFileSync('src/applicationBootstrap.jsx', 'utf8');
const publicTypography = fs.readFileSync('src/publicTypographyBootstrap.js', 'utf8');
const regionalCss = fs.readFileSync('src/styles/GlobalRegionalFontSystem.css', 'utf8');
const regionalRuntime = fs.readFileSync('src/utils/globalRegionalFontSystem.js', 'utf8');

assert.match(
  appBootstrap,
  /import ['"]\.\/styles\/GlobalRegionalFontSystem\.css['"];/,
  'regional font CSS must be loaded by the global application bootstrap',
);
assert.match(
  appBootstrap,
  /import \{ installRegionalFontSystem \} from ['"]\.\/utils\/globalRegionalFontSystem\.js['"];/,
  'regional font runtime must be imported globally',
);

const publicBootIndex = appBootstrap.indexOf('await bootstrapPublicTypographyBeforeApp()');
const installIndex = appBootstrap.indexOf('installRegionalFontSystem()');
assert.ok(publicBootIndex >= 0 && installIndex > publicBootIndex, 'regional runtime must install after public typography bootstrap');

assert.match(publicTypography, /getRegionalCustomFontFamily/);
assert.match(publicTypography, /async function waitForRegionalCustomFonts/);
assert.match(publicTypography, /document\.fonts\.load/);
assert.match(publicTypography, /waitForRegionalCustomFonts\(row\?\.region_fonts\)/);
assert.match(
  publicTypography,
  /value && typeof value === 'object'.*preset.*custom.*value\.url/s,
  'first-paint wait must target persisted custom regional font entries',
);

assert.match(regionalRuntime, /BrianRegionalCustom/);
assert.match(regionalRuntime, /@font-face/);
assert.match(regionalRuntime, /root\.dataset\[attrKey\].*custom/s);
assert.match(regionalRuntime, /--bes-font-\$\{region\.id\}/);
assert.match(regionalRuntime, /function syncRuntimeRegionalFontFamilies/);
assert.match(regionalRuntime, /style\.setProperty\('font-family', family, 'important'\)/);
assert.match(regionalRuntime, /data-bes-regional-font-family-runtime/);
assert.match(
  regionalRuntime,
  /MutationObserver\([\s\S]*scheduleRuntimeFontFamilySync/,
  'regional font family runtime must reapply after React route remounts',
);

for (const selector of [
  "html[data-font-region-page-title]",
  "var(--bes-font-pageTitle)",
  "html[data-font-region-navigation]",
  "var(--bes-font-navigation)",
]) {
  assert.equal(regionalCss.includes(selector), true, `missing regional typography selector: ${selector}`);
}

const settingsBridge = fs.readFileSync('src/components/GlobalFontSettingsBridge.jsx', 'utf8');
assert.equal(
  settingsBridge.includes("import '../styles/GlobalRegionalFontSystem.css'"),
  true,
  'Settings may retain its local import, but the application must no longer depend on visiting Settings',
);

console.log('Regional custom font fresh-session bootstrap contract: PASS');
