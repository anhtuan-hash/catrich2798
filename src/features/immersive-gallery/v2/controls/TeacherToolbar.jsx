import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,QrCode,Maximize,Minimize2,BookOpen,Library,Volume2,Film,Sparkles,Pause,Play,RefreshCw,Eye,LockOpen,Lock} from 'lucide-react';
const t=(lang,vi,en)=>lang==='en'?en:vi;
/**
 * TeacherToolbar — the full teacher control row.
 * Browsing/revealing is display-only for frozen lessons; task open/pause remain locked.
 * view panels (QR/notes/resources/voiceover/video), fullscreen and refresh stay available
 * in read-only playback (per spec: QR, evidence, playback remain accessible).
 */
export default function TeacherToolbar({
  language='vi',focusMode=false,onBrowse,
  readOnly=false,busy=false,offline=false,showJoinQr=true,
  session=null,currentIndex=0,stageCount=11,
  motionOn=true,activeTool=null,presentationActive=false,
  onBack,onPrevious,onNext,onToggleTask,onReveal,onToggleTool,onFullscreen,
  onToggleMotion,onTogglePause,onRefresh,onChangeCompletion,completed=false,hub=false
}){
  const ended=session?.status==='ended';
  const mutateLocked=readOnly||busy||ended;
  const stageOpen=Boolean(session?.stageOpen);
  const revealed=Boolean(session?.revealed);
  const isLast=currentIndex>=stageCount-1;
  const [navKey,setNavKey]=useState('');
  const runNav=async(key,fn)=>{
    if(navKey)return;
    setNavKey(key);
    const started=Date.now();
    try{await fn();}
    finally{
      const wait=Math.max(0,420-(Date.now()-started));
      window.setTimeout(()=>setNavKey(''),wait);
    }
  };
  const btn=(key,label,Icon,{onClick,disabled=false,pressed,variant='',extraAria='',loading=false,status}={})=>(
    <button key={key} type="button" className={`adv-toolbtn${variant?' adv-toolbtn--'+variant:''}${pressed?' is-active':''}${loading?' is-loading':''}`}
      onClick={onClick} disabled={disabled||loading} aria-pressed={pressed} aria-busy={loading||undefined} aria-label={extraAria||label}>
      {loading?<span className="adv-spin" aria-hidden="true"/>:Icon?<Icon size={hub?19:14} aria-hidden="true"/>:null}
      <span>{label}</span>
      {status&&<span className="adv-hub-state" data-on={motionOn} aria-hidden="true">{status}</span>}
    </button>
  );
  const motionLabel=t(language,'Chuyển động','Motion');
  const motionState=motionOn?t(language,'BẬT','ON'):t(language,'TẮT','OFF');
  const motionDescription=motionOn?t(language,'Chuyển động: BẬT','Motion ON'):t(language,'Chuyển động: TẮT','Motion OFF');
  const controls={
    previous:btn('previous',navKey==='previous'?t(language,'Đang chuyển…','Moving…'):hub?t(language,'Hoạt động trước','Previous activity'):t(language,'← Hoạt động trước','← Previous activity'),hub?ArrowLeft:null,{onClick:()=>runNav('previous',onPrevious),disabled:(!readOnly&&busy)||currentIndex===0,loading:navKey==='previous'}),
    next:btn('next',navKey==='next'?t(language,'Đang chuyển…','Moving…'):hub?t(language,'Hoạt động tiếp theo','Next activity'):t(language,'Hoạt động tiếp theo →','Next activity →'),hub?ArrowRight:null,{onClick:()=>runNav('next',onNext),disabled:(!readOnly&&(busy||ended))||isLast,variant:'primary',loading:navKey==='next',extraAria:t(language,'Chuyển sang hoạt động tiếp theo','Advance to next activity')}),
    task:btn('task',stageOpen?t(language,'Đóng nhiệm vụ','Close task'):t(language,'Mở nhiệm vụ','Open task'),stageOpen||mutateLocked?Lock:LockOpen,{onClick:onToggleTask,disabled:mutateLocked,extraAria:stageOpen?t(language,'Đóng nhiệm vụ hiện tại','Close current task'):t(language,'Mở nhiệm vụ hiện tại','Open current task')}),
    reveal:btn('reveal',readOnly?(revealed?t(language,'Ẩn giải thích','Hide explanation'):t(language,'Xem giải thích','Show explanation')):revealed?t(language,'Đã hiện giải thích','Explanation shown'):t(language,'Hiện giải thích','Reveal explanation'),Eye,{onClick:onReveal,disabled:busy||(!readOnly&&(ended||revealed))}),
    qr:showJoinQr&&btn('qr','QR',QrCode,{disabled:offline,onClick:()=>onToggleTool('qr'),pressed:activeTool==='qr'}),
    fullscreen:btn('fullscreen',presentationActive?t(language,'Thoát toàn màn hình','Exit fullscreen'):t(language,'Toàn màn hình','Fullscreen'),presentationActive?Minimize2:Maximize,{onClick:onFullscreen}),
    notes:btn('notes',t(language,'Ghi chú dạy','Teaching notes'),BookOpen,{onClick:()=>onToggleTool('notes'),pressed:activeTool==='notes'}),
    resources:btn('resources',t(language,'Thư viện','Research library'),Library,{onClick:()=>onToggleTool('resources'),pressed:activeTool==='resources'}),
    voice:btn('voice',t(language,'Giọng đọc','Voiceover'),Volume2,{onClick:()=>onToggleTool('voice'),pressed:activeTool==='voice'}),
    video:btn('video','Video Lab',Film,{onClick:()=>onToggleTool('video'),pressed:activeTool==='video'}),
    motion:btn('motion',hub?motionLabel:motionDescription,Sparkles,{onClick:onToggleMotion,pressed:motionOn,variant:!hub&&motionOn?'mint':'',status:hub?motionState:null,extraAria:hub?motionLabel:motionDescription}),
    pause:btn('pause',session?.status==='paused'?t(language,'Tiếp tục','Resume'):t(language,'Tạm dừng','Pause'),session?.status==='paused'?Play:Pause,{onClick:onTogglePause,disabled:mutateLocked}),
    refresh:btn('refresh',t(language,'Làm mới','Refresh'),RefreshCw,{onClick:onRefresh,disabled:busy}),
    completion:onChangeCompletion&&(completed
      ?btn('unlock',t(language,'Mở khóa bài dạy','Unlock lesson'),LockOpen,{onClick:onChangeCompletion,disabled:busy})
      :btn('complete',t(language,'Kết thúc bài dạy','End lesson'),Lock,{onClick:onChangeCompletion,disabled:busy,variant:'primary'})),
  };
  if(focusMode)return (
    <div className="adv-focus-toolbar" role="group" aria-label={t(language,'Điều khiển trình chiếu','Presentation controls')}>
      {controls.previous}
      <div className="adv-focus-steps" aria-label={t(language,'Hoạt động','Activities')}>
       {Array.from({length:stageCount},(_,i)=>onBrowse?<button type="button" key={i} aria-current={i===currentIndex?'step':undefined} onClick={()=>onBrowse(i)} aria-label={t(language,'Xem hoạt động ','View activity ')+(i+1)}>{String(i+1).padStart(2,'0')}</button>:<span key={i} aria-current={i===currentIndex?'step':undefined}>{String(i+1).padStart(2,'0')}</span>)}
      </div>
      <div className="adv-focus-primary">{isLast&&controls.completion&&!completed?controls.completion:isLast&&readOnly?<span className="adv-focus-finished">{t(language,'Bài học đã kết thúc','Lesson completed')}</span>:controls.next}</div>
      <details className="adv-focus-more"><summary>{t(language,'Công cụ','Tools')}</summary><div className="adv-focus-more-grid">{['fullscreen','task','reveal','qr','notes','resources','voice','video','motion','pause','refresh','completion'].map(key=>controls[key])}</div></details>
    </div>
  );
  if(!hub)return (
    <div className="toolbar adv-toolbar" role="toolbar" aria-label={t(language,'Thanh điều khiển giáo viên','Teacher control toolbar')}>
      {Object.values(controls)}
    </div>
  );
  const sections=[
    {key:'activity',label:t(language,'Hoạt động','Activity'),tools:['previous','next','task','reveal']},
    {key:'presentation',label:t(language,'Trình chiếu','Presentation'),tools:['fullscreen','voice','video','motion']},
    {key:'session',label:t(language,'Tài liệu và phiên học','Resources & session'),tools:['notes','resources','pause','refresh','qr','completion']},
  ];
  return sections.map(({key,label,tools})=>(
    <section className={`adv-hub-section adv-hub-section--${key}`} key={key} aria-label={label}>
      <h3>{label}</h3>
      <div className="adv-hub-buttons">{tools.map(tool=>controls[tool])}</div>
    </section>
  ));
}
export {TeacherToolbar};
