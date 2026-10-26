// Brian Bomb Arena v2: the visible tile is ALWAYS a number or a bomb on new boards.
// The engine is pure so all score/POT actions are atomic, undoable and testable.
export const ARENA_MODES = Object.freeze(['classic','chaos','luck','challenge']);
export const ARENA_SIZES = Object.freeze([4,5,6]);
export const POINT_VALUES = Object.freeze([10,20,30,50,100]);
const COUNTS = Object.freeze({
  // For a 5×5 board. Other board sizes use largest-remainder proportional scaling.
  classic:{points10:7,points20:6,points30:5,points50:4,points100:1,bomb:2},
  chaos:{points10:5,points20:5,points30:4,points50:4,points100:1,bomb:6},
  luck:{points10:7,points20:6,points30:4,points50:3,points100:1,bomb:4},
});
export const TILE_ICONS = Object.freeze({
  points10:'10',points20:'20',points30:'30',points50:'50',points100:'100',
  points150:'150',points200:'200',bomb:'💣',
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
  if(!Number.isInteger(count)||count<1||count>36)throw Error('Invalid arena size');
  const weights=COUNTS[mode==='challenge'?'classic':mode]||COUNTS.classic;
  const allocations=Object.entries(weights).map(([key,n])=>{
    const exact=n*count/25;return {key,amount:Math.floor(exact),remainder:exact%1};
  });
  let left=count-allocations.reduce((sum,item)=>sum+item.amount,0);
  allocations.sort((a,b)=>b.remainder-a.remainder);
  for(let i=0;i<left;i++)allocations[i%allocations.length].amount++;
  const values=allocations.flatMap(item=>Array(item.amount).fill(item.key));
  for(let i=values.length-1;i>0;i--){
    const raw=Number(rng());
    const j=Math.floor(Math.max(0,Math.min(0.999999999,Number.isFinite(raw)?raw:0))*(i+1));
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}
export function createArena(config={},rng=rngDefault){
  const size=ARENA_SIZES.includes(Number(config.size))?Number(config.size):5;
  const mode=ARENA_MODES.includes(config.mode)?config.mode:'luck';
  const teamCount=Math.max(2,Math.min(8,Number(config.teamCount)||4));
  const tiles=generateTileEvents(mode,size*size,rng).map((event,index)=>({
    id:index,label:String.fromCharCode(65+Math.floor(index/size))+(index%size+1),
    event,opened:false,owner:null,
  }));
  const teams=Array.from({length:teamCount},(_,index)=>({
    id:'team-'+(index+1),name:String(config.teamNames?.[index]||'Team '+(index+1)).slice(0,32),
    score:0,bank:0,shields:0,turns:0,
  }));
  return {
    schema:1,ruleVersion:2,id:makeId(),ownerId:String(config.ownerId||''),mode,size,
    questionGate:mode==='challenge'||Boolean(config.questionGate),
    questions:Array.isArray(config.questions)?config.questions.slice(0,300).map(q=>({
      prompt:String(q.prompt||'').slice(0,600),answer:String(q.answer||'').slice(0,300),
    })).filter(q=>q.prompt):[],
    tiles,teams,turn:0,questionIndex:0,selectedTile:null,phase:'ready',
    last:null,moves:0,theme:config.theme||'mint',updatedAt:Date.now(),history:[],future:[],
  };
}
function snapshot(state){const {history,future,...rest}=state;return clone(rest);}
function next(s){s.turn=(s.turn+1)%s.teams.length;s.selectedTile=null;}
function reveal(s,index){
  const tile=s.tiles[index],team=s.teams[s.turn];
  if(!tile||tile.opened||s.phase!=='running')return false;
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
