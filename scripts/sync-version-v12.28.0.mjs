import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version:'12.28.0',
    release:'Worksheet Factory Modern Hero',
    releaseName:'Worksheet Factory Modern Hero',
    runtimeCore:'3.6.2',
    uiCore:true,
    worksheetModernHero:true,
    worksheetFullWidthHero:true,
    worksheetHeroIllustration:true,
    worksheetSidebar:false,
    requiresSql:false,
    generatedAt:now,
  });
  fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n');
}
console.log('Version registry synchronized: 12.28.0');
