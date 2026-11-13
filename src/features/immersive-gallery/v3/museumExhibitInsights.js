import {surveySummary} from './learningEvidence.js';
export const EXHIBIT_FIELDS=Object.freeze([
 {key:'issue',label:'The Problem',short:'Problem'},
 {key:'evidence',label:'The Evidence',short:'Evidence'},
 {key:'solution',label:'Our Solution',short:'Solution'}
]);
export const exhibitField=(index,title='')=>{
 const explicit=String(title||'').toLowerCase();
 if(/\bproblem\b/.test(explicit))return 'issue';
 if(/\bevidence\b/.test(explicit))return 'evidence';
 if(/\bsolution\b/.test(explicit))return 'solution';
 return EXHIBIT_FIELDS[index]?.key||null;
};
const trim=(value,max=1400)=>String(value||'').trim().slice(0,max);
export function exhibitInsights(gallery,exhibit,index){
 const key=exhibitField(index,exhibit?.title);
 const learning=gallery?.learning||{};
 const meta=gallery?.artMeta?.[key]||{};
 const raw=trim(exhibit?.description,5000);
 const sourceMatch=raw.match(/(?:^|\n)Source:\s*([^\n]+)/i);
 const improvementMatch=raw.match(/(?:^|\n)After peer testing:\s*([^\n]+)/i);
 const imageMatch=raw.match(/(?:^|\n)Image source:\s*([^\n]+)/i);
 const survey=surveySummary(gallery?.survey);
 return {
  key,label:EXHIBIT_FIELDS.find(x=>x.key===key)?.label||'Exhibit',
  source:trim(learning.source||sourceMatch?.[1],1200),
  improvement:key==='solution'?trim(learning.improvement||improvementMatch?.[1],1200):'',
  imageSource:trim(meta.source||imageMatch?.[1],600),
  imageRights:trim(meta.rights,300),
  survey:key==='evidence'?survey:null,
  hasEvidence:Boolean(learning.source||sourceMatch||survey&&key==='evidence'),
  message:trim(learning[key],2500)||raw.split(/\n\n(?:Source:|After peer testing:|Image source:)/i)[0]
 };
}
