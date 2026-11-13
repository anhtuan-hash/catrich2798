import {exhibitInsights} from './museumExhibitInsights.js';
const clean=(s,max=2500)=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const stripDates=source=>source; // Source citations must remain verbatim, never erase bibliographic years.
export function buildExhibitFocusBoard(gallery,exhibit,index){
 const insight=exhibitInsights(gallery,exhibit,index);
 const description=clean(insight.message||exhibit?.description,2500);
 const source=clean(insight.source,1200);
 const options=(insight.survey?.options||[]).filter(v=>v&&Number.isFinite(v.count)&&Number.isFinite(v.percent))
  .map(v=>({label:clean(v.label,140),count:v.count,percent:v.percent}));
 const survey=insight.survey?.n?{
  n:insight.survey.n,options,
  sourceKind:insight.survey.source==='paper'?'paper':'online',
  caveat:'Group choices are not measurements of electricity savings or emissions.'
 }:null;
 return {
  eyebrow:'EXHIBIT INSPECTION',title:clean(exhibit?.title||insight.label||'Exhibit',160),
  description,source:source||'Source not provided',
  hasRecordedSource:!!source,
  survey,improvement:clean(insight.improvement,1200),
  imageSource:clean(insight.imageSource,600),imageRights:clean(insight.imageRights,300),
  alt:clean(exhibit?.alt_text||exhibit?.title,300),
  // Never include image_url, asset_id, group ids or timestamps on the board DTO.
  accessibilityDescription:clean((exhibit?.title||'Exhibit')+'. '+description,1200)
 };
}
export function excerptSentences(value,max=290){
 const input=clean(value,2500);
 if(input.length<=max)return {excerpt:input,hasMore:false};
 const boundary=input.slice(0,max+1).match(/^(.*?[.!?])(?:\s|$)/g);
 const candidate=boundary?.join('')?.trim()||'';
 return {excerpt:candidate.length>=45?candidate:input.slice(0,max).trimEnd()+'…',hasMore:true};
}
