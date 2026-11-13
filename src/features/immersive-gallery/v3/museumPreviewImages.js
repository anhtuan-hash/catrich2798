import {documentFromStudio} from './museumData.js';
// Builds a private student preview using only actual uploaded group assets.
// Signed media URLs come from /api/gallery-guest/artwork and are never persisted
// to the draft, copied to public state, or replaced by stock/generated images.
const SLOT_KEYS=['issue','evidence','solution'];
export function buildStudentMuseumPreview(studio,assets=[]){
 const byId=new Map((assets||[]).filter(a=>a?.id&&a?.image_url).map(a=>[a.id,a]));
 // normalizeStudio() intentionally keeps learning fields, not editable rooms.
 // Reconstruct the authored 3 exhibits from the same canonical draft formatter
 // used by saving/submission. Support raw room objects only for legacy previews.
 const canonical=documentFromStudio(studio);
 const room=studio?.rooms?.[0]?.exhibits?.length?studio.rooms[0]:canonical.rooms[0];
 const artworks=studio?.artworks||{};
 const metadata=studio?.artMeta||{};
 return {
  title:studio?.title||'Our English Museum',
  summary:studio?.summary||'',
  status:'private',origin:'student_draft',
  // Display context comes from the same authorized student pass. These fields
  // never include the short-lived image URLs and are not publicly published.
  learning:studio?.learning||{},survey:studio?.survey||null,
  artMeta:studio?.artMeta||{},
  rooms:[{
   id:'draft-room',title:room.title||studio?.title||'Our English Museum',
   template_key:room.template_key||studio?.theme||'classic',
   exhibits:(room.exhibits||[]).map((exhibit,i)=>{
    const slot=SLOT_KEYS[i],assetId=exhibit.asset_id||artworks[slot];
    const asset=byId.get(assetId);
    const src=asset?.image_url||'';
    const alt=(metadata[slot]?.alt||exhibit.alt_text||asset?.original_name||exhibit.title||'').slice(0,500);
    return {...exhibit,
     id:'draft-exhibit-'+i,status:'published',asset_id:assetId||null,
     // Kind must agree with the actual signed asset, otherwise the 2D renderer
     // silently renders an icon instead of a student-uploaded image.
     kind:src?'image':exhibit.kind==='image'?'image':(exhibit.kind||'text'),
     image_url:src,
     alt_text:alt,
     image_original_name:asset?.original_name||'',
     image_source:metadata[slot]?.source||'',
     image_rights:metadata[slot]?.rights||''
    };
   })
  }]
 };
}
