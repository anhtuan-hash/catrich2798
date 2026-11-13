import {surveyFor,feedbackFor} from './_museumEvidence.js';
import {evidenceMissing,changedExhibits} from '../src/features/immersive-gallery/v3/learningEvidence.js';
// Accountless guest endpoint. Authenticated Brian access is never granted here.
// The only cookie is an opaque, short-lived, group-scoped capability.
import {
 db,digest,randomSecret,fail,send,handleError,guardOrigin,guardBody,query,
 setCookie,clearCookie,guestContext,settings,ipHash,safeEqual,
 normalizeGuestDraft,validateGuestSubmission,requireMethod
} from './_galleryCreator.js';

export default async function galleryGuest(req,res){
 try {
  const operation=String(req.query?.operation||'');
  const admin=db();
  if(operation==='redeem'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,3000);
   const handle=String(body.handle||'').trim();
   const secret=String(body.groupSecret||'');
   if(!/^[A-Za-z0-9_-]{16,80}$/.test(handle)||secret.length<16||secret.length>128)
    throw fail(401,'Mã nhóm không hợp lệ hoặc đã hết hạn.');
   const config=await settings(admin);
   if(!config.enabled)throw fail(423,'Creator Pass chưa được mở.');
   const ip=ipHash(req),since=new Date(Date.now()-15*60*1000).toISOString();
   const handleHash=digest('handle:'+handle);
   const [ipWindow,handleWindow]=await Promise.all([
    admin.from('gcp_redeem_attempts').select('id',{head:true,count:'exact'})
      .eq('ip_hash',ip).gte('occurred_at',since),
    admin.from('gcp_redeem_attempts').select('id',{head:true,count:'exact'})
      .eq('handle_hash',handleHash).gte('occurred_at',since)
   ]);
   if(ipWindow.error||handleWindow.error)throw fail(503,'Hệ thống xác thực tạm thời gián đoạn.');
   if(ipWindow.count>=10||handleWindow.count>=20)
    throw fail(429,'Quá nhiều lần thử. Hãy liên hệ giáo viên.');
   const invite=await query(admin.from('gcp_invites').select('*').eq('handle',handle).maybeSingle());
   const now=Date.now();
   const valid=invite&&!invite.revoked_at&&Date.parse(invite.expires_at)>now&&
    (!invite.locked_until||Date.parse(invite.locked_until)<now)&&
    safeEqual(invite.secret_hash,digest('invite:'+secret));
   await query(admin.from('gcp_redeem_attempts').insert({
    ip_hash:ip,handle_hash:handleHash,succeeded:Boolean(valid)
   }));
   if(!valid){
    if(invite&&!invite.revoked_at){
     const next=Number(invite.failed_attempts||0)+1;
     await admin.from('gcp_invites').update({
      failed_attempts:next,
      locked_until:next>=5?new Date(now+15*60*1000).toISOString():invite.locked_until
     }).eq('id',invite.id);
    }
    throw fail(401,'Mã nhóm không hợp lệ hoặc đã hết hạn.');
   }
   const group=await query(admin.from('gcp_groups').select('*').eq('id',invite.group_id).single());
   const assignment=await query(admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
   if(assignment.archived_at||assignment.status!=='active'||Date.parse(assignment.deadline_at)<=now ||
      ['rejected','published'].includes(group.state))
    throw fail(423,'Nhiệm vụ đã đóng.');
   const active=await admin.from('gcp_sessions').select('token_hash',{head:true,count:'exact'})
    .eq('group_id',group.id).is('revoked_at',null).gt('expires_at',new Date().toISOString());
   if(active.error)throw fail(503,'Không thể tạo phiên.');
   if(active.count>=3)throw fail(429,'Nhóm đã có ba thiết bị đang hoạt động. Hãy nhờ giáo viên làm mới mã.');
   const token=randomSecret(32),csrf=randomSecret(24);
   const expires=Math.min(now+12*60*60*1000,Date.parse(invite.expires_at),Date.parse(assignment.deadline_at));
   await query(admin.from('gcp_sessions').insert({
    token_hash:digest('session:'+token),group_id:group.id,csrf_token:csrf,
    expires_at:new Date(expires).toISOString()
   }));
   // Reset attempt lock after a real successful redemption.
   await admin.from('gcp_invites').update({failed_attempts:0,locked_until:null}).eq('id',invite.id);
   setCookie(res,token,(expires-now)/1000);
   return send(res,200,{ok:true,csrf,groupLabel:group.label,assignmentTitle:assignment.title});
  }

  if(operation==='logout'){
   requireMethod(req,'POST');const ctx=await guestContext(req,admin,{write:true});
   await query(admin.from('gcp_sessions').update({revoked_at:new Date().toISOString()})
    .eq('token_hash',ctx.session.token_hash));
   clearCookie(res);
   return send(res,200,{ok:true});
  }

  if(operation==='me'){
   requireMethod(req,'GET');const ctx=await guestContext(req,admin);
   const {group,assignment,session}=ctx;
   const latest=await query(admin.from('gcp_reviews')
     .select('state,teacher_note,ttcm_note').eq('group_id',group.id)
     .is('archived_at',null).order('submitted_at',{ascending:false}).limit(1).maybeSingle());
   const feedback=latest&&['changes_requested','rejected'].includes(latest.state)
     ?{state:latest.state,teacher:latest.teacher_note,ttcm:latest.ttcm_note}:null;
   return send(res,200,{
    groupLabel:group.label,groupState:group.state,csrf:session.csrf_token,feedback,
    uploadEnabled:(await settings(admin)).upload_enabled===true,
    assignment:{title:assignment.title,brief:assignment.brief,class_scope:assignment.class_scope,
     deadline_at:assignment.deadline_at,max_rooms:assignment.max_rooms,max_exhibits:assignment.max_exhibits}
   });
  }

  if(operation==='draft'){
   requireMethod(req,'GET');const ctx=await guestContext(req,admin);
   const draft=await query(admin.from('gcp_drafts').select('doc,version,updated_at')
    .eq('group_id',ctx.group.id).single());
   return send(res,200,{draft:draft.doc,version:draft.version,updated_at:draft.updated_at});
  }

  if(operation==='save'){
   requireMethod(req,'PUT');const ctx=await guestContext(req,admin,{write:true});
   const body=guardBody(req,100000);
   if(!Number.isInteger(body.expectedVersion)||body.expectedVersion<0)throw fail(400,'Phiên bản không hợp lệ.');
   const doc=normalizeGuestDraft(body.draft,ctx.assignment);
   const live=await query(admin.from('museum_live_sessions')
     .select('id,status,stage_index,stage_open').eq('assignment_id',ctx.assignment.id).maybeSingle());
   if(live&&(!live.stage_open||live.status!=='active'||![3,4,6,7,8,9,10].includes(live.stage_index)))
     throw fail(423,'Giáo viên chưa mở hoạt động chỉnh sửa sản phẩm.');
   if(doc.survey){const frozen=await surveyFor(admin,live?.id);if(!frozen||frozen.id!==doc.survey.id)throw fail(400,'Biểu đồ không thuộc khảo sát của lớp.');doc.survey=frozen;}
   const ids=[...new Set([
    ...Object.values(doc.artworks||{}).filter(Boolean),
    ...doc.rooms.flatMap(r=>r.exhibits||[]).map(e=>e.kind==='image'?e.asset_id:null).filter(Boolean)
   ])];
   if(ids.length){
    const own=await query(admin.from('museum_artwork_assets').select('id')
     .eq('group_id',ctx.group.id).eq('status','private_ready').in('id',ids));
    if(own.length!==ids.length)throw fail(403,'Tranh ảnh không thuộc nhóm hoặc đã bị xóa.');
   }
   const version=await query(admin.rpc('gcp_guest_save',{
    p_group:ctx.group.id,p_expected:body.expectedVersion,p_doc:doc
   }));
   return send(res,200,{ok:true,version});
  }

  if(operation==='submit'){
   requireMethod(req,'POST');const ctx=await guestContext(req,admin,{write:true});
   const body=guardBody(req,2500);
   if(!Number.isInteger(body.expectedVersion)||body.expectedVersion<0)throw fail(400,'Phiên bản không hợp lệ.');
   const d=await query(admin.from('gcp_drafts').select('doc,version').eq('group_id',ctx.group.id).single());
   if(d.version!==body.expectedVersion)throw fail(409,'Bản nháp đã có thay đổi mới.');
   const doc=normalizeGuestDraft(d.doc,ctx.assignment);
   const live=await query(admin.from('museum_live_sessions')
    .select('id,status,stage_index,stage_open').eq('assignment_id',ctx.assignment.id).maybeSingle());
   if(live && (live.status!=='active'||!live.stage_open||live.stage_index!==10))
    throw fail(423,'Hãy đợi giáo viên mở hoạt động nộp bài.');
   if(live&&!doc.rooms.some(r=>r.exhibits.some(e=>e.kind==='image')))
    throw fail(400,'Bảo tàng của nhóm cần tối thiểu một tranh hoặc poster đã tải lên.');
   if(live&&await surveyFor(admin,live.id)){
    const missing=evidenceMissing(doc);
    if(missing.length)throw fail(400,'Cần hoàn thành: '+missing.join(' · '));
    const feedback=await feedbackFor(admin,live.id,ctx.group.id);
    if(!feedback.length)throw fail(400,'Chưa có phản hồi thực tế từ nhóm được phân công.');
    const checkpoints=await query(admin.from('museum_checkpoints').select('kind,doc').eq('session_id',live.id).eq('group_id',ctx.group.id));
    const before=checkpoints.find(c=>c.kind==='before'),after=checkpoints.find(c=>c.kind==='after');
    if(!before||!after||!changedExhibits(before.doc,after.doc).length)throw fail(400,'Cần lưu thay đổi ít nhất một thẻ hoặc ảnh ở hoạt động Cải tiến trước khi chuyển sang Báo cáo.');
   }
   validateGuestSubmission(doc);
   const reviewId=await query(admin.rpc('gcp_guest_submit',{
    p_group:ctx.group.id,p_expected:body.expectedVersion
   }));
   return send(res,200,{ok:true,reviewId,status:'submitted'});
  }

  if(operation==='assets-request-upload'){
   // No binary upload without real malware/EXIF processing and private quarantine QA.
   requireMethod(req,'POST');await guestContext(req,admin,{write:true});
   return send(res,423,{error:'Tải tệp được giữ khóa cho tới khi hoàn thành kiểm duyệt media an toàn.'});
  }
  return send(res,404,{error:'Không tìm thấy hành động Creator Pass.'});
 }catch(error){return handleError(res,error);}
}
