import { supabase, isSupabaseConfigured } from '../../utils/supabase.js';
import { normalizeTransform, validateExhibition, validateExhibit, ROOM_KEYS, safeVideoUrl } from './sceneTemplates.js';

const BUCKET='brian-gallery-private';
const unavailable = () => { throw new Error('Gallery chưa được cấu hình trong Supabase. Admin cần chạy migration sau khi duyệt.'); };
const client = () => {if(!isSupabaseConfigured||!supabase) unavailable(); return supabase;};
const requireUser = (u) => {if(!u?.id)throw new Error('Vui lòng đăng nhập để sử dụng Gallery.');return u.id;};
const check = ({data,error}) => { if(error) throw new Error(error.message||'Gallery cloud error'); return data; };
const allowedKinds=new Set(['image','audio','pdf']);
const MIME={image:['image/png','image/jpeg','image/webp','image/avif'],audio:['audio/mpeg','audio/mp4','audio/ogg','audio/wav'],pdf:['application/pdf']};
const MAX={image:2*1024*1024,audio:12*1024*1024,pdf:5*1024*1024};
export const GALLERY_BUCKET=BUCKET;

export async function getGalleryEnabled(){
  if(!isSupabaseConfigured||!supabase)return false;
  try {const {data,error}=await supabase.from('gallery_settings').select('enabled').eq('id',true).maybeSingle();if(error) return false;return data?.enabled===true;}
  catch {return false;}
}
export async function setGalleryEnabled(enabled,user){
  requireUser(user);
  if(user.role!=='admin')throw new Error('Chỉ Admin được bật hoặc tắt Gallery.');
  const {data,error}=await client().from('gallery_settings').update({enabled:!!enabled,updated_by:user.id,updated_at:new Date().toISOString()}).eq('id',true).select('enabled').single();
  return check({data,error});
}
export async function listExhibitions(){
  return check(await client().from('gallery_exhibitions').select('id,slug,title,summary,visibility,status,owner_id,accept_submissions,created_at,updated_at').neq('status','archived').order('updated_at',{ascending:false}).limit(100))||[];
}
export async function getExhibition(slugOrId){
  const col=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(slugOrId))?'id':'slug';
  const exhibit=check(await client().from('gallery_exhibitions').select('*').eq(col,slugOrId).maybeSingle());
  if(!exhibit||exhibit.status==='archived')throw new Error('This exhibition has been removed from the showcase.');
  const rooms=check(await client().from('gallery_rooms').select('*').eq('exhibition_id',exhibit.id).order('sort_order'))||[];
  let exhibits=[];
  if(rooms.length) exhibits=check(await client().from('gallery_exhibits').select('*').in('room_id',rooms.map(r=>r.id)).order('created_at'))||[];
  return {...exhibit,rooms:rooms.map(r=>({...r,exhibits:exhibits.filter(e=>e.room_id===r.id)}))};
}
export async function createExhibition(input,user){
  requireUser(user);
  const payload={title:String(input.title||'').trim().slice(0,140),slug:String(input.slug||'').trim(),summary:String(input.summary||'').slice(0,1200),visibility:input.visibility||'private',owner_id:user.id,status:'draft',accept_submissions:false};
  const errors=validateExhibition(payload);if(errors.length)throw new Error('Thông tin chưa hợp lệ: '+errors.join(', '));
  return check(await client().from('gallery_exhibitions').insert(payload).select().single());
}
export async function updateExhibition(id,fields,user){
  requireUser(user);
  const payload={};
  ['title','slug','summary','visibility','accept_submissions'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(fields,k))payload[k]=fields[k];});
  if('title' in payload)payload.title=String(payload.title).trim().slice(0,140);
  if('summary' in payload)payload.summary=String(payload.summary).slice(0,1200);
  return check(await client().from('gallery_exhibitions').update(payload).eq('id',id).select().single());
}
export async function publishExhibition(id,user){
  requireUser(user);if(user.role!=='admin')throw new Error('Chỉ Admin có quyền xuất bản.');
  const full=await getExhibition(id);
  if(!full.rooms.length)throw new Error('Cần ít nhất một phòng trưng bày.');
  const approved=full.rooms.flatMap(r=>r.exhibits).filter(e=>e.status==='approved'||e.status==='published');
  if(!approved.length)throw new Error('Cần ít nhất một hiện vật đã được duyệt.');
  for(const e of approved){const errors=validateExhibit(e);if(errors.length)throw new Error('Hiện vật '+e.title+': '+errors.join(', '));}
  return check(await client().rpc('gallery_publish_exhibition',{p_exhibition_id:id}));
}
export async function unpublishExhibition(id,user){
  requireUser(user);if(user.role!=='admin')throw new Error('Chỉ Admin có quyền gỡ xuất bản.');
  return check(await client().from('gallery_exhibitions').update({status:'draft'}).eq('id',id).select().single());
}
export async function createRoom(exhibitionId,templateKey,title,order,user){
  requireUser(user);if(!ROOM_KEYS.includes(templateKey))throw new Error('Invalid room template');
  return check(await client().from('gallery_rooms').insert({exhibition_id:exhibitionId,template_key:templateKey,title:String(title||'').trim().slice(0,120)||'Room',sort_order:order}).select().single());
}
export async function updateRoom(id,fields,user){
  requireUser(user);const payload={};
  if('title' in fields)payload.title=String(fields.title||'').trim().slice(0,120);
  if('template_key' in fields&&ROOM_KEYS.includes(fields.template_key))payload.template_key=fields.template_key;
  if('sort_order' in fields&&Number.isInteger(Number(fields.sort_order)))payload.sort_order=Number(fields.sort_order);
  return check(await client().from('gallery_rooms').update(payload).eq('id',id).select().single());
}
export async function createExhibit(roomId,input,user,{submission=false}={}){
  requireUser(user);
  const payload={room_id:roomId,submitted_by:user.id,title:String(input.title||'').trim().slice(0,160),description:String(input.description||'').slice(0,5000),kind:input.kind||'text',transform:normalizeTransform(input.transform),status:submission?'submitted':'draft',alt_text:String(input.alt_text||'').slice(0,500),transcript:String(input.transcript||'').slice(0,5000),external_url:input.kind==='video'?safeVideoUrl(input.external_url):null,model_key:input.kind==='model'?(input.model_key||'pedestal'):null,asset_id:input.asset_id||null};
  if(!payload.title)throw new Error('Thiếu tiêu đề hiện vật.');
  if(submission&&user.role!=='student')throw new Error('Chế độ gửi dành cho học sinh.');
  return check(await client().from('gallery_exhibits').insert(payload).select().single());
}
export async function updateExhibit(id,fields,user){
  requireUser(user);const payload={};
  ['title','description','kind','alt_text','transcript','asset_id','model_key'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(fields,k))payload[k]=fields[k];});
  if('transform' in fields)payload.transform=normalizeTransform(fields.transform);
  if('external_url' in fields)payload.external_url=safeVideoUrl(fields.external_url);
  if('title' in payload)payload.title=String(payload.title).trim().slice(0,160);
  return check(await client().from('gallery_exhibits').update(payload).eq('id',id).select().single());
}
export async function reviewExhibit(id,status,note,user){
  requireUser(user);
  if(!['approved','rejected'].includes(status))throw new Error('Invalid review state');
  return check(await client().from('gallery_exhibits').update({status,review_note:String(note||'').slice(0,1000),reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',id).select().single());
}
export async function uploadGalleryAsset(file,kind,user){
  requireUser(user);
  if(!allowedKinds.has(kind)||!MIME[kind].includes(file?.type)||file.size>MAX[kind]||file.size<=0)throw new Error('Loại tệp hoặc kích thước không được cho phép.');
  const sanitized=String(file.name||'media').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-70);
  const path=user.id+'/'+crypto.randomUUID()+'-'+sanitized;
  const storage=client().storage.from(BUCKET);
  const {error}=await storage.upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(error)throw error;
  try{return check(await client().from('gallery_assets').insert({path,kind,mime_type:file.type,byte_size:file.size,uploader_id:user.id}).select().single());}
  catch(e){await storage.remove([path]).catch(()=>{});throw e;}
}
export async function getGalleryAssetUrl(assetId) {
  if(!assetId)return '';
  const row=check(await client().from('gallery_assets').select('path').eq('id',assetId).maybeSingle());
  if(!row)return '';
  const {data,error}=await client().storage.from(BUCKET).createSignedUrl(row.path,120);
  if(error)throw error;
  return data?.signedUrl||'';
}
