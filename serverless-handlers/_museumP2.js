import {checkpointGallery} from './_museumEvidence.js';
import {fail,guardBody,guardOrigin,query,requireMethod,send,uid} from './_galleryCreator.js';
import {P2_FORMS,P2_PEER_FORMS,normalizeP2Values,p2Code,summarizeP2} from '../src/features/immersive-gallery/v3/museumP2Forms.js';

const table='museum_p2_worksheets';
const fields='group_id,form,slot,values,version,updated_at';
const rowQuery=(admin,sessionId,group,form,slot='')=>admin.from(table).select(fields)
 .eq('session_id',sessionId).eq('group_id',group).eq('form',form).eq('slot',slot);
const findRow=(admin,sessionId,group,form,slot)=>query(rowQuery(admin,sessionId,group,form,slot).maybeSingle());

function pairedGroup(groups,index){
 if(groups.length<2||index<0)return undefined;
 const lastCircle=groups.length%2===1&&index>=groups.length-3;
 return groups[lastCircle?(index===groups.length-1?groups.length-3:index+1):index^1];
}
async function peers(admin,session,ctx){
 const groups=await query(admin.from('gcp_groups').select('id,label').eq('assignment_id',ctx.assignment.id).order('label').order('id'));
 const index=groups.findIndex(group=>group.id===ctx.group.id);
 const target=pairedGroup(groups,index);
 const visitor=groups.find((_,i)=>pairedGroup(groups,i)?.id===ctx.group.id);
 if(!target||!visitor)throw fail(423,'At least two groups are needed for C2 and C3.');
 return {target,visitor};
}

async function peerState(admin,session,ctx,{gallery=false}={}){
 if(!session||session.stage_index<7)return null;
 let pair;
 try{pair=await peers(admin,session,ctx);}catch(e){if(e.status===423)return null;throw e;}
 const {target,visitor}=pair;
 const id=ctx.group.id;
 const [c2,score,revision,answer,retest,outgoing,outgoingRevision,outgoingAnswer]=await Promise.all([
  findRow(admin,session.id,visitor.id,'C2'),findRow(admin,session.id,id,'C2-score'),
  findRow(admin,session.id,id,'C3-share'),findRow(admin,session.id,visitor.id,'C3-answer'),
  findRow(admin,session.id,id,'C3-score'),findRow(admin,session.id,id,'C2'),
  findRow(admin,session.id,target.id,'C3-share'),findRow(admin,session.id,id,'C3-answer')
 ]);
 let exhibit=null,available=false;
 if(session.status==='active'&&session.stage_open&&session.stage_index===7){
  const before=await query(admin.from('museum_checkpoints').select('id,doc,version,group_id,created_at')
   .eq('session_id',session.id).eq('group_id',target.id).eq('kind','before').maybeSingle());
  available=Boolean(before?.doc?.rooms?.length);
  if(gallery&&available)exhibit=await checkpointGallery(admin,before,target.label);
 }
 if(session.status==='active'&&session.stage_open&&session.stage_index===8&&outgoing&&outgoingRevision){
  available=true;
  if(gallery){
   const shared=await query(admin.from(table).select('snapshot').eq('session_id',session.id).eq('group_id',target.id).eq('form','C3-share').eq('slot','').single());
   if(shared.snapshot)exhibit=await checkpointGallery(admin,shared.snapshot,target.label);
  }
 }
 return {target:target.label,visitor:visitor.label,c2,score,revision,answer,retest,outgoing,outgoingRevision,outgoingAnswer,exhibit,available,
  // The authors see the reference answers only when checking their own V1.
  b3:c2?await findRow(admin,session.id,id,'B3'):null};
}

export async function p2WorksheetsForEvidence(admin,session){
 if(session.media_board?.p2Worksheets!==true)return undefined;
 const rows=[];
 for(let offset=0;;offset+=500){
  const page=await query(admin.from(table).select(fields+',snapshot').eq('session_id',session.id)
   .order('group_id').order('form').order('slot').range(offset,offset+499));
  rows.push(...page);
  if(page.length<500)return {rows,summary:summarizeP2(rows)};
 }
}

export async function handleMuseumP2({op,req,res,admin,ctx,session,assignment,staff=false}){
 const saving=op==='p2-save';
 if(!session){
  if(saving)throw fail(423,'Start Teacher Live before saving a worksheet.');
  return send(res,200,{rows:[],peer:null,readOnly:true});
 }
 if(op==='p2-peer'){
  requireMethod(req,'GET');
  if(staff)throw fail(403,'Open the student workshop to visit a partner.');
  return send(res,200,{peer:await peerState(admin,session,ctx,{gallery:req.query?.gallery==='1'})});
 }
 if(!saving){
  requireMethod(req,'GET');
  let request=admin.from(table).select(fields).eq('session_id',session.id);
  if(!staff)request=request.eq('group_id',ctx.group.id).not('form','in','(I1-A,I1-B,E1,E3,E4,I2-A,I2-B,I3)');
  else if(req.query?.groupId){
   const groupId=String(req.query.groupId);
   if(!uid(groupId))throw fail(400,'Invalid group.');
   request=request.eq('group_id',groupId);
  }
  const rows=[];
  for(let offset=0;;offset+=500){
   const page=await query(request.order('group_id').order('form').order('slot').range(offset,offset+499));
   rows.push(...page);
   if(page.length<500)break;
  }
  return send(res,200,{rows,summary:staff?summarizeP2(rows):undefined,readOnly:Boolean(assignment.content_frozen_at||session.status==='ended')});
 }
 requireMethod(req,'POST');
 if(staff)guardOrigin(req);
 if(!session.media_board?.p2Worksheets)throw fail(423,'This lesson was created before P2 worksheets. Start a new lesson for the full P2 workflow.');
 if(assignment.content_frozen_at||session.status==='ended')throw fail(423,'The lesson is locked.');
 const body=guardBody(req,18500);
 const formId=String(body.form||'');
 const form=Object.hasOwn(P2_FORMS,formId)?P2_FORMS[formId]:null;
 if(!form||Boolean(form.staff)!==staff)throw fail(403,'This worksheet belongs to a different role.');
 if(!staff&&ctx.readOnly&&formId!=='D2')throw fail(423,'The lesson or group project is locked.');
 const slot=String(body.slot||'').trim().toUpperCase();
 if(form.individual?!p2Code(slot):slot!=='')throw fail(400,'Enter a valid student code.');
 const values=normalizeP2Values(form,body.values);
 if(!values||!Number.isInteger(body.expectedVersion)||body.expectedVersion<0)throw fail(400,'Check the worksheet fields and scores.');
 let groupId=ctx.group?.id;
 if(staff){
  if(form.group){
   if(!uid(body.groupId))throw fail(400,'Choose a group in this lesson.');
   const group=await query(admin.from('gcp_groups').select('id,assignment_id').eq('id',body.groupId).maybeSingle());
   if(group?.assignment_id!==assignment.id)throw fail(403,'This group is outside your lesson.');
   groupId=group.id;
  }else {
   // Store the class summary once, using the first existing group as its stable row scope.
   const first=await query(admin.from('gcp_groups').select('id').eq('assignment_id',assignment.id).order('label').order('id').limit(1).maybeSingle());
   if(!first)throw fail(423,'Create a group before recording the class summary.');
   groupId=first.id;
  }
 }else if(session.stage_index<form.stage||(session.status!=='active'&&!(formId==='D2'&&session.status==='paused'))||
   ((form.individual||P2_PEER_FORMS.includes(formId))&&(session.stage_index!==form.stage||!session.stage_open))){
  throw fail(423,'The teacher has not opened this worksheet, or its activity has closed.');
 }
 let snapshot=null;
 if(P2_PEER_FORMS.includes(formId)){
  const {target,visitor}=await peers(admin,session,ctx);
  const author=['C2','C3-answer'].includes(formId)?target.id:groupId;
  const visiting=['C2','C3-answer'].includes(formId)?groupId:visitor.id;
  const incoming=await findRow(admin,session.id,visiting,'C2');
  if(formId==='C2'){
   const before=await query(admin.from('museum_checkpoints').select('id,doc,version')
    .eq('session_id',session.id).eq('group_id',author).eq('kind','before').maybeSingle());
   if(!before?.doc?.rooms?.length||before.version!==body.seenVersion)throw fail(409,'Open the assigned V1 before sending your answers.');
  }else if(!incoming)throw fail(423,'The visiting group must submit C2 first.');
  if(formId==='C3-share'){
   const checked=await findRow(admin,session.id,groupId,'C2-score');
   if(!checked)throw fail(423,'Score C2 before sharing V2.');
   const [draft,before]=await Promise.all([
    query(admin.from('gcp_drafts').select('doc,version').eq('group_id',groupId).maybeSingle()),
    query(admin.from('museum_checkpoints').select('version').eq('session_id',session.id).eq('group_id',groupId).eq('kind','before').maybeSingle())
   ]);
   if(!before||!draft?.doc?.rooms?.length||draft.version<=before.version||draft.version!==body.seenVersion)
    throw fail(409,'Save a revised V2 in Group Project before sharing it.');
   snapshot={group_id:groupId,doc:draft.doc,version:draft.version,created_at:new Date().toISOString()};
  }
  if(formId==='C3-answer'||formId==='C3-score'){
   const share=await query(admin.from(table).select('snapshot').eq('session_id',session.id).eq('group_id',author).eq('form','C3-share').eq('slot','').maybeSingle());
   if(!share?.snapshot)throw fail(423,'The authors have not shared their V2.');
   if(formId==='C3-answer'&&share.snapshot.version!==body.seenVersion)throw fail(409,'Open the shared V2 before answering.');
   if(formId==='C3-score'&&!await findRow(admin,session.id,visiting,'C3-answer'))throw fail(423,'Wait for the visitor’s V2 answer.');
  }
 }
 if(staff&&['I2-A','I2-B'].includes(formId)&&!await findRow(admin,session.id,groupId,formId==='I2-A'?'I1-A':'I1-B',slot))
  throw fail(423,'The learner has not submitted this writing task.');
 const existing=await findRow(admin,session.id,groupId,formId,slot);
 // Peer records are evidence once the partner has received them.
 const fixed=P2_PEER_FORMS.includes(formId)||(!staff&&form.individual);
 if(existing&&fixed){
  if(Object.entries(values).every(([key,value])=>existing.values[key]===value))return send(res,200,{row:existing});
  throw fail(409,'This worksheet has already been submitted.');
 }
 if((existing?.version??0)!==body.expectedVersion)throw fail(409,'A newer worksheet was saved. Reload it before editing.');
 const base=admin.from(table);
 const row={session_id:session.id,group_id:groupId,form:formId,slot,values,snapshot,version:body.expectedVersion+1,updated_at:new Date().toISOString()};
 const result=await (existing?base.update(row).eq('session_id',session.id).eq('group_id',groupId).eq('form',formId).eq('slot',slot).eq('version',body.expectedVersion)
  :base.insert(row)).select(fields).maybeSingle();
 if(result.error?.code==='23505'||(!result.error&&!result.data))throw fail(409,'A newer worksheet was saved. Reload it before editing.');
 return send(res,200,{row:await query(result)});
}
