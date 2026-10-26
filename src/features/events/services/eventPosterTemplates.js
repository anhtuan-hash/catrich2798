import { supabase, isSupabaseConfigured } from '../../../utils/supabase.js';
import { getEventPosterUrl, uploadEventPoster } from './eventService.js';
import { renderEventPosterFile } from './posterCanvasRenderer.js';
import {
  POSTER_GROUPS, BUILTIN_POSTER_TEMPLATES, choosePosterTemplate,
  posterTemplatePath, decodePosterTemplatePath,
} from '../utils/posterTemplateRules.mjs';

const BUCKET='bes-event-assets';
let cached=null;
let cacheUntil=0;
const db=()=>{if(!isSupabaseConfigured||!supabase)throw new Error('Supabase chưa được kết nối.');return supabase};
const reset=()=>{cached=null;cacheUntil=0};
const throwIfError=(error)=>{if(error)throw new Error(error.message||String(error))};

/** Existing private event-assets bucket; no DB schema changes, no extra backend services. */
export async function listPosterTemplates(force=false) {
  if(!force&&cached&&Date.now()<cacheUntil)return cached;
  const storage=db().storage.from(BUCKET);
  const batches=await Promise.all(POSTER_GROUPS.map(async (group)=>{
    const {data,error}=await storage.list('templates/'+group.id,{limit:100,offset:0});
    throwIfError(error);
    return (data||[]).map(row=>decodePosterTemplatePath('templates/'+group.id+'/'+row.name)).filter(Boolean);
  }));
  const list=[...batches.flat(),...BUILTIN_POSTER_TEMPLATES];
  cached=list;cacheUntil=Date.now()+12000;
  return list;
}
export async function templateSignedUrl(template) {
  if(!template?.path)return '';
  if(!decodePosterTemplatePath(template.path))throw new Error('Invalid custom template path');
  return getEventPosterUrl(template.path);
}
/** Upload the empty ARTWORK, not a composed event poster. Only RLS-approved admins can write. */
export async function uploadPosterTemplate(file,{name,group,tone='dark',side='left'}={}) {
  if(!file || !['image/png','image/jpeg','image/webp'].includes(file.type))
    throw new Error('Mẫu cần là PNG, JPG hoặc WebP.');
  if(!file.size || file.size>8*1024*1024)throw new Error('Mẫu poster tối đa 8MB.');
  const extension=file.type==='image/png'?'png':file.type==='image/jpeg'?'jpg':'webp';
  const stamp=Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const path=posterTemplatePath({name:name||file.name,group,tone,side,stamp,extension});
  const {error}=await db().storage.from(BUCKET).upload(path,file,{
    contentType:file.type,cacheControl:'3600',upsert:false,
  });
  throwIfError(error);
  reset();return decodePosterTemplatePath(path);
}
export async function removePosterTemplate(template) {
  if(template?.source!=='uploaded'||!decodePosterTemplatePath(template.path))
    throw new Error('Chỉ có thể xóa mẫu do admin đã tải lên.');
  const {error}=await db().storage.from(BUCKET).remove([template.path]);
  throwIfError(error);
  reset();
}
export async function createEventPosterFile(event,preferredId='') {
  let templates;
  try{templates=await listPosterTemplates()}catch(e){
    console.warn('[Brian Posters] Template storage unavailable; using built-in layout:',e.message);
    templates=BUILTIN_POSTER_TEMPLATES;
  }
  let selected=choosePosterTemplate(event,templates,preferredId);
  if(!selected)selected=choosePosterTemplate(event,BUILTIN_POSTER_TEMPLATES);
  if(!selected)throw new Error('Không có mẫu poster phù hợp.');
  const signed=selected.source==='uploaded'?await templateSignedUrl(selected):'';
  const file=await renderEventPosterFile(event,selected,signed);
  return {file,template:selected};
}
/** The only auto-write path: draft-only, skip events with an already saved poster. */
export async function autoAttachPosterToDraft(event) {
  if(!event?.id||event.status!=='draft')return {status:'skipped',reason:'Not a draft'};
  if(event.poster_path)return {status:'exists',path:event.poster_path};
  const {file,template}=await createEventPosterFile(event);
  const path=await uploadEventPoster(event.id,file);
  return {status:'created',path,template:template.id};
}
