import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import fs from 'node:fs';
import {canonicalArtworkPng} from '../serverless-handlers/_museumPng.js';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES,liveStage,validResponse,summarizeResponses} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {documentFromStudio,emptyStudio,normalizeStudio} from '../src/features/immersive-gallery/v3/museumData.js';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
function crc32(input){
 let c=0xffffffff;for(const b of input){c^=b;for(let j=0;j<8;j++)c=c&1?0xedb88320^(c>>>1):c>>>1;}
 return (c^0xffffffff)>>>0;
}
function chunk(type,payload){
 const data=Buffer.from(type),out=Buffer.alloc(12+payload.length);
 out.writeUInt32BE(payload.length,0);data.copy(out,4);payload.copy(out,8);
 out.writeUInt32BE(crc32(out.subarray(4,8+payload.length)),8+payload.length);return out;
}
function fixture(){
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(2,0);ihdr.writeUInt32BE(2,4);ihdr[8]=8;ihdr[9]=6;
 const pixels=Buffer.from([0,255,0,0,255,0,255,0,255,0,0,0,255,255,255,255,255,255]);
 const chunks=[chunk('IHDR',ihdr),chunk('tEXt',Buffer.from('Author\u0000Synthetic Private Name')),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))];
 return Buffer.concat([SIGNATURE,...chunks]);
}
test('lesson has exactly two 45-minute periods and eleven explicit steps',()=>{
 assert.equal(LIVE_STAGES.length,11);assert.equal(LIVE_TOTAL_MINUTES,90);
 assert.deepEqual(LIVE_PERIOD_MINUTES,[45,45]);
 assert.ok(LIVE_STAGES.every((s,i)=>s.id&&s.minutes>0&&s.title&&s.vi));
});
test('responses count group devices, never fabricated students or zero-division',()=>{
 const x=summarizeResponses(2,[{value:0},{value:0},{value:3}]);
 assert.equal(x.n,3);assert.equal(x.unit,'group devices');
 assert.equal(x.options[0].count,2);assert.equal(x.options[0].percent,66.67);
 assert.equal(x.options[1].count,0);assert.equal(x.options[1].percent,0);
 const zero=summarizeResponses(2,[]);assert.equal(zero.n,0);
 assert.equal(zero.options[0].percent,0);
});
test('single-choice and three-question quick checks have server validation',()=>{
 assert.ok(validResponse(0,0));assert.ok(!validResponse(0,-1));assert.ok(!validResponse(2,99));
 assert.ok(validResponse(1,[0,1,1]));assert.ok(!validResponse(1,[0,1]));
 assert.ok(validResponse(10,'I will bring a reusable bottle.'));
 assert.ok(!validResponse(10,'hi'));assert.ok(!validResponse(6,0));
});
test('private image is canonicalized with no text chunks or owner metadata',()=>{
 const png=fixture();const result=canonicalArtworkPng('data:image/png;base64,'+png.toString('base64'));
 assert.equal(result.width,2);assert.equal(result.height,2);
 assert.ok(result.bytes>65);assert.equal(result.mime,'image/png');
 assert.ok(result.buffer.subarray(0,8).equals(SIGNATURE));
 assert.ok(!result.buffer.includes(Buffer.from('Synthetic Private Name')));
 assert.ok(!result.buffer.includes(Buffer.from('tEXt')));
 assert.match(result.sha256,/^[a-f0-9]{64}$/);
});
test('corrupt checksum, MIME, excessive size and unknown payload are rejected',()=>{
 const payload=fixture();const bad=Buffer.from(payload);bad[bad.length-9]^=20;
 assert.throws(()=>canonicalArtworkPng('data:image/png;base64,'+bad.toString('base64')));
 assert.throws(()=>canonicalArtworkPng('data:image/svg+xml;base64,PHN2Zz4='));
 assert.throws(()=>canonicalArtworkPng('data:image/png;base64,'+'A'.repeat(4000001)));
 assert.throws(()=>canonicalArtworkPng(''));
});
test('uploaded student artwork becomes image type with exact asset ID',()=>{
 const id='aaaaaaaa-1111-4111-8111-111111111111',studio=emptyStudio();
 studio.title='A Real Student Museum';studio.learning.issue='Our school has an environmental challenge.';
 studio.artworks={issue:id,evidence:null,solution:null};
 const doc=documentFromStudio(studio);assert.equal(doc.rooms[0].exhibits[0].kind,'image');
 assert.equal(doc.rooms[0].exhibits[0].asset_id,id);
 const accepted=normalizeGuestDraft(doc);
 assert.equal(accepted.rooms[0].exhibits[0].asset_id,id);
 assert.equal(normalizeStudio(accepted).artworks.issue,id);
});
test('server rejects arbitrary images without matching UUID and does not trust a remote URL',()=>{
 const draft=documentFromStudio(emptyStudio());draft.rooms[0].exhibits[0]={title:'X',description:'Y',kind:'image',asset_id:'https://evil.com/a.png',image_url:'https://evil.com'};
 assert.throws(()=>normalizeGuestDraft(draft),/Ảnh/);
});
test('private RLS, cookie scope, stage/CSRF gates and gateway are present',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261112210000_museum_live_classroom_artwork.sql','utf8');
 const guest=fs.readFileSync('serverless-handlers/gallery-guest.js','utf8');
 const art=fs.readFileSync('serverless-handlers/museum-artwork.js','utf8');
 const live=fs.readFileSync('serverless-handlers/museum-live.js','utf8');
 const routes=JSON.parse(fs.readFileSync('vercel.json','utf8')).rewrites;
 for(const name of ['museum_live_sessions','museum_live_responses','museum_artwork_assets','museum_learning_events']){
  assert.match(sql,new RegExp('alter table public\\.'+name+' enable row level security'));
 }
 assert.match(sql,/museum-artwork-private/);
 assert.match(guest,/museum_live_sessions/);assert.match(guest,/museum_artwork_assets/);
 assert.match(art,/canonicalArtworkPng/);assert.match(art,/guestContext\(req,admin/);
 assert.match(live,/staffContext\(req,admin/);assert.match(live,/guestContext\(req,admin/);
 assert.match(live,/stage_open/);assert.match(live,/validResponse/);
 assert.ok(routes.some(r=>r.source==='/api/gallery-guest/live'));
 assert.ok(routes.some(r=>r.source==='/api/gallery-guest/artwork'));
});
