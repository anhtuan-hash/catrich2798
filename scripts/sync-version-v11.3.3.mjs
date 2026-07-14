import fs from 'node:fs';
const version='11.3.3';
const generatedAt=new Date().toISOString();
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,{
  version,
  releaseName:'Work Assignment Delivery',
  runtimeCore:'2.3.3',
  schemaVersion:'11.3.3',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_3_work_assignment_delivery.sql',
  workAssignmentNotifications:true,
  teacherFileResponses:true,
  workHubRealtime:true,
  workHubSubmissionBucket:'work-hub-submissions',
  generatedAt,
});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,{
  version,
  release:'Work Assignment Delivery',
  runtime:'2.3.3',
  schema:'11.3.3',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_3_work_assignment_delivery.sql',
  workAssignmentNotifications:true,
  teacherFileResponses:true,
  workHubRealtime:true,
  workHubSubmissionBucket:'work-hub-submissions',
  generatedAt,
});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
