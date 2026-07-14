import fs from 'node:fs';
const required=[
  'src/config/version.js','src/pages/WorkHub.jsx','src/components/StatusMenuBar.jsx',
  'src/utils/workHubDelivery.js','src/styles/v1133.css',
  'supabase/brian_v11_3_4_preflight.sql','supabase/brian_v11_3_4_bulk_assignment_delete.sql','supabase/brian_v11_3_4_verify.sql',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.4'||version.version!=='11.3.4'||version.runtimeCore!=='2.3.4'||version.schemaVersion!=='11.3.4'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_3_4_bulk_assignment_delete.sql'){console.error('✗ required migration is not registered');failed++;}else console.log('✓ migration requirement registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
const workHub=fs.readFileSync('src/pages/WorkHub.jsx','utf8');
for(const marker of ['Chọn nhiều người','Cả tổ (','assignment_batch_id','deleteWorkItems','Xoá cả đợt giao','removeWorkHubSubmissionFiles']){
  if(!workHub.includes(marker)){console.error(`✗ missing Work Hub marker ${marker}`);failed++;}
}
const sql=fs.readFileSync('supabase/brian_v11_3_4_bulk_assignment_delete.sql','utf8');
for(const marker of ['work_hub_items_delete_v1134','bes_v1133_is_leader(auth.uid())','grant delete on public.work_hub_items','work_hub_items_assignment_batch_v1134']){
  if(!sql.includes(marker)){console.error(`✗ missing SQL marker ${marker}`);failed++;}
}
const status=fs.readFileSync('src/components/StatusMenuBar.jsx','utf8');
if(!status.includes('playNoticeTone')){console.error('✗ notification sound hotfix missing');failed++;}
if(failed) process.exit(1);
console.log('V11.3.4 release guard passed.');
