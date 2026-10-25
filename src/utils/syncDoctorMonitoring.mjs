// Sync Doctor automatic-health summary, pure and privacy preserving.
// Monitoring counts are only heuristic indicators; they are NOT verified student errors.
const validNum=(v)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
export const SYNC_MONITOR_MAX_AGE_HOURS=36;
export function summarizeSyncMonitor(runs, nowMs=Date.now()){
  const rows=Array.isArray(runs)?runs:[];
  const current=rows[0];
  if(!current)return Object.freeze({kind:'unverified',isStale:true,historyCount:0,possibleLinks:null,affected:null,delta:null,checkedAt:null});
  const when=Date.parse(String(current.checked_at||''));
  const ageHours=Number.isFinite(when)?Math.max(0,(nowMs-when)/3600000):Infinity;
  const stale=ageHours>SYNC_MONITOR_MAX_AGE_HOURS || !Number.isFinite(when) || when>nowMs+60000;
  const previous=rows.find((x,i)=>i>0&&x.school_year===current.school_year&&x.checked_at!==current.checked_at);
  const links=validNum(current.possible_missing_links);
  const mismatches=current.counter_mismatch_workspaces===null||current.counter_mismatch_workspaces===undefined?
    null:validNum(current.counter_mismatch_workspaces);
  const delta=previous?links-validNum(previous.possible_missing_links):null;
  const limited= current.status==='partial' || validNum(current.canonical_classes)===0 || validNum(current.gradebook_workspaces)===0;
  const kind=stale?'stale':limited?'partial':current.status==='attention'||links>0||(mismatches!==null&&mismatches>0)?'attention':'healthy';
  return Object.freeze({
    kind,isStale:stale,historyCount:rows.length,possibleLinks:links,
    affected:validNum(current.affected_workspaces),counterMismatches:mismatches,delta,checkedAt:current.checked_at,
    ageHours,schoolYear:current.school_year,
  });
}
