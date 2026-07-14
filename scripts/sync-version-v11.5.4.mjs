import fs from 'node:fs';
const version='11.5.4';
const generatedAt=new Date().toISOString();
const features={
  resilientMediaCapture:true,sharedMediaCaptureUtility:true,adaptiveAudioMimeType:true,microphonePermissionDiagnostics:true,
  recordingIndependentFromSpeechRecognition:true,speechRecognitionNetworkFallback:true,pronunciationRecorderFix:true,
  speakingRecorderFix:true,aiVoiceInputFallback:true,expandedAiComposer:true,aiComposerMinHeight:96,aiComposerMaxHeight:260,
  aiMessengerExpandedWidth:560,mediaCaptureRouteCoverage:['pronunciation-coach','speaking-studio','brian-ai'],
};
const shared={version,runtimeCore:'2.5.4',schemaVersion:'11.4.2',requiresSql:true,requiredMigration:'supabase/brian_v11_4_2_lesson_integration.sql',hobbyFunctionConsolidation:true,vercelFunctionCount:12,...features,generatedAt};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));Object.assign(versionFile,shared,{releaseName:'System Media Capture & AI Composer Fix'});fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));Object.assign(release,shared,{release:'System Media Capture & AI Composer Fix',runtime:'2.5.4',schema:'11.4.2'});fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
