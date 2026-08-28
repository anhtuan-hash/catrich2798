import fs from 'node:fs';

const panel = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.jsx', 'utf8');
const css = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.css', 'utf8');
const system = fs.readFileSync('src/utils/globalRegionalFontSystem.js', 'utf8');
const runtimeCss = fs.readFileSync('src/styles/GlobalRegionalFontSystem.css', 'utf8');
const accountBridge = fs.readFileSync('src/components/GlobalAccountTextSizeBridge.jsx', 'utf8');
const accountBridgeCss = fs.readFileSync('src/components/GlobalAccountTextSizeBridge.css', 'utf8');
const utilitySlot = fs.readFileSync('src/components/GlobalEnglishHubBrand.jsx', 'utf8');
const legacyScale = fs.readFileSync('src/utils/fontScale.js', 'utf8');

const assertions = [
  ['shared custom upload panel is removed', !panel.includes('regional-font-upload__preview') && !panel.includes('Tải font của riêng bạn')],
  ['every region card renders its own upload control', panel.includes('regional-font-card__custom-upload') && panel.includes('GLOBAL_FONT_REGIONS.map')],
  ['every region has a custom-font selector option', panel.includes('Font cá nhân cho khu vực này…') && panel.includes('value="custom"')],
  ['per-region file picker accepts supported formats', panel.includes('.woff2,.woff,.ttf,.otf') && panel.includes('chooseRegionFile(region, event)')],
  ['per-region custom preview is wired', panel.includes('previewRegionalCustomFont(region.id, file')],
  ['per-region custom upload is wired', panel.includes('uploadRegionalCustomFont(')],
  ['live regional preview applies draft without persistence', panel.includes("source: 'admin-region-live-preview'") && panel.includes('persist: false')],
  ['unsaved regional preview restores on cleanup', panel.includes("source: 'admin-region-live-preview-cleanup'") && panel.includes('clearRegionalCustomFontPreview()')],
  ['regional settings support custom object payloads', system.includes("preset: 'custom'") && system.includes('normalizeCustomEntry')],
  ['regional custom fonts get unique font families', system.includes('BrianRegionalCustom') && system.includes('getRegionalCustomFontFamily')],
  ['regional custom assets use region-scoped storage paths', system.includes('regions/${safe}/')],
  ['blob previews cannot be persisted', system.includes("startsWith('blob:')")],
  ['custom upload UI is styled inside cards', css.includes('.regional-font-card__custom-upload') && css.includes('.regional-font-card__file-button')],
  ['navigation font size has live range control', panel.includes('regional-font-card__font-size') && panel.includes('type="range"') && panel.includes('setNavigationFontSize')],
  ['navigation font size persists in regional settings payload', system.includes("const FONT_SIZES_KEY = 'fontSizes'") && system.includes('getRegionalFontSize')],
  ['navigation font size is bounded safely', system.includes('NAV_FONT_SIZE_MIN = 11') && system.includes('NAV_FONT_SIZE_MAX = 22')],
  ['navigation font size applies through a CSS variable', system.includes('--bes-font-size-navigation') && runtimeCss.includes('var(--bes-font-size-navigation)')],
  ['navigation font size excludes Material icon glyphs', runtimeCss.includes('.material-symbols-outlined') && runtimeCss.includes("html[data-font-size-navigation] body .brian-nav")],
  ['navigation font size UI is styled', css.includes('.regional-font-card__font-size-controls') && css.includes("input[type='range']")],
  ['legacy account text scale is intentionally retired', legacyScale.includes('FONT_SCALE_OPTIONS = Object.freeze([100])')],
  ['account utility slot mounts the functional text-size bridge', utilitySlot.includes('GlobalAccountTextSizeBridge') && utilitySlot.includes('<GlobalAccountTextSizeBridge />')],
  ['account menu quick control targets the legacy font-options slot', accountBridge.includes(".brian-nav__account-menu .brian-nav__font-options") && accountBridge.includes('createPortal')],
  ['account menu quick control uses the regional navigation setting', accountBridge.includes('getRegionalFontSize') && accountBridge.includes('fontSizes.navigation')],
  ['account menu quick control exposes decrease increase and reset actions', accountBridge.includes('commit(size - 1)') && accountBridge.includes('commit(size + 1)') && accountBridge.includes('commit(null)')],
  ['account menu quick control uses 16px as 100 percent and 11-22 bounds', accountBridge.includes('DEFAULT_SIZE = 16') && accountBridge.includes('MIN_SIZE = 11') && accountBridge.includes('MAX_SIZE = 22') && accountBridge.includes('(size / DEFAULT_SIZE) * 100')],
  ['account menu quick control saves immediately with rollback', accountBridge.includes('saveRegionalFontSettings(next)') && accountBridge.includes("source: 'account-navigation-font-size-rollback'")],
  ['account menu quick control stays synchronized through regional font events', accountBridge.includes('REGIONAL_FONT_EVENT') && accountBridge.includes('addEventListener(REGIONAL_FONT_EVENT')],
  ['legacy 100 percent option is hidden when quick control is mounted', accountBridgeCss.includes('.brian-nav__font-options > button') && accountBridgeCss.includes('display: none !important')],
  ['account quick control styling is present', accountBridgeCss.includes('.brian-nav__font-size-control') && accountBridgeCss.includes('.brian-nav__font-size-step') && accountBridgeCss.includes('.brian-nav__font-size-reset')],
  ['error and success messages are styled', css.includes('.regional-font-admin__message.is-error') && css.includes('.regional-font-admin__message.is-success')],
];

const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? '✓' : '✗'} ${name}`);
if (failed.length) {
  console.error(`\n${failed.length} per-region font/live preview contract assertion(s) failed.`);
  process.exit(1);
}
console.log('\nPer-region font/live preview contract PASS.');
