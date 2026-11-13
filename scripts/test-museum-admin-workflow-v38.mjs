import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const sql=read('supabase/migrations/20261113010000_museum_admin_direct_review_archive.sql');
const api=read('serverless-handlers/gallery-staff.js');
const wizard=read('src/features/immersive-gallery/v3/MuseumLessonFlow.jsx');
const review=read('src/features/immersive-gallery/v3/MuseumReview.jsx');
const settings=read('src/features/immersive-gallery/v3/MuseumExplore.jsx');
const guest=read('serverless-handlers/_galleryCreator.js');
test('Admin directly creates lessons without a reviewer dropdown',()=>{
 assert.match(api,/if\(operation==='create-assignment'\)\{/);
 assert.match(api,/const reviewerId=ctx\.user\.id;/);
 assert.match(api,/guardOrigin\(req\);assertAdmin\(ctx\)/);
 assert.doesNotMatch(wizard,/validReviewers|chosenReviewer|reviewerId:chosenReviewer|Người duyệt chuyên môn/);
 assert.match(wizard,/const isAdmin=data\?\.profile\?\.role==='admin'/);
 assert.match(wizard,/admin.*giao|Admin trực tiếp giao/);
 assert.doesNotMatch(settings,/grant-reviewer|Cấp quyền duyệt chuyên môn|Chọn người duyệt/);
});
test('server-only Admin review checks frozen source evidence and school',()=>{
 assert.match(api,/if\(operation==='admin-decision'\)/);
 assert.match(api,/admin\.rpc\('gcp_admin_decide'/);
 assert.match(sql,/create or replace function public\.gcp_admin_decide/);
 assert.match(sql,/p\.role='admin' and p\.approved=true and trim\(p\.school\)=a\.school_scope/);
 assert.match(sql,/rev\.snapshot_hash<>encode\(extensions\.digest/);
 assert.match(sql,/rev\.state not in \('submitted','ttcm_review'\)/);
 assert.match(sql,/insert into public\.gcp_review_events/);
 assert.match(review,/decide\('approve'\)/);
 assert.match(review,/staffRequest\(action==='publish'\?'publish':'admin-decision'/);
});
test('deletion buttons call scoped archive endpoints, not destructive cascading deletes',()=>{
 assert.match(wizard,/archive-assignment/);
 assert.match(review,/archive-review/);
 assert.match(wizard,/window\.confirm/);
 assert.match(review,/window\.confirm/);
 assert.match(api,/if\(operation==='archive-review'\)/);
 assert.match(api,/if\(operation==='archive-assignment'\)/);
 assert.match(sql,/create or replace function public\.gcp_admin_archive_review/);
 assert.match(sql,/create or replace function public\.gcp_admin_archive_assignment/);
 assert.match(sql,/rev\.state in \('approved_locked','published'\)/);
 assert.match(sql,/published_assignment_immutable/);
 assert.match(sql,/update public\.gcp_sessions set revoked_at=now\(\)/);
 assert.match(sql,/update public\.gcp_invites set revoked_at=now\(\)/);
 assert.doesNotMatch(sql,/delete from public\.gcp_(?:reviews|assignments|groups)/i);
 assert.match(api,/\.is\('archived_at',null\)/);
 assert.match(guest,/assignment\.archived_at/);
});
test('client roles have no database-execute grants for management RPCs',()=>{
 for(const fname of ['gcp_admin_decide','gcp_admin_archive_review','gcp_admin_archive_assignment']){
  assert.match(sql,new RegExp('revoke all on function public\\.'+fname+'\\('));
 }
 assert.match(sql,/to service_role/);
 assert.match(api,/assertAdmin\(ctx\)/);
});
