import {fail,query} from './_galleryCreator.js';
import {surveySummary} from '../src/features/immersive-gallery/v3/learningEvidence.js';
export async function surveyFor(admin,sessionId){return sessionId?surveySummary(await query(admin.from('museum_survey_snapshots').select('*').eq('session_id',sessionId).maybeSingle())):null;}
export async function checkpointGallery(admin,checkpoint,groupLabel){
 const ids=[...new Set((checkpoint.doc?.rooms||[]).flatMap(r=>(r.exhibits||[]).map(e=>e.asset_id)).filter(Boolean))];
 const assets=ids.length?await query(admin.from('museum_artwork_assets').select('id,storage_path,original_name').eq('group_id',checkpoint.group_id).in('id',ids)):[];
 const artworks=await Promise.all(assets.map(async a=>{
  const {data,error}=await admin.storage.from('museum-artwork-private').createSignedUrl(a.storage_path,600);
  if(error||!data?.signedUrl)throw fail(503,'Không thể mở ảnh minh chứng.');
  return {id:a.id,image_url:data.signedUrl,original_name:a.original_name};
 }));
 return {draft:checkpoint.doc,version:checkpoint.version,checkpointId:checkpoint.id,createdAt:checkpoint.created_at,groupLabel,artworks,expiresSeconds:600};
}
export async function feedbackFor(admin,sessionId,groupId){
 if(!sessionId)return [];
 let pairs=admin.from('museum_peer_pairs').select('*').eq('session_id',sessionId);
 if(groupId)pairs=pairs.eq('to_group',groupId);
 const ps=await query(pairs);
 const reviews=await query(admin.from('museum_peer_reviews').select('*').eq('session_id',sessionId));
 return ps.flatMap(p=>{const r=reviews.find(x=>x.from_group===p.from_group);return r?[{...p,...r}]:[];});
}
