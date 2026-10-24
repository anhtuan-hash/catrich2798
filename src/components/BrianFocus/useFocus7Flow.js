import { useEffect, useRef, useState } from 'react';
const key=id=>'bfc-flow-v7:'+String(id||'guest');
const empty=()=>({active:false,phase:'work',cycle:1,work:25,rest:5,repeats:4});
function read(id){try{const raw=JSON.parse(localStorage.getItem(key(id))||'null');
 return raw&&typeof raw==='object'?{...empty(),...raw,active:raw.active===true}:empty();
}catch{return empty();}}
export default function useFocus7Flow(userId,timer,completionToken){
 const [record,setRecord]=useState(()=>({owner:userId,flow:read(userId)}));
 const current=record.owner===userId?record.flow:read(userId);
 const timerRef=useRef(timer);timerRef.current=timer;
 const processed=useRef(completionToken);
 useEffect(()=>{setRecord({owner:userId,flow:read(userId)});processed.current=completionToken;},[userId]);
 useEffect(()=>{if(record.owner!==userId)return;
   try{localStorage.setItem(key(userId),JSON.stringify(record.flow));}catch{}
 },[record,userId]);
 const write=patch=>setRecord(old=>({owner:userId,flow:{...(old.owner===userId?old.flow:read(userId)),...patch}}));
 const start=config=>{
   const work=Math.min(180,Math.max(1,Math.round(Number(config.work)||25)));
   const rest=Math.min(180,Math.max(1,Math.round(Number(config.rest)||5)));
   const repeats=Math.min(10,Math.max(1,Math.round(Number(config.repeats)||4)));
   write({active:true,phase:'work',cycle:1,work,rest,repeats});
   timerRef.current.startPreset('custom',work);
 };
 const stop=()=>{write({active:false});timerRef.current.pause();};
 useEffect(()=>{
   if(processed.current===completionToken)return;
   processed.current=completionToken;
   if(record.owner!==userId||!current.active)return;
   // Timer finished naturally. The same parent owns this hook while overlay
   // is closed, so phases advance without remounting media or losing time.
   if(current.phase==='work'){
     if(current.cycle>=current.repeats){write({active:false});return;}
     write({phase:'break'});
     timerRef.current.startPreset('recovery',current.rest);
   }else{
     write({phase:'work',cycle:current.cycle+1});
     timerRef.current.startPreset('custom',current.work);
   }
 },[completionToken,userId]);
 return {flow:current,start,stop};
}
