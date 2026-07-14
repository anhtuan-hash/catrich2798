import fs from 'node:fs';
const version='11.5.2';
const generatedAt=new Date().toISOString();
const writingFeatures={
  writingStudioV2:true,writingStudioProcessWorkbench:true,writingStudioWorkflowSteps:7,writingStudioFunctionalCards:9,
  writingStudioBuildModes:['guided','process','exam','model','feedback','diagnostic'],
  writingStudioTaskBuilder:true,writingStudioLearnerContext:true,writingStudioSourceInput:true,writingStudioRubricEditor:true,
  writingStudioPlanningStudio:true,writingStudioIdeaBank:true,writingStudioOutlineBuilder:true,writingStudioLanguageToolkit:true,
  writingStudioModelAnalysis:true,writingStudioDifferentiation:true,writingStudioDraftEditor:true,writingStudioAiWritingCoach:true,
  writingStudioRubricReview:true,writingStudioLocalQualityAudit:true,writingStudioVersionHistory:true,writingStudioTeacherVault:true,
  writingStudioConnectedWorkflow:true,writingStudioTransferInbox:true,writingStudioDocumentImport:true,
  writingStudioRoute:'#/tool/writing-studio',writingStudioSchema:'bes-writing-pack/1.0',writingStudioDesign:'Modern SaaS Workbench + Soft Editorial',
};
const shared={version,runtimeCore:'2.5.2',schemaVersion:'11.4.2',requiresSql:true,requiredMigration:'supabase/brian_v11_4_2_lesson_integration.sql',
  hobbyFunctionConsolidation:true,vercelFunctionCount:12,...writingFeatures,generatedAt};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,shared,{releaseName:'Writing Studio Process Writing Workbench'});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,shared,{release:'Writing Studio Process Writing Workbench',runtime:'2.5.2',schema:'11.4.2'});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
