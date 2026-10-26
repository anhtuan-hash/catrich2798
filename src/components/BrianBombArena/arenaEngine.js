// Brian Bomb Arena v2: the visible tile is ALWAYS a number or a bomb on new boards.
// The engine is pure so all score/POT actions are atomic, undoable and testable.
export const ARENA_MODES = Object.freeze(['classic','chaos','luck','challenge']);
export const ARENA_SIZES = Object.freeze([4,5,6]);
export const POINT_VALUES = Object.freeze([10,20,30,50,100]);
// Every playable board has equal bombs and scoring tiles. In odd 5x5,
// C3 is a visibly locked FREE tile so the remaining 24 cells split 12/12.
const SCORES = Object.freeze(['points10','points20','points30','points50','points100']);
export const TILE_ICONS = Object.freeze({
  points10:'10',points20:'20',points30:'30',points50:'50',points100:'100',
  points150:'150',points200:'200',bomb:'💣',blocked:'◆',
  minus:'⚡',double:'✨',shield:'🛡️',steal:'🔄',swap:'🔀',empty:'☁️',
});
export const pointsForEvent = event => /^points\d+$/.test(String(event||''))
  ? Math.max(0,Number(String(event).slice(6))||0) : 0;
const clone = value=>JSON.parse(JSON.stringify(value));
const rngDefault=()=>{
  if(typeof crypto!=='undefined'&&crypto.getRandomValues){
    const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;
  }
  return Math.random();
};
const makeId=()=>(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():
  'arena-'+Date.now().toString(36)+'-'+Math.floor(rngDefault()*1e9).toString(36);
export function generateTileEvents(mode,count,rng=rngDefault){
  if(![16,25,36].includes(count))throw Error('Invalid arena size');
  const hasCenterLock=count%2===1;
  const playable=count-(hasCenterLock?1:0),perKind=playable/2;
  const items=[];
  // Balanced risk does not depend on mode. Modes only change the penalty
  // after a bomb is opened; the number of bombs stays exactly the same.
  for(let i=0;i<perKind;i++){
    items.push('bomb');
    items.push(SCORES[i%SCORES.length]);
  }
  // Fisher-Yates shuffle over playable tiles only (center remains locked).
  for(let i=items.length-1;i>0;i--){
    const raw=Number(rng());
    const n=Math.max(0,Math.min(.999999999,Number.isFinite(raw)?raw:0));
    const j=Math.floor(n*(i+1));
    [items[i],items[j]]=[items[j],items[i]];
  }
  if(hasCenterLock)items.splice((count-1)/2,0,'blocked');
  return items;
}
export function createArena(config={},rng=rngDefault){
  const size=ARENA_SIZES.includes(Number(config.size))?Number(config.size):5;
  const mode=ARENA_MODES.includes(config.mode)?config.mode:'luck';
  const teamCount=Math.max(2,Math.min(8,Number(config.teamCount)||4));
  const tiles=generateTileEvents(mode,size*size,rng).map((event,index)=>({
    id:index,label:String.fromCharCode(65+Math.floor(index/size))+(index%size+1),
    event,opened:event==='blocked',owner:null,
  }));
  const teams=Array.from({length:teamCount},(_,index)=>({
    id:'team-'+(index+1),name:String(config.teamNames?.[index]||'Team '+(index+1)).slice(0,32),
    score:0,bank:0,shields:0,turns:0,
  }));
  return {
    schema:1,ruleVersion:4,id:makeId(),ownerId:String(config.ownerId||''),mode,size,
    questionGate:mode==='challenge'||Boolean(config.questionGate),
    questions:Array.isArray(config.questions)?config.questions.slice(0,300).map(q=>({
      prompt:String(q.prompt||'').slice(0,600),answer:String(q.answer||'').slice(0,300),
      ...(Array.isArray(q.options)&&q.options.length===4?{
        options:q.options.map(value=>String(value).slice(0,200)),
        answerIndex:Number(q.answerIndex),
        explanation:String(q.explanation||'').slice(0,400),
        unit:Number(q.unit)||null,grade:Number(q.grade)||11,
      }:{}),
    })).filter(q=>q.prompt):[],
    tiles,teams,turn:0,questionIndex:0,selectedTile:null,phase:'ready',
    last:null,moves:0,theme:config.theme||'mint',updatedAt:Date.now(),history:[],future:[],
  };
}
function snapshot(state){const {history,future,...rest}=state;return clone(rest);}
function next(s){s.turn=(s.turn+1)%s.teams.length;s.selectedTile=null;}
function reveal(s,index){
  const tile=s.tiles[index],team=s.teams[s.turn];
  if(!tile||tile.opened||tile.event==='blocked'||s.phase!=='running')return false;
  const potBefore=team.bank,scoreBefore=team.score,kind=tile.event;
  tile.opened=true;tile.owner=team.id;team.turns++;s.moves++;
  const add=value=>{if(s.mode==='luck')team.bank+=value;else team.score+=value;};
  let label='',delta=pointsForEvent(kind);
  if(delta){add(delta);label='+'+delta;}
  else if(kind==='bomb'){
    if(team.shields>0){team.shields--;label='shield-used';}
    else if(s.mode==='luck'){team.bank=0;label='bank-lost';}
    else if(s.mode==='chaos'){team.score=Math.max(0,team.score-50);label='-50';}
    else label='turn-lost'; // Classic / Challenge never wipe previously secured scores.
  }
  // Compatibility with existing v1 saved boards. New boards never generate these.
  else if(kind==='minus'){team[s.mode==='luck'?'bank':'score']=Math.max(0,team[s.mode==='luck'?'bank':'score']-50);label='-50';}
  else if(kind==='double'){team[s.mode==='luck'?'bank':'score']*=2;label='x2';}
  else if(kind==='shield'){team.shields++;label='shield';}
  else if(kind==='steal'){const victim=s.teams[(s.turn+1)%s.teams.length];delta=Math.min(100,victim.score);victim.score-=delta;add(delta);label='steal-'+delta;}
  else if(kind==='swap'){const victim=s.teams[(s.turn+1)%s.teams.length];[team.score,victim.score]=[victim.score,team.score];label='swap';}
  else label='empty';
  s.last={tile:tile.label,tileId:index,event:kind,label,points:delta,team:team.name,
    before:scoreBefore,after:team.score,potBefore,potAfter:team.bank,bank:team.bank};
  s.questionIndex++;
  s.selectedTile=null;
  if(s.tiles.every(item=>item.opened)){
    // A complete board secures all existing pots, including the last revealed points.
    if(s.mode==='luck')s.teams.forEach(t=>{t.score+=t.bank;t.bank=0;});
    s.phase='finished';
  }else if(s.mode!=='luck'||(kind==='bomb'&&label==='bank-lost'))next(s);
  return true;
}
export function arenaReducer(state,action){
  if(!state||!action)return state;
  if(action.type==='UNDO'){
    if(!state.history?.length)return state;
    return {...clone(state.history.at(-1)),history:state.history.slice(0,-1),
      future:[snapshot(state),...(state.future||[])].slice(0,60),updatedAt:Date.now()};
  }
  if(action.type==='REDO'){
    if(!state.future?.length)return state;
    return {...clone(state.future[0]),history:[...(state.history||[]),snapshot(state)].slice(-60),
      future:state.future.slice(1),updatedAt:Date.now()};
  }
  const s=snapshot(state),team=s.teams?.[s.turn];
  if(!team)return state;
  let changed=false;
  switch(action.type){
    case 'START':if(['ready','paused'].includes(s.phase)){s.phase='running';changed=true;}break;
    case 'PAUSE':if(s.phase==='running'){s.phase='paused';changed=true;}break;
    case 'FINISH':
      if(['running','paused'].includes(s.phase)){
        if(s.mode==='luck')s.teams.forEach(t=>{t.score+=t.bank;t.bank=0;});
        s.phase='finished';s.selectedTile=null;changed=true;
      }break;
    case 'TEAM':
      if(s.phase==='running'&&s.selectedTile===null&&(!s.mode||s.mode!=='luck'||team.bank===0)
        &&Number.isInteger(action.index)&&s.teams[action.index]){s.turn=action.index;changed=s.turn!==state.turn;}
      break;
    case 'SELECT':
      if(s.phase!=='running'||s.selectedTile!==null||!Number.isInteger(action.index)
        ||!s.tiles[action.index]||s.tiles[action.index].opened)break;
      if(s.questionGate){s.selectedTile=action.index;changed=true;}
      else changed=reveal(s,action.index);
      break;
    case 'ANSWER_CHOICE':{
      // Authoritatively grade against the selected MCQ in the saved game state.
      // A tap is one atomic transaction: grade -> tile reveal -> score -> turn.
      if(s.phase!=='running'||s.selectedTile===null)break;
      const question=s.questions?.length?s.questions[s.questionIndex%s.questions.length]:null;
      const tile=s.tiles[s.selectedTile];
      if(!question||!Array.isArray(question.options)||question.options.length!==4
        ||!Number.isInteger(action.choice)||action.choice<0||action.choice>3
        ||!tile||tile.opened||tile.event==='blocked')break;
      const correct=action.choice===question.answerIndex;
      const before=team.score,potBefore=team.bank,amount=20;
      const chosenTile=s.selectedTile;
      // Question-gated MCQ rounds intentionally override the hidden tile:
      // correct answer = +20, incorrect answer = bomb and -20 secured points.
      // This avoids a right answer triggering a contradictory random bomb.
      tile.event=correct?'points20':'bomb';
      tile.opened=true;tile.owner=team.id;team.turns++;s.moves++;
      if(correct){
        if(s.mode==='luck')team.bank+=amount;
        else team.score+=amount;
      }else{
        team.bank=0;
        team.score=Math.max(0,team.score-amount);
      }
      s.last={
        event:tile.event,label:correct?'+20':'-20',tile:tile.label,tileId:chosenTile,
        team:team.name,points:correct?amount:-amount,grade:correct?'correct':'incorrect',
        chosen:action.choice,correctAnswer:question.answerIndex,
        before,after:team.score,potBefore,potAfter:team.bank,bank:team.bank,
      };
      s.selectedTile=null;s.questionIndex++;
      if(s.tiles.every(cell=>cell.opened)){
        if(s.mode==='luck')s.teams.forEach(t=>{t.score+=t.bank;t.bank=0;});
        s.phase='finished';
      }else if(!correct||s.mode!=='luck')next(s);
      changed=true;
      break;
    }
    case 'ANSWER':
      if(s.phase!=='running'||s.selectedTile===null)break;
      if(action.correct===true)changed=reveal(s,s.selectedTile);
      else{
        if(s.mode==='luck')team.bank=0;
        s.last={event:'incorrect',label:'incorrect',team:team.name,points:0,bank:team.bank};
        s.selectedTile=null;s.questionIndex++;next(s);changed=true;
      }break;
    case 'BANK':
      if(s.phase!=='running'||s.mode!=='luck'||s.selectedTile!==null||team.bank<=0)break;
      {const banked=team.bank;team.score+=banked;team.bank=0;
        s.last={event:'bank',label:'bank',team:team.name,points:banked,after:team.score,potAfter:0};
        next(s);changed=true;}
      break;
    case 'NEXT':
      if(s.phase==='running'&&s.selectedTile===null&&(s.mode!=='luck'||team.bank===0)){
        next(s);changed=true;
      }break;
    case 'SCORE':
      if(!['running','paused'].includes(s.phase)||!Number.isInteger(action.index)||!s.teams[action.index])break;
      {const value=Number(action.value);if(!Number.isFinite(value))break;
        const adjusted=Math.max(0,Math.min(999999,Math.round(value)));
        if(adjusted!==s.teams[action.index].score){s.teams[action.index].score=adjusted;changed=true;}}
      break;
    default:break;
  }
  if(!changed)return state;
  return {...s,history:[...(state.history||[]),snapshot(state)].slice(-60),future:[],updatedAt:Date.now()};
}
export function rankTeams(teams){return [...teams].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));}
