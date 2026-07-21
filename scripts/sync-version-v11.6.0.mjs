import fs from 'node:fs';
const now = new Date().toISOString();
for (const file of ['public/version.json', 'public/release-manifest.json']) {
  if (!fs.existsSync(file)) continue;
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  Object.assign(value, {
    version: '11.6.0',
    releaseName: 'Worksheet Factory V2 — Structured Learning Pack Workbench',
    runtimeCore: '2.6.0',
    worksheetFactoryV2: true,
    worksheetFactoryWorkflowSteps: 7,
    worksheetFactoryFunctionalCards: 9,
    worksheetFactoryBuildModes: ['source-to-worksheet','topic-to-worksheet','lesson-pack','refine-existing','item-bank','batch'],
    worksheetFactorySourceIntelligence: true,
    worksheetFactoryBlueprint: true,
    worksheetFactorySequentialAiGeneration: true,
    worksheetFactoryEditor: true,
    worksheetFactoryQualityAudit: true,
    worksheetFactoryA4Preview: true,
    worksheetFactoryStudentTeacherVersions: true,
    worksheetFactoryTeacherLibrary: true,
    worksheetFactoryItemBank: true,
    worksheetFactoryBatchVariants: true,
    worksheetFactoryConnectedWorkflow: true,
    worksheetFactoryTransferSchema: 'bes-worksheet-pack/2.0',
    worksheetFactoryActivityTypeCount: 21,
    worksheetFactoryDesign: 'Modern SaaS Workbench + Soft Editorial + BURS Comfortable',
    generatedAt: now,
  });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
console.log('Version registry synchronized: 11.6.0');
