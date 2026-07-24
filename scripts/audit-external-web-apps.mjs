import fs from 'node:fs';
const required=['src/components/ExternalAppsIntegration.jsx','src/components/ExternalWebAppManager.jsx','src/components/ExternalWebAppViewer.jsx','src/utils/externalWebApps.js','api/check-embed.js'];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing ${file}`)}
const index=fs.readFileSync('index.html','utf8');
if(!index.includes('/src/externalAppsBootstrap.jsx'))throw new Error('External apps bootstrap is not loaded');
const manager=fs.readFileSync('src/components/ExternalWebAppManager.jsx','utf8');
if(!manager.includes('approveExternalWebApp')||!manager.includes('submitExternalWebApp'))throw new Error('Approval workflow is incomplete');
const viewer=fs.readFileSync('src/components/ExternalWebAppViewer.jsx','utf8');
if(viewer.includes('allow-popups')||viewer.includes('window.open'))throw new Error('Viewer must not open new tabs');
console.log('External website apps audit passed.');
