import fs from 'node:fs';
const version='11.5.3';
const generatedAt=new Date().toISOString();
const features={
  pronunciationCoachV2:true,pronunciationCoachSpeechWorkbench:true,pronunciationCoachWorkflowSteps:7,pronunciationCoachFunctionalCards:9,
  pronunciationCoachPracticeModes:['sound','word','rhythm','connected','intonation','diagnostic'],pronunciationCoachFocusSelector:true,
  pronunciationCoachPracticeBlueprint:true,pronunciationCoachModelPlayer:true,pronunciationCoachSpeechSynthesis:true,
  pronunciationCoachRecorder:true,pronunciationCoachWaveform:true,pronunciationCoachSpeechRecognition:true,
  pronunciationCoachIntelligibilityCheck:true,pronunciationCoachEvidenceAwareScoring:true,pronunciationCoachAiSpeechCoach:true,
  pronunciationCoachVisualisationStudio:true,pronunciationCoachTeacherVault:true,pronunciationCoachVersionHistory:true,
  pronunciationCoachAssignments:true,pronunciationCoachConnectedWorkflow:true,pronunciationCoachTransferInbox:true,
  pronunciationCoachDocumentImport:true,pronunciationCoachRoute:'#/tool/pronunciation-coach',pronunciationCoachSchema:'bes-pronunciation-pack/1.0',
  pronunciationCoachDesign:'Modern SaaS Workbench + Soft Editorial',
};
const shared={version,runtimeCore:'2.5.3',schemaVersion:'11.4.2',requiresSql:true,requiredMigration:'supabase/brian_v11_4_2_lesson_integration.sql',hobbyFunctionConsolidation:true,vercelFunctionCount:12,...features,generatedAt};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));Object.assign(versionFile,shared,{releaseName:'Pronunciation Coach Speech Practice Workbench'});fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));Object.assign(release,shared,{release:'Pronunciation Coach Speech Practice Workbench',runtime:'2.5.3',schema:'11.4.2'});fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
