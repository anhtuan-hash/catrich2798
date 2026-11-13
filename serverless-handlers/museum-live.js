// Teacher-owned live classroom. Accountless student groups reuse Creator Pass cookies.
// Strict class scope, explicit stage transitions, no identity inference, real N group devices.
import {db,fail,send,handleError,guardOrigin,guardBody,guestContext,staffContext,assertStaff,query,uid,clean,requireMethod} from './_galleryCreator.js';
import {LIVE_STAGES,liveStage,validResponse,summarizeResponses} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {surveyFor,checkpointGallery,feedbackFor} from './_museumEvidence.js';
import {validatePeer} from '../src/features/immersive-gallery/v3/learningEvidence.js';
import {MICRO_CHALLENGES,validMicroAnswer,videoTaskFor,curriculumMediaBoard} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import {searchVideos,mediaText,mediaId,mediaBoardUpdate,mediaTask,searchThrottle,safeRefinement} from './_museumLiveMedia.js';
import {handleLivePeer,peerRoomsEvidence} from './_museumLivePeer.js';
const canRespond=stage=>['vote','quiz','exit','peer'].includes(stage?.kind);
async function scopedStaff(ctx,assignmentId){
 if(!uid(assignmentId))throw fail(400,'Lớp học không hợp lệ.');
 const a=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',assignmentId).single());
 if(a.archived_at||a.school_scope!==ctx.profile.school||(a.created_by!==ctx.user.id&&ctx.role!=='admin'))
  throw fail(403,'Không phải giáo viên phụ trách.');
 return a;
}
async function getSession(admin,assignmentId){
 return query(admin.from('museum_live_sessions').select('*').eq('assignment_id',assignmentId).maybeSingle());
}
const legacySurvey={...liveStage(2),question:'Which action do you currently take at least three days a week?',options:['Walk or cycle when possible','Switch off unused lights','Avoid food waste','None of these'],sentence:'Legacy group-device responses; do not interpret as individual habits or as the new priority survey.',teaching:'This session predates the group-priority protocol. Start a new lesson to use frozen priority evidence.'};
function publicStage(stage,revealed=false,staff=false){
 if(!stage)return null;
 return {
  id:stage.id,period:stage.period,minutes:stage.minutes,title:stage.title,vi:stage.vi,
  kind:stage.kind,question:stage.question,options:stage.options,
  questions:stage.questions?.map(q=>({...q,answer:staff||revealed?q.answer:null,explanation:staff||revealed?q.explanation:null})),
  sentence:stage.sentence,
  ...(staff?{teaching:stage.teaching,expected:stage.expected}:revealed?{expected:stage.expected}:{})
 };
}
function stateOf(s,{staff=false}={}){
 if(!s)return {status:'not_started',stage:null,stageIndex:-1,stageOpen:false};
 return {id:s.id,assignmentId:s.assignment_id,status:s.status,stageIndex:s.stage_index,
  stageOpen:s.stage_open,revealed:s.revealed,version:s.version,
  stageStartedAt:s.stage_started_at,elapsedSeconds:s.elapsed_seconds,updatedAt:s.updated_at,
  evidenceVersion:s.evidence_version,media:mediaTask(s),
  stage:publicStage(s.evidence_version===0&&s.stage_index===2?legacySurvey:liveStage(s.stage_index),s.revealed,staff)};
}
async function groupGallery(admin,groupId){
 const group=await query(admin.from('gcp_groups').select('id,label,assignment_id').eq('id',groupId).single());
 const draft=await query(admin.from('gcp_drafts').select('doc,version,updated_at').eq('group_id',groupId).single());
 const assets=await query(admin.from('museum_artwork_assets').select('id,storage_path,original_name')
  .eq('group_id',groupId).eq('status','private_ready').limit(6));
 const signed=await Promise.all(assets.map(async a=>{
  const {data,error}=await admin.storage.from('museum-artwork-private').createSignedUrl(a.storage_path,90);
  if(error||!data?.signedUrl)throw fail(503,'Không thể xem tranh ảnh.');
  return {id:a.id,image_url:data.signedUrl,original_name:a.original_name};
 }));
 return {groupLabel:group.label,draft:draft.doc,version:draft.version,artworks:signed,expiresSeconds:90};
}
export default async function museumLive(req,res){
 try{
  const op=String(req.query?.operation||''),admin=db();
  const isStaff=String(req.headers.authorization||'').startsWith('Bearer ');
  if(isStaff){
   const ctx=await staffContext(req,admin);assertStaff(ctx);
   const id=String(req.method==='GET'?req.query?.assignmentId:req.body?.assignmentId||'');
   const assignment=await scopedStaff(ctx,id);
   const session=await getSession(admin,assignment.id);
   if(op==='state'){
    requireMethod(req,'GET');
    if(!session)return send(res,200,{session:null,stageCount:LIVE_STAGES.length});
    const grp=await query(admin.from('gcp_groups').select('id,label,state')
      .eq('assignment_id',assignment.id).order('label'));
    const responses=await query(admin.from('museum_live_responses').select('value')
      .eq('session_id',session.id).eq('stage_index',session.stage_index).limit(30));
    const helps=await query(admin.from('museum_learning_events').select('group_id,created_at')
      .eq('session_id',session.id).eq('action','need_help').eq('stage_index',session.stage_index).limit(40));
    const micro=MICRO_CHALLENGES[session.stage_index]?await query(admin.from('museum_live_micro_responses')
     .select('group_id,choice,reason,submitted_at').eq('session_id',session.id)
     .eq('stage_index',session.stage_index).limit(50)):[];
    return send(res,200,{session:stateOf(session,{staff:true}),stageCount:LIVE_STAGES.length,
     microResponses:micro.length,microResults:micro,
     result:(()=>{const r=summarizeResponses(session.stage_index,responses);if(session.evidence_version===0&&session.stage_index===2)r.options=r.options.map((o,i)=>({...o,label:legacySurvey.options[i]}));return r;})(),
     groups:grp,needHelp:new Set(helps.map(h=>h.group_id)).size,helpGroups:[...new Set(helps.map(h=>h.group_id))],survey:await surveyFor(admin,session.id),feedback:await feedbackFor(admin,session.id),responses:await query(admin.from('museum_live_responses').select('group_id,value,created_at').eq('session_id',session.id).eq('stage_index',session.stage_index))});
   }
   if(op==='video-search'){
    requireMethod(req,'GET');
    // Authenticated teacher may search before the lesson starts.
    if(!searchThrottle('teacher-'+ctx.user.id))throw fail(429,'Hãy chờ trước khi tìm thêm video.');
    const q=mediaText(req.query?.q,120);
    return send(res,200,await searchVideos(q,{teacher:true}));
   }
   if(['media-task','media-add','media-remove','media-voice'].includes(op)){
    requireMethod(req,'POST');guardOrigin(req);
    const body=guardBody(req,1800);
    if(!session||session.status==='ended')throw fail(423,'Buổi dạy chưa hoạt động.');
    if(!Number.isInteger(body.version)||body.version!==session.version)
     throw fail(409,'Phiên dạy vừa thay đổi. Hãy cập nhật rồi thử lại.');
    const index=Number(body.stageIndex);
    if(!Number.isInteger(index)||index<0||index>=LIVE_STAGES.length)throw fail(400,'Hoạt động không hợp lệ.');
    let patch={};
    const current=videoTaskFor(session.media_board,index);
    if(op==='media-voice'){
     if(typeof body.enabled!=='boolean')throw fail(400,'Narration setting must be true or false.');
     patch={voiceEnabled:body.enabled};
    }else if(op==='media-task'){
     const q=mediaText(body.query,120),instruction=mediaText(body.instruction,350);
     if(q&&q.length<6)throw fail(400,'Từ khóa cần có ít nhất 6 ký tự.');
     patch={query:q,instruction};
    }else{
     const id=mediaId(body.videoId||body.url);
     if(!id)throw fail(400,'Chỉ chấp nhận liên kết video YouTube hợp lệ.');
     if(op==='media-add'){
      const title=mediaText(body.title,160)||'YouTube research video';
      const channel=mediaText(body.channel,120);
      const entries=current.videos.filter(v=>v.id!==id);
      if(entries.length>=6)throw fail(400,'Mỗi hoạt động tối đa sáu video được chọn.');
      patch={videos:[...entries,{id,title,channel}],...(body.instruction?{instruction:mediaText(body.instruction,350)}:{})};
     }else patch={videos:current.videos.filter(v=>v.id!==id)};
    }
    const board=mediaBoardUpdate(session,index,patch);
    const changed=await query(admin.from('museum_live_sessions').update({
     media_board:board,version:session.version+1,updated_at:new Date().toISOString()
    }).eq('id',session.id).eq('version',session.version).select('*').maybeSingle());
    if(!changed)throw fail(409,'Có một cập nhật khác. Hãy tải lại.');
    return send(res,200,{ok:true,media:videoTaskFor(board,index),session:stateOf(changed,{staff:true})});
   }
   if(op==='freeze-survey'){
    requireMethod(req,'POST');guardOrigin(req);const body=guardBody(req,2000);
    if(!session)throw fail(404,'Chưa bắt đầu tiết học.');
    if(session.evidence_version===0)throw fail(423,'Phiên cũ dùng câu hỏi khác. Hãy tạo bài học mới để khảo sát ưu tiên nhóm.');
    if(!Number.isInteger(body.version))throw fail(400,'Thiếu phiên bản khảo sát.');
    if(body.counts!==undefined&&(!Array.isArray(body.counts)||body.counts.length!==4||body.counts.some(v=>!Number.isInteger(v)||v<0)||!String(body.note||'').trim()))throw fail(400,'Nhập đủ bốn số nguyên và ghi nguồn phiếu giấy.');
    const survey=await query(admin.rpc('museum_freeze_survey',{p_session:session.id,p_version:body.version,p_counts:body.counts??null,p_note:clean(body.note,500)}));
    return send(res,200,{survey});
   }
   if(op==='evidence'){
    requireMethod(req,'GET');
    if(!session)throw fail(404,'Chưa có phiên học thực tế.');
    const checkpoints=await query(admin.from('museum_checkpoints').select('*').eq('session_id',session.id).order('created_at'));
    const groups=await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',assignment.id));
    const responses=await query(admin.from('museum_live_responses').select('group_id,stage_index,value,created_at').eq('session_id',session.id));
    const microResponses=await query(admin.from('museum_live_micro_responses')
     .select('group_id,stage_index,choice,reason,submitted_at').eq('session_id',session.id)
     .order('submitted_at',{ascending:true}));
    const assetIds=[...new Set(checkpoints.flatMap(c=>(c.doc?.rooms||[]).flatMap(r=>(r.exhibits||[]).map(e=>e.asset_id))).filter(Boolean))];
    const assets=assetIds.length?await query(admin.from('museum_artwork_assets').select('id,group_id,storage_path,original_name,bytes,sha256').eq('assignment_id',assignment.id).in('id',assetIds)):[];
    const media=await Promise.all(assets.map(async({storage_path,...a})=>{const {data,error}=await admin.storage.from('museum-artwork-private').createSignedUrl(storage_path,600);if(error)throw fail(503,'Không thể xuất ảnh.');return {...a,url:data.signedUrl};}));
    return send(res,200,{format:'museum-evidence-v33',exported_at:new Date().toISOString(),assignment:{id:assignment.id,title:assignment.title,class_scope:assignment.class_scope},session:stateOf(session,{staff:true}),groups,survey:await surveyFor(admin,session.id),checkpoints,feedback:await feedbackFor(admin,session.id),
     responses,microResponses,teacherMediaBoard:session.media_board||{},livePeerFeedback:await peerRoomsEvidence(admin,session.id),media});
   }
   if(op==='start'){
    requireMethod(req,'POST');guardOrigin(req);guardBody(req,1000);
    if(assignment.status!=='active')throw fail(423,'Nhiệm vụ đã đóng.');
    const now=new Date().toISOString();
    if(!session){
     const created=await query(admin.from('museum_live_sessions').insert({
      assignment_id:assignment.id,owner_id:assignment.created_by,
      school_scope:assignment.school_scope,status:'active',stage_index:0,stage_open:true,
      started_at:now,stage_started_at:now,media_board:curriculumMediaBoard()
     }).select('*').single());
     await query(admin.from('museum_learning_events').insert({
      session_id:created.id,actor_role:'teacher',action:'lesson_started',stage_index:0
     }));
     return send(res,201,{session:stateOf(created,{staff:true})});
    }
    if(session.status==='ended')throw fail(423,'Bài học đã kết thúc. Hãy tạo bài học mới để dạy lại.');
    const resumed=await query(admin.from('museum_live_sessions').update({
     status:'active',stage_open:!(session.stage_index===2&&await surveyFor(admin,session.id)),updated_at:now,version:session.version+1
    }).eq('id',session.id).eq('version',session.version).select('*').single());
    return send(res,200,{session:stateOf(resumed,{staff:true})});
   }
   if(op==='control'){
    requireMethod(req,'POST');guardOrigin(req);
    const body=guardBody(req,1000);
    if(!session)throw fail(404,'Chưa bắt đầu tiết học.');
    if(session.status==='ended')throw fail(423,'Tiết học đã kết thúc.');
    if(!Number.isInteger(body.version)||body.version!==session.version)throw fail(409,'Trạng thái bài dạy đã thay đổi. Hãy cập nhật.');
    const action=String(body.action||''),now=new Date().toISOString();
    const update={updated_at:now,version:session.version+1};
    if(action==='next'||action==='previous'){
     if(action==='next'&&session.evidence_version!==0&&session.stage_index===2&&!await surveyFor(admin,session.id))throw fail(423,'Hãy chốt khảo sát trực tuyến hoặc nhập kiểm phiếu giấy trước khi chuyển hoạt động.');
     const index=session.stage_index+(action==='next'?1:-1);
     if(index<0||index>=LIVE_STAGES.length)throw fail(400,'Hết nội dung bài dạy.');
     Object.assign(update,{stage_index:index,stage_open:!(index===2&&await surveyFor(admin,session.id)),revealed:false,stage_started_at:now,elapsed_seconds:0});
    }else if(action==='open'){if(session.status!=='active')throw fail(423,'Hãy tiếp tục bài dạy.');if(session.stage_index===2&&await surveyFor(admin,session.id))throw fail(423,'Khảo sát đã chốt. Hãy chuyển sang hoạt động tiếp theo.');update.stage_open=true;}
    else if(action==='close')update.stage_open=false;
    else if(action==='reveal')update.revealed=true;
    else if(action==='pause'){
     update.status='paused';update.stage_open=false;
     update.elapsed_seconds=Math.min(7200,(session.elapsed_seconds||0)+Math.max(0,Math.floor((Date.now()-Date.parse(session.stage_started_at))/1000)));
    }
    else if(action==='resume'){update.status='active';update.stage_open=!(session.stage_index===2&&await surveyFor(admin,session.id));update.stage_started_at=now;}
    else if(action==='end'){update.status='ended';update.stage_open=false;}
    else throw fail(400,'Lệnh giảng dạy không hợp lệ.');
    const changed=await query(admin.from('museum_live_sessions').update(update)
      .eq('id',session.id).eq('version',session.version).select('*').maybeSingle());
    if(!changed)throw fail(409,'Có thao tác của giáo viên khác. Hãy cập nhật.');
    await query(admin.from('museum_learning_events').insert({
     session_id:session.id,actor_role:'teacher',action:'stage_'+action,
     stage_index:changed.stage_index
    }));
    return send(res,200,{session:stateOf(changed,{staff:true})});
   }
   if(op==='checkpoint-compare'){
    requireMethod(req,'GET');
    if(!session)throw fail(404,'No live lesson session for this class.');
    const groupId=String(req.query?.groupId||'');
    if(!uid(groupId))throw fail(400,'Invalid class group.');
    const group=await query(admin.from('gcp_groups').select('id,label,assignment_id').eq('id',groupId).single());
    if(group.assignment_id!==assignment.id)throw fail(403,'This group is outside your class.');
    const checkpoints=await query(admin.from('museum_checkpoints').select('*')
     .eq('session_id',session.id).eq('group_id',groupId).in('kind',['before','after'])
     .order('created_at',{ascending:false}).limit(12));
    const before=checkpoints.find(c=>c.kind==='before')||null;
    const after=checkpoints.find(c=>c.kind==='after')||null;
    return send(res,200,{groupLabel:group.label,
     before:before?await checkpointGallery(admin,before,group.label):null,
     after:after?await checkpointGallery(admin,after,group.label):null});
   }
   if(op==='group-gallery'){
    requireMethod(req,'GET');
    const groupId=String(req.query?.groupId||'');
    if(!uid(groupId))throw fail(400,'Nhóm không hợp lệ.');
    const group=await query(admin.from('gcp_groups').select('assignment_id').eq('id',groupId).single());
    if(group.assignment_id!==assignment.id)throw fail(403,'Nhóm thuộc lớp khác.');
    return send(res,200,await groupGallery(admin,groupId));
   }
   return send(res,404,{error:'Không tìm thấy chức năng giáo viên.'});
  }
  // Guest: no registered student account. Cookie is one group capability.
  const writing=['respond','need-help','micro-submit','peer-room-toggle','peer-room-review'].includes(op);
  const ctx=await guestContext(req,admin,{write:writing});
  const session=await getSession(admin,ctx.assignment.id);
  if(op==='state'){
   requireMethod(req,'GET');
   const micro=session&&MICRO_CHALLENGES[session.stage_index]?await query(admin.from('museum_live_micro_responses')
    .select('choice,reason,submitted_at').eq('session_id',session.id)
    .eq('group_id',ctx.group.id).eq('stage_index',session.stage_index).maybeSingle()):null;
   return send(res,200,{session:stateOf(session),micro,groupLabel:ctx.group.label,
    submitted:session?Boolean(await query(admin.from(session.stage_index===7?'museum_peer_reviews':'museum_live_responses').select('session_id').eq('session_id',session.id).eq(session.stage_index===7?'from_group':'group_id',ctx.group.id).match(session.stage_index===7?{}:{stage_index:session.stage_index}).maybeSingle())):false,assignmentTitle:ctx.assignment.title,survey:await surveyFor(admin,session?.id),feedback:await feedbackFor(admin,session?.id,ctx.group.id)});
  }
  if(op==='video-search'){
   requireMethod(req,'GET');
   if(!session||session.status!=='active'||!session.stage_open)throw fail(423,'Hoạt động chưa mở.');
   const task=mediaTask(session);
   if(!task.query)throw fail(423,'Giáo viên chưa giao nhiệm vụ tìm video.');
   if(!searchThrottle('group-'+ctx.group.id))throw fail(429,'Nhóm đã tìm quá nhiều lần. Hãy chờ một phút.');
   const suffix=safeRefinement(req.query?.refine);
   return send(res,200,await searchVideos(task.query+(suffix?' '+suffix:'')));
  }
  if(op==='history'){
   requireMethod(req,'GET');
   const checkpoints=session?await query(admin.from('museum_checkpoints').select('*').eq('session_id',session.id).eq('group_id',ctx.group.id).order('created_at')):[];
   return send(res,200,{checkpoints:await Promise.all(checkpoints.map(c=>checkpointGallery(admin,c,ctx.group.label)))});
  }
  if(op==='results'){
   requireMethod(req,'GET');
   const snapshot=await surveyFor(admin,session?.id);
   if(!snapshot)throw fail(423,'Giáo viên chưa chốt khảo sát.');
   return send(res,200,{results:snapshot,snapshot,source:snapshot.source});
  }
  if(['peer-rooms','peer-room-toggle','peer-room-view','peer-room-review'].includes(op))
   return handleLivePeer({op,req,res,admin,ctx,session});
  if(!session||session.status!=='active'||!session.stage_open)
   throw fail(423,'Chờ giáo viên mở hoạt động.');
  const stage=liveStage(session.stage_index);
  if(op==='micro-submit'){
   requireMethod(req,'POST');const body=guardBody(req,1300);
   if(!validMicroAnswer(session.stage_index,body))throw fail(400,'Hãy chọn một câu và giải thích bằng tiếng Anh (12–450 ký tự).');
   const existing=await query(admin.from('museum_live_micro_responses').select('id')
    .eq('session_id',session.id).eq('group_id',ctx.group.id)
    .eq('stage_index',session.stage_index).maybeSingle());
   if(existing)return send(res,200,{ok:true,alreadySubmitted:true});
   const {error:insertError}=await admin.from('museum_live_micro_responses').insert({
    session_id:session.id,group_id:ctx.group.id,stage_index:session.stage_index,
    choice:body.choice,reason:body.reason.trim()
   });
   if(insertError&&insertError.code!=='23505')throw fail(503,'Không thể lưu hoạt động kiểm tra nhanh.');
   return send(res,insertError?200:201,{ok:true,alreadySubmitted:insertError?.code==='23505'});
  }
  if(op==='respond'){
   requireMethod(req,'POST');const body=guardBody(req,3000);
   if(session.stage_index===7){
    if(!validatePeer(body.value))throw fail(400,'Điền điều đã học, điều cần làm rõ (10–400 ký tự) và mức rõ ràng 1–4.');
    const pair=await query(admin.from('museum_peer_pairs').select('*').eq('session_id',session.id).eq('from_group',ctx.group.id).maybeSingle());
    if(!pair)throw fail(423,'Cần ít nhất hai nhóm có bản thiết kế để phản hồi.');
    const inserted=await admin.from('museum_peer_reviews').insert({session_id:session.id,from_group:ctx.group.id,learned:body.value.learned.trim(),clarify:body.value.clarify.trim(),rating:body.value.rating});
    if(inserted.error&&inserted.error.code!=='23505')throw fail(503,'Không lưu được phản hồi.');
    return send(res,200,{ok:true,alreadySubmitted:inserted.error?.code==='23505',toGroup:pair.to_group,checkpointId:pair.checkpoint_id});
   }
   if(!canRespond(stage)||!validResponse(session.stage_index,body.value))
    throw fail(400,'Câu trả lời không phù hợp hoạt động.');
   const existing=await query(admin.from('museum_live_responses').select('value')
    .eq('session_id',session.id).eq('stage_index',session.stage_index)
    .eq('group_id',ctx.group.id).maybeSingle());
   if(existing)return send(res,200,{ok:true,alreadySubmitted:true});
   const ins=await admin.from('museum_live_responses').insert({
    session_id:session.id,group_id:ctx.group.id,stage_index:session.stage_index,value:body.value
   });
   if(ins.error){
    if(ins.error.code==='23505')return send(res,200,{ok:true,alreadySubmitted:true});
    throw fail(503,'Không lưu được câu trả lời.');
   }
   return send(res,201,{ok:true,stageIndex:session.stage_index,unit:'one group device'});
  }
  if(op==='need-help'){
   requireMethod(req,'POST');guardBody(req,500);
   const since=new Date(Date.now()-5*60*1000).toISOString();
   const n=await admin.from('museum_learning_events').select('id',{head:true,count:'exact'})
    .eq('session_id',session.id).eq('group_id',ctx.group.id)
    .eq('action','need_help').gte('created_at',since);
   if(n.error)throw fail(503,'Không thể gửi tín hiệu.');
   if(n.count>=2)throw fail(429,'Giáo viên đã nhận tín hiệu. Vui lòng chờ.');
   await query(admin.from('museum_learning_events').insert({
    session_id:session.id,group_id:ctx.group.id,actor_role:'group',
    action:'need_help',stage_index:session.stage_index
   }));
   return send(res,200,{ok:true});
  }
  if(op==='peer-gallery'){
   requireMethod(req,'GET');
   if(session.stage_index!==7)throw fail(423,'Chưa đến hoạt động tham quan chéo.');
   const pair=await query(admin.from('museum_peer_pairs').select('*').eq('session_id',session.id).eq('from_group',ctx.group.id).maybeSingle());
   if(!pair)return send(res,200,{gallery:null});
   const checkpoint=await query(admin.from('museum_checkpoints').select('*').eq('id',pair.checkpoint_id).single());
   const group=await query(admin.from('gcp_groups').select('label').eq('id',pair.to_group).single());
   return send(res,200,{gallery:await checkpointGallery(admin,checkpoint,group.label),scope:'live_class_only'});
  }
  return send(res,404,{error:'Không tìm thấy hoạt động nhóm.'});
 }catch(e){return handleError(res,e);}
}
