import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, { version:'12.25.0', release:'Provider Command & Appearance Studio', releaseName:'Provider Command & Appearance Studio', runtimeCore:'3.6.1', uiCore:true, providerCommandCenter:true, oneClickDefaultProvider:true, providerSearchAndFilters:true, appearanceStudio:true, liveAppearancePreview:true, multiSurfaceStyles:true, multiMotionStyles:true, requiresSql:false, generatedAt:now });
  fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n');
}
console.log('Version registry synchronized: 12.25.0');
