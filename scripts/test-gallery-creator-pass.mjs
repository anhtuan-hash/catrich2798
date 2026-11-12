import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeGuestDraft,validateGuestSubmission} from '../src/features/immersive-gallery/creatorPassPolicy.js';

const room=(kind='text')=>({title:'Climate Hall',template_key:'classic',
 exhibits:[{title:'Clean energy',description:'Solar energy matters.',kind,
  ...(kind==='model'?{model_key:'globe'}:{})}]});
test('guest document is strict allowlist and cannot sneak executable data',()=>{
 const d=normalizeGuestDraft({title:'Climate',summary:'Original',admin:true,rooms:[{...room(),hack:'flag',
 exhibits:[{...room().exhibits[0],html:'<script>alert(1)</script>',submitted_by:'arbitrary'}]}]});
 assert.equal(d.admin,undefined);
 assert.equal(d.rooms[0].hack,undefined);
 assert.equal(d.rooms[0].exhibits[0].html,undefined);
 assert.equal(d.rooms[0].exhibits[0].submitted_by,undefined);
 assert.equal(validateGuestSubmission(d),true);
});
test('reject unsafe guest media and model keys',()=>{
 for(const kind of ['image','audio','video','pdf','html']){
 assert.throws(()=>normalizeGuestDraft({rooms:[room(kind)]}),/Chỉ cho phép/);
 }
 assert.throws(()=>normalizeGuestDraft({rooms:[{...room('model'),exhibits:[{title:'x',kind:'model',model_key:'https://evil.example/foo.glb'}]}]}),/chưa được duyệt/);
});
test('reject too many rooms and total exhibits',()=>{
 assert.throws(()=>normalizeGuestDraft({rooms:[room(),room(),room(),room()]}),/Vượt số phòng/);
 assert.throws(()=>normalizeGuestDraft({rooms:[{...room(),exhibits:Array.from({length:13},(_,i)=>({title:String(i),kind:'text'}))}]}),/Vượt số hiện vật/);
});
test('normalize transforms and prevent extreme numbers',()=>{
 const d=normalizeGuestDraft({rooms:[{...room(),exhibits:[{title:'Safe',kind:'text',transform:{position:[Infinity,999,2]}}]}]});
 assert.deepEqual(d.rooms[0].exhibits[0].transform.position,[-4,2,-7.72]);
});
test('submission requires meaningful written content',()=>{
 assert.throws(()=>validateGuestSubmission(normalizeGuestDraft({title:'',rooms:[]})));
 assert.throws(()=>validateGuestSubmission(normalizeGuestDraft({title:'x',rooms:[room()]}).rooms.map(()=>null)));
 assert.equal(validateGuestSubmission(normalizeGuestDraft({title:'Climate',rooms:[room()]})),true);
});
test('no Supabase auth identities are created for guests',()=>{
 const api=fs.readFileSync('serverless-handlers/gallery-guest.js','utf8');
 const common=fs.readFileSync('serverless-handlers/_galleryCreator.js','utf8');
 const migration=fs.readFileSync('supabase/migrations/20261112171000_gallery_creator_pass_v21.sql','utf8');
 assert.doesNotMatch(api,/auth\.signUp|auth\.admin\.createUser|auth\.signInAnonymously/);
 assert.doesNotMatch(common,/auth\.signUp|auth\.admin\.createUser|auth\.signInAnonymously/);
 assert.match(api,/guestContext\(req,admin,\{write:true\}\)/);
 assert.match(api,/guardOrigin\(req\)/);
 assert.match(common,/x-gallery-csrf/i);
 assert.match(common,/HttpOnly; Secure; SameSite=Strict/);
 assert.match(migration,/revoke all on table[\s\S]*from public, anon, authenticated/);
 assert.match(migration,/grant execute on function public\.gcp_guest_save[\s\S]*to service_role/);
 assert.match(migration,/enabled boolean not null default false/);
});
test('TTCM is separately granted and publication stays Admin-gated',()=>{
 const staff=fs.readFileSync('serverless-handlers/gallery-staff.js','utf8');
 const sql=fs.readFileSync('supabase/migrations/20261112171000_gallery_creator_pass_v21.sql','utf8');
 assert.match(staff,/assertAdmin\(ctx\)/);
 assert.match(staff,/reviewer\(ctx,ctx\.user\.id\)/);
 assert.match(sql,/p_actor=a\.reviewer_id/);
 assert.match(sql,/p_role|admin_required|p\.role='admin'/);
 assert.match(sql,/approved_snapshot_required/);
});
test('public guest route stays isolated from legacy Brian route guards',()=>{
 const main=fs.readFileSync('src/main.jsx','utf8');
 assert.match(main,/PUBLIC_ROUTES = new Set\([\s\S]*'gallery-create'/);
 assert.match(main,/currentRoute === 'gallery-create' && <GalleryCreatorGuestPage/);
 assert.match(main,/import\('\.\/features\/immersive-gallery\/v3\/MuseumLabStudent\.jsx'\)/);
 const student=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabStudent.jsx','utf8');
 assert.match(student,/guestRequest\('me'\)/);
 assert.match(student,/guestRequest\('submit'/);
 assert.doesNotMatch(student,/auth\.signUp|auth\.admin\.createUser|signInAnonymously/);
});
console.log('Creator Pass security contract and input validation completed.');
