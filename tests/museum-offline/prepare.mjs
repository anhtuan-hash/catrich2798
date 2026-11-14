import fs from 'node:fs/promises';
import JSZip from 'jszip';
import assert from 'node:assert/strict';
import {fixture} from './fixture.mjs';
import {exportMuseumOffline} from '../../src/features/immersive-gallery/v3/offline/exportMuseum.js';
import {buildOfflineHtml,digest} from '../../src/features/immersive-gallery/v3/offline/snapshot.js';
const runtime=JSON.parse(await fs.readFile('dist/museum-offline-runtime.json','utf8'));
assert.equal(/(?:[a-z0-9-]+)\.supabase\.co|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(runtime.script),false,'No cloud endpoint or JWT may ship in offline code');
const f=fixture(),originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{assert.equal(url,'/museum-offline-runtime.json');return Response.json(runtime);};
let result;
try{result=await exportMuseumOffline({staff:async action=>action==='dashboard'?f.staff:action==='showcase-state'?f.showcase:{gallery:f.galleries[0]},
 art:async()=>f.artworks['qa-group'],live:async action=>action==='state'?f.live['qa-lesson']:action==='evidence'?f.evidence['qa-lesson']:action==='group-gallery'?f.groupDrafts['qa-group']:{before:null,after:null},
 fetcher:async()=>{throw Error('Unexpected external fetch');}});}finally{globalThis.fetch=originalFetch;}
const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());
const snapshot=JSON.parse(await zip.file('snapshot.json').async('string')),manifest=JSON.parse(await zip.file('manifest.json').async('string'));
const html=await zip.file('BRIAN_Museum_Offline.html').async('string');
assert.equal(await digest(html),manifest.htmlSha256);assert.equal(await digest(JSON.stringify(snapshot)),manifest.snapshotSha256);
assert.equal(manifest.counts.lessons,1);assert.equal(manifest.readOnly,true);
await fs.mkdir('artifacts/museum-offline',{recursive:true});
await fs.writeFile('artifacts/museum-offline/qa.html',html);
snapshot.staff.assignments[0].title='Tampered';
await fs.writeFile('artifacts/museum-offline/tampered.html',buildOfflineHtml(runtime,snapshot,manifest.snapshotSha256));
console.log('Actual ZIP exporter round trip verified: HTML, snapshot, manifest checksums and frozen counts.');
