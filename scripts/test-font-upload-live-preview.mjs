import fs from 'node:fs';

const panel = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.jsx', 'utf8');
const css = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.css', 'utf8');
const system = fs.readFileSync('src/utils/globalRegionalFontSystem.js', 'utf8');

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
  ['error and success messages are styled', css.includes('.regional-font-admin__message.is-error') && css.includes('.regional-font-admin__message.is-success')],
];

const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? '✓' : '✗'} ${name}`);
if (failed.length) {
  console.error(`\n${failed.length} per-region font upload/live preview contract assertion(s) failed.`);
  process.exit(1);
}
console.log('\nPer-region font upload/live preview contract PASS.');
