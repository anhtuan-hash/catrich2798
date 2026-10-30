import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const ALBUM='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67';
const CUTOFF='2026-10-30T08:15:00.000Z';
const SLUG='halloween-showcase-ry29';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const send=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:H});
function ok(r){if(r.error)throw Error(r.error.message);return r.data;}
const round=n=>Math.round(n*100)/100;
function id(v){const m=String(v||'').trim().match(/^(\d{1,2}\.\d{1,2})\s+(?:Group|Nhóm)\s*(\d{1,2})\b/i);if(!m)throw Error('Tên nhóm không hợp lệ.');return {label:m[1]+' Group '+Number(m[2]),className:m[1],groupNumber:Number(m[2])};}
async function admin(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)throw Error('Cần đăng nhập Admin BRIAN.');
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user)throw Error('Phiên đăng nhập không hợp lệ.');
 const p=ok(await db.from('profiles').select('role,approved').eq('id',user.id).single());
 if(p.role!=='admin'||p.approved!==true)throw Error('Chỉ Admin được công bố.');
}
async function stored(){return ok(await db.from('bes_halloween_awards_2026').select('*').eq('album_id',ALBUM).maybeSingle());}
async function finalize(){
 const previous=await stored();if(previous)return previous;
 if(Date.now()<Date.parse(CUTOFF))return null;
 const response=await fetch('https://qrvote.org/api/c/'+SLUG+'/results',{cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('QRvote HTTP '+response.status);
 const source=await response.json();
 if(source?.campaign?.slug!==SLUG||source?.campaign?.status!=='closed')throw Error('QRvote chưa xác nhận đóng phiếu.');
 if(!Array.isArray(source.results)||source.results.length!==18)throw Error('QRvote chưa trả đủ 18 nhóm.');
 const votes=new Map();
 for(const r of source.results){const k=id(r.name).label;if(votes.has(k)||!Number.isSafeInteger(r.votes)||r.votes<0)throw Error('Phiếu QRvote không hợp lệ.');votes.set(k,r.votes);}
 const slides=ok(await db.from('bes_slideshow_slides').select('id,caption,image_path,sort_order,created_at').eq('album_id',ALBUM).order('sort_order').order('created_at'));
 if(slides.length!==18)throw Error('Album không đủ 18 tác phẩm.');
 const session=ok(await db.from('bes_judging_sessions').select('id').eq('album_id',ALBUM).single());
 const judges=ok(await db.from('bes_judging_invites').select('id').eq('session_id',session.id).is('revoked_at',null).not('submitted_at','is',null));
 if(judges.length<3)throw Error('Cần ít nhất 3 phiếu giám khảo hoàn tất.');
 const judgeIds=judges.map(j=>j.id);
 const scoring=ok(await db.from('bes_judging_scores').select('invite_id,slide_id,total').in('invite_id',judgeIds));
 const byJudge=new Map(judgeIds.map(x=>[x,new Map()]));
 for(const s of scoring){const value=Number(s.total);if(!Number.isFinite(value)||value<0||value>100)throw Error('Điểm bất hợp lệ.');byJudge.get(s.invite_id)?.set(s.slide_id,value);}
 if(judgeIds.some(x=>byJudge.get(x).size!==18))throw Error('Có phiếu đã nộp nhưng thiếu điểm.');
 const max=Math.max(...votes.values());
 const seen=new Set();
 const rows=slides.map((slide,n)=>{
  const group=id(String(slide.caption||'').split('|')[0]);
  if(seen.has(group.label)||!votes.has(group.label))throw Error('Tên nhóm không khớp QRvote.');
  seen.add(group.label);
  const jury=judgeIds.reduce((sum,k)=>sum+(byJudge.get(k).get(slide.id)??NaN),0)/judgeIds.length;
  if(!Number.isFinite(jury))throw Error('Giám khảo chưa chấm đủ.');
  const v=votes.get(group.label),audience=max?v/max*100:0;
  return {...group,slideId:slide.id,artworkNumber:n+1,imageUrl:db.storage.from('brian-slideshows').getPublicUrl(slide.image_path).data.publicUrl,
   juryScore:round(jury),audienceVotes:v,audienceScore:round(audience),finalScore:round(jury*.7+audience*.3)};
 }).sort((a,b)=>b.finalScore-a.finalScore||b.juryScore-a.juryScore||b.audienceVotes-a.audienceVotes||a.artworkNumber-b.artworkNumber).map((r,i)=>({...r,rank:i+1}));
 const payload={album_id:ALBUM,status:'frozen',cutoff_at:CUTOFF,snapshot:rows,judge_count:judgeIds.length,vote_count:[...votes.values()].reduce((a,b)=>a+b,0)};
 const result=await db.from('bes_halloween_awards_2026').insert(payload).select('*').single();
 if(result.error){if(result.error.code==='23505')return await stored();throw Error(result.error.message);}
 return result.data;
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:H});
 if(req.method!=='POST')return send({error:'Method not allowed'},405);
 try{
 const body=await req.json();
 if(body.albumId!==ALBUM||!['status','admin:status','admin:publish'].includes(body.action))return send({error:'Invalid request'},400);
 const elevated=String(body.action).startsWith('admin:');
 if(elevated)await admin(req);
 let record=await finalize();
 if(body.action==='admin:publish'){
  if(!record)throw Error('Chưa tới giờ chốt 15:15.');
  if(record.status==='frozen')record=ok(await db.from('bes_halloween_awards_2026').update({status:'published',published_at:new Date().toISOString()}).eq('album_id',ALBUM).eq('status','frozen').select('*').single());
 }
 const visible=record&&(record.status==='published'||elevated);
 return send({status:record?.status||'pending',cutoffAt:CUTOFF,serverNow:new Date().toISOString(),
  judgeCount:visible?record.judge_count:undefined,voteCount:visible?record.vote_count:undefined,
  rows:visible?record.snapshot:undefined,publishedAt:record?.published_at||null});
 }catch(e){return send({error:e instanceof Error?e.message:'Không thể tổng hợp kết quả.'},503);}
});
