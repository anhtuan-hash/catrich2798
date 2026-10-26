import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Bomb,X,Play,Pause,RotateCcw,Save,Volume2,VolumeX,Undo2,Redo2,
  Trophy,Users,Settings2,ChevronRight,Shield,Monitor,Eye,EyeOff,ArrowRight,
  Wallet,CheckCircle2,XCircle,Plus,Minus,HelpCircle,Upload,Sparkles} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {createArena,arenaReducer,rankTeams,TILE_ICONS,ARENA_MODES} from './arenaEngine.js';
import {loadArena,saveArena,clearArena} from './arenaStorage.js';
import './BrianBombArena.css';
import {createArenaSound,BOMB_SOUND_STYLES} from './arenaSound.js';
import {SAMPLE_PACKS,getSamplePack,packToText,parseArenaQuestions,toArenaCSV,EMPTY_CSV_TEMPLATE} from './arenaSamplePacks.js';
import ArenaEffects from './ArenaEffects.jsx';

const COLORS=['#ef6577','#61a9f6','#f4c265','#60d5b0','#ad8ff4','#f39b68','#8ed8ee','#d49bbd'];
const MODE_NAMES={classic:['Cổ điển','Classic'],chaos:['Hỗn loạn','Total Chaos'],luck:['Thử vận may','Press Your Luck'],challenge:['Thử thách Brian','Brian Challenge']};
const MODE_EMOJI={classic:'⭐',chaos:'⚡',luck:'🎲',challenge:'🎓'};
const THEME_NAMES={mint:'Mint Classroom',neon:'Neon Reactor',comic:'Comic Blast',cosmic:'Cosmic Danger'};
const allowedUser=user=>Boolean(user?.id&&user.approved!==false&&(
  isAdminRole(user.role)||isDepartmentLeaderRole(user.role)||normalizeSystemRole(user.role)==='teacher'));
export default function BrianBombArena({currentUser,language='vi'}){
  const vi=language!=='en',tr=(vn,en)=>vi?vn:en,ownerId=String(currentUser?.id||'');
  const allowed=allowedUser(currentUser);
  const [open,setOpen]=useState(false),[screen,setScreen]=useState('setup');
  const [loaded,setLoaded]=useState(false),[session,setSession]=useState(null);
  const [mode,setMode]=useState('luck'),[size,setSize]=useState(5);
  const [teamCount,setTeamCount]=useState(4),[names,setNames]=useState('');
  const [theme,setTheme]=useState('mint'),[questionGate,setQuestionGate]=useState(false);
  const [questionText,setQuestionText]=useState(''),[showAnswer,setShowAnswer]=useState(false);
  const [loadedPackId,setLoadedPackId]=useState(null),[selectedChoice,setSelectedChoice]=useState(null);
  const [volume,setVolume]=useState(true),[presenter,setPresenter]=useState(false);
  const [bombSoundStyle,setBombSoundStyle]=useState('recorded'),[soundVolume,setSoundVolume]=useState(75);
  const [samplePackId,setSamplePackId]=useState(SAMPLE_PACKS[0].id);
  const [confirmReset,setConfirmReset]=useState(false),[saveError,setSaveError]=useState(false);
  const [status,setStatus]=useState('');
  const [fx,setFx]=useState(null);
  const [forceFx,setForceFx]=useState(false);
  const [audioFeedback,setAudioFeedback]=useState('');
  const closeRef=useRef(null),soundRef=useRef(null),fxTimer=useRef(null),answerTapLockRef=useRef(false);
  // Do not animate the BUTTON hitbox: doing so causes mouseleave while hovering
  // and makes the shake appear to stop after one frame on Safari/Chrome.
  const hoverAnimations=useRef(new Map());
  const [shakeEnabled,setShakeEnabled]=useState(true);
  const stopTileShake=(tileId,event)=>{
    const current=hoverAnimations.current.get(tileId);
    if(current){current.cancel();hoverAnimations.current.delete(tileId);}
    event?.currentTarget?.classList.remove('is-hover-shaking');
  };
  const startTileShake=(event,tileId)=>{
    const tile=event.currentTarget;
    if(!shakeEnabled||tile.disabled||!tile.classList.contains('is-hidden'))return;
    stopTileShake(tileId);
    const surface=tile.querySelector('.bba-tile-visual');
    if(!surface)return;
    tile.classList.add('is-hover-shaking');
    if(typeof surface.animate==='function'){
      const animation=surface.animate([
        {transform:'translate3d(0,0,0) rotate(0deg)'},
        {transform:'translate3d(-3px,2px,0) rotate(-1.6deg)'},
        {transform:'translate3d(3px,-2px,0) rotate(1.9deg)'},
        {transform:'translate3d(-2px,-2px,0) rotate(-1.4deg)'},
        {transform:'translate3d(3px,2px,0) rotate(1.6deg)'},
        {transform:'translate3d(-2px,1px,0) rotate(-1.2deg)'},
        {transform:'translate3d(0,0,0) rotate(0deg)'},
      ],{duration:190,iterations:Infinity,easing:'linear'});
      hoverAnimations.current.set(tileId,animation);
    }
  };
  const clearAllTileShakes=()=>{
    hoverAnimations.current.forEach(animation=>animation.cancel());
    hoverAnimations.current.clear();
  };
  const update=action=>setSession(s=>s?arenaReducer(s,action):s);
  useEffect(()=>()=>{window.clearTimeout(fxTimer.current);soundRef.current?.close();
    hoverAnimations.current.forEach(animation=>animation.cancel());hoverAnimations.current.clear();
  },[]);
  useEffect(()=>{if(!shakeEnabled)clearAllTileShakes();},[shakeEnabled]);
  const playSound=type=>{
    if(!volume)return false;
    if(!soundRef.current)soundRef.current=createArenaSound();
    return soundRef.current.play(type,{style:bombSoundStyle,volume:soundVolume});
  };
  const testAudio=()=>{
    // Must be a direct onClick, not setTimeout/useEffect: Safari requires a gesture.
    const requested=playSound('bomb');
    setAudioFeedback(requested
      ? tr('Đã yêu cầu phát. Nếu chưa nghe, tăng âm lượng media và thử mở Safari trực tiếp.',
           'Playback requested. If silent, raise media volume and try Safari directly.')
      : tr('Thiết bị chưa cấp quyền phát âm thanh. Chạm lại để thử.',
           'Audio was blocked. Tap again to retry.'));
  };
  const testVisual=()=>{
    showFx('bomb',0,null);
  };
  const showFx=(type,amount=0,tileId=null)=>{
    window.clearTimeout(fxTimer.current);
    setFx({id:Date.now()+'-'+Math.random().toString(36).slice(2),type,amount,tileId});
    fxTimer.current=window.setTimeout(()=>setFx(null),type==='bomb'?1550:1350);
  };
  const revealFx=tile=>{
    if(tile?.event==='bomb'){playSound('bomb');showFx('bomb',0,tile.id);}
    else{
      const amount=Number(String(tile?.event||'').replace('points',''))||0;
      playSound(amount>=50?'bigpoints':'points');
      showFx('points',amount,tile.id);
    }
  };

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
    if(session?.phase!=='finished'||screen!=='arena')return undefined;
    const timeout=window.setTimeout(()=>setScreen('results'),1500);
    return()=>window.clearTimeout(timeout);
  },[session?.phase,screen]);

  const begin=()=>{
    const pack=getSamplePack(loadedPackId);
    const questions=loadedPackId&&questionText===packToText(pack)
      ? pack.items.map(q=>({...q}))
      : parseArenaQuestions(questionText);
    const game=createArena({ownerId,mode,size,teamCount,
      teamNames:names.split(/\n|;/).map(x=>x.trim()).filter(Boolean),
      questionGate:mode==='challenge'||questionGate,questions,theme});
    setSession(arenaReducer(game,{type:'START'}));
    setPresenter(false);setShowAnswer(false);setSelectedChoice(null);setSaveError(false);setScreen('arena');
    playSound('bank');
  };
  const pick=i=>{
    if(!session||session.phase!=='running'||session.selectedTile!==null)return;
    const tile=session.tiles[i];if(!tile||tile.opened||tile.event==='blocked')return;
    stopTileShake(i);
    update({type:'SELECT',index:i});setShowAnswer(false);setSelectedChoice(null);
    if(!session.questionGate)revealFx(tile);else playSound('flip');
  };
  useEffect(()=>{answerTapLockRef.current=false;},[session?.selectedTile,session?.questionIndex]);
  const answerChoice=index=>{
    if(answerTapLockRef.current||session?.phase!=='running'||session.selectedTile===null
      ||!selectedQuestion?.options||!Number.isInteger(index))return;
    answerTapLockRef.current=true; // prevents rapid double tap before React's commit.
    const correct=index===selectedQuestion.answerIndex;
    const tileId=session.selectedTile;
    update({type:'ANSWER_CHOICE',choice:index});
    setShowAnswer(false);setSelectedChoice(index);
    if(correct){playSound('bigpoints');showFx('points',20,tileId);}
    else{playSound('bomb');showFx('bomb',-20,tileId);}
  };
  const answer=correct=>{
    if(session?.selectedTile===null)return;
    const tile=session.tiles[session.selectedTile];
    update({type:'ANSWER',correct});setShowAnswer(false);setSelectedChoice(null);
    if(correct)revealFx(tile);else playSound('wrong');
  };
  const bankTurn=()=>{
    if(!session||session.phase!=='running'||session.mode!=='luck'||session.selectedTile!==null
      ||!session.teams[session.turn]?.bank)return;
    const amount=session.teams[session.turn].bank;
    update({type:'BANK'});playSound('bank');showFx('bank',amount);
  };
  const close=()=>{clearAllTileShakes();window.clearTimeout(fxTimer.current);setFx(null);setOpen(false);setConfirmReset(false);};
  const reset=async()=>{
    await clearArena(ownerId);setSession(null);setScreen('setup');setConfirmReset(false);setFx(null);
    setPresenter(false);setQuestionText('');setLoadedPackId(null);setSelectedChoice(null);setStatus('');
  };
  const save=()=>{if(session)void saveArena(ownerId,session).then(ok=>setStatus(ok?tr('Đã lưu phiên','Session saved'):tr('Không thể lưu phiên','Save failed')));};
  const upload=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const isExcel=/\.xlsx$/i.test(file.name),limit=isExcel?2000000:250000;
    if(file.size>limit){setStatus(tr('Tệp vượt dung lượng cho phép','File is too large'));event.target.value='';return;}
    try{
      if(isExcel){
        const {default:readXlsxFile}=await import('read-excel-file');
        const rows=await readXlsxFile(file);
        const start=/^question$/i.test(String(rows[0]?.[0]||''))?1:0;
        setQuestionText(rows.slice(start).map(row=>String(row[0]||'')+' || '+String(row[1]||'')).join('\n'));setLoadedPackId(null);
      }else{const csv=await file.text();setQuestionText(csv);setLoadedPackId(null);}
      setQuestionGate(true);setStatus(tr('Đã nạp ngân hàng câu hỏi','Question bank imported'));
    }catch{setStatus(tr('Không đọc được tệp','Could not read file'));}
    event.target.value='';
  };
  const importSamplePack=()=>{
    const pack=getSamplePack(samplePackId);
    setQuestionText(packToText(pack));setLoadedPackId(pack.id);setQuestionGate(true);
    setStatus(tr('Đã nạp '+pack.count+' câu: '+pack.titleVi,'Loaded '+pack.count+' questions: '+pack.titleEn));
  };
  const exportQuestionCSV=(kind='pack')=>{
    const pack=getSamplePack(samplePackId);
    const contents=kind==='template'?EMPTY_CSV_TEMPLATE:toArenaCSV(pack.items);
    const filename=kind==='template'?'brian-bomb-arena-mau-import.csv':'brian-bomb-arena-'+pack.id+'.csv';
    const blob=new Blob([contents],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
  };
  const exportResults=()=>{
    if(!session)return;
    const rows=[['Rank','Team','Score','Turns','Shields'],...rankTeams(session.teams).map((t,i)=>[i+1,t.name,t.score,t.turns,t.shields])];
    const csv='\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='brian-bomb-arena-results.csv';document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
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
          <p className="bba-muted">{tr('Tỷ lệ 1:1 bom và điểm: 4×4 = 8/8; 5×5 = 12/12, ô C3 khóa; 6×6 = 18/18.',
            'Exactly equal bombs and scoring tiles: 4×4 = 8/8; 5×5 = 12/12 with C3 locked; 6×6 = 18/18.')}</p>
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
          <h3>{tr('05 · Ngân hàng câu hỏi mẫu','05 · Quick sample packs')}</h3>
          <div className="bba-samples" aria-label={tr('Nạp bộ câu hỏi mẫu','Load sample question pack')}>
            <label className="bba-sample-heading" htmlFor="bba-sample-pack">{tr('Chọn Unit (100 câu/Unit) hoặc bộ mẫu 36 câu','Choose a Unit (100 questions) or a 36-question sample pack')}</label>
            <select id="bba-sample-pack" value={samplePackId} onChange={event=>setSamplePackId(event.target.value)}>
              {SAMPLE_PACKS.map(pack=><option key={pack.id} value={pack.id}>
                {vi?pack.titleVi:pack.titleEn} · {pack.count} {tr('câu','questions')}
              </option>)}
            </select>
            <div className="bba-sample-preview">
              <span>{getSamplePack(samplePackId).level} · {getSamplePack(samplePackId).topic}</span>
              <p>{getSamplePack(samplePackId).items[0]?.prompt}</p>
              <small>{tr('Đáp án: ','Answer: ')}{getSamplePack(samplePackId).items[0]?.answer}</small>
            </div>
            <div className="bba-sample-actions">
              <button type="button" className="bba-sample-load" onClick={importSamplePack}>
                <Plus size={17}/>{tr('Nạp nhanh ','Load ')+getSamplePack(samplePackId).count+tr(' câu',' questions')}
              </button>
              <button type="button" onClick={()=>exportQuestionCSV('pack')}>
                <Save size={16}/>{tr('Tải bộ CSV','Download CSV')}
              </button>
              <button type="button" onClick={()=>exportQuestionCSV('template')}>
                <Upload size={16}/>{tr('CSV mẫu trống','Blank CSV template')}
              </button>
            </div>
          </div>
          <h3>{tr('06 · Câu hỏi kiến thức','06 · Learning questions')}</h3>
          <label className="bba-check"><input type="checkbox" checked={mode==='challenge'||questionGate} disabled={mode==='challenge'}
            onChange={e=>setQuestionGate(e.target.checked)}/><span>{tr('Bắt buộc trả lời trước khi mở ô','Answer a question before revealing a tile')}</span></label>
          <label className="bba-label">{tr('Một dòng mỗi câu: Câu hỏi || Đáp án','One line per item: Question || Answer')}
            <textarea rows="5" value={questionText} onChange={e=>{setQuestionText(e.target.value.slice(0,70000));setLoadedPackId(null);}}
             placeholder="What is a renewable energy source? || Solar power"/></label>
          <label className="bba-file"><Upload size={16}/>{tr('Nhập CSV / Excel','Import CSV / Excel')}<input type="file" accept=".csv,.xlsx,text/csv" onChange={upload}/></label>
          <p className="bba-muted">{tr('Đã nhận diện: ','Recognized: ')}<b>{parseArenaQuestions(questionText).length}</b> {tr('câu. Nếu bỏ trống, có thể chơi mà không cần trả lời câu hỏi.','questions. Leave empty to play without a question bank.')}</p>
          <h3>{tr('07 · Âm thanh bom','07 · Bomb sound design')}</h3>
          <div className="bba-sound-settings">
            <label htmlFor="bba-bomb-style">{tr('Kiểu tiếng nổ','Explosion sound style')}</label>
            <select id="bba-bomb-style" value={bombSoundStyle} onChange={e=>setBombSoundStyle(e.target.value)}>
              {BOMB_SOUND_STYLES.map(style=><option key={style.id} value={style.id}>{vi?style.vi:style.en}</option>)}
            </select>
            <label htmlFor="bba-sound-volume">{tr('Âm lượng','Volume')}: <b>{soundVolume}%</b></label>
            <input id="bba-sound-volume" type="range" min="10" max="100" step="5" value={soundVolume}
              onChange={e=>setSoundVolume(Number(e.target.value))}/>
            <button type="button" className="bba-sound-preview" onClick={testAudio} disabled={!volume}>
              <Volume2 size={17}/>{tr('Nghe thử tiếng bom','Preview explosion')}
            </button>
            <button type="button" className="bba-sound-preview" onClick={testVisual}>
              <Sparkles size={17}/>{tr('Xem thử nổ bom trên iPhone','Test visual explosion')}
            </button>
            <label className="bba-motion-check">
              <input type="checkbox" checked={forceFx} onChange={e=>setForceFx(e.target.checked)}/>
              {tr('Hiệu ứng động đầy đủ (bật thủ công khi iOS Giảm chuyển động)',
                  'Full animated effects (opt-in when iOS Reduce Motion is enabled)')}
            </label>
            {audioFeedback&&<small role="status" className="bba-audio-feedback">{audioFeedback}</small>}
            <small>{tr('iPhone: âm thanh hiệu ứng được tạo thành WAV ngoại tuyến và phát bằng trình phát media iOS.',
              'iPhone: sound effects use offline WAV through iOS media playback.')}</small>
            <small>{bombSoundStyle==='recorded'?
              tr('Âm thanh thu thật (public domain), phát từ Wikimedia Commons. Cần kết nối mạng để tải lần đầu.',
                'Real public-domain recording streamed from Wikimedia Commons; internet required for first playback.'):
              tr('Âm thanh tổng hợp tại thiết bị; hoạt động ngoại tuyến.','Locally synthesized audio; works offline.')}</small>
            {bombSoundStyle==='recorded'&&<a href="https://commons.wikimedia.org/wiki/File:Explosion-LS100155.ogg" target="_blank" rel="noopener noreferrer"
              className="bba-sound-credit">{tr('Nguồn: Fg2 · Wikimedia Commons (public domain)','Source: Fg2 · Wikimedia Commons (public domain)')}</a>}
          </div>
          <button type="button" className="bba-primary bba-full" onClick={begin}><Play size={18}/>{tr('Bắt đầu trò chơi','Start game')}<ChevronRight size={18}/></button>
        </section>
      </div>
    </div>;
    if(screen==='results')return <section className="bba-results">
      <div className="bba-winner"><Trophy size={49}/><p>{tr('KẾT QUẢ TRÒ CHƠI','FINAL RESULTS')}</p><h2>{rankTeams(session.teams)[0]?.name}</h2></div>
      <div className="bba-ranking">{rankTeams(session.teams).map((t,i)=><div key={t.id} className="bba-rank">
        <span>{i+1}</span><strong>{t.name}</strong><b>{t.score}</b><small>{tr('ĐIỂM ĐÃ CHỐT','SECURED SCORE')}</small></div>)}</div>
      <div className="bba-result-actions"><button type="button" onClick={exportResults}><Save size={16}/>{tr('Xuất bảng điểm CSV','Export scores CSV')}</button>
      <button type="button" onClick={()=>void reset()}><RotateCcw size={16}/>{tr('Tạo ván mới','New game')}</button>
        <button type="button" onClick={()=>setScreen('arena')}><Eye size={16}/>{tr('Xem lại bảng','Review board')}</button>
        <button type="button" onClick={()=>setConfirmReset(true)}><XCircle size={16}/>{tr('Xóa phiên','Delete session')}</button></div>
    </section>;
    return <div className="bba-arena">
      {session.ruleVersion!==4&&<div className="bba-upgrade-banner" role="status">
        <span>💣 {tr('Phiên này dùng luật cũ. Tạo ván mới để có tỷ lệ 1:1 số ô bom và ô điểm, cùng âm thanh bom ghi âm thực tế.',
          'This is a previous-rule session. Start a new game for 1:1 bomb/score tiles and recorded explosion audio.')}</span>
        <button type="button" onClick={()=>setConfirmReset(true)}>{tr('Tạo ván Bomb Arena v4','Start Bomb Arena v4')}</button>
      </div>}
      
{session.mode==='luck'&&<div className="bba-pot-stage" aria-live="polite">
        <div className={'bba-pot-card'+(fx?.type==='points'?' is-increasing':'')+(fx?.type==='bomb'?' is-zeroed':'')}>
          <div><span className="bba-pot-label">POT · {leader?.name}</span>
            <strong className="bba-pot-amount">{leader?.bank||0}</strong>
            <small>{tr('Điểm tạm, chưa an toàn','Unsecured turn points')}</small></div>
          <button type="button" className="bba-bank-button" onClick={bankTurn}
            disabled={presenter||session.phase!=='running'||session.selectedTile!==null||(leader?.bank||0)<=0}>
            <Wallet size={20}/><span>BANK</span></button>
        </div>
        <p>{tr('Mở tiếp để tăng POT, hoặc Bank để giữ điểm. Trúng bom sẽ mất POT!','Flip more tiles to grow your POT, or Bank to secure it. A bomb wipes your POT!')}</p>
      </div>}
      <div className="bba-scoreboard" aria-label={tr('Bảng điểm','Scoreboard')}>
        {session.teams.map((t,i)=><section className={'bba-team '+(session.turn===i?'is-current':'')} key={t.id}
          style={{'--team-accent':COLORS[i%COLORS.length]}}>
          <button type="button" onClick={()=>update({type:'TEAM',index:i})} disabled={presenter||session.phase!=='running'||session.selectedTile!==null||(session.mode==='luck'&&(leader?.bank||0)>0)}
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
          <div className="bba-board-top"><span>{tr('MỞ Ô SỐ · TRÁNH BOM','FLIP NUMBERS · AVOID BOMBS')}</span>
            <span>{remaining} {tr('ô còn lại','tiles left')} · {session.tiles.filter(tile=>tile.event==='bomb').length} 💣 / {session.tiles.filter(tile=>tile.event.startsWith('points')).length} ⭐</span>
            {!presenter&&<button type="button" className={'bba-shake-toggle'+(shakeEnabled?' is-on':'')}
              aria-pressed={shakeEnabled} onClick={()=>setShakeEnabled(v=>!v)}>
              <Sparkles size={15}/>{shakeEnabled?tr('Rung ô: BẬT','Shake: ON'):tr('Rung ô: TẮT','Shake: OFF')}
            </button>}</div>
          <div className="bba-tiles" style={{'--bba-columns':session.size}}>
            {session.tiles.map((tile,i)=><button key={tile.id} type="button"
              className={'bba-tile '+(tile.opened?'is-revealed':'is-hidden')+(tile.event==='blocked'?' is-blocked':'')+(tile.opened&&tile.event==='bomb'?' is-bomb':'')+(fx?.tileId===tile.id?' is-just-opened':'')}
              disabled={tile.opened||session.phase!=='running'||session.selectedTile!==null||presenter}
              aria-label={tile.event==='blocked'?tile.label+' locked safe tile':tile.label+(tile.opened?' revealed':'')}
              onMouseEnter={event=>startTileShake(event,tile.id)}
              onMouseLeave={event=>stopTileShake(tile.id,event)}
              onBlur={event=>stopTileShake(tile.id,event)}
              onClick={()=>pick(i)}>
              <span className="bba-tile-visual" aria-hidden="true">
                <span className="bba-tile-front">{tile.event==='blocked'?'◆':tile.label}</span>
                <span className="bba-tile-back">{tile.event==='blocked'?'◆':tile.opened?TILE_ICONS[tile.event]:'?'}</span>
              </span>
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
          {session.mode==='luck'&&session.phase==='running'&&<div className="bba-luck-actions">
             <p>{tr('🎲 Mở ô số để tăng POT. 💣 Bom sẽ xóa POT. Nhấn BANK phía trên để chốt.','🎲 Numbers increase POT. 💣 Bombs wipe POT. Press BANK above to secure it.')}</p>
           </div>}
          {session.phase==='paused'&&<div className="bba-pause-message"><Pause size={24}/>{tr('Đã tạm dừng trò chơi','Game paused')}</div>}
          {!presenter&&<div className="bba-game-controls">
            <button type="button" onClick={()=>update({type:'UNDO'})} disabled={!session.history.length}><Undo2 size={17}/>{tr('Hoàn tác','Undo')}</button>
            <button type="button" onClick={()=>update({type:'REDO'})} disabled={!session.future.length}><Redo2 size={17}/>{tr('Làm lại','Redo')}</button>
            <button type="button" onClick={()=>update({type:'NEXT'})} disabled={session.phase!=='running'||session.selectedTile!==null||(session.mode==='luck'&&leader?.bank>0)}><ArrowRight size={17}/>{tr('Đổi lượt','Next team')}</button>
          </div>}
        </aside>
      </div>
      {session.selectedTile!==null&&session.phase==='running'&&!presenter&&<div className="bba-question-mask" role="dialog" aria-modal="true" aria-label={tr('Kiểm tra kiến thức','Question gate')}>
        <div className="bba-question-card">
          <span className="bba-eyebrow">{tr('CÂU HỎI CHO ','QUESTION FOR ')+leader?.name}</span>
          <h2>{selectedQuestion?.prompt||tr('Giáo viên xác nhận kết quả','Teacher confirms the answer')}</h2>
          {selectedQuestion?.unit&&<p className="bba-question-unit">{selectedQuestion.grade===12?'ENGLISH 12':'ENGLISH 11'} · UNIT {selectedQuestion.unit} · {tr('NGỮ PHÁP','GRAMMAR')}</p>}
          {selectedQuestion?.options&&<p className="bba-instant-hint">{tr('Chạm một phương án để chấm ngay: đúng +20, sai −20 và mất POT.', 'Tap an option to grade instantly: correct +20, wrong −20 and lose POT.')}</p>}
          {Array.isArray(selectedQuestion?.options)&&selectedQuestion.options.length===4&&
            <div className="bba-mcq-options" role="group" aria-label={tr('Bốn phương án trắc nghiệm','Four multiple-choice options')}>
              {selectedQuestion.options.map((option,index)=><button key={index} type="button"
                className={'bba-mcq-option'+(selectedChoice===index?' is-selected':'')+
                  (showAnswer&&selectedQuestion.answerIndex===index?' is-correct':'')}
                aria-pressed={selectedChoice===index} onClick={()=>answerChoice(index)}>
                <b>{'ABCD'[index]}</b><span>{option}</span>
              </button>)}
            </div>}
          {!selectedQuestion?.options&&<button type="button" className="bba-answer-toggle" onClick={()=>setShowAnswer(x=>!x)}>
            {showAnswer?<EyeOff size={17}/>:<Eye size={17}/>}
            {showAnswer?tr('Ẩn đáp án','Hide answer'):tr('Xem đáp án','Show answer')}</button>}
          {showAnswer&&<p className="bba-answer">
            {selectedQuestion?.options?'✓ '+('ABCD'[selectedQuestion.answerIndex]||'')+' · ':''}
            {selectedQuestion?.answer||'—'}
            {selectedQuestion?.explanation&&<small className="bba-mcq-explanation">{selectedQuestion.explanation}</small>}
          </p>}
          <div className="bba-question-actions">
            {!selectedQuestion?.options&&<>
            <button type="button" onClick={()=>answer(false)}><XCircle size={20}/>{tr('Chưa đúng','Incorrect')}</button>
            <button type="button" className="bba-primary" onClick={()=>answer(true)}><CheckCircle2 size={20}/>{tr('Chính xác — mở ô','Correct — reveal')}</button>
          </>}
          </div>
        </div>
      </div>}
    </div>;
  };
  const bubble=<button type="button" className="bba-bubble" onClick={()=>{
    if(!soundRef.current)soundRef.current=createArenaSound();
    soundRef.current.unlock?.();
    setOpen(true);if(session?.phase==='finished')setScreen('results');
  }}
    title={tr('Mở Brian Bomb Arena','Open Brian Bomb Arena')} aria-label={tr('Mở Brian Bomb Arena','Open Brian Bomb Arena')}>
    <Bomb size={27} strokeWidth={1.75}/><span className="bba-bubble-tip">Bomb Arena</span></button>;
  return <>
    {!open&&createPortal(bubble,document.body)}
    {open&&createPortal(<section className={'bba-shell bba-theme-'+(session?.theme||theme)+(fx?.type==='bomb'?' is-exploding':'')+(forceFx?' bba-allow-fx':'')}
       role="dialog" aria-modal="true" aria-label="Brian Bomb Arena">
      <header className="bba-header"><div className="bba-brand"><span>💣</span><div><strong>BRIAN BOMB ARENA</strong><small>THE EXPLOSIVE CLASSROOM</small></div></div>
        <div className="bba-header-actions">
          {session&&screen==='arena'&&<button type="button" onClick={()=>setPresenter(x=>!x)} aria-pressed={presenter} title={tr('Chế độ trình chiếu','Presenter mode')}><Monitor size={18}/><span>{presenter?tr('Giáo viên','Teacher'):tr('Trình chiếu','Present')}</span></button>}
          {session&&screen==='arena'&&!presenter&&<button type="button" onClick={()=>update({type:session.phase==='paused'?'START':'PAUSE'})} disabled={session.phase==='finished'}>
            {session.phase==='paused'?<Play size={18}/>:<Pause size={18}/>}<span>{session.phase==='paused'?tr('Tiếp tục','Resume'):tr('Tạm dừng','Pause')}</span></button>}
          {session&&!presenter&&<button type="button" onClick={save} title={tr('Lưu phiên','Save session')}><Save size={18}/></button>}
          <button type="button" className="bba-quick-test" onClick={testAudio}
            aria-label={tr('Thử âm thanh trên iPhone','Test iPhone sound')} title={tr('Thử âm thanh','Test sound')}>
            <Volume2 size={18}/><span>TEST</span></button>
          <button type="button" className="bba-quick-test" onClick={testVisual}
            aria-label={tr('Thử hiệu ứng bom','Test bomb visual')} title={tr('Thử hiệu ứng','Test visual')}>
            <Sparkles size={18}/><span>FX</span></button>
          <button type="button" onClick={()=>setVolume(x=>!x)} title={volume?tr('Tắt âm','Mute'):tr('Bật âm','Unmute')}>{volume?<Volume2 size={19}/>:<VolumeX size={19}/>}</button>
          <button type="button" onClick={close} ref={closeRef} className="bba-close" aria-label={tr('Đóng trò chơi','Close game')}><X size={21}/></button>
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
      <ArenaEffects fx={fx} vi={vi}/>
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
