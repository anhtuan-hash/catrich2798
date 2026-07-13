import fs from 'node:fs';
const version='11.4.2';
const generatedAt=new Date().toISOString();
const shared={
  version,
  runtimeCore:'2.4.2',
  schemaVersion:'11.4.2',
  requiresSql:true,
  requiredMigration:'supabase/brian_v11_4_2_lesson_integration.sql',
  aiLessonIntegrationStudio:true,
  englishLessonIntegrationRoute:'#/tool/english-lesson-integration',
  lessonIntegrationCloudSync:true,
  lessonIntegrationShadowDom:true,
  lessonIntegrationConnectedTransfer:true,
  generatedAt,
};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile, shared, { releaseName:'AI Lesson Integration Native Merge' });
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release, shared, { release:'AI Lesson Integration Native Merge', runtime:'2.4.2', schema:'11.4.2' });
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
