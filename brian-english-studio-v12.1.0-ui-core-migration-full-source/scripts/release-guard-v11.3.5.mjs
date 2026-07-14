import fs from 'node:fs';
const required=[
  'api/work-hub-archive-resource.js','src/config/version.js','src/pages/WorkHub.jsx',
  'src/utils/workHubResourceArchive.js','src/utils/workHubDelivery.js','src/styles/v1133.css',
  'supabase/brian_v11_3_5_preflight.sql','supabase/brian_v11_3_5_work_submission_archive.sql','supabase/brian_v11_3_5_verify.sql',
  'public/version.json','public/release-manifest.json'
];
let failed=0;
for(const file of required){if(!fs.existsSync(file)){console.error(`✗ missing ${file}`);failed++;}else console.log(`✓ ${file}`);}
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const version=JSON.parse(fs.readFileSync('public/version.json','utf8'));
if(pkg.version!=='11.3.5'||version.version!=='11.3.5'||version.runtimeCore!=='2.3.5'||version.schemaVersion!=='11.3.5'){console.error('✗ version registry mismatch');failed++;}else console.log('✓ version registry synchronized');
if(!version.requiresSql||version.requiredMigration!=='supabase/brian_v11_3_5_work_submission_archive.sql'){console.error('✗ required migration is not registered');failed++;}else console.log('✓ migration requirement registered');
const lock=fs.readFileSync('package-lock.json','utf8');
if(lock.includes('applied-caas-gateway')){console.error('✗ internal registry found');failed++;}else console.log('✓ public npm registry only');
const workHub=fs.readFileSync('src/pages/WorkHub.jsx','utf8');
for(const marker of ['Lưu vào Kho học liệu','Lưu và duyệt học liệu','archiveWorkHubAttachmentToResourceLibrary','Chọn nhiều người','Xoá cả đợt giao']){
  if(!workHub.includes(marker)){console.error(`✗ missing Work Hub marker ${marker}`);failed++;}
}
const api=fs.readFileSync('api/work-hub-archive-resource.js','utf8');
for(const marker of ["roles: ['admin', 'department_head']",'library_resource_id','resourceCategoryFolderName','archive_work_submission']){
  if(!api.includes(marker)){console.error(`✗ missing archive API marker ${marker}`);failed++;}
}
if(failed) process.exit(1);
console.log('V11.3.5 release guard passed.');
