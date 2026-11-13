const cut=(value,max=360)=>String(value||'').trim().slice(0,max);
export function presentationCueCards(learning={}){
 return [
  {label:'Problem',text:cut(learning.issue)||'Introduce the school problem in your own words.'},
  {label:'Evidence',text:cut(learning.evidence)||'State the source and group sample size only if verified.'},
  {label:'Action',text:cut(learning.solution)||'Explain one feasible action and a limitation.'}
 ];
}
export function speakingTime(seconds){const s=Math.max(0,Math.min(60,Math.floor(Number(seconds)||0)));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
