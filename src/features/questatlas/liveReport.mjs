// Teacher-only Live report. No puzzle statements, secret answers or student details.
const cell=(value)=>{
  const str=String(value??'');
  const safe=/^\s*[=+@-]/.test(str)?"'"+str:str;
  return '"'+safe.replace(/"/g,'""')+'"';
};

export function liveResultsReport(room,teams=[],attempts=[]) {
  if(!room||room.status!=='finished')throw new Error('Chỉ xuất khi phiên Live đã kết thúc.');
  if(!Array.isArray(teams)||!Array.isArray(attempts))throw new Error('Dữ liệu phiên Live không hợp lệ.');
  const stages=Array.isArray(room.puzzle_snapshot)?room.puzzle_snapshot:[];
  if(!stages.length)throw new Error('Phiên không có câu hỏi hợp lệ.');
  const maximum=stages.reduce((n,stage)=>n+Math.max(0,Number(stage.points)||0),0);
  if(maximum<=0)throw new Error('Tổng điểm tối đa không hợp lệ.');
  const entries=teams.map(team=>{
    const rows=attempts.filter(a=>a.team_id===team.id);
    const score=rows.reduce((n,a)=>n+Math.max(0,Number(a.points)||0),0);
    return {
      number:team.team_no,
      name:String(team.display_name||'').slice(0,50),
      score,
      scale10:Math.round(score/maximum*1000)/100,
      answered:rows.length,
      correct:rows.filter(a=>a.is_correct===true).length,
    };
  }).sort((a,b)=>b.score-a.score||a.number-b.number);
  return {maximum,completed:true,stages:stages.length,entries:entries.map((x,i)=>({...x,rank:i+1}))};
}

export function liveResultsCsv(room,teams,attempts) {
  const report=liveResultsReport(room,teams,attempts);
  const rows=[
    ['BRIAN QuestAtlas — Classroom Live Results'],
    ['Status','finished'],
    ['Stages',report.stages],
    ['Maximum points',report.maximum],
    [],
    ['Rank','Team #','Team name','Points','Scale (10)','Answered','Correct'],
    ...report.entries.map(x=>[x.rank,x.number,x.name,x.score,x.scale10,x.answered,x.correct]),
  ];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
