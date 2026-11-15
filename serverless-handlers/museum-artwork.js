// Server-only, group-scoped artwork API. Never grants direct anon Storage access.
import {db,fail,send,handleError,guardBody,guestContext,staffContext,assertStaff,query,clean,uid,requireMethod} from './_galleryCreator.js';
import {canonicalArtworkImage} from './_museumArtworkImage.js';
import {randomUUID} from 'node:crypto';
import {canSaveMuseumDraft} from '../src/features/immersive-gallery/v3/museumSubmissionPolicy.js';
const BUCKET='museum-artwork-private';
const SIGNED_URL_TTL=90;
async function groupForStaff(ctx,id){
 if(!uid(id))throw fail(400,'Invalid group.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',id).single());
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.archived_at||assignment.school_scope!==ctx.profile.school||
  (ctx.role!=='admin'&&![assignment.created_by,assignment.reviewer_id].includes(ctx.user.id)))
  throw fail(403,'Group is outside your teaching scope.');
 return {group,assignment};
}
async function authorise(req,admin){
 const isStaff=String(req.headers.authorization||'').startsWith('Bearer ');
 if(isStaff){const ctx=await staffContext(req,admin);assertStaff(ctx);
  const id=String(req.query?.groupId||'');const {group,assignment}=await groupForStaff(ctx,id);
  return {group,assignment,admin,isStaff:true};
 }
 const ctx=await guestContext(req,admin,{write:['upload','remove'].includes(req.query?.operation)});
 return {...ctx,admin,isStaff:false};
}
async function list(ctx){
 return query(ctx.admin.from('museum_artwork_assets')
  .select('id,group_id,original_name,bytes,width,height,created_at,status,storage_path')
  .eq('group_id',ctx.group.id).eq('status','private_ready')
  .order('created_at',{ascending:true}).limit(6));
}
async function signed(ctx,assets){
 if(!assets.length)return [];
 const {data,error}=await ctx.admin.storage.from(BUCKET).createSignedUrls(
  assets.map(asset=>asset.storage_path),SIGNED_URL_TTL);
 if(error||!data)throw fail(503,'Could not open the private image.');
 const urls=new Map(data.map(row=>[row.path,row.signedUrl]));
 return assets.map(({storage_path,...asset})=>{
  const url=urls.get(storage_path);
  if(!url)throw fail(503,'Could not open the private image.');
  return {...asset,image_url:url};
 });
}
export default async function museumArtwork(req,res){
 try{
  const started=performance.now();
  const op=String(req.query?.operation||'');const admin=db();
  const ctx=await authorise(req,admin);
  const authorized=performance.now();
  if(op==='list'){
   requireMethod(req,'GET');const assets=await list(ctx);
   return send(res,200,{assets:await signed(ctx,assets),expiresSeconds:SIGNED_URL_TTL});
  }
  if(ctx.isStaff)throw fail(403,'Only a group can modify its own art.');
  if(!ctx.feature.upload_enabled)throw fail(423,'Tải ảnh chưa được bật cho lớp học.');
  if(!['issued','editing','changes_requested'].includes(ctx.group.state))
   throw fail(423,'Bản nộp đã khóa, không thể sửa ảnh.');
  const live=await query(admin.from('museum_live_sessions').select('status,stage_index,stage_open')
   .eq('assignment_id',ctx.assignment.id).maybeSingle());
  // Group artwork can be created at any active stage. Keep group ownership,
  // private storage, PNG sanitization, and upload quotas unchanged.
  if(!live||!canSaveMuseumDraft(live))
   throw fail(423,'Artwork editing is unavailable while Teacher Live is paused.');
  if(op==='upload'){
   requireMethod(req,'POST');
   const body=guardBody(req,4050000);
   const [current,total]=await Promise.all([
    list(ctx),
    admin.from('museum_artwork_assets').select('id',{head:true,count:'exact'}).eq('group_id',ctx.group.id)
   ]);
   const replaceId=uid(body.replaceId)?body.replaceId:null;
   const replace=replaceId?current.find(a=>a.id===replaceId):null;
   if(body.replaceId&&!replace)throw fail(403,'Không thể thay ảnh ngoài nhóm.');
   if(current.length>=6&&!replace)throw fail(423,'Tối đa 6 tranh ảnh mỗi nhóm.');
   if(total.error||total.count>=30)throw fail(423,'Tối đa 30 phiên bản ảnh mỗi nhóm để giữ minh chứng.');
   let image;
   try{image=await canonicalArtworkImage(body);}catch{throw fail(400,'This image could not be processed. Try another JPG, PNG or WebP image.');}
   const encoded=performance.now();
   const name=clean(body.filename||'Student artwork',150);
   const assetId=randomUUID(),storagePath=ctx.assignment.id+'/'+ctx.group.id+'/'+assetId+'.png';
   const storage=admin.storage.from(BUCKET);
   const stored=await storage.upload(storagePath,image.buffer,{
    contentType:'image/png',cacheControl:'private, max-age=90',upsert:false
   });
   if(stored.error)throw fail(503,'Không thể lưu ảnh vào kho riêng tư.');
   const uploaded=performance.now();
   let imageUrl;
   try{
    const {data,error}=await storage.createSignedUrl(storagePath,SIGNED_URL_TTL);
    if(error||!data?.signedUrl)throw fail(503,'Could not open the private image.');
    imageUrl=data.signedUrl;
    await query(admin.from('museum_artwork_assets').insert({
     id:assetId,group_id:ctx.group.id,assignment_id:ctx.assignment.id,storage_path:storagePath,
     mime:image.mime,bytes:image.bytes,width:image.width,height:image.height,
     original_name:name,sha256:image.sha256
    }));
   }catch(e){
    await storage.remove([storagePath]);throw e;
   }
   if(replace){
    await query(admin.from('museum_artwork_assets').update({
     status:'removed',removed_at:new Date().toISOString()
    }).eq('id',replace.id).eq('group_id',ctx.group.id));
    // Retain private bytes for immutable before/after checkpoints.
   }
   res.setHeader('Server-Timing', [
    ['authorization',authorized-started],['prepare',encoded-authorized],
    ['storage',uploaded-encoded],['record',performance.now()-uploaded]
   ].map(([name,ms])=>name+';dur='+Math.round(ms)).join(', '));
   return send(res,201,{asset:{id:assetId,original_name:name,bytes:image.bytes,
    width:image.width,height:image.height,image_url:imageUrl}});
  }
  if(op==='remove'){
   requireMethod(req,'POST');const body=guardBody(req,1000);
   if(!uid(body.assetId))throw fail(400,'Ảnh không hợp lệ.');
   const asset=await query(admin.from('museum_artwork_assets').select('storage_path,id')
    .eq('id',body.assetId).eq('group_id',ctx.group.id).eq('status','private_ready').maybeSingle());
   if(!asset)throw fail(404,'Ảnh đã xóa hoặc không thuộc nhóm.');
   // Hide from active drafts; retain private checkpoint evidence.
   await query(admin.from('museum_artwork_assets').update({
    status:'removed',removed_at:new Date().toISOString()
   }).eq('id',body.assetId).eq('group_id',ctx.group.id));
   return send(res,200,{ok:true});
  }
  return send(res,404,{error:'No matching media operation.'});
 }catch(e){return handleError(res,e);}
}
