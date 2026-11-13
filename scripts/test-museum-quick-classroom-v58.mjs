import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createQuickAccessVerifier,verifyQuickAccess,QUICK_CLASSROOM_DEFAULT} from '../serverless-handlers/_galleryQuickAccess.js';
const verifier=createQuickAccessVerifier();
assert.equal(QUICK_CLASSROOM_DEFAULT,'PEK123');
assert.ok(!Object.values(verifier).includes('PEK123'),'Do not store plain default password');
assert.equal(verifyQuickAccess('PEK123',{...verifier,enabled:true}),true);
assert.equal(verifyQuickAccess('Wrong123',{...verifier,enabled:true}),false);
assert.equal(verifyQuickAccess('PEK123',{...verifier,enabled:false}),false);
assert.equal(verifyQuickAccess('PEK123',null),false);
assert.equal(verifyQuickAccess('PEK123',{enabled:true,password_salt:'bad',password_hash:'bad'}),false);
assert.notEqual(createQuickAccessVerifier().password_salt,verifier.password_salt);
const guest=readFileSync(new URL('../serverless-handlers/gallery-guest.js',import.meta.url),'utf8');
const creator=readFileSync(new URL('../serverless-handlers/_galleryCreator.js',import.meta.url),'utf8');
const staff=readFileSync(new URL('../serverless-handlers/gallery-staff.js',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/features/immersive-gallery/v3/MuseumLabStudent.jsx',import.meta.url),'utf8');
const lesson=readFileSync(new URL('../src/features/immersive-gallery/v3/MuseumLessonFlow.jsx',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261113233500_museum_quick_classroom_access_v58.sql',import.meta.url),'utf8');
for(const s of ["operation==='invite-info'","operation==='redeem'","verifyQuickAccess(secret,quick)","auth_method:quickMode?'quick':'private'","ipWindow.count>=10","handleWindow.count>=20","active.count>=3","['rejected','published'].includes(group.state)"]){assert.ok(guest.includes(s),'guest contract missing '+s);}
for(const s of ["operation==='quick-access-setting'","assertAdmin(ctx)","assignment.created_by!==ctx.user.id","createQuickAccessVerifier()","auth_method','quick'"]){assert.ok(staff.includes(s),'admin contract missing '+s);}
assert.ok(creator.includes("sess.auth_method==='quick'"),'disabled quick sessions must be refused');
assert.ok(ui.includes('getMuseumInviteInfo(handle.trim())'),'join link should discover mode');
assert.ok(ui.includes("quick?{classroomPassword:secret}:{groupSecret:secret}"),'private login fallback');
assert.ok(lesson.includes('Quick access ON · PEK123'));
assert.ok(lesson.includes("staffRequest('quick-access-setting'"));
assert.ok(migration.includes('enable row level security'));
assert.ok(migration.includes('revoke all on table public.gcp_quick_access'));
assert.ok(!guest.includes("secret_hash=digest('invite:'+QUICK_CLASSROOM_DEFAULT)"));
console.log('PASS: Quick Classroom Access verifier, session revocation, Admin gate, classroom mode and private fallback.');
