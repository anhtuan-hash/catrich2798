/** V8.4 classroom live control plane. No PII or student submissions leave the teacher browser.
 * Remote device endpoints are disabled until authenticated RLS / moderation are approved.
 */
export const LIVE_LIMITS=Object.freeze({options:6,maxVotes:500,words:80,notes:60,
 queue:80,text:80,ttlMinutes:45,teacherActionsPerSecond:5});
export const LIVE_MODES=['poll','cloud','wall'];
export const LIVE_STATUSES=['draft','live','paused','closed'];
const uid=()=>{
 if(typeof crypto==='undefined'||!crypto.getRandomValues)throw Error('Secure random unavailable');
 return Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
};
const str=(value,max=LIVE_LIMITS.text)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Math.floor(Number(value)):min));
export const isLiveActive=(session,now=Date.now())=>!!(session&&session.status==='live'&&
 now<session.expiresAt&&session.expiresAt>session.startedAt);
export function createLiveSession(mode='poll',now=Date.now()){
 if(!LIVE_MODES.includes(mode))throw Error('Invalid classroom activity');
 return {id:uid(),mode,status:'draft',title:mode==='poll'?'Quick Class Poll':
  mode==='cloud'?'Word Cloud':'Sticky Wall',startedAt:now,
  expiresAt:now+LIVE_LIMITS.ttlMinutes*60000,question:'',
  options:['Option A','Option B','Option C','Option D'],
  votes:[0,0,0,0],submissions:[],publicIds:[],queue:[],showResults:true,version:1};
}
export function advanceLiveSession(session,action,now=Date.now()){
 if(!session)return null;
 if(action==='close')return {...session,status:'closed',version:session.version+1};
 if(action==='start'&&session.status==='draft'&&now<session.expiresAt)
  return {...session,status:'live',startedAt:now,version:session.version+1};
 if(action==='resume'&&session.status==='paused'&&now<session.expiresAt)
  return {...session,status:'live',version:session.version+1};
 if(action==='pause'&&session.status==='live')
  return {...session,status:'paused',version:session.version+1};
 return session;
}
export function editLiveQuestion(session,question,options=session.options){
 if(!session||session.status!=='draft')return session;
 const sanitized=(Array.isArray(options)?options:[]).slice(0,LIVE_LIMITS.options)
  .map(o=>str(o,65)).filter(Boolean);
 const chosen=sanitized.length>=2?sanitized:['Option A','Option B'];
 return {...session,question:str(question,220),options:chosen,
  votes:chosen.map(()=>0),version:session.version+1};
}
export function recordTeacherVote(session,index,amount=1){
 if(!session||session.mode!=='poll'||!isLiveActive(session)||!Number.isInteger(index)||
  index<0||index>=session.options.length)return session;
 const votes=[...session.votes];
 votes[index]=clamp(votes[index]+clamp(amount,-1,1),0,LIVE_LIMITS.maxVotes);
 return {...session,votes,version:session.version+1};
}
const allowedText=(input)=>str(input).replace(/<[^>]*>/g,'').trim();
export function queueTeacherContribution(session,text,kind=session?.mode){
 if(!session||!isLiveActive(session)||!['cloud','wall'].includes(kind)||
  kind!==session.mode||session.queue.length>=LIVE_LIMITS.queue)return session;
 const value=allowedText(text);
 if(!value)return session;
 const token={id:uid(),text:value.slice(0,kind==='cloud'?35:LIVE_LIMITS.text),
  state:'pending',at:Date.now()};
 return {...session,queue:[...session.queue,token],version:session.version+1};
}
export function moderateContribution(session,id,approved){
 if(!session||!id||!['live','paused'].includes(session.status))return session;
 const found=session.queue.find(x=>x.id===id);
 if(!found)return session;
 const queue=session.queue.filter(x=>x.id!==id);
 const limit=session.mode==='cloud'?LIVE_LIMITS.words:LIVE_LIMITS.notes;
 const submissions=approved&&session.submissions.length<limit?
  [...session.submissions,{id:found.id,text:found.text,at:found.at}]:session.submissions;
 return {...session,queue,submissions,version:session.version+1};
}
export function clearLiveEntries(session){
 if(!session||session.status==='closed')return session;
 return {...session,submissions:[],queue:[],votes:session.votes.map(()=>0),version:session.version+1};
}
export function publicLiveSnapshot(session,now=Date.now()){
 if(!session||!LIVE_MODES.includes(session.mode)||session.status==='draft')return null;
 const status=now>=session.expiresAt?'closed':session.status;
 const common={kind:session.mode,status,title:str(session.title,100),
  question:str(session.question,220),expiresAt:clamp(session.expiresAt,0,Date.now()+86400000),
  version:clamp(session.version,0,1000000)};
 if(session.mode==='poll'){
  const options=session.options.slice(0,LIVE_LIMITS.options).map(s=>str(s,65));
  return {...common,options,
   votes:session.showResults||status==='closed'?session.votes.slice(0,options.length)
    .map(n=>clamp(n,0,LIVE_LIMITS.maxVotes)):null};
 }
 // Only teacher-approved contributions are exposed; no queue, IP, token or identity.
 const entries=session.submissions.slice(0,session.mode==='cloud'?LIVE_LIMITS.words:LIVE_LIMITS.notes)
  .map(({text})=>str(text,session.mode==='cloud'?35:LIVE_LIMITS.text));
 return {...common,entries};
}
export function aggregateCloud(entries=[]){
 const counts=new Map();
 for(const raw of entries.slice(0,LIVE_LIMITS.words)){
  const key=str(raw,35);
  if(key)counts.set(key,(counts.get(key)||0)+1);
 }
 return [...counts.entries()].map(([text,count])=>({text,count}))
  .sort((a,b)=>b.count-a.count||a.text.localeCompare(b.text)).slice(0,45);
}
