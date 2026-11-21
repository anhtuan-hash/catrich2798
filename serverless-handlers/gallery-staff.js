// Staff-only Creator Pass controls; every action verifies Supabase Auth + canonical profile.
import {createHash} from 'node:crypto';
import {
 db,digest,randomSecret,fail,send,handleError,guardOrigin,guardBody,query,
 settings,staffContext,assertStaff,assertAdmin,reviewer,uid,clean,requireMethod,
 publicMuseumContext,assertActiveMuseumLesson,galleryDatabaseSession,galleryProfileDirectory,
 syncGalleryProfile,signGalleryDisplayImage,creatorPassSecurityReady
} from './_galleryCreator.js';
import {encryptGroupPasscode,decryptGroupPasscode} from './_galleryPasscodes.js';
import {createQuickAccessVerifier} from './_galleryQuickAccess.js';
import {canGradeReviewState} from './_museumRubricPolicy.js';
import {readAseanActivityRecords} from './_museumAsean.js';
import {checkpointGallery} from './_museumEvidence.js';
import {mediaTask} from './_museumLiveMedia.js';
import {isPublicWorkshopGroup,PUBLIC_WORKSHOP_OPERATION} from '../src/features/immersive-gallery/v3/aseanPublicWorkshop.js';

// Copy approved private art into R1's still-private bucket before atomic promotion.
// The SQL publication RPC verifies each link and the immutable TTCM snapshot hash.
import {ASEAN_TEMPLATE,ASEAN_TITLE,ASEAN_RUBRIC,ASEAN_MIN_GROUPS,ASEAN_MAX_GROUPS,aseanPublicKey,isAsean,validAseanGroupCount,validAseanResponse} from '../src/features/immersive-gallery/v3/aseanLesson.js';

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
 const visible=rows.filter(g=>(!g.starts_at||Date.parse(g.starts_at)<=now)&&
  (!g.ends_at||Date.parse(g.ends_at)>=now))
  .map(({starts_at,ends_at,...row})=>row);
 if(!visible.length)return [];
 const assignmentByGallery=await galleryLessonAssignments(ctx,visible.map(gallery=>gallery.id));
 const collections=new Map();
 for(const gallery of visible){
  const {assignment,group}=assignmentByGallery.get(gallery.id)||{};
  if(!isAsean(assignment))continue;
  const collection=collections.get(assignment.id)||{
   ...gallery,id:aseanPublicKey(assignment.id),slug:aseanPublicKey(assignment.id),
   title:assignment.title||ASEAN_TITLE,summary:'Place, Experience and Visitor Advice',lesson_template:ASEAN_TEMPLATE,assignment_id:assignment.id,destinations:[]
  };
  collection.destinations.push({id:gallery.id,title:gallery.title,groupLabel:group.label});
  collections.set(assignment.id,collection);
 }
 for(const collection of collections.values())
  collection.destinations.sort((a,b)=>a.groupLabel.localeCompare(b.groupLabel,'en'));
 return [...collections.values()];
}

async function galleryLessonAssignments(ctx,galleryIds){
 if(!galleryIds.length)return new Map();
 const admin=ctx.admin;
 const links=await query(admin.from('gcp_publication_links').select('group_id,exhibition_id').in('exhibition_id',galleryIds));
 const groups=links.length?await query(admin.from('gcp_groups').select('id,label,assignment_id').in('id',links.map(l=>l.group_id))):[];
 const assignments=groups.length?await query(admin.from('gcp_assignments').select('id,title,lesson_template')
  .in('id',[...new Set(groups.map(g=>g.assignment_id))]).eq('school_scope',ctx.profile.school)):[];
 const groupsById=new Map(groups.map(g=>[g.id,g]));
 const assignmentsById=new Map(assignments.map(a=>[a.id,a]));
 return new Map(links.flatMap(link=>{
  const group=groupsById.get(link.group_id);
  const assignment=assignmentsById.get(group?.assignment_id);
  return assignment?[[link.exhibition_id,{assignment,group}]]:[];
 }));
}

async function loadPublicGroupWorkshop(req,res,admin){
 if(req.method!=='GET')throw fail(403,'The published workshop is view only.');
 const groupId=String(req.query?.groupId||'');
 const section=String(req.query?.section||'');
 if(!uid(groupId)||(section&&section!=='first'))throw fail(404,'Published workshop unavailable.');
 const unavailable=()=>fail(404,'Published workshop unavailable.');
 const ctx=await publicMuseumContext(admin);
 const group=await query(admin.from('gcp_groups').select('id,label,state,assignment_id').eq('id',groupId).maybeSingle());
 if(!group||group.state!=='published')throw unavailable();
 const [assignment,publication]=await Promise.all([
  query(admin.from('gcp_assignments').select('id,title,class_scope,lesson_template,content_frozen_at,archived_at')
   .eq('id',group.assignment_id).eq('school_scope',ctx.profile.school).maybeSingle()),
  query(admin.from('gcp_publication_links').select('review_id,exhibition_id').eq('group_id',group.id).maybeSingle()),
 ]);
 if(!isPublicWorkshopGroup(assignment,group)||!publication)throw unavailable();
 const [catalog,review,session]=await Promise.all([
  publishedSchoolCatalog(ctx),
  query(admin.from('gcp_reviews').select('snapshot,version').eq('id',publication.review_id)
   .eq('group_id',group.id).eq('state','published').is('archived_at',null).maybeSingle()),
  query(admin.from('museum_live_sessions').select('id,status,stage_index,media_board')
   .eq('assignment_id',assignment.id).maybeSingle()),
 ]);
 const collection=catalog.find(gallery=>gallery.assignment_id===assignment.id);
 if(!review||!collection?.destinations.some(item=>item.id===publication.exhibition_id))throw unavailable();

 if(section==='first'){
  if(!session)throw unavailable();
  const checkpoint=await query(admin.from('museum_checkpoints').select('id,group_id,kind,version,doc')
   .eq('session_id',session.id).eq('group_id',group.id).eq('kind','before').maybeSingle());
  if(!checkpoint||checkpoint.doc?.checkpointOrigin!=='reconstructed_reference')throw unavailable();
  const {draft,artworks}=await checkpointGallery(admin,checkpoint,group.label);
  return send(res,200,{draft,assets:artworks.map(({id,image_url})=>({id,image_url}))});
 }

 const [records,assetLinks]=await Promise.all([
  readAseanActivityRecords(admin,{group,assignment},session,{publicView:true}),
  query(admin.from('museum_publication_asset_links').select('source_asset_id,gallery_asset_id')
   .eq('review_id',publication.review_id)),
 ]);
 const approvedAssets=new Set(Object.values(review.snapshot?.artworks||{}));
 const links=assetLinks.filter(link=>approvedAssets.has(link.source_asset_id));
 const files=links.length?await query(admin.from('gallery_assets').select('id,path')
  .in('id',links.map(link=>link.gallery_asset_id))):[];
 const paths=new Map(files.map(file=>[file.id,file.path]));
 const assets=await Promise.all(links.map(async link=>{
  const path=paths.get(link.gallery_asset_id);
  if(!path)return null;
  const imageUrl=await signGalleryDisplayImage(admin,{id:link.gallery_asset_id,path},'gallery',600);
  return imageUrl?{id:link.source_asset_id,image_url:imageUrl}:null;
 }));
 return send(res,200,{
  assignment,groupLabel:group.label,draft:review.snapshot,version:review.version,records,
  assets:assets.filter(Boolean),
  live:session?{id:session.id,status:session.status,stageIndex:session.stage_index,media:mediaTask(session)}:null,
 });
}

async function loadScopedReview(ctx,reviewId){
 if(!uid(reviewId))throw fail(400,'Mã hồ sơ không hợp lệ.');
 const review=await query(ctx.admin.from('gcp_reviews').select('*').eq('id',reviewId).maybeSingle());
 if(!review||review.archived_at)throw fail(404,'Không có hồ sơ.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',review.group_id).single());
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 assertActiveMuseumLesson(assignment);
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
 assertActiveMuseumLesson(assignment);
 if(assignment.archived_at||assignment.school_scope!==ctx.profile.school||
   (assignment.created_by!==ctx.user.id&&ctx.role!=='admin'))throw fail(403,'Không phải giáo viên quản lý nhóm.');
 return {group,assignment};
}

const rubricCeilings={english:40,evidence:20,reasoning:15,design:15,revision:10};
const aseanCeilings=Object.fromEntries(ASEAN_RUBRIC.map(({key,max})=>[key,max]));
function validateRubricScores(raw,assignment){
 const ceilings=isAsean(assignment)?aseanCeilings:rubricCeilings;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    Object.keys(raw).length!==Object.keys(ceilings).length||
    Object.keys(ceilings).some(key=>!Number.isInteger(raw[key])||raw[key]<0||raw[key]>ceilings[key]))
  throw fail(400,'Each rubric score must be a whole number within its allowed range.');
 return raw;
}

export default async function galleryStaff(req,res){
 try {
  const operation=String(req.query?.operation||'');
  const admin=db();
  if(operation==='database-session'){
   requireMethod(req,'POST');guardOrigin(req);
   return send(res,200,await galleryDatabaseSession(req,admin));
  }
  if(operation===PUBLIC_WORKSHOP_OPERATION)return await loadPublicGroupWorkshop(req,res,admin);
  const bearer=String(req.headers?.authorization||'');
  const hasBearer=/^Bearer\s+\S{40,}$/i.test(bearer);
  const publicGet=new Set(['dashboard','showcase-state']);
  const publicPost=new Set(['showcase-exhibition']);
  let ctx;
  if(!hasBearer){
   if((req.method==='GET'&&publicGet.has(operation))||(req.method==='POST'&&publicPost.has(operation)))
    ctx=await publicMuseumContext(admin);
   else throw fail(403,'Public visitors can browse this museum, but cannot add, edit, or delete.');
  }else{
   ctx=await staffContext(req,admin);
   assertStaff(ctx);
  }

  // Check completion before privileged RPCs or storage side effects.
  // Database triggers also enforce the classroom lock.
  const frozenMutations=new Set([
   'quick-access-setting','regenerate-all-passcodes','grade-rubric',
   'admin-decision','archive-review','archive-assignment','rotate-invite',
   'publish','archive-exhibition','restore-exhibition'
  ]);
  if(req.method==='POST'&&frozenMutations.has(operation)){
   const body=req.body&&typeof req.body==='object'?req.body:{};
   let assignmentId=String(body.assignmentId||'');
   if(!assignmentId&&uid(String(body.groupId||''))){
    const g=await query(admin.from('gcp_groups').select('assignment_id').eq('id',body.groupId).maybeSingle());
    assignmentId=g?.assignment_id||'';
   }
   if(!assignmentId&&uid(String(body.reviewId||''))){
    const review=await query(admin.from('gcp_reviews').select('group_id').eq('id',body.reviewId).maybeSingle());
    if(review){
     const g=await query(admin.from('gcp_groups').select('assignment_id').eq('id',review.group_id).maybeSingle());
     assignmentId=g?.assignment_id||'';
    }
   }
   if(!assignmentId&&body.kind==='gallery'&&uid(String(body.key||''))){
    const link=await query(admin.from('gcp_publication_links').select('group_id')
     .eq('exhibition_id',body.key).limit(1).maybeSingle());
    if(link){
     const g=await query(admin.from('gcp_groups').select('assignment_id').eq('id',link.group_id).maybeSingle());
     assignmentId=g?.assignment_id||'';
    }
   }
   if(uid(assignmentId)){
    const target=await query(admin.from('gcp_assignments').select('content_frozen_at,lesson_template')
     .eq('id',assignmentId).maybeSingle());
    if(target)assertActiveMuseumLesson(target);
    if(target?.content_frozen_at)throw fail(423,'This lesson has been finalized and is view-only. Edits, reviews, passcode resets and deletion are disabled.');
   }
  }

  // Staff can read only their own school's archived showcase inventory.
  if(operation==='showcase-state'){
   requireMethod(req,'GET');
   const archived=ctx.role==='admin'?await query(admin.from('gallery_exhibitions')
    .select('id,title,summary,status').eq('school_scope',ctx.profile.school)
    .eq('status','archived').order('updated_at',{ascending:false}).limit(100)):[];
   const archivedScopes=await galleryLessonAssignments(ctx,archived.map(gallery=>gallery.id));
   const archivedGalleries=archived.flatMap(gallery=>{
    const assignment=archivedScopes.get(gallery.id)?.assignment;
    return isAsean(assignment)?[{...gallery,lesson_template:assignment.lesson_template,assignment_id:assignment.id}]:[];
   });
   // Provide an authorized, server-side published catalogue so a transient
   // browser settings or Data API read issue does not hide published work.
   const galleryEnabled=(await query(admin.from('gallery_settings')
    .select('enabled').eq('id',true).maybeSingle()))?.enabled===true;
   const publishedGalleries=galleryEnabled?await publishedSchoolCatalog(ctx):[];
   return send(res,200,{
    hiddenCollections:[],
    archivedGalleries,galleryEnabled,publishedGalleries
   });
  }
  if(operation==='showcase-exhibition'){
   requireMethod(req,'POST');guardOrigin(req);
   const body=guardBody(req,1100),id=String(body.id||'');
   if(!uid(id)&&!(id.startsWith('asean-')&&uid(id.slice(6))))throw fail(400,'Invalid exhibition identifier.');
   // No draft, archived, other-school or time-locked gallery leaves this API.
   const eligible=await publishedSchoolCatalog(ctx);
   const collection=eligible.find(item=>item.id===id&&isAsean(item));
   const child=eligible.find(item=>item.destinations?.some(destination=>destination.id===id));
   if(!collection&&!child&&!eligible.some(g=>g.id===id))throw fail(404,'Published exhibition unavailable.');
   const exhibitions=collection?collection.destinations.map(destination=>destination.id):[id];
   const exhibition=collection||await query(admin.from('gallery_exhibitions').select('*')
    .eq('id',id).eq('school_scope',ctx.profile.school).eq('status','published').single());
   if(child)exhibition.lesson_template=ASEAN_TEMPLATE;
   const fetchedRooms=await query(admin.from('gallery_rooms').select('*').in('exhibition_id',exhibitions).order('sort_order'));
   const rooms=collection?exhibitions.flatMap(galleryId=>fetchedRooms.filter(room=>room.exhibition_id===galleryId)):fetchedRooms;
   const roomIds=rooms.map(r=>r.id);
   const exhibits=roomIds.length?await query(admin.from('gallery_exhibits').select('*')
    .in('room_id',roomIds).eq('status','published').order('created_at')):[];
   const assetIds=[...new Set(exhibits.filter(e=>e.kind==='image'&&uid(e.asset_id))
    .map(e=>e.asset_id))];
   const assets=assetIds.length?await query(admin.from('gallery_assets')
    .select('id,path').in('id',assetIds)):[];
   // Private storage remains private; signed URLs are restricted to this
   // authenticated, same-school published catalogue and expire automatically.
   const signed=await Promise.all(assets.map(async asset=>
    [asset.id,await signGalleryDisplayImage(admin,asset,'gallery',600)]));
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
   if(kind==='gallery'){
    if(!uid(key))throw fail(400,'Invalid exhibition identifier.');
    const gallery=await query(admin.from('gallery_exhibitions')
     .select('id,school_scope,status').eq('id',key).maybeSingle());
    if(!gallery||gallery.school_scope!==ctx.profile.school)throw fail(404,'Exhibition not found in your school.');
    const assignment=(await galleryLessonAssignments(ctx,[key])).get(key)?.assignment;
    assertActiveMuseumLesson(assignment);
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
   const grants=ctx.publicReadOnly?[]:await query(admin.from('gcp_reviewer_grants')
     .select('reviewer_id,school_scope,can_publish,active').eq('school_scope',ctx.profile.school)
     .eq('active',true));
   const where=(ctx.role==='admin'||ctx.publicReadOnly)?null:ctx.user.id;
   let q=admin.from('gcp_assignments').select('*').eq('school_scope',ctx.profile.school)
    .eq('lesson_template',ASEAN_TEMPLATE).is('archived_at',null).order('created_at',{ascending:false}).limit(100);
   if(where)q=q.or('created_by.eq.'+where+',reviewer_id.eq.'+where);
   const assignments=await query(q);
   const ids=assignments.map(x=>x.id);
   const quickRows=!ctx.publicReadOnly&&ids.length?await query(admin.from('gcp_quick_access')
    .select('assignment_id,enabled').in('assignment_id',ids).limit(100)):[];
   const quickByAssignment=new Map(quickRows.map(x=>[x.assignment_id,x.enabled]));
   const visibleAssignments=assignments.map(a=>{
    if(!ctx.publicReadOnly)return {...a,quick_access_enabled:quickByAssignment.get(a.id)===true};
    const {created_by,reviewer_id,...lesson}=a;
    return lesson;
   });
   const groups=ids.length?await query(admin.from('gcp_groups').select('*')
     .in('assignment_id',ids).limit(500)):[];
   const groupIds=groups.map(g=>g.id);
   // Only authorized staff can recover invitation *handles*. Never return
   // secret hashes, one-time private passcodes, or guest session tokens.
   const inviteRows=!ctx.publicReadOnly&&groupIds.length?await query(admin.from('gcp_invites')
     .select('group_id,handle,expires_at,revoked_at,secret_envelope').in('group_id',groupIds).limit(500)):[];
   const inviteByGroup=new Map(inviteRows.map(inv=>[inv.group_id,inv]));
   const visibleGroups=groups.map(group=>{
    const invite=inviteByGroup.get(group.id);
    return {...group,invite_handle:invite?.handle||null,
     invite_expires_at:invite?.expires_at||null,invite_revoked:Boolean(invite?.revoked_at),
     invite_has_passcode:Boolean(invite?.secret_envelope)};
   });
   // A completed Exit Ticket is a live answer, never a submitted museum.
   const exitTickets=groupIds.length?await query(admin.from('museum_live_responses')
     .select('group_id,value,created_at').in('group_id',groupIds).eq('stage_index',10).limit(500)):[];
   const allReviews=groupIds.length?await query(admin.from('gcp_reviews')
     .select(ctx.publicReadOnly?'id,group_id,version,state,teacher_note,snapshot':
      'id,group_id,version,state,teacher_note,ttcm_note,approved_by,approved_at,submitted_at,snapshot_hash,snapshot')
     .in('group_id',groupIds).is('archived_at',null).order('submitted_at',{ascending:false}).limit(500)):[];
   const assignmentById=new Map(assignments.map(item=>[item.id,item]));
   const publishedGalleries=await publishedSchoolCatalog(ctx);
   const reviews=allReviews.filter(row=>!ctx.publicReadOnly||row.state==='published');
   const publishedReviewGroups=new Set(reviews.filter(row=>row.state==='published').map(row=>row.group_id));
   const visibleDestinations=new Map(publishedGalleries.map(gallery=>[
    gallery.assignment_id,new Set(gallery.destinations.map(destination=>destination.groupLabel)),
   ]));
   // Publish only recorded learning evidence from frozen lessons and groups
   // with a published review and a currently visible exhibition room.
   const aseanGroupIds=groups.filter(group=>{
    const assignment=assignmentById.get(group.assignment_id);
    return isAsean(assignment)&&(!ctx.publicReadOnly||(
     assignment.content_frozen_at&&publishedReviewGroups.has(group.id)&&
     visibleDestinations.get(group.assignment_id)?.has(group.label)
    ));
   }).map(group=>group.id);
   const [responseRows,writingRows]=aseanGroupIds.length?await Promise.all([
    query(admin.from('museum_live_responses')
     .select(ctx.publicReadOnly?'group_id,stage_index,value':'group_id,stage_index,value,created_at')
     .in('group_id',aseanGroupIds).in('stage_index',[0,1,3,4,5]).limit(2500)),
    query(admin.from('museum_learning_events')
     .select('group_id,stage_index,details').eq('action','asean_writing_grade').in('group_id',aseanGroupIds)
     .order('created_at',{ascending:false}).limit(2500)),
   ]):[[],[]];
   const aseanResponses=ctx.publicReadOnly?responseRows.filter(row=>validAseanResponse(row.stage_index,row.value)):responseRows;
   const aseanWritingScores=ctx.publicReadOnly?writingRows.flatMap(({group_id,stage_index,details})=>{
    const {experience,advice}=details||{};
    return [0,5].includes(stage_index)&&[0,1].includes(experience)&&[0,1].includes(advice)
     ?[{group_id,stage_index,details:{experience,advice}}]:[];
   }):writingRows;
   const rubricReviewIds=reviews.filter(review=>!ctx.publicReadOnly||review.state==='published').map(review=>review.id);
   const rubricRows=rubricReviewIds.length?await query(admin.from('gcp_rubric_scores')
     .select(ctx.publicReadOnly?'review_id,scores':'review_id,teacher_id,scores,feedback,updated_at')
     .in('review_id',rubricReviewIds).limit(500)):[];
   const aseanReviewIds=new Set(reviews.filter(row=>aseanGroupIds.includes(row.group_id)).map(row=>row.id));
   const rubrics=ctx.publicReadOnly?rubricRows.map(row=>{
    const keys=aseanReviewIds.has(row.review_id)?Object.keys(aseanCeilings):Object.keys(rubricCeilings);
    return {...row,scores:Object.fromEntries(keys.map(key=>[key,row.scores?.[key]]))};
   }):rubricRows;
   const directory=galleryProfileDirectory(admin);
   const reviewerCandidates=ctx.role==='admin'?await query(directory.from('profiles')
    .select('id,full_name,role').eq('school',ctx.profile.school).eq('approved',true).limit(100)):
    grants.length?await query(directory.from('profiles').select('id,full_name,role')
     .in('id',grants.map(g=>g.reviewer_id)).eq('approved',true)):[];
   const profile={role:ctx.publicReadOnly?'viewer':ctx.profile.role,school:ctx.profile.school,id:ctx.user.id};
   if(!ctx.publicReadOnly)profile.full_name=ctx.profile.full_name;
   const creatorSettings=await settings(admin);
   if(ctx.role==='admin')creatorSettings.group_codes_ready=creatorPassSecurityReady();
   return send(res,200,{profile,
    publicReadOnly:ctx.publicReadOnly===true,
    creatorSettings,reviewerCandidates,
    reviewers:grants,rubrics,
    assignments:visibleAssignments,groups:visibleGroups,reviews,exitTickets,aseanResponses,aseanWritingScores,
    publishedGalleries});
  }

  // Enable only for an approved Admin's own active lesson. The default
  // PEK123 verifier is a salted PBKDF2 hash; never stored or returned plaintext.
  if(operation==='quick-access-setting'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1100),assignmentId=String(body.assignmentId||'');
   if(!uid(assignmentId)||typeof body.enabled!=='boolean')throw fail(400,'Invalid classroom setting.');
   const assignment=await query(admin.from('gcp_assignments')
    .select('id,created_by,school_scope,archived_at,status')
    .eq('id',assignmentId).maybeSingle());
   if(!assignment||assignment.archived_at||assignment.status!=='active')
    throw fail(404,'Active lesson not found.');
   if(assignment.school_scope!==ctx.profile.school||assignment.created_by!==ctx.user.id)
    throw fail(403,'Only the lesson owner may change classroom access.');
   const enabled=body.enabled;
   if(enabled){
    const config=await settings(admin);
    if(!config.enabled)throw fail(423,'Enable Student Creator Pass first.');
    const verifier=createQuickAccessVerifier();
    await query(admin.from('gcp_quick_access').upsert({
     assignment_id:assignment.id,enabled:true,...verifier,updated_at:new Date().toISOString()
    },{onConflict:'assignment_id'}));
   }else{
    await query(admin.from('gcp_quick_access').update({enabled:false,updated_at:new Date().toISOString()})
     .eq('assignment_id',assignment.id));
    const groupRows=await query(admin.from('gcp_groups').select('id').eq('assignment_id',assignment.id).limit(12));
    if(groupRows.length)await query(admin.from('gcp_sessions').update({revoked_at:new Date().toISOString()})
     .in('group_id',groupRows.map(x=>x.id)).eq('auth_method','quick').is('revoked_at',null));
   }
   return send(res,200,{assignmentId:assignment.id,enabled});
  }

  // Passcodes are never included in the regular dashboard or visible to staff.
  // A deliberate admin-only POST is needed to decrypt them.
  if(operation==='reveal-passcodes'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1200),assignmentId=String(body.assignmentId||'');
   if(!uid(assignmentId))throw fail(400,'Invalid lesson.');
   const assignment=await query(admin.from('gcp_assignments')
     .select('id,school_scope,created_by,archived_at,lesson_template').eq('id',assignmentId).maybeSingle());
   assertActiveMuseumLesson(assignment);
   if(!assignment||assignment.archived_at||assignment.school_scope!==ctx.profile.school||
      assignment.created_by!==ctx.user.id)throw fail(403,'You cannot reveal these group passcodes.');
   const groupRows=await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',assignmentId).limit(12));
   const invites=groupRows.length?await query(admin.from('gcp_invites')
     .select('group_id,handle,secret_envelope').in('group_id',groupRows.map(g=>g.id)).limit(12)):[];
   const safeInvites=new Map(invites.map(x=>[x.group_id,x]));
   return send(res,200,{assignmentId,passcodes:groupRows.map(g=>{
    const inv=safeInvites.get(g.id);
    return {groupId:g.id,label:g.label,groupSecret:inv?.secret_envelope?
       decryptGroupPasscode(inv.secret_envelope,inv.handle):null};
   })});
  }

  // Atomic bulk reset: old sessions are revoked, original QR handles preserved,
  // and existing student work and publication statuses are not changed.
  if(operation==='regenerate-all-passcodes'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,1200),assignmentId=String(body.assignmentId||'');
   if(!uid(assignmentId))throw fail(400,'Invalid lesson.');
   const assignment=await query(admin.from('gcp_assignments')
     .select('id,school_scope,created_by,status,archived_at')
     .eq('id',assignmentId).maybeSingle());
   if(!assignment||assignment.archived_at||assignment.status!=='active')
    throw fail(423,'This lesson is no longer active.');
   if(assignment.school_scope!==ctx.profile.school||assignment.created_by!==ctx.user.id)
    throw fail(403,'You cannot regenerate these group passcodes.');
   const groupRows=await query(admin.from('gcp_groups')
     .select('id,label').eq('assignment_id',assignmentId).limit(13));
   if(!groupRows.length||groupRows.length>12)throw fail(400,'Invalid group count.');
   const invites=await query(admin.from('gcp_invites')
     .select('group_id,handle,revoked_at').in('group_id',groupRows.map(g=>g.id)).limit(13));
   const byGroup=new Map(invites.map(x=>[x.group_id,x]));
   const generated=groupRows.map(g=>{
    const inv=byGroup.get(g.id);
    if(!inv||inv.revoked_at)throw fail(409,'A group invitation is unavailable. Refresh the lesson.');
    const secret=randomSecret(24);
    return {groupId:g.id,label:g.label,handle:inv.handle,groupSecret:secret,
     secret_hash:digest('invite:'+secret),secret_envelope:encryptGroupPasscode(secret,inv.handle)};
   });
   const result=await query(admin.rpc('gcp_admin_rotate_assignment_passcodes',{
    p_assignment:assignmentId,p_actor:ctx.user.id,p_school:ctx.profile.school,
    p_tokens:generated.map(x=>({groupId:x.groupId,secret_hash:x.secret_hash,secret_envelope:x.secret_envelope}))
   }));
   if(result?.updated!==generated.length)throw fail(409,'The group reset could not be verified.');
   return send(res,200,{assignmentId,count:generated.length,
    passcodes:generated.map(({groupId,label,groupSecret})=>({groupId,label,groupSecret}))});
  }

  if(operation==='grade-rubric'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,3800);
   const scoped=await loadScopedReview(ctx,body.reviewId);
   if(scoped.assignment.created_by!==ctx.user.id&&ctx.role!=='admin')
    throw fail(403,'Chỉ Admin hoặc người tạo bài được chấm rubric.');
   // A published/approved museum is immutable to students, but Admin can
   // record or revise the independent teaching rubric without unpublishing it.
   if(!canGradeReviewState(scoped.review.state))
     throw fail(423,'The submission cannot be graded in its current state.');
   const raw=validateRubricScores(body.scores,scoped.assignment);
   const feedback=clean(body.feedback,2000);
   await query(admin.from('gcp_rubric_scores').upsert({
    review_id:scoped.review.id,teacher_id:ctx.user.id,
    scores:raw,feedback,updated_at:new Date().toISOString()
   },{onConflict:'review_id'}));
   await query(admin.from('gcp_review_events').insert({
    review_id:scoped.review.id,actor_type:ctx.role==='admin'?'admin':'teacher',actor_id:ctx.user.id,
    action:'rubric_scored',from_state:scoped.review.state,to_state:scoped.review.state,
    note:'Rubric '+Object.values(raw).reduce((n,v)=>n+v,0)+'/'+(isAsean(scoped.assignment)?10:100)
   }));
   return send(res,200,{ok:true,total:Object.values(raw).reduce((n,v)=>n+v,0)});
  }

  if(operation==='grant-reviewer'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,3000);
   const reviewerId=String(body.reviewerId||'');
   if(!uid(reviewerId)||reviewerId===ctx.user.id)throw fail(400,'Tài khoản TTCM cần được chỉ định độc lập.');
   const person=await query(galleryProfileDirectory(admin).from('profiles').select('id,role,school,approved,full_name')
    .eq('id',reviewerId).maybeSingle());
   if(!person||!person.approved||clean(person.school,180)!==ctx.profile.school)
     throw fail(403,'Người duyệt phải là tài khoản Brian đã duyệt cùng trường.');
   await syncGalleryProfile(admin,person);
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
   const template=body.lessonTemplate??ASEAN_TEMPLATE;
   if(template!==ASEAN_TEMPLATE)throw fail(400,'Unknown lesson template.');
   const count=Number(body.groupCount||0);
   if(!validAseanGroupCount(count))throw fail(400,`Chọn từ ${ASEAN_MIN_GROUPS} đến ${ASEAN_MAX_GROUPS} nhóm.`);
   const deadline=new Date(body.deadlineAt),now=Date.now();
   if(!Number.isFinite(deadline.getTime())||deadline.getTime()<now+60*60*1000||
      deadline.getTime()>now+120*24*60*60*1000)
    throw fail(400,'Hạn nộp phải nằm trong 1 giờ đến 120 ngày.');
   const title=clean(body.title,140),classScope=clean(body.classScope,120);
   if(title.length<3||classScope.length<2)throw fail(400,'Cần nhập chủ đề và lớp.');
   const enabled=await settings(admin);
   if(!enabled.enabled)return send(res,423,{
    code:'creator_pass_disabled',error:'Student Creator Pass is turned off.'
   });
   if(!creatorPassSecurityReady())return send(res,503,{
    code:'creator_pass_not_configured',error:'The server has not been configured to generate group codes.'
   });
   const tokens=Array.from({length:count},()=>{
    const handle=randomSecret(15),groupSecret=randomSecret(24);
    return {handle,groupSecret,secret_hash:digest('invite:'+groupSecret),
     secret_envelope:encryptGroupPasscode(groupSecret,handle)};
   });
   const created=await query(admin.rpc('museum_issue_templated_assignment',{
    p_template:template,
    p_teacher:ctx.user.id,p_reviewer:reviewerId,p_school:ctx.profile.school,
    p_class:classScope,p_title:title,p_brief:clean(body.brief,5000),
    p_deadline:deadline.toISOString(),
    p_tokens:tokens.map(x=>({handle:x.handle,secret_hash:x.secret_hash,secret_envelope:x.secret_envelope}))
   }));
   const invitations=created.groups.map(g=>({
    ...g,groupSecret:tokens.find(t=>t.handle===g.handle)?.groupSecret
   }));
   // Secrets are returned ONCE; all group rows created in one transaction.
   return send(res,201,{assignment:created.assignment,invitations});
  }

  if(operation==='admin-decision'){
   requireMethod(req,'POST');guardOrigin(req);assertAdmin(ctx);
   const body=guardBody(req,6000),action=String(body.action||'');
   if(!['approve','return','reject'].includes(action))throw fail(400,'Quyết định không hợp lệ.');
   const scoped=await loadScopedReview(ctx,body.reviewId);
   const decision={p_review:body.reviewId,p_actor:ctx.user.id,p_note:clean(body.note,2000)};
   let state;
   if(action==='approve'&&body.rubric){
    const {scores,expectedUpdatedAt}=body.rubric;
    if(expectedUpdatedAt!==null&&(typeof expectedUpdatedAt!=='string'||!Number.isFinite(Date.parse(expectedUpdatedAt))))
     throw fail(400,'Invalid rubric revision. Reload the submission and try again.');
    state=await query(admin.rpc('gcp_admin_approve_with_rubric',{
     ...decision,p_scores:validateRubricScores(scores,scoped.assignment),p_expected_updated_at:expectedUpdatedAt
    }));
   }else{
    state=await query(admin.rpc('gcp_admin_decide',{...decision,p_action:action}));
   }
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
    handle,secret_hash:digest('invite:'+secret),
    secret_envelope:encryptGroupPasscode(secret,handle),failed_attempts:0,locked_until:null,
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
