// Pure time calculations for Brian Class Bell Timeline, no timers/audio/browser APIs.
const clamp=(v,min,max,def=min)=>{const n=Number(v);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):def;};
const str=(v,max,def='')=>typeof v==='string'?v.trim().slice(0,max):def;
export const DEFAULT_CLASS_PHASES=[
  {id:'phase-1',name:'Warm-up',seconds:300},
  {id:'phase-2',name:'Main activity',seconds:900},
  {id:'phase-3',name:'Wrap-up',seconds:180}
];
export function normalizePhases(raw){
 const items=Array.isArray(raw)?raw.slice(0,10):[];
 return items.length?items.map((v,i)=>({
  id:'phase-'+(i+1),
  name:str(v?.name,45,'Phase '+(i+1))||'Phase '+(i+1),
  seconds:Math.round(clamp(v?.seconds,15,3600,60))
 })) : DEFAULT_CLASS_PHASES.map(x=>({...x}));
}
export function initialTimeline(phases=DEFAULT_CLASS_PHASES){
 const segments=normalizePhases(phases);
 return {segments,index:0,remainingMs:segments[0].seconds*1000,endsAt:null,running:false};
}
export function sanitizeTimeline(raw){
 const x=raw&&typeof raw==='object'?raw:{},segments=normalizePhases(x.segments);
 const index=Math.round(clamp(x.index,0,segments.length-1,0));
 const maxMs=segments[index].seconds*1000;
 const remainingMs=Math.round(clamp(x.remainingMs,0,maxMs,maxMs));
 const endsAt=Number.isFinite(x.endsAt)&&x.endsAt>0&&x.endsAt<4102444800000?x.endsAt:null;
 const running=x.running===true&&endsAt!==null;
 return {segments,index,remainingMs,running,endsAt:running?endsAt:null};
}
export function advanceTimeline(state,now){
 const s=sanitizeTimeline(state);
 if(!s.running)return {...s,changes:0,finished:false};
 let index=s.index,end=s.endsAt,changes=0;
 while(index<s.segments.length-1&&now>=end){
   index++;changes++;end+=s.segments[index].seconds*1000;
 }
 if(now>=end)return {
  ...s,index,running:false,endsAt:null,remainingMs:0,
  changes:changes+1,finished:true
 };
 return {...s,index,endsAt:end,remainingMs:Math.max(0,end-now),changes,finished:false};
}
export function timelineMs(state,now){
 return state.running&&Number.isFinite(state.endsAt)?Math.max(0,state.endsAt-now):Math.max(0,state.remainingMs);
}
