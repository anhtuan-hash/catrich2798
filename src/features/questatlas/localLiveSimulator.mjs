import { answerMatches, cleanText, validatePuzzle } from './questModel.mjs';

// Free, deterministic TEACHER-ONLY rehearsal. State is ephemeral and never
// shared to devices, APIs or persistence. Real multi-device play requires RLS/RPC.
export function createRehearsal(quest, puzzles, count = 4) {
  const teamLimit=Number(count);
  if (!Number.isInteger(teamLimit) || teamLimit < 2 || teamLimit > 8)
    throw new Error('Chọn từ 2 đến 8 đội.');
  if (!quest || !Array.isArray(puzzles) || !puzzles.length)
    throw new Error('Cần ít nhất một câu hỏi để mô phỏng.');
  if (puzzles.length > 100) throw new Error('Tối đa 100 trạm mỗi Quest.');
  const stages=[...puzzles].sort((a,b)=>Number(a.position)-Number(b.position)).map((p,i)=>{
    const issue=validatePuzzle(p);
    if(issue)throw new Error('Trạm '+(i+1)+': '+issue);
    return {
      position:i+1,kind:p.kind,stem:cleanText(p.stem,500),
      options:p.kind==='choice'?[...p.options]:[],
      correct_answer:cleanText(p.correct_answer,180),
      points:Math.min(100,Math.max(1,Math.round(Number(p.points)||10))),
    };
  });
  return {
    mode:'offline-rehearsal',title:cleanText(quest.title,150),world:quest.world,
    status:'waiting',position:0,stages,
    teams:Array.from({length:teamLimit},(_,index)=>({
      no:index+1,name:'Đội '+(index+1),joined:false,answers:[],
    })),
  };
}
export function joinRehearsal(state,no,name) {
  if (!state || state.status==='finished') return state;
  const trimmed=cleanText(name,50);
  if (trimmed.length<2) throw new Error('Tên đội cần ít nhất hai ký tự.');
  if (!state.teams.some(t=>t.no===no))throw new Error('Không tồn tại đội.');
  return {...state,teams:state.teams.map(t=>t.no===no?
    (t.joined? t:{...t,joined:true,name:trimmed}):t)};
}
export function controlRehearsal(state,action) {
  if (!state) throw new Error('Chưa có phòng.');
  const next={...state};
  if (action==='start' && state.status==='waiting') {
    if (state.teams.filter(t=>t.joined).length<2)
      throw new Error('Cần tối thiểu hai đội tham gia trước khi bắt đầu.');
    next.status='active';next.position=1;
  } else if(action==='pause'&&state.status==='active')next.status='paused';
  else if(action==='resume'&&state.status==='paused')next.status='active';
  else if(action==='next'&&state.status==='active'){
    if(state.position>=state.stages.length)next.status='finished';
    else next.position=state.position+1;
  } else if(action==='finish'&&['active','paused'].includes(state.status))next.status='finished';
  else throw new Error('Thao tác không phù hợp với trạng thái phòng.');
  return next;
}
export function submitRehearsal(state,no,response) {
  if (!state || state.status!=='active')throw new Error('Phòng chưa nhận đáp án.');
  const team=state.teams.find(t=>t.no===no);
  if(!team?.joined)throw new Error('Đội chưa tham gia.');
  if(team.answers.some(a=>a.position===state.position))
    throw new Error('Đội đã trả lời trạm này.');
  const stage=state.stages[state.position-1];
  const correct=answerMatches(stage,response);
  const record={position:state.position,correct,points:correct?stage.points:0};
  return {...state,teams:state.teams.map(t=>t.no===no?
    {...t,answers:[...t.answers,record]}:t)};
}
export function resetRehearsalTeam(state,no) {
  if(!state||state.status==='finished')throw new Error('Không thể đặt lại khi đã kết thúc.');
  if(!state.teams.some(t=>t.no===no&&t.joined))throw new Error('Đội chưa tham gia.');
  return {...state,teams:state.teams.map(t=>t.no===no?{...t,joined:false,answers:[]}:t)};
}
export function rehearsalBoard(state) {
  if(!state)return [];
  return state.teams.filter(t=>t.joined).map(team=>({
    no:team.no,name:team.name,
    score:team.answers.reduce((sum,a)=>sum+a.points,0),
    submitted:team.answers.some(a=>a.position===state.position),
    correct:team.answers.filter(a=>a.correct).length,
  })).sort((a,b)=>b.score-a.score||a.no-b.no);
}
