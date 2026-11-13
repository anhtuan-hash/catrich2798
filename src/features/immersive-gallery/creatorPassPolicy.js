import {normalizeArtMeta,surveySummary} from './v3/learningEvidence.js';
import {normalizeStoryboardOrder} from './v3/museumData.js';
// BRIAN Gallery Creator Pass — pure allowlist validation for untrusted guest documents.
// The server revalidates on EVERY save/submit. Browser validation is only UX.
export const GCP_ROOM_TEMPLATES = Object.freeze(['classic','culture','lab']);
export const GCP_MODELS = Object.freeze(['globe','book','pedestal']);
const clean=(v,n)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
export function normalizeGuestDraft(input,limits={max_rooms:3,max_exhibits:12}){
 if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Định dạng bản nháp không hợp lệ.');
 const rooms=Array.isArray(input.rooms)?input.rooms:[];
 const maxRooms=Math.max(1,Math.min(3,Number(limits.max_rooms)||3));
 const maxExhibits=Math.max(1,Math.min(12,Number(limits.max_exhibits)||12));
 if(rooms.length>maxRooms)throw new Error('Vượt số phòng cho phép.');
 let count=0;
 const result={
  title:clean(input.title,140),artMeta:normalizeArtMeta(input.artMeta),survey:surveySummary(input.survey),
  summary:clean(input.summary,1200),
  // V3 pedagogical evidence is explicitly allowlisted; never accept arbitrary
  // fields/HTML or user identities. Backward compatible with V2 drafts.
  theme:['classic','culture','lab'].includes(input.theme)?input.theme:'classic',
  storyboardOrder:normalizeStoryboardOrder(input.storyboardOrder),
  artworks:Object.fromEntries(['issue','evidence','solution'].map(k=>[k,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(input.artworks?.[k]))?input.artworks[k]:null])),
  learning:Object.fromEntries(
   ['issue','audience','source','evidence','solution','feedback','improvement','reflection','tested','roles','feasibility']
    .map(k=>[k,k==='tested'?input.learning?.tested===true:
      clean(input.learning?.[k],['issue','evidence','solution'].includes(k)?2500:1200)])
  ),
  rooms:rooms.map((room,ri)=>{
   if(!GCP_ROOM_TEMPLATES.includes(room?.template_key))throw new Error('Loại phòng không được cho phép.');
   const exhibits=Array.isArray(room.exhibits)?room.exhibits:[];
   count+=exhibits.length;
   if(count>maxExhibits)throw new Error('Vượt số hiện vật cho phép.');
   return {
    title:clean(room.title||'Phòng '+(ri+1),120),
    template_key:room.template_key,
    exhibits:exhibits.map((exhibit,ei)=>{
     if(!['text','model','image'].includes(exhibit?.kind))throw new Error('Chỉ cho phép tranh ảnh và nội dung đã kiểm tra.');
     if(exhibit.kind==='model'&&!GCP_MODELS.includes(exhibit.model_key))throw new Error('Mô hình 3D chưa được duyệt.');
     if(exhibit.kind==='image'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(exhibit.asset_id)))throw new Error('Ảnh chưa được lưu an toàn.');
     const t=exhibit.transform||{};
     const coords=(arr,fallback,min,max)=>{
      if(!Array.isArray(arr)||arr.length!==3||arr.some(v=>typeof v!=='number'||!Number.isFinite(v)||v<min||v>max))
       return fallback;
      return arr;
     };
     return {
      title:clean(exhibit.title||'Hiện vật '+(ei+1),160),
      description:clean(exhibit.description,5000),alt_text:clean(exhibit.alt_text,500),
      kind:exhibit.kind,
      model_key:exhibit.kind==='model'?exhibit.model_key:null,
      asset_id:exhibit.kind==='image'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(exhibit.asset_id))?exhibit.asset_id:null,
      transform:{
       position:coords(t.position,[(ei%5-2)*2,2,-7.72],-8,8),
       rotation:coords(t.rotation,[0,0,0],-6.28319,6.28319),
       scale:coords(t.scale,[1,1,1],.25,3)
      }
     };
    })
   };
  })
 };
 if(JSON.stringify(result).length>95000)throw new Error('Bản nháp quá lớn.');
 return result;
}
export function validateGuestSubmission(doc){
 if(!doc?.title?.trim() || !Array.isArray(doc.rooms)||doc.rooms.length===0)
  throw new Error('Cần có tiêu đề và ít nhất một phòng.');
 if(doc.rooms.some(r=>!r.title?.trim()))throw new Error('Cần đặt tên cho từng phòng.');
 const exhibits=doc.rooms.flatMap(r=>r.exhibits||[]);
 if(!exhibits.length||exhibits.some(e=>!e.title?.trim()||!e.description?.trim()))
  throw new Error('Cần ít nhất một hiện vật có tên và mô tả.');
 return true;
}
export const CREATOR_STATES = Object.freeze(['issued','editing','submitted','ttcm_review','changes_requested','approved_locked','rejected','published']);
