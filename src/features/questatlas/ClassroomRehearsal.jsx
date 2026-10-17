import React, { useMemo, useState } from 'react';
import { demoRecords } from './questModel.mjs';
import { createRehearsal, joinRehearsal, controlRehearsal,
  submitRehearsal, resetRehearsalTeam, rehearsalBoard, rehearsalCsv, rehearsalReport } from './localLiveSimulator.mjs';

const fallback=demoRecords();
export default function ClassroomRehearsal({quests=[],puzzles=[]}){
  const options=useMemo(()=>{
    const available=quests.filter(q=>puzzles.some(p=>p.quest_id===q.id))
      .map(q=>({...q,stages:puzzles.filter(p=>p.quest_id===q.id)}));
    return [{...fallback.quests[0],id:'qa-free-example',title:'DEMO · The Grammar Vault',
      stages:fallback.puzzles},...available];
  },[quests,puzzles]);
  const [selected,setSelected]=useState('qa-free-example');
  const [teamCount,setTeamCount]=useState(4);
  const [session,setSession]=useState(null);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const chosen=options.find(x=>x.id===selected)||options[0];
  const board=useMemo(()=>rehearsalBoard(session),[session]);
  const report=useMemo(()=>session?.status==='finished'?rehearsalReport(session):null,[session]);
  const stage=session?.status==='active'||session?.status==='paused'
    ?session.stages[session.position-1]:null;
  function action(operation) {
    try{
      setSession(operation(session));
      setError('');
    }catch(e){setError(e?.message||'Thao tác không thực hiện được.');}
  }
  function startRoom(){
    try{
      setSession(createRehearsal(chosen,chosen.stages,teamCount));
      setError('');
      setNotice('Đã tạo phòng mô phỏng trên trình duyệt. Không có kết nối học sinh thật.');
    }catch(e){setError(e.message);}
  }
  function joinAll(){
    try{
      let next=session;
      next.teams.forEach(t=>{if(!t.joined)next=joinRehearsal(next,t.no,'Đội '+t.no);});
      setSession(next);setError('');setNotice('Đã giả lập thiết bị cho các đội.');
    }catch(e){setError(e.message);}
  }
  function answer(no,correct){
    try{
      const answer=correct?stage.correct_answer:'__QUESTATLAS_WRONG_SIMULATION__';
      const next=submitRehearsal(session,no,answer);
      setSession(next);setError('');
      setNotice('Đội '+no+' đã gửi đáp án '+(correct?'đúng':'sai')+' (mô phỏng).');
    }catch(e){setError(e.message);}
  }
  function exportCsv(){
    if(!session||session.status!=='finished')return;
    let url=null;
    try{
      const content=rehearsalCsv(session);
      const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
      url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;
      anchor.download='questatlas-rehearsal-results.csv';
      anchor.style.display='none';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setNotice('Đã tạo bảng điểm CSV trên thiết bị. Không gửi dữ liệu lên máy chủ.');
      setError('');
    }catch(e){setError(e?.message||'Không thể tạo báo cáo.');}
    finally{if(url)URL.revokeObjectURL(url);}
  }
  const joined=session?.teams.filter(t=>t.joined).length||0;
  return <section className="qa-panel qa-rehearsal" aria-label="Phòng thi mô phỏng miễn phí">
    <header className="qa-panel-head">
      <div><h2>Phòng thi mô phỏng · Miễn phí</h2>
        <p>Chạy thử toàn bộ quy trình Classroom Live ngay trên trình duyệt, không cần database hoặc API có phí.</p>
      </div>
      <span className="qa-rehearsal-badge">OFFLINE · DEMO</span>
    </header>
    <p className="qa-info qa-warning">Đây là mô phỏng một thiết bị dành cho giáo viên, không phải phòng chơi đa thiết bị. Không tạo mã tham gia thật, không kết nối iPad và không lưu điểm lên BRIAN.</p>
    <div className="qa-rehearsal-setup">
      <label>Quest kiểm thử
        <select value={selected} disabled={!!session&&session.status!=='finished'} onChange={e=>setSelected(e.target.value)}>
          {options.map(q=><option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </label>
      <label>Số đội
        <select value={teamCount} disabled={!!session&&session.status!=='finished'} onChange={e=>setTeamCount(Number(e.target.value))}>
          {[2,3,4,5,6,7,8].map(n=><option value={n} key={n}>{n} đội</option>)}
        </select>
      </label>
      <button type="button" className="qa-primary" onClick={startRoom}>
        {session?'↻ Tạo lại phòng mô phỏng':'▶ Tạo phòng mô phỏng'}
      </button>
    </div>
    {error&&<p className="qa-info qa-error" role="alert">{error}</p>}
    {notice&&<p className="qa-info qa-success" role="status">{notice}</p>}
    {session&&<>
      <div className="qa-rehearsal-toolbar">
        <div><strong>{session.title}</strong><small>{session.status==='waiting'?'Chờ các đội tham gia':
          session.status==='active'?'Đang thi đấu':session.status==='paused'?'Đã tạm dừng':'Đã kết thúc'} ·
          {' '}{joined}/{session.teams.length} đội · Trạm {session.position}/{session.stages.length}</small></div>
        <div className="qa-quest-actions">
          {session.status==='waiting'&&<><button type="button" onClick={joinAll}>+ Thêm tất cả đội</button>
            <button type="button" className="qa-primary" disabled={joined<2} onClick={()=>action(s=>controlRehearsal(s,'start'))}>▶ Bắt đầu</button></>}
          {session.status==='active'&&<><button type="button" onClick={()=>action(s=>controlRehearsal(s,'pause'))}>Ⅱ Tạm dừng</button>
            <button type="button" className="qa-primary" onClick={()=>action(s=>controlRehearsal(s,'next'))}>
              {session.position===session.stages.length?'Kết thúc':'Trạm tiếp theo →'}</button></>}
          {session.status==='paused'&&<button type="button" className="qa-primary" onClick={()=>action(s=>controlRehearsal(s,'resume'))}>▶ Tiếp tục</button>}
          {['active','paused'].includes(session.status)&&
            <button type="button" onClick={()=>action(s=>controlRehearsal(s,'finish'))}>Kết thúc sớm</button>}
        </div>
      </div>
      {stage&&<div className="qa-rehearsal-question" aria-label="Câu hỏi tại trạm hiện tại">
        <small>STAGE {session.position} / {session.stages.length}</small>
        <h3>{stage.stem}</h3>
        {stage.kind==='choice'&&<div className="qa-rehearsal-options">{stage.options.map((x,i)=>
          <span key={i}><strong>{'ABCD'[i]}.</strong> {x}</span>)}</div>}
        <p>Điểm mỗi câu: <strong>{stage.points}</strong> · Giáo viên bấm đúng/sai để giả lập các đội trả lời.</p>
      </div>}
      <div className="qa-rehearsal-board">
        {session.teams.map(team=>{
          const score=board.find(x=>x.no===team.no);
          const answered=score?.submitted&&session.position>0;
          return <div className="qa-rehearsal-team" key={team.no}>
            <div><strong>#{team.no} {team.name}</strong><small>{team.joined?
                (answered?'Đã gửi đáp án':'Sẵn sàng'):'Chưa tham gia'}</small></div>
            <b>{score?.score||0} điểm</b>
            <div className="qa-rehearsal-team-actions">
              {!team.joined&&session.status!=='finished'&&
                <button type="button" disabled={session.status==='active'} onClick={()=>
                  action(s=>joinRehearsal(s,team.no,team.name))}>+ Tham gia</button>}
              {team.joined&&session.status==='active'&&!answered&&
                <><button type="button" onClick={()=>answer(team.no,true)}>✓ Đúng</button>
                  <button type="button" onClick={()=>answer(team.no,false)}>× Sai</button></>}
              {team.joined&&session.status!=='finished'&&
                <button type="button" onClick={()=>action(s=>resetRehearsalTeam(s,team.no))}>Đặt lại</button>}
            </div>
          </div>;
        })}
      </div>
      {report&&<div className="qa-rehearsal-results" role="region" aria-label="Báo cáo tổng kết mô phỏng">
        <div><strong>Báo cáo hoàn thành</strong>
          <p>{report.entries.length} đội · {report.totalStages} trạm · {report.maxScore} điểm tối đa</p>
          <p>Đây là dữ liệu giả lập của giáo viên, không phải điểm kiểm tra thật.</p>
        </div>
        <button type="button" className="qa-primary" onClick={exportCsv}>↓ Xuất CSV bảng điểm mô phỏng</button>
      </div>}
      {session.status==='finished'&&<div className="qa-rehearsal-done" role="status">
        Hoàn thành bài diễn tập · {board.length} đội ·
        {board.length?' Đội dẫn đầu: '+board[0].name+' ('+board[0].score+' điểm)':' Chưa có đội'}
      </div>}
    </>}
  </section>;
}
