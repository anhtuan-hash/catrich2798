// Brian Family Feud — deterministic teacher-operated game engine.
// No question/answer is claimed to represent an actual survey.
const copy=value=>JSON.parse(JSON.stringify(value));
const finite=(value,min,max,fallback)=>{const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.round(n))):fallback;};
const nowValue=now=>Number.isFinite(Number(now))?Number(now):Date.now();
const normalize=text=>String(text||'').trim().replace(/\s+/g,' ').toLowerCase();
const secureId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():
 'feud-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e8).toString(36);
const snap=s=>{const {history,future,...rest}=s;return copy(rest);};
export const FEUD_ROUND_LIMITS=Object.freeze([3,5,8,10]);
export const FEUD_MAX_TEAMS=6;
export function validateFeudBank(bank){
  if(!Array.isArray(bank)||!bank.length||bank.length>120)throw Error('Choose 1–120 valid survey-style boards.');
  const ids=new Set(),prompts=new Set();
  return bank.map((item,index)=>{
    const prompt=String(item?.prompt||'').trim();
    const category=String(item?.category||'English Classroom').trim().slice(0,70);
    const answers=item?.answers;
    if(prompt.length<15||prompt.length>240||!Array.isArray(answers)||answers.length!==6)
      throw Error('Board '+(index+1)+' needs a question and exactly six answers.');
    if(prompts.has(normalize(prompt)))throw Error('Duplicate question on board '+(index+1));
    prompts.add(normalize(prompt));
    const unique=new Set();
    const validated=answers.map((entry,j)=>{
      const text=String(entry?.text||'').trim(),points=Number(entry?.points);
      if(!text||text.length>90||!Number.isInteger(points)||points<1||points>100)
        throw Error('Invalid answer '+(j+1)+' on board '+(index+1));
      if(unique.has(normalize(text)))throw Error('Repeated answer on board '+(index+1));
      unique.add(normalize(text));return {text,points};
    });
    if(validated.reduce((sum,a)=>sum+a.points,0)!==100)
      throw Error('Game points must total 100 for board '+(index+1));
    let id=String(item.id||'').trim();
    if(!id||ids.has(id))id='custom-board-'+(index+1);
    ids.add(id);
    return {id,category,prompt,answers:validated};
  });
}
export function createFamilyFeud(options={}){
  const bank=validateFeudBank(options.bank);
  const count=Math.min(bank.length,FEUD_ROUND_LIMITS.includes(Number(options.roundLimit))?Number(options.roundLimit):5);
  const teams=Array.from({length:finite(options.teamCount,2,6,2)},(_,i)=>({
    id:'team-'+(i+1),name:String(options.teamNames?.[i]||'Team '+(i+1)).trim().slice(0,32)||'Team '+(i+1),
    score:0,roundWins:0,
  }));
  return {
    schema:1,id:secureId(),ownerId:String(options.ownerId||''),createdAt:Date.now(),
    phase:'ready',bank,roundLimit:count,roundIndex:0,
    edition:options.edition?{id:String(options.edition.id||''),unit:Number(options.edition.unit)||null,
      title:String(options.edition.title||'').slice(0,100)}:null,
    teams,controller:0,stealer:1,
    multiplier:1,pointsPot:0,strikes:0,revealed:[],showAll:false,
    last:null,fast:null,fastPlayed:false,
    history:[],future:[],updatedAt:Date.now(),
  };
}
export const currentFeudBoard=s=>s?.bank?.[s.roundIndex]||null;
function clampScore(value){return finite(value,0,999999,0);}
function award(s,teamIndex,reason){
  const team=s.teams[teamIndex];
  if(!team||s.phase==='round_done'||s.phase==='finished')return false;
  team.score=clampScore(team.score+s.pointsPot);
  team.roundWins++;
  s.last={kind:reason,team:team.name,points:s.pointsPot,multiplier:s.multiplier};
  s.phase='round_done';
  return true;
}
function nextMultiplier(nextIndex,roundLimit){
  return nextIndex===roundLimit-1?3:nextIndex===roundLimit-2?2:1;
}
function settleFast(s){
  if(!s.fast||s.fast.settled)return false;
  const player=s.teams[s.fast.team];
  if(!player)return false;
  player.score=clampScore(player.score+s.fast.points);
  s.fast.settled=true;s.fast.dueAt=null;s.fast.remainingMs=0;
  s.phase='fast_done';s.fastPlayed=true;
  s.last={kind:'fast_money',team:player.name,points:s.fast.points,
    reachedTarget:s.fast.points>=200};
  return true;
}
function finishFastLeg(s){
  const f=s.fast;
  if(!f||s.phase!=='fast_money')return false;
  if(f.player===0){
    f.player=1;f.index=0;f.remainingMs=45000;f.dueAt=null;f.paused=true;
    return true;
  }
  return settleFast(s);
}
function runFastAnswer(s,action,pass=false){
  const f=s.fast;
  if(!f||s.phase!=='fast_money'||f.paused||f.index>=f.questions.length)return false;
  const now=nowValue(action.now);
  if(f.dueAt!==null&&now>=f.dueAt)return finishFastLeg(s);
  let points=0;
  if(!pass){
    const answerIndex=Number(action.index);
    if(!Number.isInteger(answerIndex)||answerIndex<0||answerIndex>=f.questions[f.index].answers.length)return false;
    if(f.player===1&&f.answers.some(a=>a.player===0&&a.boardId===f.questions[f.index].id&&a.answerIndex===answerIndex))
      return false; // Repeated Fast Money answers are prohibited on the second pass.
    points=f.questions[f.index].answers[answerIndex].points;
  }
  f.answers.push({player:f.player,boardId:f.questions[f.index].id,answerIndex:pass?null:Number(action.index),points});
  f.points+=points;f.index++;
  if(f.index>=f.questions.length)return finishFastLeg(s);
  return true;
}
export function feudReducer(state,action){
  if(!state||!action?.type)return state;
  if(action.type==='UNDO'||action.type==='REDO'){
    const undo=action.type==='UNDO';
    if(undo?!state.history.length:!state.future.length)return state;
    const restored=undo?copy(state.history.at(-1)):copy(state.future[0]);
    const result={...restored,
      history:undo?state.history.slice(0,-1):[...state.history,snap(state)].slice(-60),
      future:undo?[snap(state),...state.future].slice(0,60):state.future.slice(1),
      updatedAt:Date.now()};
    if(result.phase==='fast_money'&&result.fast&&!result.fast.paused){
      result.fast.dueAt=Date.now()+(result.fast.remainingMs??45000);
    }
    return result;
  }
  const s=snap(state),board=currentFeudBoard(s);
  let changed=false;
  switch(action.type){
    case 'SET_CONTROLLER':
      if(s.phase==='ready'&&Number.isInteger(action.index)&&s.teams[action.index]){
        s.controller=action.index;
        s.stealer=(action.index+1)%s.teams.length;changed=s.controller!==state.controller;
      }break;
    case 'SET_MULTIPLIER':
      if(s.phase==='ready'&&[1,2,3].includes(action.value)){
        s.multiplier=action.value;changed=s.multiplier!==state.multiplier;
      }break;
    case 'START_ROUND':
      if(s.phase==='ready'&&board){s.phase='playing';changed=true;}break;
    case 'REVEAL':{
      if(!['playing','steal'].includes(s.phase)||!board)break;
      if(!Number.isInteger(action.index)||!board.answers[action.index]||s.revealed.includes(action.index))break;
      s.revealed.push(action.index);
      s.pointsPot=clampScore(s.pointsPot+board.answers[action.index].points*s.multiplier);
      if(s.phase==='steal')changed=award(s,s.stealer,'steal_success');
      else if(s.revealed.length===board.answers.length)changed=award(s,s.controller,'all_revealed');
      else{changed=true;s.last={kind:'reveal',answerIndex:action.index,points:board.answers[action.index].points*s.multiplier};}
      break;
    }
    case 'STRIKE':
      if(s.phase==='playing'){
        s.strikes++;
        if(s.strikes>=3)s.phase='steal';
        s.last={kind:'strike',strikes:s.strikes};
        changed=true;
      }else if(s.phase==='steal')changed=award(s,s.controller,'steal_failed');
      break;
    case 'SET_STEALER':
      if(s.phase==='steal'&&Number.isInteger(action.index)&&s.teams[action.index]&&action.index!==s.controller){
        s.stealer=action.index;changed=s.stealer!==state.stealer;
      }break;
    case 'END_ROUND':
      if(s.phase==='playing'||s.phase==='steal')changed=award(s,s.controller,'manual_settlement');
      break;
    case 'SHOW_ALL':
      if(s.phase==='round_done'&&!s.showAll){s.showAll=true;changed=true;}break;
    case 'NEXT_ROUND':
      if(s.phase==='round_done'){
        if(s.roundIndex+1>=s.roundLimit){s.phase='finished';}
        else{
          s.roundIndex++;s.phase='ready';
          s.controller=(s.controller+1)%s.teams.length;
          s.stealer=(s.controller+1)%s.teams.length;
          s.multiplier=nextMultiplier(s.roundIndex,s.roundLimit);
          s.pointsPot=0;s.revealed=[];s.strikes=0;s.showAll=false;
        }
        changed=true;
      }break;
    case 'FINISH_GAME':
      if(['ready','round_done'].includes(s.phase)){s.phase='finished';changed=true;}
      break;
    case 'FAST_START':
      if(s.phase!=='finished'||s.fastPlayed||!Number.isInteger(action.team)||!s.teams[action.team])break;
      {
        const unused=s.bank.slice(s.roundLimit);
        const fastBoards=(unused.length>=5?unused:s.bank).slice(0,5);
        if(fastBoards.length<5)break;
         s.fast={team:action.team,questions:fastBoards,index:0,player:0,points:0,
          answers:[],remainingMs:45000,dueAt:nowValue(action.now)+45000,
          paused:false,settled:false,target:200};
        s.phase='fast_money';changed=true;
      }break;
    case 'FAST_ANSWER':changed=runFastAnswer(s,action);break;
    case 'FAST_PASS':changed=runFastAnswer(s,action,true);break;
    case 'FAST_TIMEOUT':
      if(s.phase==='fast_money'&&s.fast&&!s.fast.paused&&s.fast.dueAt!==null&&
        nowValue(action.now)>=s.fast.dueAt)changed=finishFastLeg(s);
      break;
    case 'FAST_FINISH':
      if(s.phase==='fast_money')changed=settleFast(s);
      break;
    case 'FAST_PAUSE':
      if(s.phase==='fast_money'&&s.fast&&!s.fast.paused){
        s.fast.remainingMs=Math.max(0,s.fast.dueAt-nowValue(action.now));
        s.fast.dueAt=null;s.fast.paused=true;changed=true;
      }break;
    case 'FAST_RESUME':
      if(s.phase==='fast_money'&&s.fast?.paused){
        s.fast.dueAt=nowValue(action.now)+s.fast.remainingMs;
        s.fast.paused=false;changed=true;
      }break;
    default:break;
  }
  if(!changed)return state;
  return {...s,history:[...state.history,snap(state)].slice(-60),future:[],updatedAt:Date.now()};
}
export function rankFeudTeams(teams=[]){
  return [...teams].sort((a,b)=>b.score-a.score||b.roundWins-a.roundWins||a.name.localeCompare(b.name));
}
function parseRows(content){
  const text=String(content||'').replace(/^\uFEFF/,'');
  const rows=[],row=[];let field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(char==='"'){
      if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;
    }else if(char===','&&!quoted){row.push(field);field='';}
    else if((char==='\n'||char==='\r')&&!quoted){
      row.push(field);field='';if(row.some(x=>x.trim()))rows.push([...row]);row.length=0;
      if(char==='\r'&&text[i+1]==='\n')i++;
    }else field+=char;
  }
  if(quoted)throw Error('Unclosed CSV quote.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  return rows;
}
export function importFeudCSV(text){
  if(String(text||'').length>300000)throw Error('CSV file is too large (300 KB max).');
  const rows=parseRows(text);
  if(rows.length&&normalize(rows[0][0])==='question')rows.shift();
  const groups=new Map();
  for(const [question,answer,points,category] of rows){
    const prompt=String(question||'').trim(),key=normalize(prompt);
    if(!key)continue;
    if(!groups.has(key))groups.set(key,{prompt,category:category||'Custom Bank',answers:[]});
    groups.get(key).answers.push({text:String(answer||'').trim(),points:Number(points)});
  }
  return validateFeudBank([...groups.values()]);
}
const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
export function exportFeudCSV(bank){
  return '\uFEFFquestion,answer,points,category\r\n'+validateFeudBank(bank)
    .flatMap(q=>q.answers.map(a=>[q.prompt,a.text,a.points,q.category].map(quote).join(',')))
    .join('\r\n');
}
export function exportFeudResults(game){
  return '\uFEFFteam,score,round_wins\r\n'+rankFeudTeams(game?.teams||[])
    .map(t=>[t.name,t.score,t.roundWins].map(quote).join(',')).join('\r\n');
}
