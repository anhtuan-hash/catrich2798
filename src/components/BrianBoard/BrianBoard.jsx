import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Presentation,Pen,Highlighter,Eraser,MousePointer2,Hand,Type,Square,Circle,Minus,
 StickyNote,ScanEye,Undo2,Redo2,Plus,Copy,Trash2,Save,CheckCircle2,X,ChevronLeft,
 ChevronRight,CloudOff,Play,Pause,RotateCcw,Timer,Users,Eye,EyeOff,Maximize2,
 Download,Move,Palette,FilePlus2,LockKeyhole,LockKeyholeOpen,Layers,ArrowUp,ArrowDown,ImagePlus} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {GLOBAL_FLOATING_ACTION_EVENT,FLOATING_ACTION_IDS} from '../../utils/unifiedFloatingDock.js';
import {BOARD_W,BOARD_H,newLesson,newPage,normalizeLesson,makeId,THEMES,sanitizeStudentPage} from './boardModel.js';
import {readBoardDraft,saveBoardDraft,listBoardLessons,readBoardLesson,deleteBoardLesson} from './boardStorage.js';
import BoardCanvas from './BoardCanvas.jsx';
import {listBoardCloud,saveBoardCloud,readBoardCloud} from './boardCloud.js';
import './BrianBoard.css';

const drawTools=[
 ['select',MousePointer2,'Select','Chọn'],['pan',Hand,'Pan','Di chuyển'],
 ['pen',Pen,'Pen','Bút'],['highlighter',Highlighter,'Highlight','Đánh dấu'],
 ['eraser',Eraser,'Erase stroke','Tẩy nét'],['text',Type,'Text','Chữ'],
 ['shape-rect',Square,'Rectangle','Hình chữ nhật'],['shape-ellipse',Circle,'Ellipse','Hình tròn'],
 ['shape-line',Minus,'Line','Đường thẳng'],['sticky',StickyNote,'Sticky note','Ghi chú'],
 ['flashcard',Layers,'Flashcard','Thẻ lật'],['mask',EyeOff,'Answer curtain','Che đáp án'],
 ['laser',ScanEye,'Laser pointer','Con trỏ laser'],
];
const SHAPES=['ivory','midnight','classroom'];
const snapshots=items=>typeof structuredClone==='function'?structuredClone(items):JSON.parse(JSON.stringify(items));
const rolesAllowed=user=>{
 if(!user?.id||user.approved===false)return false;
 return isAdminRole(user.role)||isDepartmentLeaderRole(user.role)||normalizeSystemRole(user.role)==='teacher';
};
export default function BrianBoard({currentUser,language='vi'}){
 const vi=language!=='en',ownerId=currentUser?.id,allowed=rolesAllowed(currentUser);
 const [open,setOpen]=useState(false),[phase,setPhase]=useState('closed');
 const [lesson,setLesson]=useState(null),[loading,setLoading]=useState(false);
 const [saveState,setSaveState]=useState('idle'),[saveError,setSaveError]=useState('');
 const [tool,setTool]=useState('pen'),[color,setColor]=useState('#335d63'),[thickness,setThickness]=useState(5);
 const [zoom,setZoom]=useState(1),[camera,setCamera]=useState({x:0,y:0});
 const [contentText,setContentText]=useState(''),[privateAnswer,setPrivateAnswer]=useState(''),[showPages,setShowPages]=useState(()=>window.innerWidth>780),[spotlight,setSpotlight]=useState(false);
 const [studentView,setStudentView]=useState(false),[timerSeconds,setTimerSeconds]=useState(300);
 const [timerDeadline,setTimerDeadline]=useState(0),[timerNow,setTimerNow]=useState(Date.now());
 const [teams,setTeams]=useState([{name:'Team 1',score:0},{name:'Team 2',score:0}]);
 const [randomNames,setRandomNames]=useState(''),[randomChoice,setRandomChoice]=useState('');
 const [panel,setPanel]=useState('pages'),[library,setLibrary]=useState([]),[libraryError,setLibraryError]=useState(''),[cloudLibrary,setCloudLibrary]=useState([]),[cloudStatus,setCloudStatus]=useState('');
 const refreshLibrary=async()=>{
  try{setLibrary(await listBoardLessons(ownerId));setLibraryError('');}
  catch(e){setLibraryError(e.message||'Cannot load library');}
 };
 useEffect(()=>{if(open&&panel==='library')void refreshLibrary();},[open,panel,lesson?.id,lesson?.updatedAt]);
 const history=useRef([]),future=useRef([]),docRef=useRef(null),enterRef=useRef(null),closeRef=useRef(null);
 const saving=useRef(Promise.resolve()),dirty=useRef(false),animating=useRef(false);
 const launchRef=useRef(null),lastFocusRef=useRef(null),mounted=useRef(true);
 const page=lesson?.pages.find(x=>x.id===lesson.activePageId)||lesson?.pages[0];
 const theme=lesson?.theme||'ivory';
 const activeCamera=page?.camera||camera;
 docRef.current=lesson;
 useEffect(()=>()=>{mounted.current=false;},[]);
 useEffect(()=>{
  if(!open||!timerDeadline)return undefined;
  const id=setInterval(()=>setTimerNow(Date.now()),1000);
  return()=>clearInterval(id);
 },[open,timerDeadline]);
 const remaining=timerDeadline?Math.max(0,Math.ceil((timerDeadline-timerNow)/1000)):timerSeconds;
 const timerText=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');

 const persist=useCallback(async snapshot=>{
  if(!snapshot||!ownerId)return;
  dirty.current=true;setSaveState('saving');
  try{
   saving.current=saving.current.catch(()=>{}).then(()=>saveBoardDraft(ownerId,snapshot));
   await saving.current;
   if(docRef.current===snapshot)dirty.current=false;
   if(mounted.current)setSaveState('saved');
  }catch(err){if(mounted.current){setSaveState('error');setSaveError(err?.message||'IndexedDB write failed');}}
 },[ownerId]);
 const mutate=useCallback(update=>{
  const prior=docRef.current;if(!prior)return;
  const next=typeof update==='function'?update(prior):update;
  if(!next||next===prior)return;
  history.current=[...history.current.slice(-119),snapshots(prior)];
  future.current=[];
  const value={...next,updatedAt:Date.now()};
  docRef.current=value;
  setLesson(value);dirty.current=true;setSaveState('pending');
 },[]);
 const undo=useCallback(()=>{
  if(!history.current.length||!docRef.current)return;
  future.current.push(snapshots(docRef.current));
  const next=history.current.pop();docRef.current=next;setLesson(next);dirty.current=true;setSaveState('pending');
 },[]);
 const redo=useCallback(()=>{
  if(!future.current.length||!docRef.current)return;
  history.current.push(snapshots(docRef.current));
  const next=future.current.pop();docRef.current=next;setLesson(next);dirty.current=true;setSaveState('pending');
 },[]);
 useEffect(()=>{
  if(!open||!lesson||loading||!dirty.current)return undefined;
  const id=setTimeout(()=>{void persist(docRef.current);},420);
  return()=>clearTimeout(id);
 },[lesson,open,loading,persist]);
 useEffect(()=>{
  history.current=[];future.current=[];setLesson(null);setOpen(false);setPhase('closed');
  dirty.current=false;setSaveError('');
 },[ownerId]);
 const start=useCallback(async()=>{
  if(!allowed||open||animating.current)return;
  if(document.querySelector('.bfc-overlay')){
   window.alert(vi?'Hãy đóng Brian Focus trước khi mở Bảng dạy học. Video nền vẫn tiếp tục phát.':'Close Brian Focus before opening Board. Background audio will continue.');
   return;
  }
  animating.current=true;lastFocusRef.current=document.activeElement;
  setLoading(true);setSaveError('');
  try{
   const draft=await readBoardDraft(ownerId);
   const restored=normalizeLesson(draft||newLesson(ownerId),ownerId);
   docRef.current=restored;setLesson(restored);history.current=[];future.current=[];dirty.current=false;
  }catch(e){
   // Do not silently replace a draft after storage failed: user may have data.
   setSaveState('error');setSaveError(e.message||'Cannot read local drafts');
   setLoading(false);animating.current=false;return;
  }
  setLoading(false);setPhase('entering');setOpen(true);
 },[allowed,open,ownerId,vi]);
 const finishClose=useCallback(()=>{
  setPhase('closed');setOpen(false);animating.current=false;setStudentView(false);
  setTimeout(()=>lastFocusRef.current?.focus?.({preventScroll:true}),0);
 },[]);
 const close=useCallback(async()=>{
  if(!open||animating.current&&phase!=='active')return;
  if(dirty.current){
   await persist(docRef.current);
   if(dirty.current||saveState==='error'){
    const leave=window.confirm(vi?'Lưu bảng chưa được xác nhận. Vẫn đóng? (Nét vừa viết có thể mất)':'Storage has not confirmed your work. Close anyway? Unsaved strokes could be lost.');
    if(!leave)return;
   }
  }
  animating.current=true;setPhase('exiting');
 },[open,phase,persist,saveState,vi]);
 useLayoutEffect(()=>{
  if(!open||phase!=='entering')return undefined;
  const el=enterRef.current;const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animation=el?.animate?.(
    reduce?[{opacity:0},{opacity:1}]:[{opacity:0,transform:'translateY(12px) scale(.975)',clipPath:'inset(5% round 30px)'},{opacity:1,transform:'translateY(0) scale(1)',clipPath:'inset(0% round 0px)'}],
    {duration:reduce?160:490,easing:'cubic-bezier(.16,.8,.26,1)',fill:'both'});
  if(!animation){setPhase('active');animating.current=false;return;}
  let canceled=false;animation.finished.then(()=>{if(!canceled){setPhase('active');animating.current=false;}},()=>{});
  return()=>{canceled=true;animation.cancel();};
 },[open,phase]);
 useLayoutEffect(()=>{
  if(!open||phase!=='exiting')return undefined;
  const el=enterRef.current,reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animation=el?.animate?.(reduce?[{opacity:1},{opacity:0}]:
    [{opacity:1,transform:'scale(1)'},{opacity:0,transform:'translateY(18px) scale(.965)'}],
    {duration:reduce?160:420,easing:'cubic-bezier(.55,.02,.73,.33)',fill:'forwards'});
  const timer=setTimeout(finishClose,900);
  Promise.resolve(animation?.finished).then(finishClose,finishClose);
  return()=>{clearTimeout(timer);animation?.cancel?.();};
 },[open,phase,finishClose]);
 useEffect(()=>{
  const onAction=e=>{if(e.detail?.id===FLOATING_ACTION_IDS.board)void start();};
  window.addEventListener(GLOBAL_FLOATING_ACTION_EVENT,onAction);
  return()=>window.removeEventListener(GLOBAL_FLOATING_ACTION_EVENT,onAction);
 },[start]);
 useEffect(()=>{
  if(!open)return undefined;
  const key=e=>{
   if(e.key==='Escape'){
    if(studentView){setStudentView(false);return;}
    void close();return;
   }
   const editing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
   if(editing)return;
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){
    e.preventDefault();e.shiftKey?redo():undo();
   }else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}
   else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void persist(docRef.current);}
   else if(!e.metaKey&&!e.ctrlKey){
    const keymap={b:'pen',h:'highlighter',e:'eraser',v:'select',t:'text',p:'pan'};
    if(keymap[e.key.toLowerCase()])setTool(keymap[e.key.toLowerCase()]);
   }
  };
  document.addEventListener('keydown',key);
  return()=>document.removeEventListener('keydown',key);
 },[open,close,undo,redo,persist,studentView]);
 useEffect(()=>{
  if(!open)return undefined;
  document.body.classList.add('bbd-board-session');
  return()=>document.body.classList.remove('bbd-board-session');
 },[open]);
 const editPage=(fn)=>mutate(d=>({...d,pages:d.pages.map(p=>p.id===d.activePageId?fn(p):p)}));
 const commitObj=object=>{if(!page||page.locked)return;editPage(p=>({...p,objects:[...p.objects,object]}));};
 const eraseObject=id=>{if(!page||page.locked)return;editPage(p=>({...p,objects:p.objects.filter(o=>o.id!==id)}));};
 const interactObject=id=>{if(!page||page.locked)return;
  editPage(p=>({...p,objects:p.objects.map(o=>o.id===id&&o.kind==='flashcard'
   ?{...o,revealed:!o.revealed}:o)}));
 };
 const insertImage=file=>{
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){
    window.alert(vi?'Chỉ nhận PNG/JPEG/WebP tối đa 2 MB':'Choose a PNG/JPEG/WebP image up to 2 MB');return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
   const src=String(reader.result||'');
   if(!/^data:image\/(?:png|jpeg|webp);base64,/i.test(src))return;
   commitObj({kind:'image',id:makeId(),src,x:150,y:120,width:560,height:340,studentVisible:true});
  };
  reader.readAsDataURL(file);
 };
 const addPage=()=>mutate(d=>{
  const next=newPage('Page '+(d.pages.length+1));
  return {...d,pages:[...d.pages,next],activePageId:next.id};
 });
 const copyPage=()=>mutate(d=>{
  const orig=d.pages.find(p=>p.id===d.activePageId);
  const next={...snapshots(orig),id:makeId(),title:orig.title+' copy',objects:orig.objects.map(o=>({...o,id:makeId()}))};
  return {...d,pages:[...d.pages,next],activePageId:next.id};
 });
 const deletePage=()=>{
  if(!lesson||lesson.pages.length<=1)return;
  if(!window.confirm(vi?'Xóa trang này? Có thể hoàn tác.':'Delete this page? Undo remains available.'))return;
  mutate(d=>{const pages=d.pages.filter(p=>p.id!==d.activePageId);return {...d,pages,activePageId:pages[0].id};});
 };
 const switchLesson=async id=>{
  if(id===docRef.current?.id)return;
  if(dirty.current)await persist(docRef.current);
  try{
   const selected=await readBoardLesson(ownerId,id);
   if(!selected)throw Error('Draft not found');
   docRef.current=selected;setLesson(selected);dirty.current=false;
   history.current=[];future.current=[];
   await saveBoardDraft(ownerId,selected);
   setPanel('pages');
  }catch(e){setLibraryError(e.message||'Cannot open draft');}
 };
 const createLesson=async()=>{
  if(dirty.current)await persist(docRef.current);
  const next=newLesson(ownerId);
  docRef.current=next;setLesson(next);history.current=[];future.current=[];
  dirty.current=true;
  await persist(next);setPanel('pages');void refreshLibrary();
 };
 const removeLesson=async id=>{
  if(!window.confirm(vi?'Xóa hẳn bài dạy này khỏi thiết bị?':'Permanently delete this local lesson?'))return;
  try{
   if(docRef.current?.id===id){
    const next=newLesson(ownerId);docRef.current=next;setLesson(next);
    history.current=[];future.current=[];dirty.current=true;await persist(next);
   }
   await deleteBoardLesson(ownerId,id);void refreshLibrary();
  }catch(e){setLibraryError(e.message||'Cannot delete draft');}
 };
 const cloudList=async()=>{
  try{setCloudStatus(vi?'Đang đọc Cloud…':'Loading cloud…');
   setCloudLibrary(await listBoardCloud(ownerId));setCloudStatus('');}
  catch(e){setCloudStatus(e.message||'Cloud is unavailable');}
 };
 const backupCloud=async()=>{
  if(!docRef.current)return;
  try{
   setCloudStatus(vi?'Đang sao lưu…':'Backing up…');
   if(dirty.current)await persist(docRef.current);
   await saveBoardCloud(ownerId,docRef.current);
   setCloudStatus(vi?'Đã sao lưu lên tài khoản':'Backed up to your account');
   void cloudList();
  }catch(e){setCloudStatus(e.message||'Cloud backup failed');}
 };
 const restoreCloud=async id=>{
  if(!window.confirm(vi?'Nhập bản sao Cloud thành một bài dạy MỚI? Bản hiện tại sẽ được giữ nguyên.':'Import this cloud snapshot as a NEW lesson? Your current lesson will be preserved.'))return;
  try{
   const found=await readBoardCloud(ownerId,id);
   if(!found)throw Error('Cloud lesson not found');
   if(dirty.current)await persist(docRef.current);
   const copy={...found.lesson,id:makeId(),title:found.lesson.title+' (Cloud copy)'};
   docRef.current=copy;setLesson(copy);history.current=[];future.current=[];
   dirty.current=true;await persist(copy);
   setPanel('pages');setCloudStatus(vi?'Đã nhập bản sao riêng':'Imported private copy');
  }catch(e){setCloudStatus(e.message||'Restore failed');}
 };
 const pageAt=index=>mutate(d=>({...d,activePageId:d.pages[index]?.id||d.activePageId}));
 const movePage=offset=>mutate(d=>{
  const index=d.pages.findIndex(p=>p.id===d.activePageId),target=index+offset;
  if(target<0||target>=d.pages.length)return d;
  const pages=[...d.pages];[pages[index],pages[target]]=[pages[target],pages[index]];
  return {...d,pages};
 });
 const exportPNG=async()=>{
  const root=document.querySelector('.bbd-canvas__svg');if(!root)return;
  const serializer=new XMLSerializer();
  const svg=serializer.serializeToString(root);
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='brian-board-'+(lesson?.title||'lesson').replace(/[^a-z0-9-]/gi,'_')+'.svg';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const addTeam=()=>setTeams(prev=>prev.length>=8?prev:[...prev,{name:'Team '+(prev.length+1),score:0}]);
 const drawTheme={ivory:'Ivory Studio',midnight:'Midnight Slate',classroom:'Classroom Canvas'};
 if(!allowed)return null;
 const button=<button type="button" className="bbd-board-fab" ref={launchRef}
   aria-label={vi?'Mở bảng giảng dạy Brian Board':'Open Brian Teaching Board'} title="Brian Board"
   onClick={()=>void start()}><Presentation size={25} strokeWidth={1.8}/><span className="bbd-board-fab__tooltip">Brian Board</span></button>;
 return <>
  {!open&&createPortal(button,document.body)}
  {open&&createPortal(<section ref={enterRef} className={'bbd-shell bbd-theme-'+theme+(studentView?' is-student-view':'')} data-phase={phase}
   role="dialog" aria-modal="true" aria-label="Brian Teaching Board">
   <header className="bbd-head">
    <div className="bbd-brand"><span className="bbd-brand__mark">B</span><span><strong>BRIAN BOARD</strong>
      <small>THE LIVING CLASSROOM</small></span></div>
    <input className="bbd-lesson-name" aria-label="Lesson title" value={lesson?.title||''}
     onChange={e=>mutate(d=>({...d,title:e.target.value.slice(0,180)}))}/>
    <span className={'bbd-save-status is-'+saveState} role="status">
      {saveState==='error'?<CloudOff size={14}/>:<CheckCircle2 size={14}/>}
      {saveState==='error'?(vi?'Lỗi lưu':'Save error'):saveState==='saving'?(vi?'Đang lưu':'Saving'):
       saveState==='pending'?(vi?'Chưa lưu':'Unsaved'):(vi?'Đã lưu trên máy':'Saved locally')}</span>
    <div className="bbd-head-actions">
     <button onClick={undo} disabled={!history.current.length} title="Undo"><Undo2 size={17}/></button>
     <button onClick={redo} disabled={!future.current.length} title="Redo"><Redo2 size={17}/></button>
     <button onClick={()=>void persist(docRef.current)} title={vi?'Lưu ngay':'Save now'}><Save size={17}/><span>{vi?'Lưu':'Save'}</span></button>
     <button onClick={()=>setShowPages(v=>!v)} title={vi?'Hiện/ẩn công cụ bên phải':'Toggle side panel'}><Move size={17}/></button>
     <button onClick={()=>setStudentView(v=>!v)} title={vi?'Xem như học sinh':'Student preview'}>
      <Eye size={18}/><span>{vi?'Xem lớp':'Preview'}</span></button>
     <button className="bbd-close" onClick={()=>void close()} title={vi?'Đóng':'Close'}><X size={18}/><span>{vi?'Đóng':'Close'}</span></button>
    </div>
   </header>
   {saveError&&<div className="bbd-storage-warning" role="alert">{saveError}</div>}
   <div className="bbd-workspace">
    {!studentView&&<aside className="bbd-tools" aria-label="Drawing tools">
     {drawTools.map(([id,Icon,en,vn])=><button key={id} type="button" onClick={()=>setTool(id)}
       className={tool===id?'active':''} aria-label={vi?vn:en} title={vi?vn:en}><Icon size={20}/></button>)}
     <button onClick={()=>setSpotlight(s=>!s)} className={spotlight?'active':''} title="Spotlight"><ScanEye size={20}/></button>
    </aside>}
    <div className="bbd-canvas-area">
     <BoardCanvas page={studentView?sanitizeStudentPage(page):page} tool={studentView?'select':tool} color={color} width={thickness}
       onCommit={commitObj} onErase={eraseObject} zoom={zoom} setZoom={setZoom}
       camera={camera} setCamera={setCamera} contentText={contentText} privateAnswer={privateAnswer} onInteract={interactObject}
       spotlight={spotlight} studentView={studentView}/>
     <div className="bbd-canvas-bottom">
      <div className="bbd-color-strip">
       {['#335d63','#648cd0','#db8159','#a5669f','#e0b143','#272a31','#f7f6f1'].map(c=>
        <button key={c} className={color===c?'selected':''} onClick={()=>setColor(c)}
         aria-label={'Ink color '+c} style={{background:c}}/>)}
       <input aria-label="Stroke thickness" type="range" min="2" max="22" value={thickness}
        onChange={e=>setThickness(Number(e.target.value))}/>
       {['text','sticky','flashcard'].includes(tool)&&<input className="bbd-object-text"
        value={contentText} onChange={e=>setContentText(e.target.value)}
        placeholder={vi?'Nhập nội dung rồi chạm bảng':'Type, then tap the board'}/>}
       {tool==='flashcard'&&<input className="bbd-object-text" value={privateAnswer}
        onChange={e=>setPrivateAnswer(e.target.value)}
        placeholder={vi?'Đáp án riêng của giáo viên':'Teacher-only answer'}/>}
      </div>
      <div className="bbd-zoom">
       <button onClick={()=>setZoom(z=>Math.max(.35,Math.round((z-.15)*100)/100))}>−</button>
       <span>{Math.round(zoom*100)}%</span>
       <button onClick={()=>setZoom(z=>Math.min(3,Math.round((z+.15)*100)/100))}>+</button>
       <button onClick={()=>{setZoom(1);setCamera({x:0,y:0});}} title="Reset view"><Maximize2 size={16}/></button>
      </div>
     </div>
    </div>
    {!studentView&&showPages&&<aside className="bbd-sidebar">
     <div className="bbd-sidebar-tabs">
      {['pages','library','teaching','design'].map(id=><button key={id} className={panel===id?'active':''} onClick={()=>setPanel(id)}>
       {id==='pages'?(vi?'Trang':'Pages'):id==='library'?(vi?'Thư viện':'Library'):id==='teaching'?(vi?'Lớp học':'Classroom'):(vi?'Thiết kế':'Design')}</button>)}
     </div>
     {panel==='pages'&&<div className="bbd-pages">
      <div className="bbd-side-heading"><strong>{vi?'Các trang bài giảng':'Lesson pages'}</strong>
       <button onClick={addPage}><Plus size={17}/></button></div>
      {lesson?.pages.map((p,i)=><button key={p.id} className={'bbd-page'+(p.id===lesson.activePageId?' active':'')}
       onClick={()=>pageAt(i)}><span className="bbd-page__num">{String(i+1).padStart(2,'0')}</span>
        <span>{p.title}</span>{p.locked&&<LockKeyhole size={13}/>}</button>)}
      <div className="bbd-side-actions"><button onClick={copyPage}><Copy size={16}/>{vi?'Nhân bản':'Duplicate'}</button>
       <button onClick={deletePage} disabled={lesson?.pages.length<2}><Trash2 size={16}/>{vi?'Xóa':'Delete'}</button> <button title="Move page up" onClick={()=>movePage(-1)}><ArrowUp size={16}/></button>
   <button title="Move page down" onClick={()=>movePage(1)}><ArrowDown size={16}/></button></div>
      <button onClick={()=>editPage(p=>({...p,locked:!p.locked}))}>{page?.locked?<LockKeyholeOpen size={16}/>:<LockKeyhole size={16}/>}
       {page?.locked?(vi?'Mở khóa trang':'Unlock page'):(vi?'Khóa trang':'Lock page')}</button>
      <button onClick={()=>editPage(p=>({...p,hidden:!p.hidden}))}>{page?.hidden?<EyeOff size={16}/>:<Eye size={16}/>}
       {page?.hidden?(vi?'Hiện trang khi chiếu':'Show on display'):(vi?'Ẩn trang khi chiếu':'Hide on display')}</button>
     </div>}
     {panel==='library'&&<div className="bbd-side-stack">
      <div className="bbd-side-heading"><h3>{vi?'Thư viện bài dạy':'Lesson library'}</h3>
       <button onClick={()=>void createLesson()}><FilePlus2 size={16}/></button></div>
      <p>{vi?'Các bản nháp lưu riêng trên thiết bị này, không ghi vào sổ điểm hay dữ liệu lớp.':'Private lessons on this device, separate from gradebook and class data.'}</p>
      <button onClick={()=>void createLesson()}><Plus size={16}/>{vi?'Tạo bài dạy mới':'New lesson'}</button>
      <h4>{vi?'Bản sao lưu Cloud':'Cloud backups'}</h4>
      <div className="bbd-side-actions">
       <button onClick={()=>void backupCloud()}><Save size={15}/>{vi?'Sao lưu Cloud':'Backup'}</button>
       <button onClick={()=>void cloudList()}><CloudOff size={15}/>{vi?'Tải danh sách':'Refresh list'}</button>
      </div>
      {cloudStatus&&<p role="status">{cloudStatus}</p>}
      {cloudLibrary.map(row=><div key={row.lesson_id} className="bbd-library-item">
       <div><strong>{row.title}</strong><small>{new Date(row.updated_at).toLocaleDateString()} · r{row.revision}</small></div>
       <button onClick={()=>void restoreCloud(row.lesson_id)}>{vi?'Nhập bản sao':'Import copy'}</button>
      </div>)}
      {libraryError&&<p role="alert">{libraryError}</p>}
      {library.map(x=><div key={x.id} className={'bbd-library-item'+(x.id===lesson?.id?' active':'')}>
        <div><strong>{x.title}</strong><small>{x.pages} {vi?'trang':'pages'} · {new Date(x.updatedAt).toLocaleDateString()}</small></div>
        <div className="bbd-side-actions"><button disabled={x.id===lesson?.id} onClick={()=>void switchLesson(x.id)}>{vi?'Mở':'Open'}</button>
         <button onClick={()=>void removeLesson(x.id)}><Trash2 size={15}/></button></div>
      </div>)}
     </div>}
     {panel==='teaching'&&<div className="bbd-side-stack">
      <h3>{vi?'Tiện ích lớp học':'Classroom tools'}</h3>
      <div className="bbd-timer"><strong>{timerText}</strong><div className="bbd-side-actions">
       <button onClick={()=>{if(timerDeadline){setTimerSeconds(remaining);setTimerDeadline(0);}
        else{setTimerDeadline(Date.now()+timerSeconds*1000);setTimerNow(Date.now());}}}>
        {timerDeadline?<Pause size={16}/>:<Play size={16}/>}</button>
       <button onClick={()=>{setTimerDeadline(0);setTimerSeconds(300);}}><RotateCcw size={16}/></button></div></div>
      <label>{vi?'Thời lượng (phút)':'Minutes'}
       <input type="number" min="1" max="180" value={Math.max(1,Math.round(timerSeconds/60))}
        onChange={e=>{if(!timerDeadline)setTimerSeconds(Math.max(60,Math.min(10800,Number(e.target.value||5)*60)));}}/></label>
      <h4>{vi?'Điểm đội':'Team scores'}</h4>
      {teams.map((team,i)=><div className="bbd-team" key={i}>
       <span>{team.name}</span><button onClick={()=>setTeams(t=>t.map((x,j)=>j===i?{...x,score:Math.max(0,x.score-1)}:x))}>−</button>
       <strong>{team.score}</strong><button onClick={()=>setTeams(t=>t.map((x,j)=>j===i?{...x,score:x.score+1}:x))}>+</button></div>)}
      <button disabled={teams.length>=8} onClick={addTeam}><Users size={17}/>{vi?'Thêm đội':'Add team'}</button>
      <h4>{vi?'Chọn ngẫu nhiên':'Random picker'}</h4>
      <textarea rows={3} value={randomNames} onChange={e=>setRandomNames(e.target.value)}
       placeholder={vi?'Nhập tên, mỗi dòng một người':'One name per line'}/>
      <button onClick={()=>{const list=randomNames.split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean);
       if(list.length){const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);setRandomChoice(list[bytes[0]%list.length]);}}}>
       {vi?'Chọn một người':'Pick one'}</button>
      {randomChoice&&<strong className="bbd-random-result">{randomChoice}</strong>}
     </div>}
     {panel==='design'&&<div className="bbd-side-stack">
      <h3>{vi?'Chủ đề bảng':'Board theme'}</h3>
      {SHAPES.map(id=><button key={id} className={'bbd-theme-choice'+(theme===id?' active':'')}
       onClick={()=>mutate(d=>({...d,theme:id}))}>{drawTheme[id]}</button>)}
      <h4>{vi?'Nền trang':'Page background'}</h4>
      {['plain','grid','lines'].map(x=><button key={x} onClick={()=>editPage(p=>({...p,background:x}))}
       className={'bbd-theme-choice'+(page?.background===x?' active':'')}>{x}</button>)}
      <label className="bbd-import-image"><ImagePlus size={16}/>{vi?'Thêm ảnh (tối đa 2 MB)':'Insert image (max 2 MB)'}
       <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{insertImage(e.target.files?.[0]);e.target.value='';}}/></label>
      <button onClick={exportPNG}><Download size={16}/>{vi?'Xuất trang SVG':'Export SVG page'}</button>
      <p>{vi?'Nét viết và trang bài dạy được lưu riêng trên trình duyệt này.':'Your lesson draft is saved privately on this device.'}</p>
     </div>}
    </aside>}
   </div>
   <footer className="bbd-footer">
    <span>{vi?'Bài dạy đang soạn':'Draft lesson'} · {lesson?.pages.length||1} {vi?'trang':'pages'}</span>
    <div className="bbd-pagination">
     <button onClick={()=>pageAt(Math.max(0,lesson.pages.findIndex(p=>p.id===lesson.activePageId)-1))}><ChevronLeft size={17}/></button>
     <span>{lesson.pages.findIndex(p=>p.id===lesson.activePageId)+1} / {lesson.pages.length}</span>
     <button onClick={()=>pageAt(Math.min(lesson.pages.length-1,lesson.pages.findIndex(p=>p.id===lesson.activePageId)+1))}><ChevronRight size={17}/></button>
    </div>
    <button onClick={()=>setShowPages(s=>!s)}>{vi?'Brian Board · Bản nháp cá nhân':'Brian Board · Personal draft'}</button>
   </footer>
  </section>,document.body)}
 </>;
}
