import fs from 'node:fs';
const version='11.5.1';
const generatedAt=new Date().toISOString();
const grammarBuilderFeatures={
  grammarBuilderV2:true,grammarBuilderV21:true,grammarBuilderV22:true,grammarBuilderV23:true,grammarBuilderV24:true,
  grammarBuilderWorkflowSteps:7,grammarBuilderFunctionalCards:9,grammarBuilderTwoCardLayout:true,
  grammarBuilderDomainOnlyFocus:true,grammarBuilderGroupedDomains:true,grammarBuilderDomainOptionCount:100,
  grammarBuilderCustomFocusRequest:true,grammarBuilderModernSaasWorkbench:true,
  grammarBuilderCompactProductHeader:true,grammarBuilderProjectContextStrip:true,
  grammarBuilderSegmentedWorkflow:true,grammarBuilderModernBlueprintCard:true,
  grammarBuilderModernAiTaskCards:true,grammarBuilderResponsiveWorkbench:true,
  grammarBuilderSelectedControlHighlighting:true,grammarBuilderEditorLargeItemCards:true,
  grammarBuilderModernAuditCards:true,grammarBuilderBuildModes:['mini-lesson','practice-set','thpt-exam','diagnostic','revision-pack','interactive'],
  grammarBuilderBlueprint:true,grammarBuilderItemBank:true,grammarBuilderTeacherVault:true,
  grammarBuilderQualityAudit:true,grammarBuilderMetadataCards:true,grammarBuilderDiagnosticEngine:true,
  grammarBuilderVariantGenerator:true,grammarBuilderConnectedWorkflow:true,grammarBuilderAiBatchGeneration:true,
  grammarBuilderRoute:'#/tool/grammar-builder',
};
const shared={
  version,runtimeCore:'2.5.1',schemaVersion:'11.4.2',requiresSql:true,
  requiredMigration:'supabase/brian_v11_4_2_lesson_integration.sql',
  aiLessonIntegrationStudio:true,englishLessonIntegrationRoute:'#/tool/english-lesson-integration',
  lessonIntegrationCloudSync:true,lessonIntegrationShadowDom:true,lessonIntegrationConnectedTransfer:true,
  lessonIntegrationNativeBundle:true,lessonIntegrationExternalBundle:false,lessonIntegrationRuntimeFix:true,
  lessonIntegrationModuleVersion:'1.4.1-brian.2',lessonIntegrationLargeWorkspace:true,
  lessonIntegrationAICopilot:true,lessonIntegrationNativeAiBridge:true,
  lessonIntegrationProviderInheritance:true,lessonIntegrationLargeProposalCards:true,
  lessonIntegrationReviewDrawer:true,hobbyFunctionConsolidation:true,vercelFunctionCount:12,
  ...grammarBuilderFeatures,generatedAt
};
const versionFile=JSON.parse(fs.readFileSync('public/version.json','utf8'));
Object.assign(versionFile,shared,{releaseName:'Grammar Builder Modern SaaS Workbench'});
fs.writeFileSync('public/version.json',JSON.stringify(versionFile,null,2)+'\n');
const release=JSON.parse(fs.readFileSync('public/release-manifest.json','utf8'));
Object.assign(release,shared,{release:'Grammar Builder Modern SaaS Workbench',runtime:'2.5.1',schema:'11.4.2'});
fs.writeFileSync('public/release-manifest.json',JSON.stringify(release,null,2)+'\n');
console.log(`Version registry synchronized: ${version}`);
