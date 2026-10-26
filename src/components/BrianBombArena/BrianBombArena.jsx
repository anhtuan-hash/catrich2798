import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Bomb,X,Play,Pause,RotateCcw,Save,Volume2,VolumeX,Undo2,Redo2,
  Trophy,Users,Settings2,ChevronRight,Shield,Monitor,Eye,EyeOff,ArrowRight,
  Wallet,CheckCircle2,XCircle,Plus,Minus,HelpCircle,Upload,Sparkles} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {createArena,arenaReducer,rankTeams,TILE_ICONS,ARENA_MODES} from './arenaEngine.js';
import {loadArena,saveArena,clearArena} from './arenaStorage.js';
import './BrianBombArena.css';

const COLORS=['#ef6577','#61a9f6','#f4c265','#60d5b0','#ad8ff4','#f39b68','#8ed8ee','#d49bbd'];
const MODE_NAMES={classic:['Cổ điển','Classic'],chaos:['Hỗn loạn','Total Chaos'],luck:['Thử vận may','Press Your Luck'],challenge:['Thử thách Brian','Brian Challenge']};
const MODE_EMOJI={classic:'⭐',chaos:'⚡',luck:'🎲',challenge:'🎓'};
const THEME_NAMES={neon:'Neon Reactor',comic:'Comic Blast',cosmic:'Cosmic Danger'};
const allowedUser=user=>Boolean(user?.id&&user.approved!==false&&(
  isAdminRole(user.role)||isDepartmentLeaderRole(user.role)||normalizeSystemRole(user.role)==='teacher'));
function parseQuestions(input){
  // UTF-8 text, question||answer, or straightforward CSV with header question,answer.
  return String(input||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean)
    .filter((line,i)=>!(i===0&&/^(question|câu hỏi)\s*,\s*(answer|đáp án)/i.test(line)))
    .map(line=>{
      const separator=line.includes('||')?'||':line.includes('\t')?'\t':',';
      const parts=line.split(separator);
      return {prompt:String(parts.shift()||'').replace(/^"|"$/g,'').trim(),
        answer:parts.join(separator).replace(/^"|"$/g,'').trim()};
    }).filter(x=>x.prompt).slice(0,300);
}
function useGameSound(){
  const ctx=useRef(null);
  useEffect(()=>()=>{try{ctx.current?.close();}catch{/* optional */}},[]);
  return type=>{
    try{
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!ctx.current)ctx.current=new AC();
      const audio=ctx.current;if(audio.state==='suspended')void audio.resume();
      const notes=type==='bomb'?[160,90]:type==='success'?[550,830]:[440];
      notes.forEach((hz,i)=>{
        const osc=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+i*.11;
        osc.type=type==='bomb'?'sawtooth':'sine';osc.frequency.setValueAtTime(hz,at);
        gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.045,at+.025);
        gain.gain.exponentialRampToValueAtTime(.0001,at+.19);
        osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.2);
      });
    }catch{/* Sound must never block play. */}
  };
}
export default function BrianBombArena({currentUser,language='vi'}){
  const vi=language!=='en',tr=(vn,en)=>vi?vn:en,ownerId=String(currentUser?.id||'');
  const allowed=allowedUser(currentUser);
  const [open,setOpen]=useState(false),[screen,setScreen]=useState('setup');
  const [loaded,setLoaded]=useState(false),[session,setSession]=useState(null);
  const [mode,setMode]=useState('classic'),[size,setSize]=useState(5);
  const [teamCount,setTeamCount]=useState(4),[names,setNames]=useState('');
  const [theme,setTheme]=useState('neon'),[questionGate,setQuestionGate]=useState(false);
  const [questionText,setQuestionText]=useState(''),[showAnswer,setShowAnswer]=useState(false);
  const [volume,setVolume]=useState(true),[presenter,setPresenter]=useState(false);
  const [confirmReset,setConfirmReset]=useState(false),[saveError,setSaveError]=useState(false);
  const [status,setStatus]=useState('');
  const closeRef=useRef(null),playSound=useGameSound();
  const update=action=>setSession(s=>s?arenaReducer(s,action):s);

  useEffect(()=>{
    let valid=true;
    setLoaded(false);setSession(null);setOpen(false);setScreen('setup');
    if(!ownerId||!allowed){setLoaded(true);return()=>{valid=false;};}
    void loadArena(ownerId).then(saved=>{
      if(!valid)return;
      if(saved?.schema===1&&saved.ownerId===ownerId&&Array.isArray(saved.tiles)&&Array.isArray(saved.teams)){
        setSession(saved);setScreen(saved.phase==='finished'?'results':'arena');
      }
      setLoaded(true);
    }).catch(()=>{if(valid)setLoaded(true);});
    return()=>{valid=false;};
  },[ownerId,allowed]);

  useEffect(()=>{
    if(!loaded||!session||session.ownerId!==ownerId)return;
    let active=true;
    void saveArena(ownerId,session).then(ok=>{if(active)setSaveError(!ok);});
    return()=>{active=false;};
  },[loaded,session,ownerId]);

  useEffect(()=>{
    if(!open)return;
    const original=document.body.style.overflow;
    document.body.style.overflow='hidden';
    closeRef.current?.focus({preventScroll:true});
    const onKey=e=>{
      if(e.key==='Escape'){
        if(confirmReset)setConfirmReset(false);
        else setOpen(false);
      }
    };
    document.addEventListener('keydown',onKey);
    return()=>{document.removeEventListener('keydown',onKey);document.body.style.overflow=original;};
  },[open,confirmReset]);

  useEffect(()=>{
    if(session?.phase==='finished'&&screen==='arena')setScreen('results');
  },[session?.phase,screen]);

  const begin=()=>{
    const questions=parseQuestions(questionText);
    const game=createArena({ownerId,mode,size,teamCount,
      teamNames:names.split(/\n|;/).map(x=>x.trim()).filter(Boolean),
      questionGate:mode==='challenge'||questionGate,questions,theme});
    setSession(arenaReducer(game,{type:'START'}));
    setPresenter(false);setShowAnswer(false);setSaveError(false);setScreen('arena');
    if(volume)playSound('success');
  };
  const pick=i=>{
    if(!session||session.phase!=='running'||session.selectedTile!==null)return;
    const tile=session.tiles[i];if(!tile||tile.opened)return;
    update({type:'SELECT',index:i});setShowAnswer(false);
    if(volume&&!session.questionGate)playSound(tile.event==='bomb'?'bomb':'success');
  };
  const answer=correct=>{
    if(session?.selectedTile===null)return;
    const tile=session.tiles[session.selectedTile];
    update({type:'ANSWER',correct});setShowAnswer(false);
    if(volume)playSound(correct?(tile?.event==='bomb'?'bomb':'success'):'bomb');
  };
  const close=()=>{setOpen(false);setConfirmReset(false);};
  const reset=async()=>{
    await clearArena(ownerId);setSession(null);setScreen('setup');setConfirmReset(false);
    setPresenter(false);setQuestionText('');setStatus('');
  };
  const save=()=>{if(session)void saveArena(ownerId,session).then(ok=>setStatus(ok?tr('Đã lưu phiên','Session saved'):tr('Không thể lưu phiên','Save failed')));};
  const upload=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>250000){setStatus(tr('Tệp CSV vượt 250 KB','CSV exceeds 250 KB'));return;}
    try{const csv=await file.text();setQuestionText(csv);setQuestionGate(true);
      setStatus(tr('Đã nạp tệp CSV','CSV loaded'));}
    catch{setStatus(tr('Không đọc được tệp','Could not read file'));}
    event.target.value='';
  };
  if(!allowed)return null;
  const remaining=session?.tiles.filter(t=>!t.opened).length||0;
  const selectedQuestion=session?.questions?.length?session.questions[session.questionIndex%session.questions.length]:null;
  const leader=session?.teams?.[session.turn];
  const box=()=>{
    if(screen==='setup'||!session)return <div className="bba-setup">
      <div className="bba-hero">
        <span className="bba-hero-icon" aria-hidden="true">💣</span>
        <div><span className="bba-eyebrow">BRIAN CLASSROOM GAMES</span><h2>{tr('Biến mỗi ô thành một bất ngờ','Every tile is a surprise')}</h2>
          <p>{tr('Chọn chế độ, chia đội và mở màn một cuộc thi đầy kịch tính.','Pick a mode, form your teams and start the challenge.')}</p></div>
      </div>
      <div className="bba-setup-grid">
        <section className="bba-panel">
          <h3>{tr('01 · Chế độ trò chơi','01 · Game mode')}</h3>
          <div className="bba-mode-grid">{ARENA_MODES.map(value=><button key={value} type="button" className={'bba-mode '+(mode===value?'is-picked':'')}
            aria-pressed={mode===value} onClick={()=>setMode(value)}>
            <span>{MODE_EMOJI[value]}</span><strong>{MODE_NAMES[value][vi?0:1]}</strong>
          </button>)}</div>
          <h3>{tr('02 · Kích thước bảng','02 · Board size')}</h3>
          <div className="bba-pill-row">{[4,5,6].map(n=><button type="button" key={n} className={'bba-pill '+(size===n?'is-picked':'')}
            aria-pressed={size===n} onClick={()=>setSize(n)}>{n} × {n}<small>{n*n} {tr('ô','tiles')}</small></button>)}</div>
          <h3>{tr('03 · Đội thi đấu','03 · Teams')}</h3>
          <div className="bba-stepper"><button type="button" onClick={()=>setTeamCount(x=>Math.max(2,x-1))} aria-label={tr('Giảm số đội','Remove team')}><Minus size={17}/></button>
            <strong>{teamCount} {tr('đội','teams')}</strong><button type="button" onClick={()=>setTeamCount(x=>Math.min(8,x+1))} aria-label={tr('Thêm đội','Add team')}><Plus size={17}/></button></div>
          <label className="bba-label">{tr('Tên đội (mỗi dòng một đội)','Team names (one per line)')}
            <textarea rows="3" placeholder={tr('Nhóm 1\nNhóm 2\nNhóm 3','Group 1\nGroup 2\nGroup 3')} value={names} onChange={e=>setNames(e.target.value.slice(0,500))}/></label>
        </section>
        <section className="bba-panel">
          <h3>{tr('04 · Không gian trò chơi','04 · Game atmosphere')}</h3>
          <div className="bba-theme-grid">{Object.keys(THEME_NAMES).map(t=><button type="button" key={t} className={'bba-theme-button is-'+t+(theme===t?' is-picked':'')}
            aria-pressed={theme===t} onClick={()=>setTheme(t)}><Sparkles size={20}/><span>{THEME_NAMES[t]}</span></button>)}</div>
          <h3>{tr('05 · Câu hỏi kiến thức','05 · Learning questions')}</h3>
          <label className="bba-check"><input type="checkbox" checked={mode==='challenge'||questionGate} disabled={mode==='challenge'}
            onChange={e=>setQuestionGate(e.target.checked)}/><span>{tr('Bắt buộc trả lời trước khi mở ô','Answer a question before revealing a tile')}</span></label>
          <label className="bba-label">{tr('Một dòng mỗi câu: Câu hỏi || Đáp án','One line per item: Question || Answer')}
            <textarea rows="5" value={questionText} onChange={e=>setQuestionText(e.target.value.slice(0,70000))}
             placeholder="What is a renewable energy source? || Solar power"/></label>
          <label className="bba-file"><Upload size={16}/>{tr('Nhập tệp CSV','Import CSV')}<input type="file" accept=".csv,text/csv" onChange={upload}/></label>
          <p className="bba-muted">{tr('Nếu chưa nhập câu hỏi, trò chơi sử dụng bảng bí mật không cần chấm đáp án.','With an empty bank, the game runs as a tile-only activity.')}</p>
          <button type="button" className="bba-primary bba-full" onClick={begin}><Play size={18}/>{tr('Bắt đầu trò chơi','Start game')}<ChevronRight size={18}/></button>
        </section>
      </div>
    </div>;
    if(screen==='results')return <section className="bba-results">
      <div className="bba-winner"><Trophy size={49}/><p>{tr('KẾT QUẢ TRÒ CHƠI','FINAL RESULTS')}</p><h2>{rankTeams(session.teams)[0]?.name}</h2></div>
      <div className="bba-ranking">{rankTeams(session.teams).map((t,i)=><div key={t.id} className="bba-rank">
        <span>{i+1}</span><strong>{t.name}</strong><b>{t.score}</b></div>)}</div>
      <div className="bba-result-actions"><button type="button" onClick={()=>{setSession(null);setScreen('setup')}}><RotateCcw size={16}/>{tr('Tạo ván mới','New game')}</button>
        <button type="button" onClick={()=>setScreen('arena')}><Eye size={16}/>{tr('Xem lại bảng','Review board')}</button>
        <button type="button" onClick={()=>setConfirmReset(true)}><XCircle size={16}/>{tr('Xóa phiên','Delete session')}</button></div>
    </section>;
    return <div className="bba-arena">
      <div className="bba-scoreboard" aria-label={tr('Bảng điểm','Scoreboard')}>
        {session.teams.map((t,i)=><section className={'bba-team '+(session.turn===i?'is-current':'')} key={t.id}
          style={{'--team-accent':COLORS[i%COLORS.length]}}>
          <button type="button" onClick={()=>update({type:'TEAM',index:i})} disabled={presenter||session.phase!=='running'||session.selectedTile!==null}
            aria-label={tr('Chọn đội ','Select team ')+t.name}><span className="bba-team-indicator"/><strong>{t.name}</strong></button>
          <b>{t.score}</b>
          {session.mode==='luck'&&<small>BANK: {t.bank}</small>}
          {t.shields>0&&<small>🛡️ {t.shields}</small>}
          {!presenter&&<div className="bba-team-tools"><button type="button" onClick={()=>update({type:'SCORE',index:i,value:t.score-50})} aria-label={tr('Trừ 50 điểm','Minus 50 points')}>−</button>
            <button type="button" onClick={()=>update({type:'SCORE',index:i,value:t.score+50})} aria-label={tr('Cộng 50 điểm','Plus 50 points')}>+</button></div>}
        </section>)}
      </div>
      <div className="bba-playground">
        <div className="bba-board-wrap">
          <div className="bba-board-top"><span>{tr('CHIẾN TRƯỜNG BÍ MẬT','MYSTERY FIELD')}</span>
            <span>{remaining} {tr('ô còn lại','tiles left')}</span></div>
          <div className="bba-tiles" style={{'--bba-columns':session.size}}>
            {session.tiles.map((tile,i)=><button key={tile.id} type="button"
              className={'bba-tile '+(tile.opened?'is-revealed':'is-hidden')}
              disabled={tile.opened||session.phase!=='running'||session.selectedTile!==null||presenter}
              aria-label={tile.label+(tile.opened?' revealed':'')} onClick={()=>pick(i)}>
              <span className="bba-tile-front">{tile.label}</span>
              <span className="bba-tile-back" aria-hidden={!tile.opened}>{tile.opened?TILE_ICONS[tile.event]:'?'}</span>
            </button>)}
          </div>
        </div>
        <aside className="bba-side">
          <div className="bba-current"><span className="bba-eyebrow">{tr('LƯỢT HIỆN TẠI','CURRENT TURN')}</span>
            <h2>{leader?.name}</h2><p>{MODE_EMOJI[session.mode]} {MODE_NAMES[session.mode][vi?0:1]}</p>
            {session.mode==='luck'&&<div className="bba-bank">{tr('Điểm tạm','Temporary bank')} <strong>{leader?.bank||0}</strong></div>}
          </div>
          {session.last&&<div className="bba-result-event" role="status">
            <span className="bba-event-icon">{TILE_ICONS[session.last.event]||'🎯'}</span>
            <strong>{session.last.tile||session.last.team}</strong>
            <p>{session.last.event==='incorrect'?tr('Trả lời chưa đúng','Incorrect answer'):
              session.last.event==='bank'?tr('Đã chốt điểm','Points banked'):session.last.label}</p>
          </div>}
          {session.mode==='luck'&&session.phase==='running'&&!presenter&&<div className="bba-luck-actions">
            <button type="button" onClick={()=>update({type:'BANK'})}><Wallet size={17}/>{tr('CHỐT ĐIỂM','BANK')}</button>
            <p>{tr('Tiếp tục chọn ô hoặc chốt số điểm tạm hiện có.','Keep picking, or secure your temporary points.')}</p>
          </div>}
          {session.phase==='paused'&&<div className="bba-pause-message"><Pause size={24}/>{tr('Đã tạm dừng trò chơi','Game paused')}</div>}
          {!presenter&&<div className="bba-game-controls">
            <button type="button" onClick={()=>update({type:'UNDO'})} disabled={!session.history.length}><Undo2 size={17}/>{tr('Hoàn tác','Undo')}</button>
            <button type="button" onClick={()=>update({type:'REDO'})} disabled={!session.future.length}><Redo2 size={17}/>{tr('Làm lại','Redo')}</button>
            <button type="button" onClick={()=>update({type:'NEXT'})} disabled={session.phase!=='running'||session.selectedTile!==null}><ArrowRight size={17}/>{tr('Đổi lượt','Next team')}</button>
          </div>}
        </aside>
      </div>
      {session.selectedTile!==null&&session.phase==='running'&&!presenter&&<div className="bba-question-mask" role="dialog" aria-modal="true" aria-label={tr('Kiểm tra kiến thức','Question gate')}>
        <div className="bba-question-card">
          <span className="bba-eyebrow">{tr('CÂU HỎI CHO ','QUESTION FOR ')+leader?.name}</span>
          <h2>{selectedQuestion?.prompt||tr('Giáo viên xác nhận kết quả','Teacher confirms the answer')}</h2>
          <button type="button" className="bba-answer-toggle" onClick={()=>setShowAnswer(x=>!x)}>
            {showAnswer?<EyeOff size={17}/>:<Eye size={17}/>}
            {showAnswer?tr('Ẩn đáp án','Hide answer'):tr('Xem đáp án','Show answer')}</button>
          {showAnswer&&<p className="bba-answer">{selectedQuestion?.answer||'—'}</p>}
          <div className="bba-question-actions"><button type="button" onClick={()=>answer(false)}><XCircle size={20}/>{tr('Chưa đúng','Incorrect')}</button>
            <button type="button" className="bba-primary" onClick={()=>answer(true)}><CheckCircle2 size={20}/>{tr('Chính xác — mở ô','Correct — reveal')}</button></div>
        </div>
      </div>}
    </div>;
  };
  const bubble=<button type="button" className="bba-bubble" onClick={()=>{setOpen(true);if(session?.phase==='finished')setScreen('results');}}
    title={tr('Mở Brian Bomb Arena','Open Brian Bomb Arena')} aria-label={tr('Mở Brian Bomb Arena','Open Brian Bomb Arena')}>
    <Bomb size={27} strokeWidth={1.75}/><span className="bba-bubble-tip">Bomb Arena</span></button>;
  return <>
    {!open&&createPortal(bubble,document.body)}
    {open&&createPortal(<section className={'bba-shell bba-theme-'+(session?.theme||theme)}
       role="dialog" aria-modal="true" aria-label="Brian Bomb Arena">
      <header className="bba-header"><div className="bba-brand"><span>💣</span><div><strong>BRIAN BOMB ARENA</strong><small>THE EXPLOSIVE CLASSROOM</small></div></div>
        <div className="bba-header-actions">
          {session&&screen==='arena'&&<button type="button" onClick={()=>setPresenter(x=>!x)} aria-pressed={presenter} title={tr('Chế độ trình chiếu','Presenter mode')}><Monitor size={18}/><span>{presenter?tr('Giáo viên','Teacher'):tr('Trình chiếu','Present')}</span></button>}
          {session&&screen==='arena'&&!presenter&&<button type="button" onClick={()=>update({type:session.phase==='paused'?'START':'PAUSE'})} disabled={session.phase==='finished'}>
            {session.phase==='paused'?<Play size={18}/>:<Pause size={18}/>}<span>{session.phase==='paused'?tr('Tiếp tục','Resume'):tr('Tạm dừng','Pause')}</span></button>}
          {session&&!presenter&&<button type="button" onClick={save} title={tr('Lưu phiên','Save session')}><Save size={18}/></button>}
          <button type="button" onClick={()=>setVolume(x=>!x)} title={volume?tr('Tắt âm','Mute'):tr('Bật âm','Unmute')}>{volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
          <button type="button" onClick={closeRef?close:close} ref={closeRef} className="bba-close" aria-label={tr('Đóng trò chơi','Close game')}><X size={21}/></button>
        </div>
      </header>
      <main className="bba-main">
        {!loaded?<div className="bba-loading">{tr('Đang khôi phục phiên…','Restoring session…')}</div>:box()}
      </main>
      <footer className="bba-footer"><span>{saveError?tr('Lỗi lưu phiên trên thiết bị','Local save error'):status||tr('Lưu tự động trên thiết bị · Không cần AI','Offline autosave · No AI')}</span>
        {session&&screen==='arena'&&!presenter&&<div className="bba-footer-actions">
          <button type="button" onClick={()=>update({type:'FINISH'})}>{tr('Kết thúc','Finish')}</button>
          <button type="button" onClick={()=>setConfirmReset(true)}><RotateCcw size={14}/>{tr('Ván mới','New game')}</button></div>}
      </footer>
      {confirmReset&&<div className="bba-confirm" role="alertdialog" aria-modal="true" aria-label={tr('Xóa phiên hiện tại','Delete current session')}>
        <div><HelpCircle size={26}/><h3>{tr('Xóa phiên đang lưu?','Delete saved session?')}</h3>
          <p>{tr('Thao tác này sẽ xóa tiến trình hiện tại trên thiết bị.','This removes the current saved progress on this device.')}</p>
          <div><button type="button" onClick={()=>setConfirmReset(false)}>{tr('Hủy','Cancel')}</button>
            <button type="button" className="bba-danger" onClick={()=>void reset()}>{tr('Xóa và tạo mới','Delete and restart')}</button></div>
        </div>
      </div>}
    </section>,document.body)}
  </>;
}
