import fs from 'node:fs';
const version='11.3.2';
const generatedAt=new Date().toISOString();
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,{
  version,
  releaseName:'Admin Hidden Apps Vault',
  runtimeCore:'2.3.2',
  schemaVersion:'11.3.2',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_2_app_visibility.sql',
  adminHiddenAppsVault:true,
  teacherVisibilityEnforcement:true,
  visibilityRealtime:true,
  generatedAt,
});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,{
  version,
  release:'Admin Hidden Apps Vault',
  runtime:'2.3.2',
  schema:'11.3.2',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_2_app_visibility.sql',
  adminHiddenAppsVault:true,
  teacherVisibilityEnforcement:true,
  visibilityRealtime:true,
  generatedAt,
});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
