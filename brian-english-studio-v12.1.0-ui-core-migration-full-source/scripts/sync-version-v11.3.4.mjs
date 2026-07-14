import fs from 'node:fs';
const version='11.3.4';
const generatedAt=new Date().toISOString();
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,{
  version,
  releaseName:'Bulk Work Assignment & Safe Delete',
  runtimeCore:'2.3.4',
  schemaVersion:'11.3.4',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_4_bulk_assignment_delete.sql',
  bulkWorkAssignment:true,
  wholeDepartmentAssignment:true,
  safeWorkDeletion:true,
  workAssignmentNotifications:true,
  teacherFileResponses:true,
  notificationSound:true,
  animatedUnreadBadge:true,
  generatedAt,
});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,{
  version,
  release:'Bulk Work Assignment & Safe Delete',
  runtime:'2.3.4',
  schema:'11.3.4',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_3_4_bulk_assignment_delete.sql',
  bulkWorkAssignment:true,
  wholeDepartmentAssignment:true,
  safeWorkDeletion:true,
  workAssignmentNotifications:true,
  teacherFileResponses:true,
  notificationSound:true,
  animatedUnreadBadge:true,
  generatedAt,
});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
