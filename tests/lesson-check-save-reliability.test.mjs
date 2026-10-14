import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/LessonCheckStudio.jsx');
const service=read('src/utils/lessonCheckActivities.js');
const sql=read('supabase/migrations/20261014070000_lesson_check_atomic_save.sql');
const css=read('src/pages/LessonCheckApprovedMockupOne.css');

test('Single save always releases synchronous guard and spinner',()=>{
 const fn=page.slice(page.indexOf('  async function saveActivity() {'),page.indexOf('  async function duplicateActivity('));
 assert.match(fn,/if \(savingSingleRef\.current \|\| saving\) return/);
 assert.match(fn,/finally \{\s*savingSingleRef\.current = false;\s*setSaving\(false\);/);
 assert.match(fn,/saveLessonCheckActivityReliable\(normalized, parsedDraft/);
 assert.match(fn,/pendingSingleSaveRef\.current\.requestId/);
 assert.match(fn,/pendingSingleSaveRef\.current\?\.fingerprint !== fingerprint/);
 assert.match(fn,/setSaveFeedback\(\{ type: 'error'/);
 assert.match(page,/className=\{`lcs-save-feedback is-/);
 assert.match(css,/\.lcs-save-feedback\.is-error/);
});

test('Retry protects the initial activity when thumbnail save fails',()=>{
 assert.match(page,/setSingleDraft\(previous => \(\{ \.\.\.previous, id: result\.id \}\)\)/);
 assert.match(page,/pendingSingleSaveRef\.current = null/);
 assert.match(page,/resetActivityBuilder\(\)/);
 assert.match(page,/crypto\.randomUUID\(\)/);
});

test('Supabase uses one atomic RPC with abortable 22-second deadline',()=>{
 assert.match(service,/export async function saveLessonCheckActivityReliable\(/);
 assert.match(service,/timeoutMs = 22000/);
 assert.match(service,/AbortController\(\)/);
 assert.match(service,/\.rpc\('lesson_check_save_activity_reliable', payload\)/);
 assert.match(service,/\.abortSignal\(controller\.signal\)/);
 assert.match(service,/finally \{\s*clearTimeout\(timer\)/);
 assert.match(service,/Hoạt động có thể đã được ghi/);
});

test('RPC idempotency prevents lost-response duplicate and protects other user receipts',()=>{
 assert.match(sql,/primary key\(actor_id, request_id\)/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/lesson_check_is_leader\(\)/);
 assert.match(sql,/on conflict do nothing/);
 assert.match(sql,/existing_hash is distinct from fingerprint/);
 assert.match(sql,/if saved_id is null then raise exception/);
 assert.match(sql,/saved_id := public\.lesson_check_save_activity\(/);
 assert.match(sql,/update public\.lesson_check_activities set focus_area=p_focus_area/);
 assert.match(sql,/revoke all on public\.lesson_check_save_receipts from public, anon, authenticated/);
 assert.match(sql,/revoke all on function public\.lesson_check_save_activity_reliable/);
 assert.doesNotMatch(sql,/drop table|truncate|delete from public\.lesson_check_activities/i);
});

test('Timeout and transport exceptions are retryable rather than uncaught',async()=>{
 const start=service.indexOf('export async function saveLessonCheckActivityReliable(');
 const end=service.indexOf('export async function deleteLessonCheckActivity(',start);
 assert.ok(start>0&&end>start);
 const clean=service.slice(start,end).replace('export async function','async function');
 const calls=[];
 const fakeSupabase={rpc:(name,payload)=>{
   calls.push({name,payload});
   return {abortSignal:async()=>({data:null,error:{message:'temporary outage'}})};
 }};
 const context={isSupabaseConfigured:true,supabase:fakeSupabase,AbortController,
   setTimeout,clearTimeout,emitUpdate:()=>{},
   buildLessonCheckSavePayload:()=>({target_activity:null,p_title:'Demo',p_embed_kind:'url',p_embed_code:'https://example.com',p_grade:11})};
 const fun=vm.runInNewContext(clean+'\n saveLessonCheckActivityReliable',context);
 const r=await fun({title:'Demo',focusArea:'grammar'},{kind:'url'},{requestId:'123',timeoutMs:50});
 assert.equal(r.ok,false);
 assert.equal(r.retryable,true);
 assert.equal(calls[0].name,'lesson_check_save_activity_reliable');
 assert.equal(calls[0].payload.p_focus_area,'grammar');
 assert.equal(calls[0].payload.p_request_id,'123');
 fakeSupabase.rpc=()=>{throw new Error('offline')};
 const failed=await fun({focusArea:'grammar'},{kind:'url'},{requestId:'123',timeoutMs:50});
 assert.equal(failed.ok,false);
 assert.equal(failed.retryable,true);
});
