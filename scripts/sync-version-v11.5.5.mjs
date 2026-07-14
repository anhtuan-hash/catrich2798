import fs from 'node:fs';
const version='11.5.5';
const generatedAt=new Date().toISOString();
const features={
  listeningLab:false,
  removedApps:['listening-lab'],
  listeningLabRemovedFromRegistry:true,
  listeningLabRemovedFromHome:true,
  listeningLabRouteRetired:true,
  listeningLabConnectedWorkflowRemoved:true,
  retiredWorkspaceTabCleanup:true,
};
const shared={version,runtimeCore:'2.5.5',schemaVersion:'11.4.2',requiresSql:false,hobbyFunctionConsolidation:true,vercelFunctionCount:12,...features,generatedAt};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,shared,{releaseName:'Listening Lab Removal'});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,shared,{release:'Listening Lab Removal',runtime:'2.5.5',schema:'11.4.2'});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
