import fs from 'node:fs';

const panel = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.jsx', 'utf8');
const css = fs.readFileSync('src/components/admin/RegionalFontAdminPanel.css', 'utf8');

const assertions = [
  ['custom font validation is wired', panel.includes('validateGlobalCustomFont')],
  ['custom font preview is wired', panel.includes('previewGlobalCustomFont')],
  ['custom font upload is wired', panel.includes('saveGlobalCustomFont')],
  ['live regional preview applies draft without persistence', panel.includes("source: 'admin-region-live-preview'") && panel.includes('persist: false')],
  ['unsaved regional preview restores on cleanup', panel.includes("source: 'admin-region-live-preview-cleanup'")],
  ['font file picker accepts supported formats', panel.includes('.woff2,.woff,.ttf,.otf')],
  ['live preview UI is visible', panel.includes('regional-font-admin__live')],
  ['custom font live sample is visible', panel.includes('regional-font-upload__preview')],
  ['upload UI has responsive styling', css.includes('.regional-font-upload') && css.includes('@media (max-width: 640px)')],
  ['error and success messages are styled', css.includes('.regional-font-admin__message.is-error') && css.includes('.regional-font-admin__message.is-success')],
];

const failed = assertions.filter(([, ok]) => !ok);
for (const [name, ok] of assertions) console.log(`${ok ? '✓' : '✗'} ${name}`);
if (failed.length) {
  console.error(`\n${failed.length} font upload/live preview contract assertion(s) failed.`);
  process.exit(1);
}
console.log('\nFont upload/live preview contract PASS.');
