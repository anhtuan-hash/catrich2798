// Optional Chaos Five rules. Pure operations; legacy sessions bypass these.
export const CHAOS_FEATURES=Object.freeze(['defuse','combo','shield','timer','boss']);
const finiteNow=now=>Number.isFinite(Number(now))?Number(now):Date.now();
export function buildChaosKit(features=CHAOS_FEATURES,difficulty='extreme'){
  const enabled=Object.fromEntries(CHAOS_FEATURES.map(feature=>[feature,features.includes(feature)]));
  return {
    version:1,enabled:true,features:enabled,difficulty:'extreme',
    timerSeconds:15,questionDueAt:null,remainingMs:null,
    bossTrigger:5,bossMaxHP:3,bossHP:3,bossActive:false,
    bossDefeated:false,bonus:100,
  };
}
export const isChaosKit=s=>Boolean(s?.mode==='chaos'&&s.chaosKit?.enabled);
export function beginChaosQuestion(s,now){
  if(!isChaosKit(s)||!s.chaosKit.features.timer)return;
  s.chaosKit.remainingMs=s.chaosKit.timerSeconds*1000;
  s.chaosKit.questionDueAt=finiteNow(now)+s.chaosKit.remainingMs;
}
export function pauseChaosTimer(s,now){
  if(!isChaosKit(s)||!s.chaosKit.features.timer||s.selectedTile===null)return;
  if(s.chaosKit.questionDueAt!==null){
    s.chaosKit.remainingMs=Math.max(0,s.chaosKit.questionDueAt-finiteNow(now));
    s.chaosKit.questionDueAt=null;
  }
}
export function resumeChaosTimer(s,now){
  if(!isChaosKit(s)||!s.chaosKit.features.timer||s.selectedTile===null)return;
  const ms=s.chaosKit.remainingMs??s.chaosKit.timerSeconds*1000;
  s.chaosKit.questionDueAt=finiteNow(now)+ms;
}
export function resolveChaosAnswer(s,action){
  if(!isChaosKit(s)||s.phase!=='running'||s.selectedTile===null)return false;
  const team=s.teams[s.turn],tile=s.tiles[s.selectedTile];
  const question=s.questions?.length?s.questions[s.questionIndex%s.questions.length]:null;
  if(!team||!tile||tile.opened||tile.event==='blocked'||!question||!Array.isArray(question.options)||
    !Number.isInteger(question.answerIndex)||question.answerIndex<0||question.answerIndex>3)return false;
  const timedOut=action.type==='TIMEOUT'||(s.chaosKit.features.timer&&
    s.chaosKit.questionDueAt!==null&&finiteNow(action.now)>=s.chaosKit.questionDueAt);
  // A timeout must originate from an active deadline; prevents accidental
  // timeout requests in timer-disabled sessions.
  if(action.type==='TIMEOUT'&&(!s.chaosKit.features.timer||
    s.chaosKit.questionDueAt===null||finiteNow(action.now)<s.chaosKit.questionDueAt))return false;
  if(!timedOut&&(!Number.isInteger(action.choice)||action.choice<0||action.choice>3))return false;
  const correct=!timedOut&&action.choice===question.answerIndex;
  const kit=s.chaosKit,oldScore=team.score,potBefore=team.bank;
  const previousCombo=team.combo||0;
  let awarded=0,shieldUsed=false,shieldEarned=false,bossHit=false,bossDefeated=false;
  if(correct){
    team.combo=previousCombo+1;
    const multiplier=kit.features.combo?(team.combo>=6?3:team.combo>=3?2:1):1;
    awarded=20*multiplier;
    team.score+=awarded;
    if(kit.features.shield&&team.combo%3===0&&team.shields<2){
      team.shields++;shieldEarned=true;
    }
    if(kit.features.boss&&kit.bossActive&&!kit.bossDefeated){
      kit.bossHP=Math.max(0,kit.bossHP-1);bossHit=true;
      if(kit.bossHP===0){kit.bossDefeated=true;bossDefeated=true;team.score+=kit.bonus;awarded+=kit.bonus;}
    }
  }else{
    team.combo=0;
    team.bank=0;
    if(kit.features.shield&&team.shields>0){team.shields--;shieldUsed=true;}
    else team.score=Math.max(0,team.score-20);
  }
  const tileId=s.selectedTile;
  tile.event=correct?'points'+(20*(kit.features.combo?(team.combo>=6?3:team.combo>=3?2:1):1)):'bomb';
  tile.opened=true;tile.owner=team.id;team.turns++;s.moves++;
  kit.questionDueAt=null;kit.remainingMs=null;
  s.last={
    event:tile.event,label:correct?'+'+awarded:shieldUsed?'shield-used':'-20',
    tile:tile.label,tileId,team:team.name,grade:correct?'correct':'incorrect',
    points:correct?awarded:(shieldUsed?0:-Math.min(20,oldScore)),
    before:oldScore,after:team.score,potBefore,potAfter:team.bank,
    chosen:timedOut?null:action.choice,correctAnswer:question.answerIndex,
    timedOut,combo:team.combo,multiplier:kit.features.combo?(team.combo>=6?3:team.combo>=3?2:1):1,
    shieldUsed,shieldEarned,bossHit,bossDefeated,bossHP:kit.bossHP,
  };
  s.questionIndex++;s.selectedTile=null;
  const remaining=s.tiles.filter(t=>!t.opened).length;
  if(remaining===0){
    s.phase='finished';
  }else{
    if(kit.features.boss&&!kit.bossActive&&remaining<=kit.bossTrigger)kit.bossActive=true;
    s.turn=(s.turn+1)%s.teams.length;
  }
  return true;
}
