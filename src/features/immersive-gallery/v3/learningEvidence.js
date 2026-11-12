// Shared, deterministic learning evidence helpers. No student identities or invented data.
export const SURVEY_QUESTION='As a group, choose ONE action your group will prioritise at school.';
export const SURVEY_OPTIONS=['Walking or cycling when feasible','Switching off unused lights','Reducing food waste','Another feasible action'];
export const SURVEY_UNIT='group votes';
export const wordCount=value=>String(value||'').trim().split(/\s+/u).filter(Boolean).length;
export const groupRoles=['English editor','Data checker','Artwork designer','Presenter'];
export const ART_KEYS=['issue','evidence','solution'];
export function normalizeArtMeta(input){return Object.fromEntries(ART_KEYS.map(k=>[k,{
 alt:String(input?.[k]?.alt||'').trim().slice(0,500),source:String(input?.[k]?.source||'').trim().slice(0,600),
 rights:String(input?.[k]?.rights||'').trim().slice(0,300)
}]));}
export function roundRobin(groups){
 const sorted=[...groups].sort((a,b)=>String(a.label).localeCompare(String(b.label),'en')||a.id.localeCompare(b.id));
 return sorted.length<2?[]:sorted.map((g,i)=>({from_group:g.id,to_group:sorted[(i+1)%sorted.length].id}));
}
export function validatePeer(value){return value&&typeof value.learned==='string'&&value.learned.trim().length>=10&&value.learned.length<=400&&
 typeof value.clarify==='string'&&value.clarify.trim().length>=10&&value.clarify.length<=400&&Number.isInteger(value.rating)&&value.rating>=1&&value.rating<=4;}
export function surveySummary(snapshot){
 if(!snapshot)return null;
 const counts=snapshot.counts;
 if(!Array.isArray(counts)||counts.length!==4||counts.some(x=>!Number.isInteger(x)||x<0))return null;
 const n=counts.reduce((a,b)=>a+b,0);
 if(!n||n>1000)return null;
 return {id:String(snapshot.id||''),session_id:String(snapshot.session_id||''),counts:[...counts],source:snapshot.source==='paper'?'paper':'online',note:String(snapshot.note||'').slice(0,500),created_at:String(snapshot.created_at||''),n,unit:SURVEY_UNIT,options:SURVEY_OPTIONS.map((label,i)=>({label,count:counts[i],percent:Math.round(counts[i]*10000/n)/100}))};
}
export function surveyCitation(snapshot){const s=surveySummary(snapshot);return s?
 `In-class group-priority survey (N=${s.n} group votes; ${s.source==='paper'?'paper tally entered by teacher':'online group votes'}; ${s.created_at}). ${s.options.map(o=>`${o.label}: ${o.count}/${s.n} (${o.percent}%)`).join('; ')}. These are group choices, not individual habits or measured emission reductions.`:'';}
export function changedExhibits(before,after){return ART_KEYS.filter(k=>
 before?.learning?.[k]!==after?.learning?.[k]||before?.artworks?.[k]!==after?.artworks?.[k]||
 JSON.stringify(before?.artMeta?.[k]||{})!==JSON.stringify(after?.artMeta?.[k]||{}));}
export function evidenceMissing(doc){
 const l=doc?.learning||{},missing=[];
 for(const [key,label] of [['issue','Problem'],['evidence','Evidence'],['source','Source'],['solution','Solution'],['improvement','Revision reason'],['reflection','Reflection'],['roles','Group roles'],['feasibility','Feasibility check']])if(!String(l[key]||'').trim())missing.push(label);
 for(const k of ART_KEYS)if(doc?.artworks?.[k])for(const field of ['alt','source','rights'])if(!doc.artMeta?.[k]?.[field]?.trim())missing.push(`${k}: ${field}`);
 if(!ART_KEYS.some(k=>k!=='evidence'&&doc?.artworks?.[k]))missing.push('An original poster for Problem or Solution');
 if(!surveySummary(doc?.survey)||!doc?.artworks?.evidence)missing.push('Frozen class survey chart');
 return missing;
}
export function contestBasename(name){return 'TiengAnh_THPT_'+(String(name||'Giao-vien').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,c=>c==='đ'?'d':'D').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'')||'Giao-vien')+'_STEM_';}
