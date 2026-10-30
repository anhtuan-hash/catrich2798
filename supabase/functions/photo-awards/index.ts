import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

/** Halloween 2026 — live/manual or scheduled results, 50% jury + 50% QRvote. */
const ALBUM='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67';
const SCHEDULED_CUTOFF='2026-10-30T08:15:00.000Z';
const QRVOTE_SLUG='halloween-showcase-ry29';
const db=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{
 auth:{persistSession:false,autoRefreshToken:false}
});
const headers={
 'Content-Type':'application/json','Access-Control-Allow-Origin':'*',
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
 'Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'
};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
function result<T>(r:{data:T,error:{message:string,code?:string}|null}):T{
 if(r.error)throw new Error(r.error.message);
 return r.data;
}
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
function groupKey(input:unknown){
 const match=String(input||'').trim().match(/^(\d{1,2}\.\d{1,2})\s+(?:Group|Nhóm)\s*(\d{1,2})\b/i);
 if(!match)throw new Error('Không nhận diện được tên nhóm: '+String(input).slice(0,65));
 const className=match[1],groupNumber=Number(match[2]);
 return {className,groupNumber,label:className+' Group '+groupNumber};
}
async function requireAdmin(request:Request){
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token||token===Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))throw new Error('Cần đăng nhập Admin BRIAN.');
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user)throw new Error('Phiên đăng nhập không hợp lệ.');
 const profile=result(await db.from('profiles').select('role,approved').eq('id',user.id).maybeSingle());
 if(!profile||profile.role!=='admin'||profile.approved!==true)throw new Error('Chỉ Admin BRIAN được công bố giải thưởng.');
}
async function stored(){
 return result(await db.from('bes_halloween_awards_2026').select('*').eq('album_id',ALBUM).maybeSingle());
}

/**
 * Read every active judge's SAVED scores, even if that judge has not submitted.
 * For each artwork, average only its saved scores; if there are none, its jury score is 0.
 * Never expose scores/identities of individual judges.
 */
async function readLiveRanking(requireQrClosed=false){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 let source:any;
 try{
  const response=await fetch('https://qrvote.org/api/c/'+QRVOTE_SLUG+'/results',{
   cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}
  });
  if(!response.ok)throw new Error('QRvote API HTTP '+response.status);
  source=await response.json();
 }finally{clearTimeout(timeout);}
 if(source?.campaign?.slug!==QRVOTE_SLUG)throw new Error('Không xác thực được cuộc bình chọn QRvote.');
 if(requireQrClosed && source?.campaign?.status!=='closed'){
  throw new Error('QRvote chưa xác nhận đóng phiếu; sẽ tự kiểm tra lại.');
 }
 const votes=new Map<string,number>();
 if(!Array.isArray(source.results)||source.results.length!==18)throw new Error('QRvote chưa trả đủ 18 nhóm.');
 for(const entry of source.results){
  const label=groupKey(entry.name).label;
  if(votes.has(label)||!Number.isSafeInteger(entry.votes)||entry.votes<0){
   throw new Error('Phiếu QRvote bị trùng hoặc không hợp lệ.');
  }
  votes.set(label,entry.votes);
 }
 const slides=result(await db.from('bes_slideshow_slides')
  .select('id,caption,image_path,sort_order,created_at')
  .eq('album_id',ALBUM).order('sort_order').order('created_at'));
 if(slides.length!==18)throw new Error('Album chưa đủ 18 tác phẩm.');
 const session=result(await db.from('bes_judging_sessions').select('id').eq('album_id',ALBUM).single());
 const activeJudges=result(await db.from('bes_judging_invites')
  .select('id').eq('session_id',session.id).is('revoked_at',null));
 const judgeIds=activeJudges.map((judge:{id:string})=>judge.id);
 const savedScores=judgeIds.length
  ?result(await db.from('bes_judging_scores').select('invite_id,slide_id,total').in('invite_id',judgeIds))
  :[];
 const scoresBySlide=new Map<string,number[]>();
 const contributors=new Set<string>();
 for(const entry of savedScores){
  const score=Number(entry.total);
  if(!Number.isFinite(score)||score<0||score>100)throw new Error('Điểm giám khảo không hợp lệ.');
  contributors.add(entry.invite_id);
  const list=scoresBySlide.get(entry.slide_id)||[];
  list.push(score);
  scoresBySlide.set(entry.slide_id,list);
 }
 const seen=new Set<string>();
 const maxVotes=Math.max(0,...Array.from(votes.values()));
 const rows=slides.map((slide:any,index:number)=>{
  const identity=groupKey(String(slide.caption||'').split('|')[0]);
  if(seen.has(identity.label)||!votes.has(identity.label))throw new Error('Tên nhóm BRIAN và QRvote không khớp.');
  seen.add(identity.label);
  const scores=scoresBySlide.get(slide.id)||[];
  const jury=scores.length?scores.reduce((sum,value)=>sum+value,0)/scores.length:0;
  const audienceVotes=votes.get(identity.label)||0;
  const audience=maxVotes?audienceVotes/maxVotes*100:0;
  return {
   ...identity,slideId:slide.id,artworkNumber:index+1,
   imageUrl:db.storage.from('brian-slideshows').getPublicUrl(slide.image_path).data.publicUrl,
   scoredCount:scores.length,juryScore:round(jury),
   juryWeighted:round(jury*.5),audienceVotes,audienceScore:round(audience),
   audienceWeighted:round(audience*.5),finalScore:round((jury+audience)*.5)
  };
 }).sort((a,b)=>b.finalScore-a.finalScore||b.juryScore-a.juryScore||
  b.audienceVotes-a.audienceVotes||a.artworkNumber-b.artworkNumber)
  .map((entry,index)=>({...entry,rank:index+1}));
 const capturedAt=new Date().toISOString();
 return {
  rows,capturedAt,judgeCount:contributors.size,
  activeJudgeCount:activeJudges.length,savedScoreCount:savedScores.length,
  voteCount:[...votes.values()].reduce((a,b)=>a+b,0),
  voteStatus:String(source.campaign.status||'unknown')
 };
}
type Live=Awaited<ReturnType<typeof readLiveRanking>>;
async function insertSnapshot(live:Live){
 const record={
  album_id:ALBUM,status:'frozen',cutoff_at:live.capturedAt,snapshot:live.rows,
  judge_count:live.judgeCount,vote_count:live.voteCount
 };
 const insertion=await db.from('bes_halloween_awards_2026').insert(record).select('*').single();
 if(insertion.error){
  if(insertion.error.code==='23505'){
   const existing=await stored();
   if(existing)return existing;
  }
  throw new Error(insertion.error.message);
 }
 return insertion.data;
}
async function autoFreeze(){
 const previous=await stored();
 if(previous)return previous;
 if(Date.now()<Date.parse(SCHEDULED_CUTOFF))return null;
 const live=await readLiveRanking(true);
 return insertSnapshot(live);
}
async function publish(record:any){
 if(!record)throw new Error('Không có kết quả để công bố.');
 if(record.status==='published')return record;
 const update=await db.from('bes_halloween_awards_2026')
  .update({status:'published',published_at:new Date().toISOString()})
  .eq('album_id',ALBUM).eq('status','frozen').select('*').maybeSingle();
 if(update.error)throw new Error(update.error.message);
 return update.data||await stored();
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const body=await request.json();
  const action=String(body.action||'');
  if(body.albumId!==ALBUM||!['status','admin:status','admin:preview','admin:publish','admin:publish-now'].includes(action)){
   return reply({error:'Yêu cầu không hợp lệ.'},400);
  }
  const elevated=action.startsWith('admin:');
  if(elevated)await requireAdmin(request);
  let saved:any;
  let preview:Live|null=null;
  if(action==='admin:preview'){
   saved=await stored();
   if(!saved)preview=await readLiveRanking(false);
  }else if(action==='admin:publish-now'){
   saved=await stored();
   if(!saved)saved=await insertSnapshot(await readLiveRanking(false));
   saved=await publish(saved);
  }else{
   saved=await autoFreeze();
   if(action==='admin:publish')saved=await publish(saved);
  }
  if(preview){
   return reply({
    status:'preview',cutoffAt:SCHEDULED_CUTOFF,capturedAt:preview.capturedAt,
    serverNow:new Date().toISOString(),weights:{jury:50,audience:50},
    judgeCount:preview.judgeCount,activeJudgeCount:preview.activeJudgeCount,
    savedScoreCount:preview.savedScoreCount,voteCount:preview.voteCount,
    voteStatus:preview.voteStatus,rows:preview.rows
   });
  }
  const show=Boolean(saved&&(saved.status==='published'||elevated));
  return reply({
   status:saved?.status||'pending',cutoffAt:SCHEDULED_CUTOFF,
   capturedAt:saved?.cutoff_at||null,serverNow:new Date().toISOString(),
   weights:{jury:50,audience:50},publishedAt:saved?.published_at||null,
   judgeCount:show?saved.judge_count:undefined,
   voteCount:show?saved.vote_count:undefined,
   savedScoreCount:show?saved.snapshot.reduce((n:number,r:any)=>n+(r.scoredCount||0),0):undefined,
   rows:show?saved.snapshot:undefined
  });
 }catch(error){
  const message=error instanceof Error?error.message:'Không thể tổng hợp kết quả.';
  console.error('photo-awards',message);
  return reply({error:message,status:'unavailable',cutoffAt:SCHEDULED_CUTOFF},
   /Admin|đăng nhập|Phiên đăng nhập/.test(message)?403:503);
 }
});
