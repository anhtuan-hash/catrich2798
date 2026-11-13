// Classroom-only, student-initiated live peer feedback. Server-side Creator Pass scope
// and private storage are mandatory; never expose an invite to the public web.
import {fail,send,guardBody,requireMethod,query,uid} from './_galleryCreator.js';
import {checkpointGallery} from './_museumEvidence.js';
import {validatePeer} from '../src/features/immersive-gallery/v3/learningEvidence.js';
import {exhibitField} from '../src/features/immersive-gallery/v3/museumExhibitInsights.js';

const allowedFocus=new Set(['issue','evidence','solution']);
const inPeerStage=s=>Boolean(s&&s.status==='active'&&s.stage_open===true&&s.stage_index>=7&&s.stage_index<=9);
const requirePeerStage=s=>{if(!inPeerStage(s))throw fail(423,'Peer feedback is available only during the open Test, Revise or Present activity.');};
const roomIdOf=x=>{const id=String(x||'');if(!uid(id))throw fail(400,'Invalid feedback room.');return id;};
export async function peerRoomsEvidence(admin,sessionId){
 const rooms=await query(admin.from('museum_peer_live_rooms').select('id,session_id,owner_group_id,draft_version,is_open,created_at').eq('session_id',sessionId));
 const reviews=rooms.length?await query(admin.from('museum_peer_live_feedback').select('room_id,from_group_id,learned,clarify,rating,target_exhibit,created_at').in('room_id',rooms.map(r=>r.id))):[];
 return {rooms,reviews};
}
export async function handleLivePeer({op,req,res,admin,ctx,session}){
 if(op==='peer-rooms'){
  requireMethod(req,'GET');
  if(!session||session.stage_index<7)return send(res,200,{rooms:[],mine:null,received:[]});
  const rows=await query(admin.from('museum_peer_live_rooms')
   .select('id,owner_group_id,is_open,draft_version,created_at,draft_snapshot')
   .eq('session_id',session.id).order('created_at',{ascending:true}).limit(100));
  const owners=await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',ctx.assignment.id).limit(100));
  const labels=new Map(owners.map(g=>[g.id,g.label]));
  const reviews=rows.length?await query(admin.from('museum_peer_live_feedback')
   .select('room_id,from_group_id,learned,clarify,rating,target_exhibit,created_at')
   .in('room_id',rows.map(r=>r.id)).limit(500)):[];
  const mine=rows.find(r=>r.owner_group_id===ctx.group.id);
  return send(res,200,{
   stageIndex:session.stage_index,
   rooms:rows.filter(r=>r.is_open&&r.owner_group_id!==ctx.group.id).map(r=>({
    id:r.id,ownerGroup:labels.get(r.owner_group_id)||'Class group',
    title:String(r.draft_snapshot?.title||'Our English Museum').slice(0,140),
    responses:reviews.filter(v=>v.room_id===r.id).length,
    responded:reviews.some(v=>v.room_id===r.id&&v.from_group_id===ctx.group.id)
   })),
   mine:mine?{id:mine.id,isOpen:mine.is_open,version:mine.draft_version,
    responses:reviews.filter(v=>v.room_id===mine.id).length}:null,
   received:mine?reviews.filter(v=>v.room_id===mine.id).map(v=>({
    fromGroup:labels.get(v.from_group_id)||'Class group',
    learned:v.learned,clarify:v.clarify,rating:v.rating,targetExhibit:v.target_exhibit||null,createdAt:v.created_at
   })):[]
  });
 }
 if(op==='peer-room-toggle'){
  requireMethod(req,'POST');const body=guardBody(req,1000);
  requirePeerStage(session);
  if(typeof body.open!=='boolean')throw fail(400,'Open/close state is required.');
  const existing=await query(admin.from('museum_peer_live_rooms').select('id,is_open')
   .eq('session_id',session.id).eq('owner_group_id',ctx.group.id).maybeSingle());
  if(existing){
   const changed=await query(admin.from('museum_peer_live_rooms')
    .update({is_open:body.open,updated_at:new Date().toISOString()})
    .eq('id',existing.id).eq('session_id',session.id).eq('owner_group_id',ctx.group.id)
    .select('id,is_open').single());
   return send(res,200,{ok:true,room:changed});
  }
  if(!body.open)return send(res,200,{ok:true,room:null});
  const draft=await query(admin.from('gcp_drafts').select('doc,version').eq('group_id',ctx.group.id).single());
  if(!draft?.doc||!Array.isArray(draft.doc.rooms)||draft.doc.rooms.length<1)
   throw fail(423,'Save a museum draft before opening feedback.');
  const ins=await admin.from('museum_peer_live_rooms').insert({
   session_id:session.id,owner_group_id:ctx.group.id,draft_snapshot:draft.doc,
   draft_version:draft.version,is_open:true
  }).select('id,is_open').maybeSingle();
  if(ins.error){
   if(ins.error.code==='23505')throw fail(409,'Feedback room already exists. Refresh and try again.');
   throw fail(503,'Unable to open the feedback room.');
  }
  return send(res,201,{ok:true,room:ins.data});
 }
 if(op==='peer-room-view'){
  requireMethod(req,'GET');requirePeerStage(session);
  const id=roomIdOf(req.query?.roomId);
  const room=await query(admin.from('museum_peer_live_rooms').select('*')
   .eq('id',id).eq('session_id',session.id).eq('is_open',true).maybeSingle());
  if(!room||room.owner_group_id===ctx.group.id)throw fail(404,'Feedback room not available.');
  const owner=await query(admin.from('gcp_groups').select('id,label,assignment_id').eq('id',room.owner_group_id).single());
  if(owner.assignment_id!==ctx.assignment.id)throw fail(403,'This gallery belongs to a different class.');
  const gallery=await checkpointGallery(admin,{
   id:room.id,session_id:session.id,group_id:room.owner_group_id,doc:room.draft_snapshot,
   version:room.draft_version,created_at:room.created_at
  },owner.label);
  return send(res,200,{gallery,roomId:room.id});
 }
 if(op==='peer-room-review'){
  requireMethod(req,'POST');requirePeerStage(session);
  const body=guardBody(req,2500),roomId=roomIdOf(body.roomId);
  if(!validatePeer(body.value))throw fail(400,'Provide two English comments of 10–400 characters and a clarity score from 1–4.');
  const room=await query(admin.from('museum_peer_live_rooms').select('id,owner_group_id,is_open,draft_snapshot')
   .eq('id',roomId).eq('session_id',session.id).maybeSingle());
  if(!room?.is_open||room.owner_group_id===ctx.group.id)throw fail(423,'This room is closed or belongs to your group.');
  const focus=body.value.targetExhibit===undefined||body.value.targetExhibit===null||body.value.targetExhibit===''?
   null:String(body.value.targetExhibit);
  if(focus&&!allowedFocus.has(focus))throw fail(400,'Choose a valid exhibit to review.');
  if(focus&&!(room.draft_snapshot?.rooms||[]).flatMap(r=>r.exhibits||[])
    .some((ex,i)=>exhibitField(i,ex.title)===focus))
   throw fail(400,'That exhibit is not part of this classroom gallery.');
  const ins=await admin.from('museum_peer_live_feedback').insert({
   room_id:roomId,from_group_id:ctx.group.id,
   learned:body.value.learned.trim(),clarify:body.value.clarify.trim(),
   rating:body.value.rating,target_exhibit:focus
  });
  if(ins.error&&ins.error.code!=='23505')throw fail(503,'Could not save this feedback.');
  return send(res,ins.error?200:201,{ok:true,alreadySubmitted:ins.error?.code==='23505'});
 }
 throw fail(404,'Unknown peer-feedback operation.');
}
