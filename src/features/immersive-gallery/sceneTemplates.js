// BRIAN Immersive Gallery R1 — immutable templates and bounded transforms.
// No network or React dependency: safe for unit tests and the 2D fallback.
export const ROOM_TEMPLATES = Object.freeze({
  classic: { key:'classic', vi:'Phòng tranh cổ điển', en:'Classic Gallery', accent:'#b47d69', wall:'#f3e9de', floor:'#d0bda6', ceiling:'#fcfaf4', description:'Framed visual stories and student posters.' },
  culture: { key:'culture', vi:'Không gian văn hoá', en:'Culture Pavilion', accent:'#628e83', wall:'#dcebe5', floor:'#b6c9b8', ceiling:'#f8faf4', description:'Languages, places and cultural discoveries.' },
  lab: { key:'lab', vi:'Phòng khám phá', en:'Discovery Lab', accent:'#687da3', wall:'#e0e8f1', floor:'#bdcad8', ceiling:'#f9fbfd', description:'Explore, inspect and investigate.' },
});
export const ROOM_KEYS = Object.freeze(Object.keys(ROOM_TEMPLATES));
export const EXHIBIT_TYPES = Object.freeze(['text','image','audio','video','pdf','model']);
export const QUALITY = Object.freeze(['auto','high','balanced','lite']);
export const DEFAULT_TRANSFORM = Object.freeze({position:[0,2,-7.72],rotation:[0,0,0],scale:[1,1,1]});
const numbers = (value, count, fallback, min, max) => Array.isArray(value) && value.length === count && value.every(v => Number.isFinite(v) && v >= min && v <= max) ? value.map(Number) : [...fallback];
export function normalizeTransform(value={}) {
  return {
    position:numbers(value?.position,3,DEFAULT_TRANSFORM.position,-8,8),
    rotation:numbers(value?.rotation,3,DEFAULT_TRANSFORM.rotation,-6.28319,6.28319),
    scale:numbers(value?.scale,3,DEFAULT_TRANSFORM.scale,0.25,3),
  };
}
export function validTransform(value) {
  if (!value || !Array.isArray(value.position) || !Array.isArray(value.rotation) || !Array.isArray(value.scale)) return false;
  const clean=normalizeTransform(value);
  return ['position','rotation','scale'].every(key=>value[key].length===3 && value[key].every((v,i)=>Number.isFinite(v) && v===clean[key][i]));
}
export function validSlug(value) { return /^[a-z0-9][a-z0-9-]{1,62}$/.test(String(value||'')); }
export function slugify(value) { return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'gallery'; }
export function safeVideoUrl(value) {
  try { const u=new URL(String(value)); if(u.protocol!=='https:') return '';
    if(u.hostname==='www.youtube.com'||u.hostname==='youtube.com') { const id=u.searchParams.get('v'); return /^[\w-]{11}$/.test(id||'')?'https://www.youtube-nocookie.com/embed/'+id:''; }
    if(u.hostname==='www.youtube-nocookie.com' && /^\\/embed\\/[\\w-]{11}$/.test(u.pathname)) return 'https://www.youtube-nocookie.com'+u.pathname;
    if(u.hostname==='youtu.be') {const id=u.pathname.slice(1);return /^[\w-]{11}$/.test(id)?'https://www.youtube-nocookie.com/embed/'+id:'';}
    return '';
  }catch{return '';}
}
export function validateExhibition(value) {
  const errors=[];
  if(!String(value?.title||'').trim() || String(value.title).length>140) errors.push('title');
  if(!validSlug(value?.slug)) errors.push('slug');
  if(!['private','school','public'].includes(value?.visibility)) errors.push('visibility');
  return errors;
}
export function validateExhibit(value) {
  const errors=[];
  if(!String(value?.title||'').trim()||String(value.title).length>160) errors.push('title');
  if(!EXHIBIT_TYPES.includes(value?.kind)) errors.push('kind');
  if(!validTransform(value?.transform)) errors.push('transform');
  if(value?.kind==='image' && !value.asset_id) errors.push('asset');
  if(value?.kind==='video' && !safeVideoUrl(value.external_url)) errors.push('video');
  if(value?.kind==='model' && !['pedestal','globe','book'].includes(value?.model_key)) errors.push('model');
  if(value?.kind==='audio' && !value.asset_id) errors.push('audio');
  return errors;
}
export function useLiteQuality(pref='auto') {
  if (pref==='lite'||pref==='balanced') return pref;
  if (pref==='high') return 'high';
  if(typeof navigator==='undefined')return 'balanced';
  return (navigator.hardwareConcurrency<=4||/Android|iPhone|iPad/i.test(navigator.userAgent))?'lite':'balanced';
}
export function isPreviewAllowed(exhibition, viewer) {
  if(exhibition?.status!=='published'||!exhibition?.enabled)return false;
  if(exhibition.starts_at&&Date.parse(exhibition.starts_at)>Date.now())return false;
  if(exhibition.ends_at&&Date.parse(exhibition.ends_at)<Date.now())return false;
  if(exhibition.visibility==='public')return !!viewer; // Global Brian login gate is authoritative.
  if(!viewer)return false;
  return exhibition.visibility==='school'||exhibition.owner_id===viewer.id||viewer.role==='admin';
}
