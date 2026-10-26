import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {
  Users,Trophy,Play,X,ArrowRight,RotateCcw,Eye,EyeOff,Volume2,VolumeX,
  Undo2,Redo2,Download,Upload,CheckCircle2,Timer,Settings2,Sparkles,
  Crown,Gift,Pause,FastForward,Check,FileDown,HelpCircle
} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {readBubbleMotion} from '../../utils/bubbleMotion.js';
import {createArenaSound} from '../BrianBombArena/arenaSound.js';
import {FAMILY_FEUD_BANK,FAMILY_FEUD_BANK_NOTICE} from './familyFeudBank.js';
import {
  createFamilyFeud,feudReducer,rankFeudTeams,currentFeudBoard,
  FEUD_ROUND_LIMITS,importFeudCSV,exportFeudCSV,exportFeudResults
} from './familyFeudEngine.js';
import {loadFeud,saveFeud,clearFeud} from './familyFeudStorage.js';
import './BrianFamilyFeud.css';

const TEAM_COLORS=['#F39A3D','#59B6F8','#E275C8','#65D4A3','#B89AF9','#F2D067'];
const allowedUser=user=>Boolean(user?.id&&user.approved!==false&&(
  isAdminRole(user.role)||isDepartmentLeaderRole(user.role)||normalizeSystemRole(user.role)==='teacher'));
const exportFile=(name,contents)=>{
  const file=new Blob([contents],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(file),link=document.createElement('a');
  link.href=url;link.download=name;document.body.appendChild(link);
  link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
};
const showPoints=(number)=>Number(number||0).toLocaleString('en-US');

export default function BrianFamilyFeud({currentUser,language='vi'}){
  const vi=language!=='en',tr=(vn,en)=>vi?vn:en,ownerId=String(currentUser?.id||'');
  const allowed=allowedUser(currentUser);
  const [open,setOpen]=useState(false),[exiting,setExiting]=useState(false);
  const exitTimer=useRef(null),soundRef=useRef(null),fxTimer=useRef(null);
  const fastTimerLock=useRef(null);
  const [loaded,setLoaded]=useState(false),[game,setGame]=useState(null);
  const [teamCount,setTeamCount]=useState(4),[teamNames,setTeamNames]=useState('');
  const [roundLimit,setRoundLimit]=useState(5),[grade,setGrade]=useState('all');
  const [customBank,setCustomBank]=useState(null),[hostKey,setHostKey]=useState(false);
  const [soundOn,setSoundOn]=useState(true),[confirmReset,setConfirmReset]=useState(false);
  const [status,setStatus]=useState(''),[fx,setFx]=useState(null),[fastTime,setFastTime]=useState(45);
  const [fastTeam,setFastTeam]=useState(0);
  const [fullscreenFocus,setFullscreenFocus]=useState(true);
  const motion=readBubbleMotion();
  const motionKind=motion.effect,motionDuration=motion.duration;
  const shellRef=useRef(null);

  const playSound=type=>{
    if(!soundOn)return;
    try{
      if(!soundRef.current)soundRef.current=createArenaSound();
      soundRef.current.play(type,{style:'arcade',volume:65});
    }catch{/* A missing audio permission must never interrupt grading. */}
  };
  const animate=(type,label)=>{
    window.clearTimeout(fxTimer.current);
    setFx({id:Date.now(),type,label});
    fxTimer.current=window.setTimeout(()=>setFx(null),type==='strike'?1400:1800);
  };
  const dispatch=action=>setGame(prev=>prev?feudReducer(prev,action):prev);
  useEffect(()=>{
    if(!allowed||!ownerId)return;
    let active=true;setLoaded(false);
    void loadFeud(ownerId).then(saved=>{
      if(!active)return;
      if(saved?.schema===1&&saved.ownerId===ownerId&&Array.isArray(saved.bank)&&Array.isArray(saved.teams)){
        // A resumed Fast Money timer never runs invisibly while the app is closed.
        if(saved.phase==='fast_money'&&saved.fast&&!saved.fast.paused){
          saved.fast.remainingMs=Math.max(0,Math.min(45000,(saved.fast.dueAt||Date.now())-Date.now()));
          saved.fast.dueAt=null;saved.fast.paused=true;
        }
        setGame(saved);
      }
      setLoaded(true);
    }).catch(()=>{if(active)setLoaded(true);});
    return()=>{active=false;};
  },[allowed,ownerId]);
  useEffect(()=>{
    if(!loaded||!ownerId||!game)return;
    let active=true;
    void saveFeud(ownerId,game).then(ok=>{if(active&&!ok)setStatus(tr('Không thể lưu trên thiết bị này.','Could not save on this device.'));});
    return()=>{active=false;};
  },[game,loaded,ownerId]);
  useEffect(()=>()=>{window.clearTimeout(exitTimer.current);window.clearTimeout(fxTimer.current);soundRef.current?.close?.();},[]);
  const closePanel=()=>{
    if(exiting)return;
    if(game?.phase==='fast_money'&&!game.fast?.paused)dispatch({type:'FAST_PAUSE',now:Date.now()});
    if(motionDuration<=0){setOpen(false);return;}
    setExiting(true);
    exitTimer.current=window.setTimeout(()=>{setOpen(false);setExiting(false);},motionDuration);
  };
  const openPanel=()=>{
    if(!soundRef.current)soundRef.current=createArenaSound();
    soundRef.current.unlock?.();
    window.clearTimeout(exitTimer.current);setExiting(false);setOpen(true);
  };
  useEffect(()=>{
    if(!open)return;
    const old=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const onKey=e=>{
      if(e.key==='Escape'){
        if(confirmReset)setConfirmReset(false);
        else closePanel();
        return;
      }
      const tag=e.target?.tagName;
      if(['INPUT','TEXTAREA','SELECT'].includes(tag)||e.ctrlKey||e.metaKey||e.altKey)return;
      if(!game||!hostKey)return;
      if(['playing','steal'].includes(game.phase)){
        if(/^[1-6]$/.test(e.key)){
          const index=Number(e.key)-1;
          const board=currentFeudBoard(game);
          if(board?.answers[index]&&!game.revealed.includes(index))doReveal(index);
        }else if(e.key.toLowerCase()==='x')doStrike();
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=old;};
  },[open,confirmReset,game,hostKey,soundOn]);
  useEffect(()=>{
    if(!game||game.phase!=='fast_money'||game.fast?.paused||!Number.isFinite(game.fast?.dueAt)||!open)return;
    const key=game.id+':'+game.fast.index+':'+game.fast.dueAt;
    fastTimerLock.current=null;
    const check=()=>{
      const now=Date.now(),seconds=Math.max(0,Math.ceil((game.fast.dueAt-now)/1000));
      setFastTime(seconds);
      if(now>=game.fast.dueAt&&fastTimerLock.current!==key){
        fastTimerLock.current=key;dispatch({type:'FAST_TIMEOUT',now});
        playSound('bomb');animate('strike',tr('HẾT GIỜ!','TIME UP!'));
      }
    };
    check();
    const handle=window.setInterval(check,120);
    return()=>window.clearInterval(handle);
  },[open,game?.id,game?.phase,game?.fast?.dueAt,game?.fast?.index,game?.fast?.paused]);
  useEffect(()=>{
    if(!open||game?.phase!=='fast_money'||game.fast?.paused)return;
    const onHidden=()=>{if(document.visibilityState==='hidden')dispatch({type:'FAST_PAUSE',now:Date.now()});};
    document.addEventListener('visibilitychange',onHidden);
    return()=>document.removeEventListener('visibilitychange',onHidden);
  },[open,game?.phase,game?.fast?.paused]);

  const selection=useMemo(()=>{
    const items=customBank||FAMILY_FEUD_BANK;
    return grade==='all'?items:items.filter(q=>q.category.startsWith('English '+grade+' ·'));
  },[grade,customBank]);
  const start=()=>{
    if(selection.length<3){setStatus(tr('Cần tối thiểu 3 bảng câu hỏi.','At least 3 boards are required.'));return;}
    const names=teamNames.split(/[\n;]/).map(x=>x.trim()).filter(Boolean);
    try{
      const created=createFamilyFeud({ownerId,bank:selection,roundLimit,teamCount,teamNames:names});
      setGame(created);setHostKey(false);setStatus('');playSound('bank');
    }catch(e){setStatus(String(e.message||e));}
  };
  const newGame=async()=>{
    await clearFeud(ownerId);setGame(null);setConfirmReset(false);setHostKey(false);
    setStatus(tr('Đã bắt đầu cấu hình ván mới.','Ready to configure a new game.'));
  };
  const importCSV=async e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{
      if(f.size>300000)throw Error('CSV max 300 KB.');
      const parsed=importFeudCSV(await f.text());
      setCustomBank(parsed);setGrade('all');
      setStatus(tr('Đã nhập ','Imported ')+parsed.length+tr(' bảng câu hỏi riêng.',' custom boards.'));
    }catch(error){setStatus('⚠️ '+String(error.message||error));}
    e.target.value='';
  };
  const doReveal=index=>{
    if(!game||!['playing','steal'].includes(game.phase))return;
    const board=currentFeudBoard(game);
    if(!board?.answers[index]||game.revealed.includes(index))return;
    const wasSteal=game.phase==='steal',all=game.revealed.length+1===board.answers.length;
    dispatch({type:'REVEAL',index});
    playSound(wasSteal||all?'win':'bigpoints');
    animate(wasSteal?'win':'reveal',wasSteal?tr('CƯỚP ĐIỂM THÀNH CÔNG!','STEAL SUCCESS!'):
      '+'+showPoints(board.answers[index].points*game.multiplier));
  };
  const doStrike=()=>{
    if(!game||!['playing','steal'].includes(game.phase))return;
    const failedSteal=game.phase==='steal';
    dispatch({type:'STRIKE'});playSound('wrong');
    animate('strike',failedSteal?tr('CƯỚP ĐIỂM THẤT BẠI','STEAL FAILED'):'✖');
  };
  const fastAnswer=index=>{
    if(game?.phase!=='fast_money'||game.fast.paused)return;
    if(Date.now()>=game.fast.dueAt){dispatch({type:'FAST_TIMEOUT',now:Date.now()});return;}
    const isLast=game.fast.index===game.fast.questions.length-1;
    dispatch({type:'FAST_ANSWER',index,now:Date.now()});
    playSound(isLast?'win':'points');
    animate('reveal','+'+game.fast.questions[game.fast.index].answers[index].points);
  };
  const fastPass=()=>{
    if(game?.phase!=='fast_money'||game.fast.paused)return;
    dispatch({type:'FAST_PASS',now:Date.now()});playSound('flip');
  };
  const board=currentFeudBoard(game);
  const controller=game?.teams?.[game.controller],stealer=game?.teams?.[game.stealer];
  const fastBoard=game?.fast?.questions?.[game.fast?.index];
  const ranking=rankFeudTeams(game?.teams||[]);
  const currentMult=game?.multiplier||1;

  if(!allowed)return null;
  const launch=<button type="button" className="bff-bubble" aria-label={tr('Mở Brian Family Feud','Open Brian Family Feud')}
      title="Brian Family Feud" onClick={openPanel}>
      <Users size={27} strokeWidth={2.1}/>
      <span className="bff-bubble-hint">Family Feud</span>
    </button>;
  const setup=<div className="bff-setup">
    <header className="bff-intro">
      <span className="bff-eyebrow">THE CLASSROOM SURVEY SHOW</span>
      <h2>{tr('Một câu hỏi. Sáu đáp án. Cả lớp bùng nổ!','One question. Six answers. One big showdown!')}</h2>
      <p>{tr('Học sinh đoán câu trả lời; giáo viên bấm lật ô, ghi điểm, trao quyền cướp điểm và điều khiển Fast Money.',
        'Students call out answers. The teacher reveals tiles, manages strikes and steals, and hosts Fast Money.')}</p>
    </header>
    <div className="bff-setup-grid">
      <section className="bff-card">
        <h3>{tr('01 · Đội thi đấu','01 · Teams')}</h3>
        <div className="bff-team-stepper"><button type="button" onClick={()=>setTeamCount(c=>Math.max(2,c-1))}>−</button>
          <strong>{teamCount} {tr('đội','teams')}</strong>
          <button type="button" onClick={()=>setTeamCount(c=>Math.min(6,c+1))}>+</button></div>
        <label className="bff-field">{tr('Tên đội (mỗi dòng một đội)','Team names (one per line)')}
          <textarea value={teamNames} onChange={e=>setTeamNames(e.target.value.slice(0,400))} rows={4}
            placeholder={tr('Nhóm 1\nNhóm 2\nNhóm 3','Team 1\nTeam 2\nTeam 3')}/></label>
        <h3>{tr('02 · Số vòng chơi','02 · Rounds')}</h3>
        <div className="bff-pills">{FEUD_ROUND_LIMITS.map(n=><button type="button" key={n} className={roundLimit===n?'is-active':''}
            onClick={()=>setRoundLimit(n)}>{n} {tr('vòng','rounds')}</button>)}</div>
        <p className="bff-muted">{tr('Hai vòng cuối tự động nhân đôi và nhân ba điểm.','The last two rounds automatically double and triple the points.')}</p>
      </section>
      <section className="bff-card">
        <h3>{tr('03 · Bộ câu hỏi','03 · Question bank')}</h3>
        <label className="bff-field">{tr('Chọn nội dung','Choose content')}
          <select value={grade} onChange={e=>setGrade(e.target.value)}>
            <option value="all">{tr('Tất cả khối lớp','All grades')}</option>
            <option value="10">English 10</option><option value="11">English 11</option><option value="12">English 12</option>
          </select></label>
        <div className="bff-bank-preview">
          <b>{selection.length} {tr('bảng câu hỏi','question boards')}</b>
          <p>{selection[0]?.prompt||tr('Chưa có câu hỏi','No questions available')}</p>
          <small>{tr('Mỗi bảng gồm sáu gợi ý đáp án và tổng 100 điểm mô phỏng.',
            'Each board has six suggested answers totaling 100 gameplay points.')}</small>
        </div>
        <div className="bff-import-actions">
          <label className="bff-upload"><Upload size={17}/>{tr('Nhập CSV','Import CSV')}
            <input type="file" accept=".csv,text/csv" onChange={importCSV}/></label>
          <button type="button" onClick={()=>exportFile('brian-family-feud-bank.csv',exportFeudCSV(selection))}>
            <FileDown size={17}/>{tr('Tải CSV','Export CSV')}</button>
          {customBank&&<button type="button" onClick={()=>{setCustomBank(null);setGrade('all');}}>
            <RotateCcw size={15}/>{tr('Mặc định','Defaults')}</button>}
        </div>
        <div className="bff-disclaimer">ⓘ {tr('Điểm được biên soạn phục vụ trò chơi; không phải khảo sát 100 người thật.',
          FAMILY_FEUD_BANK_NOTICE)}</div>
      </section>
    </div>
    {status&&<p className="bff-status" role="status">{status}</p>}
    <button type="button" className="bff-action bff-start" onClick={start} disabled={!loaded||selection.length<3}>
      <Play size={23}/>{tr('TẠO VÁN FAMILY FEUD','CREATE FAMILY FEUD GAME')}<ArrowRight size={22}/></button>
  </div>;
  const scorebar=game&&<div className="bff-scorebar">
    {game.teams.map((team,index)=><section key={team.id}
      className={'bff-team'+(game.controller===index?' is-controlling':'')+(game.phase==='steal'&&game.stealer===index?' is-stealer':'')}
      style={{'--bff-team-color':TEAM_COLORS[index%TEAM_COLORS.length]}}>
      <button type="button" onClick={()=>dispatch({type:game.phase==='steal'?'SET_STEALER':'SET_CONTROLLER',index})}
        disabled={game.phase!=='ready'&&game.phase!=='steal'||game.phase==='steal'&&index===game.controller}
        aria-label={tr('Chọn đội ','Select team ')+team.name}><span className="bff-team-color"/>{team.name}</button>
      <strong>{showPoints(team.score)}</strong><small>{team.roundWins} {tr('vòng thắng','wins')}</small>
    </section>)}
  </div>;
  const playScreen=game&&<div className="bff-game">
    {scorebar}
    <div className="bff-round-banner">
      <span>{tr('VÒNG','ROUND')} {Math.min(game.roundIndex+1,game.roundLimit)} / {game.roundLimit}</span>
      <strong>{tr('NHÂN ĐIỂM','MULTIPLIER')} ×{currentMult}</strong>
      {game.phase==='ready'&&<div className="bff-pills">{[1,2,3].map(n=><button key={n} type="button"
        className={currentMult===n?'is-active':''} onClick={()=>dispatch({type:'SET_MULTIPLIER',value:n})}>×{n}</button>)}</div>}
      <span>{tr('POT','POT')}: <b>{showPoints(game.pointsPot)}</b></span>
    </div>
    <div className="bff-play-grid">
      <section className="bff-board-panel">
        <div className="bff-board-head">
          <span className="bff-eyebrow">BRIAN FAMILY FEUD</span>
          <h2>{board?.prompt}</h2>
          <small>{board?.category}</small>
        </div>
        <div className="bff-answer-board" aria-label={tr('Bảng sáu đáp án','Six-answer survey-style board')}>
          {board?.answers.map((answer,index)=>{
            const revealed=game.revealed.includes(index)||game.showAll;
            return <button type="button" key={index} className={'bff-answer-tile'+(revealed?' is-revealed':'')}
              disabled={!hostKey||!['playing','steal'].includes(game.phase)||game.revealed.includes(index)}
              onClick={()=>doReveal(index)}
              title={hostKey&&!revealed?tr('Lật ô số ','Reveal slot ')+(index+1):undefined}
              aria-label={tr('Đáp án ','Answer ')+(index+1)+(revealed?': '+answer.text:' · hidden')}>
              <span className="bff-answer-rank">{index+1}</span>
              <span className="bff-answer-text">{revealed?answer.text:'••••••••••'}</span>
              <strong className="bff-answer-points">{revealed?answer.points*currentMult:'?'}</strong>
            </button>;
          })}
        </div>
        <div className="bff-strikes" aria-label={tr('Số lần trả lời sai','Strike counter')}>
          {[0,1,2].map(i=><span key={i} className={i<game.strikes?'is-struck':''}>{i<game.strikes?'✖':'○'}</span>)}
        </div>
      </section>
      <aside className="bff-control-panel">
        <div className="bff-control-card">
          <span className="bff-eyebrow">{tr('LƯỢT CỦA','CONTROLLING TEAM')}</span>
          <h3>{controller?.name}</h3>
          <p>{game.phase==='ready'?tr('Sẵn sàng cho câu hỏi mới.','Ready to start a new question.'):
             game.phase==='steal'?tr('Ba lần sai! Đội khác được cướp điểm.','Three strikes! The other team can steal.'):
             game.phase==='round_done'?tr('Vòng này đã chốt điểm.','Round points have been awarded.'):
             tr('Học sinh nêu đáp án, giáo viên lật ô phù hợp.','Students call out answers; the teacher reveals matching tiles.')}</p>
        </div>
        {game.phase==='steal'&&<div className="bff-steal-card">
          <span className="bff-eyebrow">⚡ {tr('CƠ HỘI CƯỚP ĐIỂM','STEAL CHANCE')}</span>
          <h3>{stealer?.name}</h3>
          <p>{tr('Đội cướp chỉ có một lần đoán. Nhấn đáp án đúng trong bảng điều khiển hoặc chọn Sai.',
            'The stealing team gets one guess. Reveal a correct answer, or record a failed steal.')}</p>
        </div>}
        {['playing','steal'].includes(game.phase)&&<div className="bff-host-card">
          <button className="bff-host-toggle" type="button" onClick={()=>setHostKey(v=>!v)}
            aria-pressed={hostKey}>{hostKey?<EyeOff size={19}/>:<Eye size={19}/>}
            {hostKey?tr('ẨN ĐÁP ÁN GIÁO VIÊN','HIDE HOST KEY'):tr('MỞ ĐÁP ÁN GIÁO VIÊN','SHOW HOST KEY')}</button>
          {hostKey?<div className="bff-host-answers">{board?.answers.map((item,i)=><button type="button"
            key={i} disabled={game.revealed.includes(i)} onClick={()=>doReveal(i)}>
            <b>{i+1}</b><span>{item.text}</span><strong>{item.points*currentMult}</strong></button>)}</div>:
            <small>{tr('Bảng đáp án được ẩn khi trình chiếu. Mở khi cần điều khiển.',
              'Answer key stays concealed during projection. Open it to reveal answers.')}</small>}
        </div>}
        <div className="bff-actions">
          {game.phase==='ready'&&<button className="bff-action bff-primary" type="button" onClick={()=>{
            dispatch({type:'START_ROUND'});playSound('flip');
          }}><Play size={21}/>{tr('BẮT ĐẦU VÒNG','START ROUND')}</button>}
          {['playing','steal'].includes(game.phase)&&<>
            <button className="bff-action bff-strike-btn" type="button" onClick={doStrike}>
              <X size={24}/>{game.phase==='steal'?tr('CƯỚP SAI — CHỐT VÒNG','STEAL FAILED — AWARD ROUND'):tr('ĐÁP ÁN SAI +1 X','WRONG ANSWER +1 X')}</button>
            <button className="bff-action bff-subtle" type="button" onClick={()=>{
              dispatch({type:'END_ROUND'});playSound('bank');
            }}>{tr('Chốt điểm và kết thúc vòng','End & award this round')}</button>
          </>}
          {game.phase==='round_done'&&<>
            <p className="bff-round-result"><Trophy size={20}/>{game.last?.team} +{showPoints(game.last?.points)}</p>
            <button className="bff-action bff-subtle" type="button" onClick={()=>dispatch({type:'SHOW_ALL'})}>
              <Eye size={18}/>{tr('Hiện tất cả đáp án','Reveal all answers')}</button>
            <button className="bff-action bff-primary" type="button" onClick={()=>{dispatch({type:'NEXT_ROUND'});setHostKey(false);}}>
              <ArrowRight size={19}/>{game.roundIndex+1<game.roundLimit?tr('VÒNG TIẾP THEO','NEXT ROUND'):tr('XEM KẾT QUẢ','FINAL RESULTS')}</button>
            <button className="bff-action bff-subtle" type="button" onClick={()=>dispatch({type:'FINISH_GAME'})}>
              {tr('Kết thúc trò chơi tại đây','Finish game now')}</button>
          </>}
        </div>
        <div className="bff-shortcuts">{tr('Giáo viên: 1–6 để mở ô, X ghi sai (khi đã bật đáp án).',
          'Teacher: 1–6 reveal answer, X records strike (when Host Key is visible).')}</div>
      </aside>
    </div>
  </div>;
  const resultsScreen=game&&<div className="bff-results">
    <span className="bff-eyebrow">FAMILY FEUD · CLASSROOM CHAMPIONS</span>
    <h2>🏆 {tr('BẢNG XẾP HẠNG','FINAL SCOREBOARD')}</h2>
    <div className="bff-podium">{ranking.map((team,index)=><section key={team.id}
       className={'bff-podium-card'+(index===0?' is-winner':'')}>
      <span>{index===0?'👑':'#'+(index+1)}</span><h3>{team.name}</h3>
      <strong>{showPoints(team.score)}</strong><small>{team.roundWins} {tr('vòng thắng','round wins')}</small>
    </section>)}</div>
    <div className="bff-results-actions">
      <button type="button" className="bff-action" onClick={()=>exportFile('brian-family-feud-scores.csv',exportFeudResults(game))}>
        <Download size={19}/>{tr('Xuất bảng điểm CSV','Export scoreboard CSV')}</button>
      {!game.fastPlayed&&game.bank.length>=5&&<div className="bff-fast-launch">
        <label>{tr('Đội vào vòng Fast Money','Fast Money finalist')}
          <select value={fastTeam} onChange={e=>setFastTeam(Number(e.target.value))}>
            {game.teams.map((team,index)=><option key={team.id} value={index}>{team.name}</option>)}</select>
        </label>
        <button className="bff-action bff-primary" type="button" onClick={()=>{
          dispatch({type:'FAST_START',team:fastTeam,now:Date.now()});playSound('win');
        }}><Timer size={19}/>{tr('FAST MONEY · 45 GIÂY','FAST MONEY · 45 SECONDS')}</button>
      </div>}
      {game.fastPlayed&&<div className="bff-fast-result">
        <Gift size={25}/>{tr('Fast Money: ','Fast Money: ')}{showPoints(game.fast?.points)} / 200
        {game.fast?.points>=200?' 🎉':''}</div>}
      <button type="button" className="bff-action" onClick={()=>setConfirmReset(true)}>
        <RotateCcw size={18}/>{tr('Tạo ván Family Feud mới','Create another Family Feud game')}</button>
    </div>
  </div>;
  const fastScreen=game?.fast&&<div className="bff-fast-screen">
    {scorebar}
    <div className="bff-fast-header">
      <span className="bff-eyebrow">BRIAN FAMILY FEUD · FAST MONEY</span>
      <h2>{game.fast.questions.length} {tr('CÂU HỎI THẦN TỐC','QUICKFIRE QUESTIONS')}</h2>
      <div className={'bff-fast-clock'+(fastTime<=10?' is-danger':'')}>
        <Timer size={27}/>{game.fast.paused?tr('TẠM DỪNG','PAUSED'):fastTime+'s'}</div>
      <strong>{showPoints(game.fast.points)} / 200 {tr('điểm mục tiêu','target points')}</strong>
    </div>
    <div className="bff-fast-question">
      <span>{tr('CÂU','QUESTION')} {Math.min(game.fast.index+1,5)} / 5</span>
      <h3>{fastBoard?.prompt||'—'}</h3>
    </div>
    <div className="bff-fast-answers">{fastBoard?.answers.map((answer,index)=><button key={index} type="button"
      disabled={game.fast.paused} onClick={()=>fastAnswer(index)}>
      <span>{index+1}</span><strong>{answer.text}</strong><b>+{answer.points}</b></button>)}</div>
    <div className="bff-fast-actions">
      <button type="button" onClick={()=>dispatch({type:game.fast.paused?'FAST_RESUME':'FAST_PAUSE',now:Date.now()})}
        className="bff-action bff-primary">{game.fast.paused?<Play size={17}/>:<Pause size={17}/>}
        {game.fast.paused?tr('Tiếp tục','Resume'):tr('Tạm dừng','Pause')}</button>
      <button type="button" onClick={fastPass} disabled={game.fast.paused} className="bff-action">
        <FastForward size={17}/>{tr('Bỏ qua câu này','Pass this question')}</button>
      <button type="button" onClick={()=>dispatch({type:'FAST_FINISH'})} className="bff-action">
        <Check size={17}/>{tr('Kết thúc Fast Money','Finish Fast Money')}</button>
    </div>
  </div>;

  return <>
    {!open&&createPortal(launch,document.body)}
    {open&&createPortal(<section className="bff-shell" role="dialog" aria-modal="true" aria-label="Brian Family Feud"
       ref={shellRef} data-bubble-phase={exiting?'exit':'enter'} data-motion-kind={motionKind}
       style={{'--bff-motion-duration':motionDuration+'ms'}}>
      <header className="bff-topbar">
        <div className="bff-brand"><span className="bff-brand-icon">👨‍👩‍👧‍👦</span><div>
          <strong>BRIAN FAMILY FEUD</strong><small>THE CLASSROOM SHOWDOWN</small></div></div>
        <div className="bff-header-actions">
          {game&&<button type="button" title="Undo" disabled={!game.history.length} onClick={()=>dispatch({type:'UNDO'})}><Undo2 size={20}/></button>}
          {game&&<button type="button" title="Redo" disabled={!game.future.length} onClick={()=>dispatch({type:'REDO'})}><Redo2 size={20}/></button>}
          <button type="button" title={tr('Bật/tắt âm thanh','Toggle sound')} onClick={()=>setSoundOn(x=>!x)}>
            {soundOn?<Volume2 size={20}/>:<VolumeX size={20}/>}</button>
          {game&&<button type="button" title={tr('Ván mới','New game')} onClick={()=>setConfirmReset(true)}><RotateCcw size={20}/></button>}
          <button type="button" title={tr('Đóng','Close')} aria-label={tr('Đóng Family Feud','Close Family Feud')}
             onClick={closePanel} className="bff-close"><X size={22}/></button>
        </div>
      </header>
      <main className="bff-main">
        {!loaded?<div className="bff-loading">{tr('Đang khôi phục ván chơi…','Restoring saved session…')}</div>:
         !game?setup:
         ['ready','playing','steal','round_done'].includes(game.phase)?playScreen:
         game.phase==='fast_money'?fastScreen:resultsScreen}
      </main>
      <footer className="bff-footer">
        <span>{tr('Tự lưu trên thiết bị · Dữ liệu khảo sát mô phỏng · Không dùng AI',
          'Offline autosave · Simulated survey-style scores · No AI')}</span>
        {game&&<span>{game.phase==='steal'?tr('⚡ CƯỚP ĐIỂM','⚡ STEAL'):game.phase==='fast_money'?'FAST MONEY':
           tr('Đã lưu tiến trình','Session autosaved')}</span>}
      </footer>
      {fx&&<div key={fx.id} className={'bff-fx is-'+fx.type} aria-live="polite" role="status">
        <div className="bff-fx-icon">{fx.type==='strike'?'❌':fx.type==='win'?'🏆':'✨'}</div>
        <strong>{fx.label}</strong>
        {fx.type!=='strike'&&<div className="bff-sparks">{Array.from({length:22},(_,i)=>
          <i key={i} style={{'--i':i,'--rotation':(i*360/22)+'deg'}}/>)}</div>}
      </div>}
      {confirmReset&&<div className="bff-confirm-mask" role="alertdialog" aria-modal="true"
        aria-label={tr('Xóa ván chơi hiện tại?','Delete current game?')}>
        <div className="bff-confirm-card"><HelpCircle size={32}/>
          <h3>{tr('Tạo ván mới?','Create a new game?')}</h3>
          <p>{tr('Ván đã lưu hiện tại sẽ bị xóa khỏi thiết bị. Hành động này không thể hoàn tác.',
            'This device’s current saved game will be deleted. This cannot be undone.')}</p>
          <div><button type="button" onClick={()=>setConfirmReset(false)}>{tr('Hủy','Cancel')}</button>
            <button type="button" className="bff-danger" onClick={()=>void newGame()}>{tr('Xóa và tạo mới','Delete and restart')}</button></div>
        </div>
      </div>}
    </section>,document.body)}
  </>;
}
