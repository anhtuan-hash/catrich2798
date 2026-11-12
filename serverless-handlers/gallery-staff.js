// Staff-only Creator Pass controls; every action verifies Supabase Auth + canonical profile.
import {
 db,digest,randomSecret,fail,send,handleError,guardOrigin,guardBody,query,
 settings,staffContext,assertStaff,assertAdmin,reviewer,uid,clean,requireMethod
} from './_galleryCreator.js';

async function loadScopedReview(ctx,reviewId){
 if(!uid(reviewId))throw fail(400,'Mã hồ sơ không hợp lệ.');
 const review=await query(ctx.admin.from('gcp_reviews').select('*').eq('id',reviewId).maybeSingle());
 if(!review)throw fail(404,'Không có hồ sơ.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',review.group_id).single());
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.school_scope!==ctx.profile.school||
    ![assignment.created_by,assignment.reviewer_id].includes(ctx.user.id)&&ctx.role!=='admin')
  throw fail(403,'Không có quyền xem hồ sơ này.');
 return {review,group,assignment};
}
async function loadOwnGroup(ctx,groupId){
 if(!uid(groupId))throw fail(400,'Nhóm không hợp lệ.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',groupId).maybeSingle());
 if(!group)throw fail(404,'Không có nhóm.');
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.school_scope!==ctx.profile.school||
   (assignment.created_by!==ctx.user.id&&ctx.role!=='admin'))throw fail(403,'Không phải giáo viên quản lý nhóm.');
 return {group,assignment};
}

export default async function galleryStaff(req,res){
 try {
  const operation=String(req.query?.operation||'');
  const admin=db();
  const ctx=await staffContext(req,admin);
  assertStaff(ctx);

  if(operation==='dashboard'){
   requireMethod(req,'GET');
   const grants=await query(admin.from('gcp_reviewer_grants')
     .select('reviewer_id,school_scope,can_publish,active').eq('school_scope',ctx.profile.school)
     .eq('active',true));
   const where=ctx.role==='admin'?null:ctx.user.id;
   let q=admin.from('gcp_assignments').select('*').eq('school_scope',ctx.profile.school)
    .order('created_at',{ascending:false}).limit(100);
   if(where)q=q.or('created_by.eq.'+where+',reviewer_id.eq.'+where);
   const assignments=await query(q);
   const ids=assignments.map(x=>x.id);
   const groups=ids.length?await query(admin.from('gcp_groups').select('*')
     .in('assignment_id',ids).limit(500)):[];
   const groupIds=groups.map(g=>g.id);
   const reviews=groupIds.length?await query(admin.from('gcp_reviews')
     .select('id,group_id,version,state,teacher_note,ttcm_note,approved_by,approved_at,submitted_at,snapshot_hash,snapshot')
     .in('group_id',groupIds).order('submitted_at',{ascending:false}).limit(500)):[];
   const reviewerCandidates=ctx.role==='admin'?await query(admin.from('profiles')
    .select('id,full_name,role').eq('school',ctx.profile.school).eq('approved',true).limit(100)):
    grants.length?await query(admin.from('profiles').select('id,full_name,role')
     .in('id',grants.map(g=>g.reviewer_id)).eq('approved',true)):[];
   return send(res,200,{profile:{role:ctx.profile.role,school:ctx.profile.school,id:ctx.user.id},
    creatorSettings:await settings(admin),reviewerCandidates,
    reviewers:grants,
    assignments,groups,reviews});
  }

  if(operation==='grant-reviewer'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,3000);
   const reviewerId=String(body.reviewerId||'');
   if(!uid(reviewerId)||reviewerId===ctx.user.id)throw fail(400,'Tài khoản TTCM cần được chỉ định độc lập.');
   const person=await query(admin.from('profiles').select('id,role,school,approved')
    .eq('id',reviewerId).maybeSingle());
   if(!person||!person.approved||clean(person.school,180)!==ctx.profile.school)
     throw fail(403,'Người duyệt phải là tài khoản Brian đã duyệt cùng trường.');
   const grant=await query(admin.from('gcp_reviewer_grants').upsert({
    reviewer_id:reviewerId,school_scope:ctx.profile.school,
    can_publish:Boolean(body.canPublish),active:true,granted_by:ctx.user.id
   }).select('reviewer_id,school_scope,can_publish,active').single());
   return send(res,200,{grant});
  }

  if(operation==='create-assignment'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,6000);
   const reviewerId=String(body.reviewerId||'');
   await reviewer(ctx,reviewerId,{publish:true});
   if(reviewerId===ctx.user.id)throw fail(403,'Người ra đề không thể tự duyệt cuối.');
   const count=Number(body.groupCount||0);
   if(!Number.isInteger(count)||count<1||count>12)throw fail(400,'Số nhóm phải từ 1 đến 12.');
   const deadline=new Date(body.deadlineAt),now=Date.now();
   if(!Number.isFinite(deadline.getTime())||deadline.getTime()<now+60*60*1000||
      deadline.getTime()>now+120*24*60*60*1000)
    throw fail(400,'Hạn nộp phải nằm trong 1 giờ đến 120 ngày.');
   const title=clean(body.title,140),classScope=clean(body.classScope,120);
   if(title.length<3||classScope.length<2)throw fail(400,'Cần nhập chủ đề và lớp.');
   const enabled=await settings(admin);
   if(!enabled.enabled)throw fail(423,'Creator Pass chưa được bật.');
   const tokens=Array.from({length:count},()=>{
    const handle=randomSecret(15),groupSecret=randomSecret(24);
    return {handle,groupSecret,secret_hash:digest('invite:'+groupSecret)};
   });
   const created=await query(admin.rpc('gcp_staff_issue_assignment',{
    p_teacher:ctx.user.id,p_reviewer:reviewerId,p_school:ctx.profile.school,
    p_class:classScope,p_title:title,p_brief:clean(body.brief,5000),
    p_deadline:deadline.toISOString(),
    p_tokens:tokens.map(x=>({handle:x.handle,secret_hash:x.secret_hash}))
   }));
   const invitations=created.groups.map(g=>({
    ...g,groupSecret:tokens.find(t=>t.handle===g.handle)?.groupSecret
   }));
   // Secrets are returned ONCE; all group rows created in one transaction.
   return send(res,201,{assignment:created.assignment,invitations});
  }

  if(operation==='rotate-invite'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,1000),{group,assignment}=await loadOwnGroup(ctx,body.groupId);
   if(!['issued','editing','changes_requested'].includes(group.state))
    throw fail(423,'Nhóm đã nộp, không thể thay mã tự do.');
   const handle=randomSecret(15),secret=randomSecret(24);
   const now=new Date().toISOString();
   await query(admin.from('gcp_sessions').update({revoked_at:now})
     .eq('group_id',group.id).is('revoked_at',null));
   await query(admin.from('gcp_invites').update({
    handle,secret_hash:digest('invite:'+secret),failed_attempts:0,locked_until:null,
    expires_at:assignment.deadline_at,revoked_at:null
   }).eq('group_id',group.id));
   return send(res,200,{groupId:group.id,handle,groupSecret:secret});
  }

  if(operation==='decision'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,3500);
   const action=String(body.action||'');
   if(!['teacher_forward','teacher_return','ttcm_approve','ttcm_return','ttcm_reject'].includes(action))
    throw fail(400,'Quyết định không hợp lệ.');
   const {assignment}=await loadScopedReview(ctx,body.reviewId);
   if(action.startsWith('ttcm_')) {
    if(assignment.reviewer_id!==ctx.user.id)throw fail(403,'Không phải TTCM được phân công.');
    await reviewer(ctx,ctx.user.id);
   } else if(assignment.created_by!==ctx.user.id)throw fail(403,'Không phải giáo viên phụ trách.');
   const state=await query(admin.rpc('gcp_review_decide',{
    p_review:body.reviewId,p_actor:ctx.user.id,
    p_action:action,p_note:clean(body.note,2000)
   }));
   return send(res,200,{ok:true,state});
  }

  if(operation==='publish'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000);
   const scoped=await loadScopedReview(ctx,body.reviewId);
   await reviewer(ctx,scoped.assignment.reviewer_id,{publish:true});
   // R1's existing publication trigger requires an actual approved Admin.
   // This function uses a privileged, single-transaction promotion of a frozen snapshot.
   const exhibitionId=await query(admin.rpc('gcp_admin_publish',{
    p_review:body.reviewId,p_admin:ctx.user.id
   }));
   return send(res,200,{ok:true,exhibitionId});
  }

  if(operation==='feature-settings'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000);
   // Never allow upload from this pilot without a separate media-security rollout.
   const updated=await query(admin.from('gcp_settings').update({
    enabled:body.enabled===true,upload_enabled:false,updated_at:new Date().toISOString()
   }).eq('id',true).select('enabled,upload_enabled').single());
   return send(res,200,{settings:updated});
  }

  return send(res,404,{error:'Không tìm thấy hành động quản lý Creator Pass.'});
 }catch(error){return handleError(res,error);}
}
