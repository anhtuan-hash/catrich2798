import fs from 'node:fs';
const version='11.3.6';
const generatedAt=new Date().toISOString();
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,{
  version,
  releaseName:'Launcher Gallery and Aligned App Grid',
  runtimeCore:'2.3.6',
  schemaVersion:'11.3.5',
  requiresSql:false,
  requiredMigration:null,
  alignedAppCardGrid:true,
  launcherStyleSelector:true,
  circularLauncher:true,
  waterBoxLauncher:true,
  animatedFloatingApps:true,
  launcherConfigSchema:5,
  generatedAt,
});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,{
  version,
  release:'Launcher Gallery and Aligned App Grid',
  runtime:'2.3.6',
  schema:'11.3.5',
  requiresSql:false,
  requiredMigration:null,
  alignedAppCardGrid:true,
  launcherStyleSelector:true,
  circularLauncher:true,
  waterBoxLauncher:true,
  animatedFloatingApps:true,
  launcherConfigSchema:5,
  generatedAt,
});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
