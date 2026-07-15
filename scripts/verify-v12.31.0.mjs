import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const targets=['content-ecosystem','collaboration-hub','automation-center'];
const titles=['Hệ sinh thái nội dung dạy học','Teaching Content Ecosystem','Không gian cộng tác','Collaboration Hub','Trung tâm tự động hóa','Automation Center'];
const activeFiles=['src/main.jsx','src/data/apps.js','src/utils/permissions.js','src/components/GlobalFlatNavigation.jsx','src/components/ContentTransferHub.jsx','src/ui-core/components/UICommandCenter.jsx','src/ui-core/layouts/routeLayout.js','src/ui-core/runtime/workspaceRegistry.js','public/manifest.webmanifest','public/version.json','public/release-manifest.json'];
let failed=[];
for(const file of activeFiles){const t=read(file);for(const token of [...targets,...titles])if(t.includes(token))failed.push(`${file}: ${token}`)}
for(const file of ['src/pages/ContentEcosystem.jsx','src/pages/CollaborationHub.jsx','src/pages/AutomationCenter.jsx','src/utils/contentEcosystem.js'])if(fs.existsSync(file))failed.push(`still exists: ${file}`);
const app=read('src/config/version.js');if(!app.includes("12.31.0"))failed.push('version not updated');
if(failed.length){console.error('V12.31.0 verification failed');failed.forEach(x=>console.error('✗',x));process.exit(1)}
console.log('✓ Three retired apps absent from routes, app catalog, navigation, permissions, command center, transfer hub and PWA shortcuts.');
console.log('✓ Dedicated page files removed.');
console.log('✓ V12.31.0 source verification passed.');
