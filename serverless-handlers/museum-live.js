// Teacher-owned live classroom. Accountless student groups reuse Creator Pass cookies.
// Strict class scope, explicit stage transitions, no identity inference, real N group devices.
import {db,fail,send,handleError,guardOrigin,guardBody,guestContext,staffContext,assertStaff,query,uid,clean,requireMethod} from './_galleryCreator.js';
import {LIVE_STAGES,liveStage,validResponse,summarizeResponses} from '../src/features/immersive-gallery/v3/liveLesson.js';
const canRespond=stage=>['vote','quiz','exit','peer'].includes(stage?.kind);
async function scopedStaff(ctx,assignmentId){
 if(!uid(assignmentId))throw fail(400,'Lớp học không hợp lệ.');
 const a=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',assignmentId).single());
 if(a.school_scope!==ctx.profile.school||(a.created_by!==ctx.user.id&&ctx.role!=='admin'))
  throw fail(403,'Không phải giáo viên phụ trách.');
 return a;
}
async function getSession(admin,assignmentId){
 return query(admin.from('museum_live_sessions').select('*').eq('assignment_id',assignmentId).maybeSingle());
}
function publicStage(stage,revealed=false,staff=false){
 if(!stage)return null;
 return {
  id:stage.id,period:stage.period,minutes:stage.minutes,title:stage.title,vi:stage.vi,
  kind:stage.kind,question:stage.question,options:stage.options,
  questions:stage.questions?.map(q=>({...q,answer:staff||revealed?q.answer:null})),
  sentence:stage.sentence,
  ...(staff?{teaching:stage.teaching,expected:stage.expected}:revealed?{expected:stage.expected}:{})
 };
}
function stateOf(s,{staff=false}={}){
 if(!s)return {status:'not_started',stage:null,stageIndex:-1,stageOpen:false};
 return {id:s.id,assignmentId:s.assignment_id,status:s.status,stageIndex:s.stage_index,
  stageOpen:s.stage_open,revealed:s.revealed,version:s.version,
  stageStartedAt:s.stage_started_at,elapsedSeconds:s.elapsed_seconds,updatedAt:s.updated_at,
  stage:publicStage(liveStage(s.stage_index),s.revealed,staff)};
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
    return send(res,200,{session:stateOf(session,{staff:true}),stageCount:LIVE_STAGES.length,
     result:summarizeResponses(session.stage_index,responses.map(r=>({value:r.value}))),
     groups:grp,needHelp:helps.length});
   }
   if(op==='start'){
    requireMethod(req,'POST');guardOrigin(req);guardBody(req,1000);
    if(assignment.status!=='active')throw fail(423,'Nhiệm vụ đã đóng.');
    const now=new Date().toISOString();
    if(!session){
     const created=await query(admin.from('museum_live_sessions').insert({
      assignment_id:assignment.id,owner_id:assignment.created_by,
      school_scope:assignment.school_scope,status:'active',stage_index:0,stage_open:false,
      started_at:now,stage_started_at:now
     }).select('*').single());
     await query(admin.from('museum_learning_events').insert({
      session_id:created.id,actor_role:'teacher',action:'lesson_started',stage_index:0
     }));
     return send(res,201,{session:stateOf(created,{staff:true})});
    }
    if(session.status==='ended')throw fail(423,'Bài học đã kết thúc. Hãy tạo bài học mới để dạy lại.');
    const resumed=await query(admin.from('museum_live_sessions').update({
     status:'active',updated_at:now,version:session.version+1
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
     const index=session.stage_index+(action==='next'?1:-1);
     if(index<0||index>=LIVE_STAGES.length)throw fail(400,'Hết nội dung bài dạy.');
     Object.assign(update,{stage_index:index,stage_open:false,revealed:false,stage_started_at:now,elapsed_seconds:0});
    }else if(action==='open'){if(session.status!=='active')throw fail(423,'Hãy tiếp tục bài dạy.');update.stage_open=true;}
    else if(action==='close')update.stage_open=false;
    else if(action==='reveal')update.revealed=true;
    else if(action==='pause'){
     update.status='paused';update.stage_open=false;
     update.elapsed_seconds=Math.min(7200,(session.elapsed_seconds||0)+Math.max(0,Math.floor((Date.now()-Date.parse(session.stage_started_at))/1000)));
    }
    else if(action==='resume'){update.status='active';update.stage_started_at=now;}
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
  const writing=['respond','need-help'].includes(op);
  const ctx=await guestContext(req,admin,{write:writing});
  const session=await getSession(admin,ctx.assignment.id);
  if(op==='state'){
   requireMethod(req,'GET');
   return send(res,200,{session:stateOf(session),groupLabel:ctx.group.label,
    assignmentTitle:ctx.assignment.title});
  }
  if(!session||session.status!=='active'||!session.stage_open)
   throw fail(423,'Chờ giáo viên mở hoạt động.');
  const stage=liveStage(session.stage_index);
  if(op==='respond'){
   requireMethod(req,'POST');const body=guardBody(req,3000);
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
   const peers=await query(admin.from('gcp_groups')
    .select('id,label').eq('assignment_id',ctx.assignment.id)
    .neq('id',ctx.group.id).order('label').limit(12));
   if(!peers.length)return send(res,200,{gallery:null});
   const chosen=peers[0];
   return send(res,200,{gallery:await groupGallery(admin,chosen.id),scope:'live_class_only'});
  }
  if(op==='results'){
   requireMethod(req,'GET');
   if(session.stage_index<2||(session.stage_index===2&&!session.revealed&&session.stage_open))
    throw fail(423,'Giáo viên chưa công bố biểu đồ khảo sát.');
   const results=await query(admin.from('museum_live_responses').select('value')
    .eq('session_id',session.id).eq('stage_index',2).limit(100));
   return send(res,200,{results:summarizeResponses(2,results),source:'live_group_devices'});
  }
  return send(res,404,{error:'Không tìm thấy hoạt động nhóm.'});
 }catch(e){return handleError(res,e);}
}
