import fs from 'node:fs';
const version='11.5.6';
const generatedAt=new Date().toISOString();
const features={
  aiWorkspaceResilience:true,
  aiWorkspaceAdaptiveTokenRetry:true,
  aiWorkspaceInternalFallback:true,
  aiWorkspaceContinuationMode:true,
  aiWorkspaceFriendlyCreditErrors:true,
  aiWorkspaceResponseBudgets:['economy','balanced','detailed'],
  listeningLab:false,
  removedApps:['listening-lab'],
};
const shared={version,runtimeCore:'2.5.6',schemaVersion:'11.4.2',requiresSql:false,hobbyFunctionConsolidation:true,vercelFunctionCount:12,...features,generatedAt};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,shared,{releaseName:'AI Workspace Resilience'});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,shared,{release:'AI Workspace Resilience',runtime:'2.5.6',schema:'11.4.2'});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
