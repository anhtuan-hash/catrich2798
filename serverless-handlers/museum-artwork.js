// Server-only, group-scoped artwork API. Never grants direct anon Storage access.
import {db,fail,send,handleError,guardBody,guestContext,staffContext,assertStaff,query,clean,uid,requireMethod} from './_galleryCreator.js';
import {canonicalArtworkPng} from './_museumPng.js';
import {randomUUID} from 'node:crypto';
const BUCKET='museum-artwork-private';
async function groupForStaff(ctx,id){
 if(!uid(id))throw fail(400,'Invalid group.');
 const group=await query(ctx.admin.from('gcp_groups').select('*').eq('id',id).single());
 const assignment=await query(ctx.admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 if(assignment.school_scope!==ctx.profile.school||
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
  .select('id,group_id,original_name,bytes,width,height,created_at,status')
  .eq('group_id',ctx.group.id).eq('status','private_ready')
  .order('created_at',{ascending:true}).limit(6));
}
async function signed(ctx,assets){
 return Promise.all(assets.map(async asset=>{
  const record=await query(ctx.admin.from('museum_artwork_assets')
   .select('storage_path').eq('id',asset.id).eq('group_id',ctx.group.id)
   .eq('status','private_ready').single());
  const {data,error}=await ctx.admin.storage.from(BUCKET).createSignedUrl(record.storage_path,90);
  if(error||!data?.signedUrl)throw fail(503,'Could not open the private image.');
  return {...asset,image_url:data.signedUrl};
 }));
}
export default async function museumArtwork(req,res){
 try{
  const op=String(req.query?.operation||'');const admin=db();
  const ctx=await authorise(req,admin);
  if(op==='list'){
   requireMethod(req,'GET');const assets=await list(ctx);
   return send(res,200,{assets:await signed(ctx,assets),expiresSeconds:90});
  }
  if(ctx.isStaff)throw fail(403,'Only a group can modify its own art.');
  const config=await query(admin.from('gcp_settings').select('upload_enabled').eq('id',true).single());
  if(!config.upload_enabled)throw fail(423,'Tải ảnh chưa được bật cho lớp học.');
  if(!['issued','editing','changes_requested'].includes(ctx.group.state))
   throw fail(423,'Bản nộp đã khóa, không thể sửa ảnh.');
  const live=await query(admin.from('museum_live_sessions').select('status,stage_index,stage_open')
   .eq('assignment_id',ctx.assignment.id).maybeSingle());
  if(live && (live.status!=='active'||!live.stage_open||live.stage_index<6||live.stage_index>9))
   throw fail(423,'Giáo viên chưa mở hoạt động tải ảnh.');
  if(op==='upload'){
   requireMethod(req,'POST');
   const body=guardBody(req,4050000);
   const current=await list(ctx);if(current.length>=6)throw fail(423,'Tối đa 6 tranh ảnh mỗi nhóm.');
   let image;
   try{image=canonicalArtworkPng(body.png);}catch(e){throw fail(400,e.message);}
   const name=clean(body.filename||'Student artwork',150);
   const assetId=randomUUID(),storagePath=ctx.assignment.id+'/'+ctx.group.id+'/'+assetId+'.png';
   const stored=await admin.storage.from(BUCKET).upload(storagePath,image.buffer,{
    contentType:'image/png',cacheControl:'private, max-age=90',upsert:false
   });
   if(stored.error)throw fail(503,'Không thể lưu ảnh vào kho riêng tư.');
   try{
    await query(admin.from('museum_artwork_assets').insert({
     id:assetId,group_id:ctx.group.id,assignment_id:ctx.assignment.id,storage_path:storagePath,
     mime:image.mime,bytes:image.bytes,width:image.width,height:image.height,
     original_name:name,sha256:image.sha256
    }));
   }catch(e){
    await admin.storage.from(BUCKET).remove([storagePath]);throw e;
   }
   const [asset]=await signed(ctx,[{id:assetId,original_name:name,bytes:image.bytes,width:image.width,height:image.height}]);
   return send(res,201,{asset});
  }
  if(op==='remove'){
   requireMethod(req,'POST');const body=guardBody(req,1000);
   if(!uid(body.assetId))throw fail(400,'Ảnh không hợp lệ.');
   const asset=await query(admin.from('museum_artwork_assets').select('storage_path,id')
    .eq('id',body.assetId).eq('group_id',ctx.group.id).eq('status','private_ready').maybeSingle());
   if(!asset)throw fail(404,'Ảnh đã xóa hoặc không thuộc nhóm.');
   const removed=await admin.storage.from(BUCKET).remove([asset.storage_path]);
   if(removed.error)throw fail(503,'Không thể xóa ảnh.');
   await query(admin.from('museum_artwork_assets').update({
    status:'removed',removed_at:new Date().toISOString()
   }).eq('id',body.assetId).eq('group_id',ctx.group.id));
   return send(res,200,{ok:true});
  }
  return send(res,404,{error:'No matching media operation.'});
 }catch(e){return handleError(res,e);}
}
