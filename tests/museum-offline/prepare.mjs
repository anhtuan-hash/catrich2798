import fs from 'node:fs/promises';
import {fixture} from './fixture.mjs';
import {buildOfflineHtml,digest} from '../../src/features/immersive-gallery/v3/offline/snapshot.js';
const runtime=JSON.parse(await fs.readFile('dist/museum-offline-runtime.json','utf8'));
const snapshot=fixture(),hash=await digest(JSON.stringify(snapshot));
await fs.mkdir('artifacts/museum-offline',{recursive:true});
await fs.writeFile('artifacts/museum-offline/qa.html',buildOfflineHtml(runtime,snapshot,hash));
snapshot.staff.assignments[0].title='Tampered';
await fs.writeFile('artifacts/museum-offline/tampered.html',buildOfflineHtml(runtime,snapshot,hash));
