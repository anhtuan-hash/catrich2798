// Brian Instant Tools Wave 4 — offline-only helpers; no network, class data or AI.
const cap=(value,min,max,fallback=min)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
const str=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const list=value=>Array.isArray(value)?value:[];
export function parseGroupNames(input){
  const rows=Array.isArray(input)?input:String(input??'').split(/\r?\n/);
  const seen=new Set(),names=[];
  for(const row of rows){
    const name=String(row??'').trim().slice(0,55);
    const key=name.toLocaleLowerCase();
    if(name&&!seen.has(key)){seen.add(key);names.push(name);}
    if(names.length>=80)break;
  }
  return names;
}
const nextIndex=(exclusive)=>{
  const c=globalThis.crypto;
  if(c?.getRandomValues){
    const range=exclusive,ceiling=0x100000000-(0x100000000%range),bytes=new Uint32Array(1);
    do{c.getRandomValues(bytes);}while(bytes[0]>=ceiling);
    return bytes[0]%range;
  }
  return Math.floor(Math.random()*exclusive);
};
export function makeBalancedGroups(input,count=4,randomIndex=nextIndex){
  const names=parseGroupNames(input),size=Math.round(cap(count,2,8,4));
  if(names.length<2)throw Error('MIN_NAMES');
  const a=[...names];
  for(let i=a.length-1;i>0;i--){const j=randomIndex(i+1);if(!Number.isInteger(j)||j<0||j>i)throw Error('RNG');[a[i],a[j]]=[a[j],a[i]];}
  return Array.from({length:Math.min(size,a.length)},(_,i)=>a.filter((_,index)=>index%Math.min(size,a.length)===i));
}
// Microphone data is relative digital full scale (dBFS), never calibrated room sound pressure (dB SPL).
export function rmsToDbfs(rms){return Math.max(-90,Math.min(0,20*Math.log10(Math.max(Number(rms)||0,0.000031623))));}
export function relativeLoudness(db,threshold=-28){return Math.max(0,Math.min(1,(db+65)/60));}
export function reactionLabel(ms){if(!Number.isFinite(ms)||ms<0)return '—';return ms<200?'excellent':ms<300?'quick':ms<450?'steady':'practice';}
export function normalizeBellSegments(saved){
  const rows=list(saved).slice(0,8).map((p,i)=>({
    id:'bell-'+i,name:str(p?.name,45).trim()||'Phase '+(i+1),
    seconds:Math.round(cap(p?.seconds,10,3600,60))
  }));
  return rows.length?rows:[{id:'bell-0',name:'Activity',seconds:300},{id:'bell-1',name:'Break',seconds:60}];
}
export function bellRemaining(state,now){return state?.running?Math.max(0,(Number(state.endsAt)||0)-now):Math.max(0,Number(state?.remainingMs)||0);}
export function progressBell(state,now){
  const segments=normalizeBellSegments(state?.segments);
  const index=Math.round(cap(state?.index,0,segments.length-1));
  if(!state?.running||!Number.isFinite(state.endsAt))return {...state,segments,index,advanced:0,completed:false};
  let i=index,end=state.endsAt,advanced=0;
  while(now>=end&&i<segments.length-1){
    i++;end+=segments[i].seconds*1000;advanced++;
  }
  if(now>=end)return {...state,segments,index:i,endsAt:null,remainingMs:0,running:false,advanced:advanced+1,completed:true};
  return {...state,segments,index:i,endsAt:end,remainingMs:Math.max(0,end-now),advanced,completed:false};
}
export function sanitizeWave4(saved){
  const s=saved&&typeof saved==='object'?saved:{},groups=s.groupMaker||{};
  const input=str(groups.input,7000),allowed=parseGroupNames(input);
  const validSet=new Set(allowed),used=new Set();
  const stored=list(groups.groups).slice(0,8).map(g=>list(g).slice(0,80).filter(n=>{
    if(typeof n!=='string'||!validSet.has(n)||used.has(n))return false;
    used.add(n);return true;
  }));
  const buzzer=s.buzzer||{},teams=list(buzzer.teams).slice(0,8)
    .map((n,i)=>str(n,32).trim()||'Team '+(i+1));
  const reaction=s.reactionTimer||{},bell=s.classBell||{};
  const segments=normalizeBellSegments(bell.segments);
  const index=Math.round(cap(bell.index,0,segments.length-1));
  const remainingMs=cap(bell.remainingMs,0,segments[index].seconds*1000,segments[index].seconds*1000);
  return {
    groupMaker:{input,count:Math.round(cap(groups.count,2,8,4)),groups:used.size===allowed.length&&stored.length?stored:[]},
    noiseMeter:{threshold:Math.round(cap(s.noiseMeter?.threshold,-55,-8,-28))},
    buzzer:{teams:teams.length>=2?teams:['Team 1','Team 2','Team 3','Team 4'],
      winner:Number.isInteger(buzzer.winner)&&buzzer.winner>=0&&buzzer.winner<teams.length?buzzer.winner:null},
    reactionTimer:{best:Number.isFinite(reaction.best)?Math.round(cap(reaction.best,1,20000,0)):null,
      attempts:list(reaction.attempts).slice(0,12).map(n=>Math.round(cap(n,1,20000,0))).filter(Boolean)},
    classBell:{segments,index,running:bell.running===true&&Number.isFinite(bell.endsAt)&&bell.endsAt>0,
      endsAt:bell.running===true&&Number.isFinite(bell.endsAt)?bell.endsAt:null,
      remainingMs}
  };
}
