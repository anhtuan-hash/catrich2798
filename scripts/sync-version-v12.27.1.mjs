import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version:'12.27.1',
    release:'Worksheet Source Length Guard',
    releaseName:'Worksheet Source Length Guard',
    runtimeCore:'3.6.2',
    uiCore:true,
    worksheetKeywordSourceAi:true,
    keywordSourceGeneration:true,
    sourceLengthGuard:true,
    automaticExpansionRetry:true,
    sourceProvenance:true,
    requiresSql:false,
    generatedAt:now,
  });
  fs.writeFileSync(file, JSON.stringify(value,null,2)+'\n');
}
console.log('Version registry synchronized: 12.27.1');
