// Museum V5 — read-only projection of the group's existing evidence.
// No inferred sources, invented survey numbers, timestamps, or signed URLs.
const safe=(value,length=1600)=>String(value??'')
 .replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,length);
const shortenAtSentence=(value,wordLimit=79)=>{
 const words=safe(value,2500).split(/\s+/).filter(Boolean);
 if(words.length<=wordLimit)return {preview:words.join(' '),remainder:''};
 const prefix=words.slice(0,wordLimit).join(' '),last=Math.max(prefix.lastIndexOf('. '),prefix.lastIndexOf('? '),prefix.lastIndexOf('! '));
 const preview=last>prefix.length*.45?prefix.slice(0,last+1):prefix+'…';
 return {preview,remainder:words.join(' ')};
};
export function buildExhibitFocusBoard(exhibit,insight,index=0){
 const title=safe(exhibit?.title,160)||'Exhibit';
 const originalDescription=safe(insight?.message||exhibit?.description,2500);
 const excerpt=shortenAtSentence(originalDescription);
 const survey=insight?.survey;
 let evidence=null;
 if(survey&&Number.isFinite(survey.n)&&survey.n>0&&Array.isArray(survey.options)){
  const n=Math.floor(survey.n);
  const options=survey.options.filter(o=>Number.isFinite(o.count)&&Number.isFinite(o.percent))
   .map(o=>({label:safe(o.label,110),count:o.count,percent:o.percent}));
  if(options.length)evidence={n,options,sourceKind:survey.source==='paper'?'paper':'online',
   caveat:'Group choices indicate priorities, not measured electricity savings or emissions.'};
 }
 return {
  index,eyebrow:'EXHIBIT INSPECTION',title,
  description:excerpt.preview,fullDescription:excerpt.remainder,
  source:safe(insight?.source,1200),
  improvement:safe(insight?.improvement,1200),
  imageSource:safe(insight?.imageSource,600),imageRights:safe(insight?.imageRights,300),
  evidence,
  accessibilityDescription:title+'. '+excerpt.preview
 };
}
// Only the fields already authorized for the current museum snapshot are
// projected. This adapter intentionally never receives an invite, group ID,
// access token or image URL.
export function projectAuthorizedEvidence(source){
 const raw=source&&typeof source==='object'?source:{};
 return {
  learning:raw.learning&&typeof raw.learning==='object'?raw.learning:{},
  survey:raw.survey&&typeof raw.survey==='object'?raw.survey:null,
  artMeta:raw.artMeta&&typeof raw.artMeta==='object'?raw.artMeta:{}
 };
}
