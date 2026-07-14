import fs from 'node:fs';
const required=[
  'src/config/version.js','src/main.jsx','src/pages/WorkHub.jsx','src/components/StatusMenuBar.jsx',
  'src/utils/workHubDelivery.js','src/styles/v1133.css',
  'supabase/brian_v11_3_3_preflight.sql','supabase/brian_v11_3_3_work_assignment_delivery.sql','supabase/brian_v11_3_3_verify.sql',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.3'||version.version!=='11.3.3'||version.runtimeCore!=='2.3.3'||version.schemaVersion!=='11.3.3'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_3_3_work_assignment_delivery.sql'){console.error('✗ required migration is not registered');failed++;}else console.log('✓ migration requirement registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
const workHub=fs.readFileSync('src/pages/WorkHub.jsx','utf8');
for(const marker of ['submitTeacherResponse','bes_v1133_submit_work_response','Nộp phản hồi công việc','uploadWorkHubSubmissionFile']){
  if(!workHub.includes(marker)){console.error(`✗ missing Work Hub marker ${marker}`);failed++;}
}
const status=fs.readFileSync('src/components/StatusMenuBar.jsx','utf8');
for(const marker of ['listWorkHubNotifications','subscribeWorkHubNotifications',"kind: 'work-hub'",'rememberWorkHubItem']){
  if(!status.includes(marker)){console.error(`✗ missing notification marker ${marker}`);failed++;}
}
const sql=fs.readFileSync('supabase/brian_v11_3_3_work_assignment_delivery.sql','utf8');
for(const marker of ['work_hub_notifications','bes_v1133_submit_work_response','work-hub-submissions','work_hub_files_select_v1133','supabase_realtime']){
  if(!sql.includes(marker)){console.error(`✗ missing SQL marker ${marker}`);failed++;}
}
if(failed) process.exit(1);
console.log('V11.3.3 release guard passed.');
