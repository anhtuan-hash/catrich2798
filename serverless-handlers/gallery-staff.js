// Staff-only Creator Pass controls; every action verifies Supabase Auth + canonical profile.
import {createHash} from 'node:crypto';
import {
 db,digest,randomSecret,fail,send,handleError,guardOrigin,guardBody,query,
 settings,staffContext,assertStaff,assertAdmin,reviewer,uid,clean,requireMethod
} from './_galleryCreator.js';
import {PREPARED_COLLECTIONS} from '../src/features/immersive-gallery/v3/museumPreparedCollections.js';

// Copy approved private art into R1's still-private bucket before atomic promotion.
// The SQL publication RPC verifies each link and the immutable TTCM snapshot hash.
async function stageApprovedArt(ctx,scoped){
 const {review,group,assignment}=scoped,admin=ctx.admin;
 if(review.state==='published')return;
 if(review.state!=='approved_locked'||group.state!=='approved_locked')
  throw fail(423,'Bản triển lãm chưa được TTCM duyệt cuối.');
 const ids=[...new Set((review.snapshot?.rooms||[]).flatMap(room=>(room.exhibits||[]))
  .filter(piece=>piece.kind==='image').map(piece=>piece.asset_id))];
 if(ids.length>6)throw fail(400,'Vượt số lượng ảnh đã được duyệt.');
 for(const id of ids){
  if(!uid(id))throw fail(400,'Ảnh trong bản duyệt không hợp lệ.');
  const existing=await query(admin.from('museum_publication_asset_links')
   .select('gallery_asset_id').eq('review_id',review.id).eq('source_asset_id',id).maybeSingle());
  if(existing)continue;
  const src=await query(admin.from('museum_artwork_assets')
   .select('id,storage_path,bytes,sha256,mime,status,group_id')
   .eq('id',id).eq('group_id',group.id).eq('status','private_ready').single());
  if(src.mime!=='image/png'||src.bytes>3200000)throw fail(400,'Ảnh nguồn không hợp lệ.');
  const downloaded=await admin.storage.from('museum-artwork-private').download(src.storage_path);
  if(downloaded.error||!downloaded.data)throw fail(503,'Không tải được ảnh đã được kiểm tra.');
  const buffer=Buffer.from(await downloaded.data.arrayBuffer());
  if(buffer.length!==src.bytes||createHash('sha256').update(buffer).digest('hex')!==src.sha256)
   throw fail(503,'Ảnh nguồn bị thay đổi so với bản kiểm chứng.');
  const target=assignment.created_by+'/museum-approved/'+review.id+'/'+id+'.png';
  let galleryAsset=await query(admin.from('gallery_assets').select('id')
   .eq('path',target).maybeSingle());
  if(!galleryAsset){
   const uploaded=await admin.storage.from('brian-gallery-private').upload(target,buffer,{
    contentType:'image/png',cacheControl:'private, max-age=120',upsert:false
   });
   if(uploaded.error){
    // On a failed prior attempt, only re-use existing object if hash matches.
    const previous=await admin.storage.from('brian-gallery-private').download(target);
    if(previous.error||!previous.data)throw fail(503,'Không thể chuyển ảnh đã duyệt.');
    const bytes=Buffer.from(await previous.data.arrayBuffer());
    if(createHash('sha256').update(bytes).digest('hex')!==src.sha256)throw fail(409,'Ảnh xuất bản trùng tên nhưng không giống nội dung.');
   }
   galleryAsset=await query(admin.from('gallery_assets').insert({
    uploader_id:assignment.created_by,path:target,kind:'image',
    mime_type:'image/png',byte_size:buffer.length
   }).select('id').single());
  }
  await query(admin.from('museum_publication_asset_links').insert({
   review_id:review.id,source_asset_id:id,gallery_asset_id:galleryAsset.id
  }));
 }
}

// Keep the catalogue independent of browser-side Supabase queries. Both the
// already loaded staff dashboard and the exhibition view share this scope.
async function publishedSchoolCatalog(ctx){
 const admin=ctx.admin;
 const enabled=await query(admin.from('gallery_settings').select('enabled')
  .eq('id',true).maybeSingle());
 if(enabled?.enabled!==true)return [];
 const rows=await query(admin.from('gallery_exhibitions')
  .select('id,slug,title,summary,visibility,status,owner_id,accept_submissions,created_at,updated_at,starts_at,ends_at')
  .eq('school_scope',ctx.profile.school).eq('status','published')
  .in('visibility',['school','public']).order('updated_at',{ascending:false}).limit(100));
 const now=Date.now();
 return rows.filter(g=>(!g.starts_at||Date.parse(g.starts_at)<=now)&&
  (!g.ends_at||Date.parse(g.ends_at)>=now))
  .map(({starts_at,ends_at,...row})=>row);
}

async function loadScopedReview(ctx,reviewId){
 if(!uid(reviewId))throw fail(400,'Mã hồ sơ không hợp lệ.');
 const review=await query(ctx.admin.from('gcp_reviews').select('*').eq('id',reviewId).maybeSingle());
 if(!review||review.archived_at)throw fail(404,'Không có hồ sơ.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',review.group_id).single());
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.archived_at||assignment.school_scope!==ctx.profile.school||
    ![assignment.created_by,assignment.reviewer_id].includes(ctx.user.id)&&ctx.role!=='admin')
  throw fail(403,'Không có quyền xem hồ sơ này.');
 return {review,group,assignment};
}
async function loadOwnGroup(ctx,groupId){
 if(!uid(groupId))throw fail(400,'Nhóm không hợp lệ.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',groupId).maybeSingle());
 if(!group)throw fail(404,'Không có nhóm.');
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.archived_at||assignment.school_scope!==ctx.profile.school||
   (assignment.created_by!==ctx.user.id&&ctx.role!=='admin'))throw fail(403,'Không phải giáo viên quản lý nhóm.');
 return {group,assignment};
}

export default async function galleryStaff(req,res){
 try {
  const operation=String(req.query?.operation||'');
  const admin=db();
  const ctx=await staffContext(req,admin);
  assertStaff(ctx);

  // Staff can read only their own school's archived showcase inventory.
  if(operation==='showcase-state'){
   requireMethod(req,'GET');
   const hidden=await query(admin.from('museum_showcase_archives')
    .select('item_kind,item_key').eq('school_scope',ctx.profile.school).limit(500));
   const archivedGalleries=ctx.role==='admin'?await query(admin.from('gallery_exhibitions')
    .select('id,title,summary,status').eq('school_scope',ctx.profile.school)
    .eq('status','archived').order('updated_at',{ascending:false}).limit(100)):[];
   // Provide an authorized, server-side published catalogue so a transient
   // browser settings or Data API read issue does not hide published work.
   const galleryEnabled=(await query(admin.from('gallery_settings')
    .select('enabled').eq('id',true).maybeSingle()))?.enabled===true;
   const publishedGalleries=galleryEnabled?await publishedSchoolCatalog(ctx):[];
   return send(res,200,{
    hiddenCollections:hidden.filter(x=>x.item_kind==='collection').map(x=>x.item_key),
    archivedGalleries,galleryEnabled,publishedGalleries
   });
  }
  if(operation==='showcase-exhibition'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,1100),id=String(body.id||'');
   if(!uid(id))throw fail(400,'Invalid exhibition identifier.');
   // No draft, archived, other-school or time-locked gallery leaves this API.
   const eligible=await publishedSchoolCatalog(ctx);
   if(!eligible.some(g=>g.id===id))throw fail(404,'Published exhibition unavailable.');
   const exhibition=await query(admin.from('gallery_exhibitions').select('*')
    .eq('id',id).eq('school_scope',ctx.profile.school).eq('status','published').single());
   const rooms=await query(admin.from('gallery_rooms').select('*')
    .eq('exhibition_id',id).order('sort_order'));
   const roomIds=rooms.map(r=>r.id);
   const exhibits=roomIds.length?await query(admin.from('gallery_exhibits').select('*')
    .in('room_id',roomIds).eq('status','published').order('created_at')):[];
   const assetIds=[...new Set(exhibits.filter(e=>e.kind==='image'&&uid(e.asset_id))
    .map(e=>e.asset_id))];
   const assets=assetIds.length?await query(admin.from('gallery_assets')
    .select('id,path').in('id',assetIds)):[];
   // Private storage remains private; signed URLs are restricted to this
   // authenticated, same-school published catalogue and expire automatically.
   const signed=await Promise.all(assets.map(async asset=>{
    const result=await admin.storage.from('brian-gallery-private')
     .createSignedUrl(asset.path,600);
    return [asset.id,result.error?'':(result.data?.signedUrl||'')];
   }));
   const links=new Map(signed);
   const hydrated=rooms.map(room=>({...room,
    exhibits:exhibits.filter(e=>e.room_id===room.id).map(e=>({...e,
     image_url:e.kind==='image'?(links.get(e.asset_id)||''):''}))}));
   return send(res,200,{gallery:{...exhibition,rooms:hydrated}});
  }

  if(operation==='archive-exhibition'||operation==='restore-exhibition'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1500);
   const kind=String(body.kind||''),key=String(body.key||'');
   if(kind==='collection'){
    if(!PREPARED_COLLECTIONS.some(c=>c.key===key))throw fail(404,'Unknown prepared collection.');
   }else if(kind==='gallery'){
    if(!uid(key))throw fail(400,'Invalid exhibition identifier.');
    const gallery=await query(admin.from('gallery_exhibitions')
     .select('id,school_scope,status').eq('id',key).maybeSingle());
    if(!gallery||gallery.school_scope!==ctx.profile.school)throw fail(404,'Exhibition not found in your school.');
   }else throw fail(400,'Invalid exhibition type.');
   // One database transaction archives or restores the exhibition, preserving
   // rooms, approved artworks, group submissions, rubric and evidence records.
   const state=await query(admin.rpc('museum_showcase_change',{
    p_kind:kind,p_key:key,p_school:ctx.profile.school,p_actor:ctx.user.id,
    p_archive:operation==='archive-exhibition'
   }));
   return send(res,200,{ok:true,state,kind,key});
  }

  if(operation==='dashboard'){
   requireMethod(req,'GET');
   const grants=await query(admin.from('gcp_reviewer_grants')
     .select('reviewer_id,school_scope,can_publish,active').eq('school_scope',ctx.profile.school)
     .eq('active',true));
   const where=ctx.role==='admin'?null:ctx.user.id;
   let q=admin.from('gcp_assignments').select('*').eq('school_scope',ctx.profile.school)
    .is('archived_at',null).order('created_at',{ascending:false}).limit(100);
   if(where)q=q.or('created_by.eq.'+where+',reviewer_id.eq.'+where);
   const assignments=await query(q);
   const ids=assignments.map(x=>x.id);
   const groups=ids.length?await query(admin.from('gcp_groups').select('*')
     .in('assignment_id',ids).limit(500)):[];
   const groupIds=groups.map(g=>g.id);
   // Only authorized staff can recover invitation *handles*. Never return
   // secret hashes, one-time private passcodes, or guest session tokens.
   const inviteRows=groupIds.length?await query(admin.from('gcp_invites')
     .select('group_id,handle,expires_at,revoked_at').in('group_id',groupIds).limit(500)):[];
   const inviteByGroup=new Map(inviteRows.map(inv=>[inv.group_id,inv]));
   const visibleGroups=groups.map(group=>{
    const invite=inviteByGroup.get(group.id);
    return {...group,invite_handle:invite?.handle||null,
     invite_expires_at:invite?.expires_at||null,invite_revoked:Boolean(invite?.revoked_at)};
   });
   // A completed Exit Ticket is a live answer, never a submitted museum.
   const exitTickets=groupIds.length?await query(admin.from('museum_live_responses')
     .select('group_id,value,created_at').in('group_id',groupIds).eq('stage_index',10).limit(500)):[];
   const reviews=groupIds.length?await query(admin.from('gcp_reviews')
     .select('id,group_id,version,state,teacher_note,ttcm_note,approved_by,approved_at,submitted_at,snapshot_hash,snapshot')
     .in('group_id',groupIds).is('archived_at',null).order('submitted_at',{ascending:false}).limit(500)):[];
   const rubrics=reviews.length?await query(admin.from('gcp_rubric_scores')
     .select('review_id,teacher_id,scores,feedback,updated_at')
     .in('review_id',reviews.map(r=>r.id)).limit(500)):[];
   const reviewerCandidates=ctx.role==='admin'?await query(admin.from('profiles')
    .select('id,full_name,role').eq('school',ctx.profile.school).eq('approved',true).limit(100)):
    grants.length?await query(admin.from('profiles').select('id,full_name,role')
     .in('id',grants.map(g=>g.reviewer_id)).eq('approved',true)):[];
   return send(res,200,{profile:{role:ctx.profile.role,school:ctx.profile.school,id:ctx.user.id},
    creatorSettings:await settings(admin),reviewerCandidates,
    reviewers:grants,rubrics,
    assignments,groups:visibleGroups,reviews,exitTickets,
    publishedGalleries:await publishedSchoolCatalog(ctx)});
  }

  if(operation==='grade-rubric'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,3800);
   const scoped=await loadScopedReview(ctx,body.reviewId);
   if(scoped.assignment.created_by!==ctx.user.id&&ctx.role!=='admin')
    throw fail(403,'Chỉ Admin hoặc người tạo bài được chấm rubric.');
   if(!['submitted','ttcm_review'].includes(scoped.review.state))
     throw fail(423,'Chỉ chấm khi bản nộp đang trong quá trình duyệt.');
   const ceilings={english:40,evidence:20,reasoning:15,design:15,revision:10};
   const raw=body.scores;
   if(!raw||typeof raw!=='object'||Array.isArray(raw)||
       Object.keys(raw).length!==5||
       Object.keys(ceilings).some(key=>!Number.isInteger(raw[key])||raw[key]<0||raw[key]>ceilings[key]))
      throw fail(400,'Điểm rubric phải đủ năm tiêu chí và không vượt điểm tối đa.');
   const feedback=clean(body.feedback,2000);
   await query(admin.from('gcp_rubric_scores').upsert({
    review_id:scoped.review.id,teacher_id:ctx.user.id,
    scores:raw,feedback,updated_at:new Date().toISOString()
   },{onConflict:'review_id'}));
   await query(admin.from('gcp_review_events').insert({
    review_id:scoped.review.id,actor_type:ctx.role==='admin'?'admin':'teacher',actor_id:ctx.user.id,
    action:'rubric_scored',from_state:scoped.review.state,to_state:scoped.review.state,
    note:'Rubric '+Object.values(raw).reduce((n,v)=>n+v,0)+'/100'
   }));
   return send(res,200,{ok:true,total:Object.values(raw).reduce((n,v)=>n+v,0)});
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
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,6000);
   const reviewerId=ctx.user.id; // Admin alone assigns and approves.
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

  if(operation==='admin-decision'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,3500),action=String(body.action||'');
   if(!['approve','return','reject'].includes(action))throw fail(400,'Quyết định không hợp lệ.');
   await loadScopedReview(ctx,body.reviewId);
   const state=await query(admin.rpc('gcp_admin_decide',{
    p_review:body.reviewId,p_actor:ctx.user.id,p_action:action,p_note:clean(body.note,2000)
   }));
   return send(res,200,{ok:true,state});
  }
  if(operation==='archive-review'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000);
   await loadScopedReview(ctx,body.reviewId);
   const state=await query(admin.rpc('gcp_admin_archive_review',{
    p_review:body.reviewId,p_actor:ctx.user.id
   }));
   return send(res,200,{ok:true,state});
  }
  if(operation==='archive-assignment'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000);
   if(!uid(body.assignmentId))throw fail(400,'Mã bài học không hợp lệ.');
   const assignment=await query(admin.from('gcp_assignments')
    .select('id,school_scope,archived_at').eq('id',body.assignmentId).maybeSingle());
   if(!assignment||assignment.archived_at||assignment.school_scope!==ctx.profile.school)
    throw fail(404,'Không có bài học thuộc trường này.');
   const state=await query(admin.rpc('gcp_admin_archive_assignment',{
    p_assignment:body.assignmentId,p_actor:ctx.user.id
   }));
   return send(res,200,{ok:true,state});
  }

  if(operation==='rotate-invite'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
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
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   throw fail(410,'Quy trình TTCM đã kết thúc. Sử dụng Admin duyệt trực tiếp.');
  }

  if(operation==='publish'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000);
   const scoped=await loadScopedReview(ctx,body.reviewId);
   if(scoped.review.approved_by!==ctx.user.id)
    await reviewer(ctx,scoped.assignment.reviewer_id,{publish:true});
   await stageApprovedArt(ctx,scoped);
   // R1's existing publication trigger requires an actual approved Admin.
   // This function uses a privileged, single-transaction promotion of a frozen snapshot.
   const exhibitionId=await query(admin.rpc('gcp_admin_publish',{
    p_review:body.reviewId,p_admin:ctx.user.id
   }));
   return send(res,200,{ok:true,exhibitionId});
  }

  if(operation==='artwork-settings'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1000),enable=body.enabled===true;
   if(enable){
    const feature=await settings(admin);
    if(!feature.enabled)throw fail(423,'Cần bật Creator Pass trước.');
    const {data:bucket,error:storageError}=await admin.storage.getBucket('museum-artwork-private');
    if(storageError||!bucket||bucket.public)throw fail(503,'Kho ảnh riêng tư chưa sẵn sàng.');
    // No reviewer delegation required to enable artwork uploads.
   }
   const updated=await query(admin.from('gcp_settings').update({
    upload_enabled:enable,updated_at:new Date().toISOString()
   }).eq('id',true).select('enabled,upload_enabled').single());
   return send(res,200,{settings:updated});
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
