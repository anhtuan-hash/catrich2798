// Brian Bomb Arena v1 — pure deterministic game rules, no external services.
export const ARENA_MODES = Object.freeze(['classic','chaos','luck','challenge']);
export const ARENA_SIZES = Object.freeze([4,5,6]);
const COUNTS = {
  classic:{points50:4,points100:6,points150:4,points200:2,bomb:3,minus:2,double:1,shield:1,steal:1,empty:1},
  chaos:{points50:2,points100:3,points150:1,points200:1,bomb:5,minus:3,double:2,shield:2,steal:3,swap:2,empty:1},
  luck:{points50:3,points100:5,points150:4,points200:2,bomb:5,minus:3,double:2,shield:1},
};
export const TILE_ICONS = Object.freeze({
  points50:'⭐',points100:'💎',points150:'🏆',points200:'🎁',bomb:'💣',
  minus:'⚡',double:'✨',shield:'🛡️',steal:'🔄',swap:'🔀',empty:'☁️',
});
const copy = value => JSON.parse(JSON.stringify(value));
const random = () => {
  if (typeof crypto!=='undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;
  }
  return Math.random();
};
const newId = () => (typeof crypto!=='undefined' && crypto.randomUUID) ? crypto.randomUUID()
  : 'arena-'+Date.now().toString(36)+'-'+Math.floor(random()*1e9).toString(36);
function generateEvents(mode,count,rng){
  const weights=COUNTS[mode==='challenge'?'classic':mode]||COUNTS.classic;
  const items=Object.entries(weights);
  const base=items.map(([key,n])=>({key,amount:Math.floor(n*count/25),fraction:n*count/25-Math.floor(n*count/25)}));
  let left=count-base.reduce((s,x)=>s+x.amount,0);
  base.sort((a,b)=>b.fraction-a.fraction);
  for(let i=0;i<left;i++)base[i%base.length].amount++;
  const bag=base.flatMap(x=>Array(x.amount).fill(x.key));
  for(let i=bag.length-1;i>0;i--){
    const j=Math.floor(Math.max(0,Math.min(0.999999999,rng()))*(i+1));
    [bag[i],bag[j]]=[bag[j],bag[i]];
  }
  return bag;
}
export function createArena(config={},rng=random){
  const size=ARENA_SIZES.includes(Number(config.size))?Number(config.size):5;
  const mode=ARENA_MODES.includes(config.mode)?config.mode:'classic';
  const teamCount=Math.max(2,Math.min(8,Number(config.teamCount)||4));
  const tiles=generateEvents(mode,size*size,rng).map((event,index)=>({
    id:index,label:String.fromCharCode(65+Math.floor(index/size))+(index%size+1),
    event,opened:false,owner:null
  }));
  const teams=Array.from({length:teamCount},(_,i)=>({
    id:'team-'+(i+1),name:String(config.teamNames?.[i]||'Team '+(i+1)).slice(0,32),
    score:0,bank:0,shields:0,turns:0
  }));
  return {schema:1,id:newId(),ownerId:String(config.ownerId||''),mode,size,
    questionGate:mode==='challenge'||Boolean(config.questionGate),
    questions:Array.isArray(config.questions)?config.questions.slice(0,300).map(q=>({
      prompt:String(q.prompt||'').slice(0,600),answer:String(q.answer||'').slice(0,300)
    })).filter(q=>q.prompt):[],
    tiles,teams,turn:0,questionIndex:0,selectedTile:null,phase:'ready',
    last:null,moves:0,theme:config.theme||'neon',updatedAt:Date.now(),history:[],future:[]};
}
function snapshot(state){
  const {history,future,...rest}=state;return copy(rest);
}
function advance(s){s.turn=(s.turn+1)%s.teams.length;s.selectedTile=null;}
function award(s,index){
  const cell=s.tiles[index],t=s.teams[s.turn];
  if(!cell||cell.opened||s.phase!=='running')return false;
  cell.opened=true;cell.owner=t.id;t.turns++;s.moves++;
  const kind=cell.event,before=t.score;
  const earn=n=>{if(s.mode==='luck')t.bank+=n;else t.score+=n;};
  let label=kind;
  if(kind.startsWith('points')){const points=Number(kind.slice(6));earn(points);label='+'+points;}
  else if(kind==='bomb'){
    if(t.shields>0){t.shields--;label='shield-used';}
    else if(s.mode==='luck'){t.bank=0;label='bank-lost';}
    else {t.score=0;label='bomb';}
  }else if(kind==='minus'){
    if(s.mode==='luck')t.bank=Math.max(0,t.bank-50);
    else t.score=Math.max(0,t.score-50);
    label='-50';
  }else if(kind==='double'){
    if(s.mode==='luck')t.bank*=2;else t.score*=2;
    label='x2';
  }else if(kind==='shield'){t.shields++;label='shield';}
  else if(kind==='steal'&&s.teams.length>1){
    const other=s.teams[(s.turn+1)%s.teams.length];
    const stolen=Math.min(100,other.score);other.score-=stolen;earn(stolen);label='steal-'+stolen;
  }else if(kind==='swap'&&s.teams.length>1){
    const other=s.teams[(s.turn+1)%s.teams.length];
    const tmp=t.score;t.score=other.score;other.score=tmp;label='swap';
  }else if(kind==='empty')label='empty';
  s.last={tile:cell.label,event:kind,label,team:t.name,before,after:t.score,bank:t.bank};
  s.questionIndex++;
  s.selectedTile=null;
  if(s.tiles.every(x=>x.opened)){
    if(s.mode==='luck')s.teams.forEach(team=>{team.score+=team.bank;team.bank=0;});
    s.phase='finished';
  }else if(s.mode!=='luck'||(kind==='bomb'&&label==='bank-lost'))advance(s);
  return true;
}
export function arenaReducer(state,action){
  if(!state||!action)return state;
  if(action.type==='UNDO'){
    if(!state.history.length)return state;
    const prev=state.history[state.history.length-1];
    return {...copy(prev),history:state.history.slice(0,-1),future:[snapshot(state),...state.future].slice(0,60),updatedAt:Date.now()};
  }
  if(action.type==='REDO'){
    if(!state.future.length)return state;
    return {...copy(state.future[0]),history:[...state.history,snapshot(state)].slice(-60),future:state.future.slice(1),updatedAt:Date.now()};
  }
  const s=snapshot(state);
  let changed=false;
  switch(action.type){
    case 'START':if(s.phase==='ready'||s.phase==='paused'){s.phase='running';changed=true;}break;
    case 'PAUSE':if(s.phase==='running'){s.phase='paused';changed=true;}break;
    case 'FINISH':if(s.phase==='running'||s.phase==='paused'){s.phase='finished';changed=true;}break;
    case 'TEAM':if(s.phase==='running'&&!s.selectedTile&&Number.isInteger(action.index)&&action.index>=0&&action.index<s.teams.length){s.turn=action.index;changed=true;}break;
    case 'SELECT':{
      if(s.phase!=='running'||s.selectedTile!==null||!s.tiles[action.index]||s.tiles[action.index].opened)break;
      if(s.questionGate){s.selectedTile=action.index;changed=true;}
      else changed=award(s,action.index);
      break;
    }
    case 'ANSWER':{
      if(s.phase!=='running'||s.selectedTile===null)break;
      if(action.correct===true)changed=award(s,s.selectedTile);
      else {s.last={event:'incorrect',team:s.teams[s.turn].name};s.selectedTile=null;s.questionIndex++;advance(s);changed=true;}
      break;
    }
    case 'BANK':{
      if(s.phase!=='running'||s.mode!=='luck'||s.selectedTile!==null)break;
      const team=s.teams[s.turn];team.score+=team.bank;team.bank=0;
      s.last={event:'bank',team:team.name,after:team.score};advance(s);changed=true;break;
    }
    case 'NEXT':if(s.phase==='running'&&!s.selectedTile){advance(s);changed=true;}break;
    case 'SCORE':{
      if(!['running','paused'].includes(s.phase)||!Number.isInteger(action.index)||!s.teams[action.index])break;
      const value=Number(action.value);
      if(!Number.isFinite(value))break;
      s.teams[action.index].score=Math.max(0,Math.min(999999,Math.round(value)));
      changed=true;break;
    }
    default:break;
  }
  if(!changed)return state;
  return {...s,history:[...state.history,snapshot(state)].slice(-60),future:[],updatedAt:Date.now()};
}
export function rankTeams(teams){
  return [...teams].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
}
