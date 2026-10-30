import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

/** Halloween 2026 — preview never locks data; official results use 80% jury + 20% QRvote. */
const ALBUM='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67';
const SCHEDULED_CUTOFF='2026-10-30T08:15:00.000Z';
const QRVOTE_SLUG='halloween-showcase-ry29';
const DEFAULT_ANNOUNCE_AT='2026-10-30T08:20:00.000Z';
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
 return user;
}
async function schedule(){
 const row=result(await db.from('bes_halloween_awards_schedule_2026')
  .select('vote_close_at,announce_at,updated_at').eq('album_id',ALBUM).maybeSingle());
 return {
  voteCloseAt:row?.vote_close_at||SCHEDULED_CUTOFF,
  announceAt:row?.announce_at||DEFAULT_ANNOUNCE_AT,
  updatedAt:row?.updated_at||null,
  providerManaged:true
 };
}
async function saveSchedule(body:any,userId:string){
 const existing=await stored();
 if(existing)throw new Error('Kết quả đã chốt, không thể thay đổi lịch.');
 const close=String(body.voteCloseAt||''),announce=String(body.announceAt||'');
 const valid=(v:string)=>/^2026-10-(?:29|30)T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|\+07:00|\+00:00)$/.test(v)&&Number.isFinite(Date.parse(v));
 if(!valid(close)||!valid(announce))throw new Error('Chỉ cho phép thiết lập lịch trong ngày 30/10/2026.');
 const closeMs=Date.parse(close),announceMs=Date.parse(announce);
 const start=Date.parse('2026-10-29T17:00:00Z');
 const end=Date.parse('2026-10-30T17:00:00Z');
 if(closeMs<start||closeMs>=end||announceMs<closeMs||announceMs>=end)throw new Error('Giờ công bố không được sớm hơn giờ kết thúc bình chọn, cùng ngày 30/10.');
 const saved=result(await db.from('bes_halloween_awards_schedule_2026')
  .upsert({album_id:ALBUM,vote_close_at:new Date(closeMs).toISOString(),
    announce_at:new Date(announceMs).toISOString(),updated_at:new Date().toISOString(),updated_by:userId},
   {onConflict:'album_id'})
  .select('vote_close_at,announce_at,updated_at').single());
 return {voteCloseAt:saved.vote_close_at,announceAt:saved.announce_at,updatedAt:saved.updated_at,providerManaged:true};
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
   juryWeighted:round(jury*.8),audienceVotes,audienceScore:round(audience),
   audienceWeighted:round(audience*.2),finalScore:round(jury*.8+audience*.2)
  };
 }).sort((a,b)=>b.finalScore-a.finalScore||b.juryScore-a.juryScore||
  b.audienceVotes-a.audienceVotes||a.artworkNumber-b.artworkNumber)
  .map((entry,index)=>({...entry,rank:index+1}));
 const capturedAt=new Date().toISOString();
 return {
  rows,capturedAt,judgeCount:contributors.size,
  activeJudgeCount:activeJudges.length,savedScoreCount:savedScores.length,
  voteCount:[...votes.values()].reduce((a,b)=>a+b,0),
  voteStatus:String(source.campaign.status||'unknown'),
  providerCloseAt:source.campaign.closesAt?new Date(source.campaign.closesAt).toISOString():null
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
async function autoFreeze(settings:any){
 const previous=await stored();
 if(previous)return previous;
 if(Date.now()<Date.parse(settings.voteCloseAt))return null;
 const live=await readLiveRanking(true);
 return insertSnapshot(live);
}
async function autoAnnounce(settings:any){
 const saved=await autoFreeze(settings);
 if(!saved)return null;
 if(Date.now()<Date.parse(settings.announceAt))return saved;
 return publish(saved);
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
  const allowed=['status','admin:status','admin:preview','admin:publish-now','admin:publish','admin:schedule'];
  if(body.albumId!==ALBUM||!allowed.includes(action))return reply({error:'Yêu cầu không hợp lệ.'},400);
  const elevated=action.startsWith('admin:');
  const who=elevated?await requireAdmin(request):null;
  const settings=action==='admin:schedule'
   ?await saveSchedule(body,who!.id)
   :await schedule();
  // A legacy "publish-now" request is now deliberately only a read-only preview.
  // It can never write a frozen result or make an announcement.
  if(action==='admin:preview'||action==='admin:publish-now'){
   const saved=await stored();
   if(!saved){
    const live=await readLiveRanking(false);
    return reply({status:'preview',...settings,cutoffAt:settings.voteCloseAt,capturedAt:live.capturedAt,
     serverNow:new Date().toISOString(),weights:{jury:80,audience:20},
     judgeCount:live.judgeCount,activeJudgeCount:live.activeJudgeCount,
     savedScoreCount:live.savedScoreCount,voteCount:live.voteCount,
     voteStatus:live.voteStatus,providerCloseAt:live.providerCloseAt,rows:live.rows});
   }
   return reply({status:saved.status,...settings,cutoffAt:settings.voteCloseAt,capturedAt:saved.cutoff_at,
    serverNow:new Date().toISOString(),weights:{jury:80,audience:20},
    judgeCount:saved.judge_count,voteCount:saved.vote_count,
    savedScoreCount:saved.snapshot.reduce((sum:number,row:any)=>sum+(row.scoredCount||0),0),
    publishedAt:saved.published_at||null,rows:saved.snapshot});
  }
  let saved:any=null;
  let scheduleError:string|null=null;
  try{
   saved=await autoAnnounce(settings);
  }catch(error){
   scheduleError=error instanceof Error?error.message:'Chưa thể chốt kết quả.';
  }
  if(action==='admin:publish'){
   if(Date.now()<Date.parse(settings.announceAt))throw new Error('Chưa đến giờ công bố đã cài đặt.');
   if(!saved)throw new Error(scheduleError||'Chưa thể xác minh kết quả QRvote sau giờ đóng.');
   saved=await publish(saved);
  }
  const visible=Boolean(saved&&(saved.status==='published'||elevated));
  return reply({
   status:saved?.status||'pending',...settings,cutoffAt:settings.voteCloseAt,serverNow:new Date().toISOString(),
   capturedAt:saved?.cutoff_at||null,weights:{jury:80,audience:20},
   publishedAt:saved?.published_at||null,
   pendingReason:scheduleError,
   judgeCount:visible?saved.judge_count:undefined,
   voteCount:visible?saved.vote_count:undefined,
   savedScoreCount:visible?saved.snapshot.reduce((n:number,r:any)=>n+(r.scoredCount||0),0):undefined,
   rows:visible?saved.snapshot:undefined
  });
 }catch(error){
  const message=error instanceof Error?error.message:'Không thể tổng hợp kết quả.';
  console.error('photo-awards',message);
  return reply({error:message,status:'unavailable'},
   /Admin|đăng nhập|Phiên đăng nhập/.test(message)?403:400);
 }
});
