import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Presentation,Pen,Highlighter,Eraser,MousePointer2,Hand,Type,Square,Circle,Minus,
 StickyNote,ScanEye,Undo2,Redo2,Plus,Copy,Trash2,Save,CheckCircle2,X,ChevronLeft,
 ChevronRight,CloudOff,Play,Pause,RotateCcw,Timer,Users,Eye,EyeOff,Maximize2,
 Download,Move,Palette,FilePlus2,LockKeyhole,LockKeyholeOpen,Layers,ArrowUp,ArrowDown,ImagePlus,Search,RefreshCcw,FileJson,FileUp,Edit3,ArrowUpRight,Triangle,Grid3X3,Droplets,Frame,Clapperboard,MapPinned,Map,Focus,Lasso,Paintbrush,LayoutTemplate,SquareStack,BookMarked,ShieldCheck} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {GLOBAL_FLOATING_ACTION_EVENT,FLOATING_ACTION_IDS} from '../../utils/unifiedFloatingDock.js';
import {BOARD_W,BOARD_H,newLesson,newPage,normalizeLesson,makeId,THEMES,sanitizeStudentPage} from './boardModel.js';
import {readBoardDraft,saveBoardDraft,listBoardLessons,readBoardLesson,deleteBoardLesson} from './boardStorage.js';
import BoardCanvas from './BoardCanvas.jsx';
import {listBoardCloud,saveBoardCloud,readBoardCloud} from './boardCloud.js';
import {boardStudentPayload,newBoardPresentationId} from './boardPresentation.js';
import {importBoardPdf,exportBoardStudentPdf} from './boardPdf.js';
import {createBoardActivity} from './boardActivities.js';
import {BOARD_PEN_PRESETS} from './boardDrawing.js';
import {safeBoardViewport,viewportForFrame,cameraForViewport,nextFramePlacement,adjacentFrameIndex,FRAME_LIMIT,fitBoardContent,reorderBoardFrame,duplicateBoardFrame} from './boardSpatial.js';
import {BOARD_BACKUP_MAX_BYTES,duplicateBoardLesson,exportPrivateBoardBackup,importPrivateBoardBackup,
 boardActivityRaw,reviseBoardActivity,duplicateBoardActivity,moveBoardActivity,hideAllBoardActivities,
 selectBoardNameWithoutRepeat} from './boardWorkflow.js';
import BoardActivityStage from './BoardActivityStage.jsx';
import BoardActivityLabBuilder from './BoardActivityLabBuilder.jsx';
import BoardActivityPublicPreview from './BoardActivityPublicPreview.jsx';
import {LAB_TYPES,LAB_LABELS,LAB_EXAMPLES,LAB_IMAGE_TYPES} from './boardActivityLab.js';
import BoardPenToolbarExtras from './BoardPenToolbarExtras.jsx';
import BoardNavigator from './BoardNavigator.jsx';
import {eraseInkAtPoint,scaleBoardObjects,duplicateBoardObjects,reorderBoardObjects,
 BOARD_V8_TEMPLATES,buildBoardTemplate} from './boardV8Tools.js';
import './BrianBoard.css';
import './BoardActivities.css';
import './BoardVisualRefresh.css';

const drawTools=[
 ['select',MousePointer2,'Select','Chọn'],['lasso',Lasso,'Freeform lasso','Khoanh chọn tự do'],['pan',Hand,'Pan','Di chuyển'],
 ['frame',Frame,'Draw frame','Vẽ khung trình chiếu'],
 ['pen',Pen,'Pen','Bút'],['highlighter',Highlighter,'Highlight','Đánh dấu'],
 ['eraser',Eraser,'Erase object','Tẩy đối tượng'],['eraser-ink',Eraser,'Erase ink only','Chỉ tẩy nét bút'],
 ['eraser-precision',Paintbrush,'Precision eraser','Tẩy từng đoạn nét'],
 ['text',Type,'Text','Chữ'],
 ['shape-rect',Square,'Rectangle','Hình chữ nhật'],['shape-ellipse',Circle,'Ellipse','Hình tròn'],
 ['shape-line',Minus,'Line','Đường thẳng'],
 ['shape-arrow',ArrowUpRight,'Arrow','Mũi tên'],['shape-triangle',Triangle,'Triangle','Tam giác'],
 ['sticky',StickyNote,'Sticky note','Ghi chú'],
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
 const closingInspector=useRef(false);
 const [lesson,setLesson]=useState(null),[loading,setLoading]=useState(false);
 const ownerRef=useRef(ownerId);ownerRef.current=ownerId;
 const [saveState,setSaveState]=useState('idle'),[saveError,setSaveError]=useState('');
 const [tool,setTool]=useState('pen'),[color,setColor]=useState('#335d63'),[thickness,setThickness]=useState(5);
 const [penPreset,setPenPreset]=useState('classic'),[snapToGrid,setSnapToGrid]=useState(false);
 const [shapeFill,setShapeFill]=useState('none');
 const [motion,setMotion]=useState(()=>{
  try{const saved=window.localStorage.getItem('bbd-motion-v1');
   return ['off','balanced','expressive'].includes(saved)?saved:'balanced';
  }catch{return 'balanced';}
 });
 useEffect(()=>{try{window.localStorage.setItem('bbd-motion-v1',motion);}catch{}},[motion]);
 const [zoom,setZoom]=useState(1),[camera,setCamera]=useState({x:0,y:0});
 const [activeFrameId,setActiveFrameId]=useState(null),[showFrames,setShowFrames]=useState(true);
 const [navigatorOpen,setNavigatorOpen]=useState(()=>window.innerWidth>640),[showNavigator,setShowNavigator]=useState(true);
 const [cleanMode,setCleanMode]=useState(false);
 const inspectorBeforeClean=useRef(false);
 const frameFlight=useRef(0);

 const [contentText,setContentText]=useState(''),[privateAnswer,setPrivateAnswer]=useState(''),[showPages,setShowPages]=useState(()=>window.innerWidth>780),[spotlight,setSpotlight]=useState(false);
 const [studentView,setStudentView]=useState(false),[timerSeconds,setTimerSeconds]=useState(300);
 const [timerDeadline,setTimerDeadline]=useState(0),[timerNow,setTimerNow]=useState(Date.now());
 const [teams,setTeams]=useState([{name:'Team 1',score:0},{name:'Team 2',score:0}]);
 const [randomNames,setRandomNames]=useState(''),[randomChoice,setRandomChoice]=useState(''),[randomUsed,setRandomUsed]=useState([]);
 const [presenting,setPresenting]=useState(false),presentationRef=useRef(null);
 const [pdfBusy,setPdfBusy]=useState(false),[pdfStatus,setPdfStatus]=useState('');
 const [activityType,setActivityType]=useState('matching'),[activityTitle,setActivityTitle]=useState(''),
  [activityPrompt,setActivityPrompt]=useState(''),[activityRaw,setActivityRaw]=useState(''),
  [activityError,setActivityError]=useState(''),[activeActivityId,setActiveActivityId]=useState(null),[editingActivityId,setEditingActivityId]=useState(null);
 const [activityImage,setActivityImage]=useState(''),[activityLive,setActivityLive]=useState(null);
 const activityLiveRef=useRef(null);activityLiveRef.current=activityLive;
 const [panel,setPanel]=useState('pages'),[library,setLibrary]=useState([]),[libraryError,setLibraryError]=useState(''),[cloudLibrary,setCloudLibrary]=useState([]),[cloudStatus,setCloudStatus]=useState('');
 const [libraryQuery,setLibraryQuery]=useState(''),[backupStatus,setBackupStatus]=useState('');
 useEffect(()=>{setRandomNames('');setRandomChoice('');setRandomUsed([]);setEditingActivityId(null);},[ownerId,lesson?.id]);
 const refreshLibrary=async()=>{
  try{setLibrary(await listBoardLessons(ownerId));setLibraryError('');}
  catch(e){setLibraryError(e.message||'Cannot load library');}
 };
 useEffect(()=>{if(open&&panel==='library')void refreshLibrary();},[open,panel,lesson?.id,lesson?.updatedAt]);
 const history=useRef([]),future=useRef([]),docRef=useRef(null),enterRef=useRef(null),closeRef=useRef(null);
 const saving=useRef(Promise.resolve()),dirty=useRef(false),animating=useRef(false);
 const launchRef=useRef(null),lastFocusRef=useRef(null),mounted=useRef(true);
 const page=lesson?.pages.find(x=>x.id===lesson.activePageId)||lesson?.pages[0];
 useEffect(()=>()=>{if(frameFlight.current)cancelAnimationFrame(frameFlight.current);},[page?.id]);
 const frames=page?.frames||[];
 const visibleFrames=frames.filter(frame=>!frame.hidden);
 const currentViewport=safeBoardViewport({x:camera.x,y:camera.y,width:BOARD_W/zoom,height:BOARD_H/zoom});
 const viewportRef=useRef(currentViewport);viewportRef.current=currentViewport;
 const lastPointerBroadcast=useRef(0);
 const broadcastPointer=(point,mode='laser')=>{
  const session=presentationRef.current;
  if(!session)return;
  if(point){
   const now=Date.now();
   if(now-lastPointerBroadcast.current<42)return;
   lastPointerBroadcast.current=now;
  }
  const bounded=point?{x:Math.max(-100000,Math.min(100000,Number(point.x)||0)),
   y:Math.max(-100000,Math.min(100000,Number(point.y)||0))}:null;
  session.bus.postMessage({type:'pointer',mode:mode==='spotlight'?'spotlight':'laser',point:bounded});
 };
 useEffect(()=>{
  if(tool!=='laser'&&!spotlight)broadcastPointer(null);
 },[tool,spotlight,studentView,activeActivityId]);
 useEffect(()=>{setCamera({x:0,y:0});setZoom(1);setActiveFrameId(null);},[page?.id]);
 // Exact TV payload for classroom preview: never read a raw activity in student mode.
 const studentActivityPayload=studentView&&lesson?boardStudentPayload(lesson,activeActivityId,activityLive):null;
 const studentActivityPreview=studentActivityPayload?.activity||null;
 const activeActivityRef=useRef(activeActivityId);activeActivityRef.current=activeActivityId;
 const receivePublicActivityState=useCallback(next=>{
  const value={...next,activityId:activeActivityRef.current};
  setActivityLive(prev=>JSON.stringify(prev)===JSON.stringify(value)?prev:value);
 },[]);
 useEffect(()=>{setActivityLive(null);},[activeActivityId,lesson?.activePageId]);
 const theme=lesson?.theme||'ivory';
 const stageKey=(page?.id||'empty')+':'+(activeActivityId||'board')+':'+(studentView?'student':'teacher');
 const activeToolName=drawTools.find(([id])=>id===tool);
 const modeLabel=studentView?(vi?'Xem trước cho học sinh':'Student preview'):
  activeActivityId?(vi?'Sân khấu bài tập':'Activity stage'):(activeToolName?.[vi?3:2]||'Board');
 const closeInspector=()=>{
  if(closingInspector.current)return;
  const reduce=motion==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(window.innerWidth>780||reduce){setShowPages(false);return;}
  const pane=document.getElementById('bbd-sidebar');
  if(!pane?.animate){setShowPages(false);return;}
  closingInspector.current=true;
  const effect=pane.animate([
   {opacity:1,transform:'translateX(0)'},
   {opacity:.15,transform:'translateX(42px)'}
  ],{duration:185,easing:'cubic-bezier(.55,.02,.75,.3)',fill:'forwards'});
  effect.finished.then(()=>{
   setShowPages(false);closingInspector.current=false;
  },()=>{setShowPages(false);closingInspector.current=false;});
 };
 const toggleInspector=()=>{if(cleanMode){setCleanMode(false);setShowPages(true);}else if(showPages)closeInspector();else setShowPages(true);};
 useEffect(()=>{
  setColor(old=>{
   if(theme==='midnight'&&old==='#335d63')return '#dcece6';
   if(theme!=='midnight'&&old==='#dcece6')return '#335d63';
   return old;
  });
 },[theme]);
 const activeCamera=page?.camera||camera;
 docRef.current=lesson;
 const lastStateBroadcast=useRef(0);
 useEffect(()=>{
  const session=presentationRef.current;
  if(!session||!lesson)return undefined;
  const send=()=>{
   if(presentationRef.current!==session)return;
   session.bus.postMessage(boardStudentPayload(lesson,activeActivityId,activityLive,currentViewport));
   lastStateBroadcast.current=Date.now();
  };
  const elapsed=Date.now()-lastStateBroadcast.current;
  if(elapsed>=110){send();return undefined;}
  const timeout=setTimeout(send,110-elapsed);
  return()=>clearTimeout(timeout);
 },[lesson,activeActivityId,activityLive,camera.x,camera.y,zoom]);
 useEffect(()=>()=>{const session=presentationRef.current;
  if(session){session.bus.postMessage({type:'end'});session.bus.close();presentationRef.current=null;}
 },[]);
 const stopPresentation=()=>{
  const session=presentationRef.current;
  if(session){session.bus.postMessage({type:'end'});session.bus.close();presentationRef.current=null;}
  setPresenting(false);
  lastPointerBroadcast.current=0;
 };
 const startPresentation=()=>{
  if(presentationRef.current)return stopPresentation();
  if(!('BroadcastChannel' in window)){
   window.alert(vi?'Trình duyệt này chưa hỗ trợ trình chiếu hai cửa sổ.':'This browser does not support local dual-screen mode.');return;
  }
  const id=newBoardPresentationId();
  const url=location.origin+'/brian-board-viewer.html#board='+encodeURIComponent(id);
  const child=window.open(url,'_blank');
  if(child)try{child.opener=null;}catch{}
  if(!child){window.alert(vi?'Hãy cho phép mở cửa sổ mới để trình chiếu.':'Allow popups to open the student display.');return;}
  const bus=new BroadcastChannel('bbd-local-'+id);
  bus.onmessage=e=>{if(e.data?.type==='request'&&docRef.current)bus.postMessage(boardStudentPayload(docRef.current,activeActivityRef.current,activityLiveRef.current,viewportRef.current));};
  presentationRef.current={id,bus};
  setPresenting(true);
  bus.postMessage(boardStudentPayload(docRef.current,activeActivityRef.current,activityLiveRef.current,viewportRef.current));
 };
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
  if(frameFlight.current)cancelAnimationFrame(frameFlight.current);
  frameFlight.current=0;
  stopPresentation();setPhase('closed');setOpen(false);animating.current=false;setStudentView(false);
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
  const el=enterRef.current;const reduce=motion==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animation=!reduce&&el?.animate?.(
    [{opacity:0,transform:'translateY(12px) scale(.975)',clipPath:'inset(5% round 30px)'},{opacity:1,transform:'translateY(0) scale(1)',clipPath:'inset(0% round 0px)'}],
    {duration:motion==='expressive'?490:330,easing:'cubic-bezier(.16,.8,.26,1)',fill:'both'});
  if(!animation){setPhase('active');animating.current=false;return;}
  let canceled=false;animation.finished.then(()=>{if(!canceled){setPhase('active');animating.current=false;}},()=>{});
  return()=>{canceled=true;animation.cancel();};
 },[open,phase,motion]);
 useLayoutEffect(()=>{
  if(!open||phase!=='exiting')return undefined;
  const el=enterRef.current,reduce=motion==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const animation=!reduce&&el?.animate?.(
    [{opacity:1,transform:'scale(1)'},{opacity:0,transform:'translateY(18px) scale(.965)'}],
    {duration:motion==='expressive'?420:260,easing:'cubic-bezier(.55,.02,.73,.33)',fill:'forwards'});
  const timer=setTimeout(finishClose,900);
  Promise.resolve(animation?.finished).then(finishClose,finishClose);
  return()=>{clearTimeout(timer);animation?.cancel?.();};
 },[open,phase,finishClose,motion]);
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
   else if(e.altKey&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
    e.preventDefault();
    const list=(docRef.current?.pages?.find(p=>p.id===docRef.current.activePageId)?.frames||[]).filter(f=>!f.hidden);
    const i=adjacentFrameIndex(list,activeFrameId,e.key==='ArrowRight'?1:-1);
    if(i>=0)goToFrame(list[i]);
   }
   else if(!e.metaKey&&!e.ctrlKey&&!e.altKey&&!e.repeat){
    const key=e.key.toLowerCase();
    const keymap={b:'pen',h:'highlighter',e:'eraser',v:'select',t:'text',p:'pan',f:'frame'};
    if(keymap[key]){e.preventDefault();setTool(keymap[key]);}
    else if(key==='g'){e.preventDefault();fitAllCanvas();}
    else if(key==='m'){e.preventDefault();setShowNavigator(old=>!old);}
    else if(key==='0'){e.preventDefault();homeCanvas();}
    else if(key==='c'){e.preventDefault();toggleCleanMode();}
   }
  };
  document.addEventListener('keydown',key);
  return()=>document.removeEventListener('keydown',key);
 },[open,close,undo,redo,persist,studentView,activeFrameId,page?.id,page?.objects,frames,zoom,camera.x,camera.y,cleanMode,motion]);
 useEffect(()=>{
  if(!open)return undefined;
  document.body.classList.add('bbd-board-session');
  return()=>document.body.classList.remove('bbd-board-session');
 },[open]);
 const editPage=(fn)=>mutate(d=>({...d,pages:d.pages.map(p=>p.id===d.activePageId?fn(p):p)}));
 const cancelActivityEditing=()=>{
  setEditingActivityId(null);setActivityRaw('');setActivityTitle('');setActivityPrompt('');setActivityImage('');setActivityError('');
 };
 const beginActivityEditing=activity=>{
  if(page?.locked)return;
  setEditingActivityId(activity.id);setActivityType(activity.type);
  setActivityTitle(activity.title);setActivityPrompt(activity.prompt);
  setActivityRaw(boardActivityRaw(activity));setActivityImage(activity.image||'');setActivityError('');
 };
 const addActivity=()=>{
  if(!page||page.locked||(!editingActivityId&&page.activities?.length>=24))return;
  try{
   const original=(page.activities||[]).find(a=>a.id===editingActivityId);
   if(editingActivityId&&!original)throw Error('Activity no longer exists; cancel editing and retry');
   const input={type:activityType,title:activityTitle,prompt:activityPrompt,raw:activityRaw,imageData:activityImage};
   const activity=original?reviseBoardActivity(original,input):createBoardActivity(input);
   editPage(p=>({...p,activities:original?p.activities.map(a=>a.id===original.id?activity:a):
    [...(p.activities||[]),activity]}));
   setActiveActivityId(activity.id);cancelActivityEditing();
  }catch(e){setActivityError(e.message||'Invalid activity');}
 };
 const duplicateActivity=id=>{
  if(page?.locked||page?.activities?.length>=24)return;
  const original=(page.activities||[]).find(a=>a.id===id);if(!original)return;
  try{
   const copy=duplicateBoardActivity(original);
   editPage(p=>({...p,activities:[...(p.activities||[]),copy]}));
   setActiveActivityId(copy.id);setActivityError('');
  }catch(e){setActivityError(e.message||'Unable to duplicate activity');}
 };
 const orderActivity=(id,offset)=>{
  if(page?.locked)return;
  editPage(p=>({...p,activities:moveBoardActivity(p.activities,id,offset)}));
 };
 const hideEveryActivity=()=>{
  if(page?.locked||!(page?.activities||[]).some(a=>a.studentVisible!==false))return;
  if(!window.confirm(vi?'Ẩn toàn bộ bài tập của trang này khỏi học sinh và TV?':'Hide all activities on this page from student preview, TV and PDF?'))return;
  editPage(p=>({...p,activities:hideAllBoardActivities(p.activities)}));
 };
 const toggleActivityVisibility=id=>{
  if(page?.locked)return;
  editPage(p=>({...p,activities:(p.activities||[]).map(activity=>activity.id===id&&!activity.teacherOnly?
   {...activity,studentVisible:activity.studentVisible===false}:activity)}));
 };
 const deleteActivity=id=>{
  if(!window.confirm(vi?'Xóa hoạt động này? Có thể hoàn tác.':'Remove this activity? Undo is available.'))return;
  editPage(p=>({...p,activities:(p.activities||[]).filter(a=>a.id!==id)}));
  if(activeActivityId===id)setActiveActivityId(null);
  if(editingActivityId===id)cancelActivityEditing();
 };
 const commitObj=object=>{if(!page||page.locked)return;editPage(p=>({...p,objects:[...p.objects,object]}));};
 const eraseObject=id=>{if(!page||page.locked)return;editPage(p=>({...p,objects:p.objects.filter(o=>o.id!==id)}));};
 const precisionErase=points=>{
  if(!page||page.locked||!points?.length)return;
  const sampled=points.length>120?points.filter((_,i)=>i%Math.ceil(points.length/120)===0):points;
  editPage(p=>({...p,objects:sampled.reduce((objects,point)=>eraseInkAtPoint(objects,point,23),p.objects)}));
 };
 const batchEdit=(ids,action,params={})=>{
  if(!page||page.locked||!ids.length)return;
  editPage(p=>{
   const objects=p.objects;
   if(action==='delete')return {...p,objects:objects.filter(o=>!ids.includes(o.id))};
   if(action==='duplicate')return {...p,objects:duplicateBoardObjects(objects,ids).slice(0,3000)};
   if(action==='front'||action==='back')return {...p,objects:reorderBoardObjects(objects,ids,action)};
   if(action==='scale')return {...p,objects:scaleBoardObjects(objects,ids,params.factor)};
   return p;
  });
 };
 const insertTeachingTemplate=id=>{
  if(!page||page.locked)return;
  const created=buildBoardTemplate(id,currentViewport,vi);
  if(!created.length||page.objects.length+created.length>3000)return;
  editPage(p=>({...p,objects:[...p.objects,...created]}));
  setTool('select');
 };
 const duplicateObject=id=>{
  if(!page||page.locked||page.objects.length>=3000)return;
  const obj=page.objects.find(o=>o.id===id);
  if(!obj)return;
  const copy=snapshots(obj);
  copy.id=makeId();
  if(copy.kind==='stroke')copy.points=(copy.points||[]).map(pt=>({...pt,x:pt.x+30,y:pt.y+30}));
  else if(copy.kind==='shape'){copy.x+=30;copy.y+=30;copy.x2+=30;copy.y2+=30;}
  else{copy.x=(copy.x||0)+30;copy.y=(copy.y||0)+30;}
  commitObj(copy);
 };
 const clearInk=()=>{
  if(!page||page.locked||!page.objects.some(o=>o.kind==='stroke'))return;
  if(!window.confirm(vi?'Xóa toàn bộ nét bút ở trang này? Có thể hoàn tác.':'Clear all pen strokes on this page? Undo is available.'))return;
  editPage(p=>({...p,objects:p.objects.filter(o=>o.kind!=='stroke')}));
 };
 const moveObject=(id,dx,dy)=>{
  if(!page||page.locked||!Number.isFinite(dx)||!Number.isFinite(dy))return;
  editPage(p=>({...p,objects:p.objects.map(o=>{
   if(o.id!==id)return o;
   if(o.kind==='stroke')return {...o,points:o.points.map(pt=>({...pt,x:pt.x+dx,y:pt.y+dy}))};
   if(o.kind==='shape')return {...o,x:o.x+dx,y:o.y+dy,x2:o.x2+dx,y2:o.y2+dy};
   return {...o,x:(o.x||0)+dx,y:(o.y||0)+dy};
  })}));
 };
 const interactObject=id=>{if(!page||page.locked)return;
  editPage(p=>({...p,objects:p.objects.map(o=>o.id===id&&['flashcard','mask'].includes(o.kind)
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
 const addPdfPages=async file=>{
  if(!file||pdfBusy||!docRef.current)return;
  setPdfBusy(true);setPdfStatus(vi?'Đang đọc PDF…':'Reading PDF…');
  const ownerAtStart=ownerId,lessonAtStart=docRef.current.id;
  try{
   const pages=await importBoardPdf(file,docRef.current.pages.length,({page,total})=>{
    setPdfStatus((vi?'Đang tạo trang PDF ':'Rendering PDF page ')+page+'/'+total);
   });
   if(ownerAtStart!==ownerId||lessonAtStart!==docRef.current?.id)return;
   mutate(d=>({...d,pages:[...d.pages,...pages],activePageId:pages[0].id}));
   setPanel('pages');setPdfStatus((vi?'Đã thêm ':'Imported ')+pages.length+(vi?' trang PDF':' PDF pages'));
  }catch(e){setPdfStatus(e?.message||'PDF import failed');}
  finally{setPdfBusy(false);}
 };
 const exportStudentPdf=async(includeActivities=false)=>{
  if(pdfBusy||!docRef.current)return;
  setPdfBusy(true);setPdfStatus(vi?'Đang xuất PDF cho học sinh…':'Exporting student PDF…');
  try{
   const bytes=await exportBoardStudentPdf(docRef.current,({page,total})=>
    setPdfStatus((vi?'Đang xuất trang ':'Exporting page ')+page+'/'+total),{includeActivities});
   const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
   const a=document.createElement('a');a.href=url;
   a.download='brian-board-student-'+(docRef.current.title||'lesson').replace(/[^a-z0-9_-]+/gi,'_')+
    (includeActivities?'-activities':'')+'.pdf';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
   setPdfStatus(includeActivities?(vi?'Đã xuất cả phiếu bài tập, không có đáp án riêng':'Exported worksheets without private answer keys'):
   (vi?'Đã tạo PDF không có ghi chú riêng':'Exported without teacher-only notes'));
  }catch(e){setPdfStatus(e?.message||'PDF export failed');}
  finally{setPdfBusy(false);}
 };
 const addFrameAtView=()=>{
  if(!page||page.locked||frames.length>=FRAME_LIMIT)return;
  const placed=nextFramePlacement(frames,BOARD_W,BOARD_H);
  const frame={...placed,id:makeId(),title:(vi?'Khung ':'Frame ')+(frames.length+1),hidden:false};
  editPage(p=>({...p,frames:[...(p.frames||[]),frame]}));
  setActiveFrameId(frame.id);setPanel('frames');
  goToFrame(frame);
 };
 const createDrawnFrame=frame=>{
  if(!page||page.locked||frames.length>=FRAME_LIMIT)return;
  const named={...frame,title:(vi?'Khung ':'Frame ')+(frames.length+1)};
  editPage(p=>({...p,frames:[...(p.frames||[]),named]}));
  setActiveFrameId(named.id);setPanel('frames');
 };
 const flyToView=next=>{
  if(frameFlight.current)cancelAnimationFrame(frameFlight.current);
  frameFlight.current=0;
  const reduced=motion==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced||typeof requestAnimationFrame!=='function'){
   setZoom(next.zoom);setCamera(next.camera);return;
  }
  const from={x:camera.x,y:camera.y,zoom},start=performance.now();
  const duration=motion==='expressive'?510:320;
  const tick=now=>{
   const t=Math.min(1,(now-start)/duration),e=1-Math.pow(1-t,3);
   setCamera({x:from.x+(next.camera.x-from.x)*e,y:from.y+(next.camera.y-from.y)*e});
   setZoom(from.zoom+(next.zoom-from.zoom)*e);
   if(t<1)frameFlight.current=requestAnimationFrame(tick);
   else frameFlight.current=0;
  };
  frameFlight.current=requestAnimationFrame(tick);
 };
 const goToFrame=frame=>{
  if(!frame||frame.hidden)return;
  const v=viewportForFrame(frame);
  const next=cameraForViewport(v);
  flyToView(next);setActiveFrameId(frame.id);
  setActiveActivityId(null);
 };
 const moveBetweenFrames=delta=>{
  const visible=frames.filter(f=>!f.hidden);
  const i=adjacentFrameIndex(visible,activeFrameId,delta);
  if(i>=0)goToFrame(visible[i]);
 };
 const homeCanvas=()=>{
  flyToView({camera:{x:0,y:0},zoom:1});setActiveFrameId(null);
 };
 const fitAllCanvas=()=>{
  if(!page)return;
  flyToView(fitBoardContent({frames,objects:page.objects}));
  setActiveFrameId(null);
 };
 const centerCanvasOn=point=>{
  if(!point)return;
  if(frameFlight.current)cancelAnimationFrame(frameFlight.current);
  frameFlight.current=0;
  const viewWidth=BOARD_W/zoom,viewHeight=BOARD_H/zoom;
  const limit=value=>Math.max(-100000,Math.min(100000,value));
  setCamera({x:limit(point.x-viewWidth/2),y:limit(point.y-viewHeight/2)});
  setActiveFrameId(null);
 };
 const toggleCleanMode=()=>{
  if(!cleanMode){
   inspectorBeforeClean.current=showPages;
   setShowPages(false);setCleanMode(true);
  }else{
   setCleanMode(false);
   if(inspectorBeforeClean.current&&window.innerWidth>780)setShowPages(true);
  }
 };
 const shiftFrame=(id,direction)=>{
  if(page?.locked)return;
  editPage(p=>({...p,frames:reorderBoardFrame(p.frames,id,direction)}));
 };
 const cloneFrame=id=>{
  if(page?.locked||frames.length>=FRAME_LIMIT)return;
  const newId=makeId(),next=duplicateBoardFrame(frames,id,newId);
  if(next.length===frames.length)return;
  editPage(p=>({...p,frames:next}));
  setActiveFrameId(newId);
 };
 const updateFrame=(id,fn)=>{
  if(page?.locked)return;
  editPage(p=>({...p,frames:(p.frames||[]).map(f=>f.id===id?fn(f):f)}));
 };
 const removeFrame=id=>{
  if(page?.locked)return;
  if(!window.confirm(vi?'Xóa khung trình chiếu này? Nét viết trong vùng vẫn được giữ.':'Delete this presentation frame? Drawing content will stay.'))return;
  editPage(p=>({...p,frames:(p.frames||[]).filter(f=>f.id!==id)}));
  if(activeFrameId===id)setActiveFrameId(null);
 };
 const addPage=()=>mutate(d=>{
  const next=newPage('Page '+(d.pages.length+1));
  return {...d,pages:[...d.pages,next],activePageId:next.id};
 });
 const copyPage=()=>mutate(d=>{
  const orig=d.pages.find(p=>p.id===d.activePageId);
  const next={...snapshots(orig),id:makeId(),title:orig.title+' copy',objects:orig.objects.map(o=>({...o,id:makeId()})),
   activities:(orig.activities||[]).map(a=>({...snapshots(a),id:makeId()}))};
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
 const duplicateLesson=async id=>{
  try{
   if(dirty.current)await persist(docRef.current);
   const original=id===docRef.current?.id?docRef.current:await readBoardLesson(ownerId,id);
   if(!original)throw Error('Lesson is unavailable');
   const copy=duplicateBoardLesson(original,ownerId);
   docRef.current=copy;setLesson(copy);history.current=[];future.current=[];
   dirty.current=true;await persist(copy);setPanel('pages');void refreshLibrary();
   setBackupStatus(vi?'Đã nhân bản bài dạy riêng':'A separate private lesson was created');
  }catch(e){setLibraryError(e.message||'Could not duplicate lesson');}
 };
 const exportPrivateJson=()=>{
  try{
   const data=exportPrivateBoardBackup(docRef.current,ownerId);
   const blob=new Blob([data],{type:'application/json;charset=utf-8'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='brian-board-private-'+(docRef.current.title||'lesson').replace(/[^a-z0-9_-]+/gi,'_')+'.json';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
   setBackupStatus(vi?'Đã xuất bản sao JSON riêng tư':'Private JSON backup exported');
  }catch(e){setBackupStatus(e.message||'Private export failed');}
 };
 const importPrivateJson=async file=>{
  if(!file)return;
  if(file.size>BOARD_BACKUP_MAX_BYTES){setBackupStatus(vi?'Bản sao vượt 25 MB':'Backup exceeds 25 MB');return;}
  const account=ownerId;
  try{
   const copy=importPrivateBoardBackup(await file.text(),account);
   if(account!==ownerRef.current)return;
   if(!window.confirm(vi?'Khôi phục thành bài dạy MỚI? Tệp chứa đáp án riêng của giáo viên, không chia sẻ với học sinh.':'Restore as a NEW lesson? This private file can contain teacher answers.'))return;
   if(dirty.current){await persist(docRef.current);if(dirty.current)throw Error('Save your current lesson before importing a new one');}
   if(account!==ownerRef.current)return;
   docRef.current=copy;setLesson(copy);history.current=[];future.current=[];
   dirty.current=true;await persist(copy);setPanel('pages');
   setBackupStatus(vi?'Đã khôi phục bản sao mới trên thiết bị':'Restored as a new private lesson');
  }catch(e){setBackupStatus(e.message||'Backup import failed');}
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
 const chooseName=()=>{
  const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);
  const result=selectBoardNameWithoutRepeat(randomNames,randomUsed,bytes[0]/4294967296);
  setRandomChoice(result.choice);setRandomUsed(result.used);
 };
 const resetNamePicker=()=>{setRandomUsed([]);setRandomChoice('');};
 const drawTheme={ivory:'Ivory Studio',midnight:'Midnight Slate',classroom:'Classroom Canvas'};
 if(!allowed)return null;
 const button=<button type="button" className="bbd-board-fab" ref={launchRef}
   aria-label={vi?'Mở bảng giảng dạy Brian Board':'Open Brian Teaching Board'} title="Brian Board"
   onClick={()=>void start()}><Presentation size={25} strokeWidth={1.8}/><span className="bbd-board-fab__tooltip">Brian Board</span></button>;
 return <>
  {!open&&createPortal(button,document.body)}
  {open&&createPortal(<section ref={enterRef} className={'bbd-shell bbd-theme-'+theme+(studentView?' is-student-view':'')+(cleanMode?' is-clean-mode':'')} data-phase={phase} data-motion={motion}
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
     <button onClick={toggleCleanMode} className={cleanMode?'is-active':''}
      title={cleanMode?(vi?'Hiện lại bảng công cụ':'Restore editing panels'):(vi?'Chế độ trình bày gọn':'Distraction-free presentation')}
      aria-pressed={cleanMode} aria-label={cleanMode?(vi?'Thoát chế độ gọn':'Exit clean mode'):(vi?'Bật chế độ gọn':'Enter clean mode')}>
      <Focus size={17}/><span>{cleanMode?(vi?'Thoát gọn':'Restore'):(vi?'Gọn':'Clean')}</span></button>
     <button onClick={toggleInspector} title={vi?'Hiện/ẩn công cụ bên phải':'Toggle side panel'}
      aria-controls="bbd-sidebar" aria-expanded={showPages} aria-label={vi?'Mở hoặc đóng bảng điều khiển':'Toggle inspector panel'}><Move size={17}/></button>
     <button onClick={startPresentation} title={vi?'Mở màn hình học sinh (cùng máy)':'Open local student display'} className={presenting?'is-presenting':''}>
      <Presentation size={18}/><span>{presenting?(vi?'Dừng chia sẻ':'Stop TV'):(vi?'Màn hình TV':'TV Display')}</span></button>
     <button onClick={()=>setStudentView(v=>!v)} title={vi?'Xem như học sinh':'Student preview'}>
      <Eye size={18}/><span>{vi?'Xem lớp':'Preview'}</span></button>
     <button className="bbd-close" onClick={()=>void close()} title={vi?'Đóng':'Close'}><X size={18}/><span>{vi?'Đóng':'Close'}</span></button>
    </div>
   </header>
   {saveError&&<div className="bbd-storage-warning" role="alert">{saveError}</div>}
   <div className="bbd-workspace">
    {!studentView&&!cleanMode&&<aside className="bbd-tools" aria-label="Drawing tools">
     {drawTools.map(([id,Icon,en,vn])=><React.Fragment key={id}>
       {['pen','text','shape-rect','sticky','laser'].includes(id)&&<span className="bbd-tool-divider" aria-hidden="true"/>}
       <button type="button" onClick={()=>setTool(id)} aria-pressed={tool===id}
        className={tool===id?'active':''} aria-label={vi?vn:en} title={vi?vn:en}><Icon size={20}/></button>
      </React.Fragment>)}
     <button onClick={()=>setSpotlight(s=>!s)} className={spotlight?'active':''} title="Spotlight"><ScanEye size={20}/></button>
    </aside>}
    <div className="bbd-canvas-area">
     <div className="bbd-canvas-crumb" aria-live="polite">
      <span className="bbd-canvas-crumb__dot" aria-hidden="true"/>
      <strong>{page?.title||(vi?'Trang bảng':'Board page')}</strong>
      <span className="bbd-canvas-crumb__separator" aria-hidden="true">/</span>
      <span>{modeLabel}</span>
      <small>{vi?'Trang':'Page'} {lesson?.pages.findIndex(p=>p.id===lesson.activePageId)+1||1}</small>
     </div>
     {!activeActivityId&&visibleFrames.length>0&&<div className="bbd-frame-strip" aria-label={vi?'Điều khiển lộ trình khung':'Presentation frame sequence'}>
      <div className="bbd-frame-strip__intro"><Frame size={15}/>
       <span>{vi?'LỘ TRÌNH':'FRAME DECK'}</span>
       <strong>{activeFrameId?Math.max(1,visibleFrames.findIndex(f=>f.id===activeFrameId)+1):'–'} / {visibleFrames.length}</strong>
      </div>
      <div className="bbd-frame-strip__items">
       {visibleFrames.map((f,i)=><button key={f.id} type="button" className={activeFrameId===f.id?'active':''}
        title={f.title} aria-pressed={activeFrameId===f.id} onClick={()=>goToFrame(f)}>
        <span>{i+1}</span><span>{f.title}</span></button>)}
      </div>
      <div className="bbd-frame-strip__nav">
       <button type="button" onClick={()=>moveBetweenFrames(-1)}
        aria-label={vi?'Khung trước':'Previous frame'} title={vi?'Khung trước':'Previous frame'}><ChevronLeft size={16}/></button>
       <button type="button" onClick={()=>moveBetweenFrames(1)}
        aria-label={vi?'Khung sau':'Next frame'} title={vi?'Khung sau':'Next frame'}><ChevronRight size={16}/></button>
      </div>
     </div>}
     <div key={stageKey} className="bbd-stage-transition" data-motion={motion} aria-label={vi?'Không gian trình bày':'Presentation surface'}>
     {activeActivityId&&page?.activities?.find(a=>a.id===activeActivityId)
       ?studentView?<div className="bbd-activity-stage" aria-label="Student activity preview">
        {!studentActivityPreview?<p role="status">{vi?'Trang hoặc hoạt động này không hiển thị cho học sinh.':'This page or activity is hidden from students.'}</p>:LAB_TYPES.includes(studentActivityPreview.type)?
         <BoardActivityPublicPreview activity={studentActivityPreview} live={studentActivityPayload.live} vi={vi}/>:<>
         <h2>{studentActivityPreview.title}</h2>
         {studentActivityPreview.prompt&&<p>{studentActivityPreview.prompt}</p>}
         <div className="bbd-activity-preview__groups">
          <section><h3>{studentActivityPreview.type==='ordering'?(vi?'Các mảnh câu đã xáo trộn':'Scrambled sentence pieces'):(vi?'Nội dung câu hỏi':'Prompts')}</h3>
           <div className="bbd-activity-stage__tray">{studentActivityPreview.labels.map((x,i)=><span className="bbd-activity-card" key={i}>{i+1}. {x}</span>)}</div>
          </section>
          {studentActivityPreview.type==='matching'&&<section><h3>{vi?'Ngân hàng phương án':'Answer bank'}</h3>
           <div className="bbd-activity-stage__tray">{studentActivityPreview.options.map((x,i)=><span className="bbd-activity-card" key={i}>{String.fromCharCode(65+i)}. {x}</span>)}</div>
          </section>}
          {studentActivityPreview.type==='sorting'&&<section><h3>{vi?'Các nhóm phân loại':'Categories'}</h3>
           <div className="bbd-activity-stage__tray">{studentActivityPreview.categories.map((x,i)=><span className="bbd-activity-card" key={i}>{x}</span>)}</div>
          </section>}
         </div>
        </>}
       </div>
       :<BoardActivityStage activity={page.activities.find(a=>a.id===activeActivityId)}
         vi={vi} onClose={()=>setActiveActivityId(null)} onPublicState={receivePublicActivityState}/>
       :<BoardCanvas page={studentView?sanitizeStudentPage(page):page} tool={studentView?'select':tool} color={color} width={thickness}
       onCommit={commitObj} onErase={eraseObject} onDuplicateObject={duplicateObject} onMoveObject={moveObject}
       onBatchEdit={batchEdit} onPrecisionErase={precisionErase}
       penPreset={penPreset} snapToGrid={snapToGrid} shapeFill={shapeFill} vi={vi} zoom={zoom} setZoom={setZoom}
       camera={camera} setCamera={next=>{setCamera(next);setActiveFrameId(null);}}
       frames={frames} showFrames={showFrames} activeFrameId={activeFrameId}
       onPointerPosition={broadcastPointer} onCreateFrame={createDrawnFrame} contentText={contentText} privateAnswer={privateAnswer} onInteract={interactObject}
       spotlight={spotlight} studentView={studentView}/>}
     </div>
     <div className="bbd-canvas-bottom">
      <div className="bbd-color-strip">
       {['#335d63','#648cd0','#db8159','#a5669f','#e0b143','#272a31','#f7f6f1'].map(c=>
        <button key={c} className={color===c?'selected':''} onClick={()=>setColor(c)}
         aria-label={'Ink color '+c} style={{background:c}}/>)}
       <input aria-label="Stroke thickness" type="range" min="2" max="22" value={thickness}
        onChange={e=>setThickness(Number(e.target.value))}/>
        <BoardPenToolbarExtras studentView={studentView} tool={tool} vi={vi}
         presets={BOARD_PEN_PRESETS} penPreset={penPreset} setPenPreset={setPenPreset}
         setTool={setTool} setThickness={setThickness} snapToGrid={snapToGrid}
         setSnapToGrid={setSnapToGrid} shapeFill={shapeFill} setShapeFill={setShapeFill}
         page={page} clearInk={clearInk}/>
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
       <button onClick={homeCanvas} title={vi?'Về vùng bảng ban đầu':'Return to board origin'}><MapPinned size={16}/></button>
       <button onClick={fitAllCanvas} title={vi?'Khớp toàn bộ nội dung':'Fit all content'} aria-label={vi?'Khớp toàn bộ nội dung':'Fit all content'}><Maximize2 size={16}/></button>
       <button onClick={()=>setShowNavigator(v=>!v)} aria-pressed={showNavigator}
        title={vi?'Bật/tắt bản đồ thu nhỏ':'Toggle mini-map'}><Map size={16}/></button>
       <button disabled={!frames.filter(f=>!f.hidden).length} onClick={()=>moveBetweenFrames(-1)}
        title={vi?'Khung trước':'Previous frame'}><ChevronLeft size={16}/></button>
       <button disabled={!frames.filter(f=>!f.hidden).length} onClick={()=>moveBetweenFrames(1)}
        title={vi?'Khung sau':'Next frame'}><ChevronRight size={16}/></button>
      </div>
     </div>
     {!studentView&&showNavigator&&!activeActivityId&&<BoardNavigator page={page} viewport={currentViewport}
      activeFrameId={activeFrameId} vi={vi} open={navigatorOpen} onToggle={()=>setNavigatorOpen(v=>!v)}
      onCenter={centerCanvasOn} onFitAll={fitAllCanvas} onHome={homeCanvas}/>}
    </div>
    {!studentView&&showPages&&!cleanMode&&<button className="bbd-sidebar-scrim" type="button"
      tabIndex={-1} aria-label={vi?'Đóng bảng điều khiển':'Close inspector'}
      onClick={closeInspector}/>}
    {!studentView&&showPages&&!cleanMode&&<aside className="bbd-sidebar" id="bbd-sidebar"
      aria-label={vi?'Bảng điều khiển bài dạy':'Lesson inspector'}>
      <button type="button" className="bbd-sidebar-close"
       title={vi?'Đóng bảng điều khiển':'Close inspector'} aria-label={vi?'Đóng bảng điều khiển':'Close inspector'}
       onClick={closeInspector}><X size={18}/></button>
     <div className="bbd-sidebar-tabs">
      {['pages','frames','activities','assets','library','teaching','design'].map(id=><button key={id} className={panel===id?'active':''} onClick={()=>setPanel(id)}>
       {id==='pages'?(vi?'Trang':'Pages'):id==='frames'?(vi?'Khung':'Frames'):id==='activities'?(vi?'Bài tập':'Activities'):id==='assets'?(vi?'Mẫu':'Templates'):id==='library'?(vi?'Thư viện':'Library'):id==='teaching'?(vi?'Lớp học':'Classroom'):(vi?'Thiết kế':'Design')}</button>)}
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
     {panel==='frames'&&<div className="bbd-side-stack bbd-frame-panel">
      <div className="bbd-side-heading"><h3>{vi?'Không gian vô hạn · Frames':'Infinite board · Frames'}</h3>
       <Clapperboard size={20}/></div>
      <p>{vi?'Dùng bàn tay để kéo bảng ra mọi hướng. Vẽ khung như slide hoặc tạo khung kế tiếp. Mỗi khung là một điểm dừng trong bài dạy; nội dung vẽ không bị chia cắt.':
       'Pan freely across the board. Draw presentation frames or add a frame to the right. Each frame becomes a lesson stop without splitting your drawing.'}</p>
      <div className="bbd-side-actions">
       <button type="button" disabled={page?.locked||frames.length>=FRAME_LIMIT}
        onClick={()=>{setTool('frame');setShowFrames(true);}}>
        <Frame size={16}/>{vi?'Vẽ khung':'Draw frame'}</button>
       <button type="button" disabled={page?.locked||frames.length>=FRAME_LIMIT} onClick={addFrameAtView}>
        <Plus size={16}/>{vi?'Thêm khung kế tiếp':'Add next frame'}</button>
      </div>
      <button type="button" onClick={()=>setShowFrames(v=>!v)}>
       {showFrames?<EyeOff size={16}/>:<Eye size={16}/>}
       {showFrames?(vi?'Ẩn viền khung khi viết':'Hide frame outlines'):(vi?'Hiện viền khung':'Show frame outlines')}</button>
      <button type="button" onClick={homeCanvas}><MapPinned size={16}/>{vi?'Về tọa độ gốc 0,0':'Return to origin 0,0'}</button>
      <div className="bbd-frame-count">{frames.length}/{FRAME_LIMIT} {vi?'khung':'frames'}</div>
      {frames.map((f,i)=><div key={f.id} className={'bbd-frame-card'+(activeFrameId===f.id?' active':'')}>
       <div className="bbd-frame-card__top">
        <span className="bbd-frame-card__number">{String(i+1).padStart(2,'0')}</span>
        <input aria-label={(vi?'Tên khung ':'Frame name ')+(i+1)} value={f.title} maxLength={90}
         disabled={page?.locked} onChange={e=>updateFrame(f.id,old=>({...old,title:e.target.value.slice(0,90)}))}/>
       </div>
       <small>{Math.round(f.x)}, {Math.round(f.y)} · {Math.round(f.width)} × {Math.round(f.height)}</small>
       <div className="bbd-side-actions">
        <button type="button" onClick={()=>goToFrame(f)} disabled={f.hidden}>
         <Presentation size={16}/>{vi?'Đến khung':'Go to frame'}</button>
        <button type="button" disabled={page?.locked||i===0}
         title={vi?'Chuyển khung lên trước':'Move frame up'} onClick={()=>shiftFrame(f.id,-1)}><ArrowUp size={16}/></button>
        <button type="button" disabled={page?.locked||i===frames.length-1}
         title={vi?'Chuyển khung xuống sau':'Move frame down'} onClick={()=>shiftFrame(f.id,1)}><ArrowDown size={16}/></button>
        <button type="button" disabled={page?.locked||frames.length>=FRAME_LIMIT}
         title={vi?'Nhân bản khung':'Duplicate frame'} onClick={()=>cloneFrame(f.id)}><Copy size={16}/></button>
        <button type="button" disabled={page?.locked}
         title={f.hidden?(vi?'Hiện khung trong lộ trình':'Show frame'):(vi?'Ẩn khung khỏi lộ trình':'Skip frame')}
         onClick={()=>updateFrame(f.id,old=>({...old,hidden:!old.hidden}))}>
         {f.hidden?<EyeOff size={16}/>:<Eye size={16}/>}</button>
        <button type="button" disabled={page?.locked} onClick={()=>removeFrame(f.id)}><Trash2 size={16}/></button>
       </div>
      </div>)}
      {!frames.length&&<p>{vi?'Bắt đầu bằng công cụ Vẽ khung rồi kéo một hình chữ nhật trên bảng, hoặc chọn Thêm khung kế tiếp.':
       'Use Draw frame and drag a rectangle, or choose Add next frame.'}</p>}
      <p>{vi?'Phím tắt: F vẽ khung · P kéo bảng · Alt+←/→ chuyển khung · G khớp tất cả · M bản đồ · C chế độ gọn · 0 về gốc.':
       'Shortcuts: F draw frame · P pan · Alt+←/→ frames · G fit all · M map · C clean view · 0 home.'}</p>
     </div>}
     {panel==='assets'&&<div className="bbd-side-stack bbd-v8-assets">
      <div className="bbd-side-heading"><h3>{vi?'Thư viện mẫu giảng dạy':'Teaching templates'}</h3><LayoutTemplate size={19}/></div>
      <p>{vi?'Chèn bố cục có thể viết, kéo thả và chỉnh sửa ngay vào vùng đang nhìn. Không cần AI.':
       'Insert editable template objects into the current view. No AI or external service.'}</p>
      <div className="bbd-v8-template-grid">
       {BOARD_V8_TEMPLATES.map(template=><button type="button" key={template.id}
        disabled={page?.locked||page?.objects?.length>2980}
        onClick={()=>insertTeachingTemplate(template.id)}>
        <LayoutTemplate size={19}/><strong>{vi?template.vi:template.en}</strong>
        <small>{vi?'Chèn vào canvas':'Add to canvas'}</small></button>)}
      </div>
     </div>}
     {panel==='activities'&&<div className="bbd-side-stack bbd-activity-builder">
       <h3>{vi?'Hoạt động tương tác':'Interactive activities'}</h3>
       <p>{vi?'13 dạng bài tập — 10 hoạt động mới với chạm, kéo thả và chấm điểm ngay trên bảng.':'13 playable modes — including ten new touch, drag-and-drop and automatically graded activities.'}</p>
       <label>{vi?'Loại hoạt động':'Activity type'}
        <select value={activityType} onChange={e=>{setActivityType(e.target.value);setActivityRaw('');setActivityImage('');setActivityError('');}}>
         <option value="matching">{vi?'Ghép đôi':'Matching'}</option>
         <option value="ordering">{vi?'Sắp xếp câu':'Sentence ordering'}</option>
         <option value="sorting">{vi?'Phân loại':'Sorting'}</option>
         {LAB_TYPES.map(id=><option key={id} value={id}>{LAB_LABELS[id][vi?1:0]}</option>)}
        </select></label>
       <label>{vi?'Tên hoạt động':'Title'}<input maxLength={130} value={activityTitle}
         onChange={e=>setActivityTitle(e.target.value)} placeholder="Planet Earth"/></label>
       <label>{vi?'Yêu cầu':'Instruction'}<input maxLength={130} value={activityPrompt}
         onChange={e=>setActivityPrompt(e.target.value)} placeholder="Match, sort or reorder"/></label>
       <label>{vi?'Nội dung câu hỏi':'Question content'}
        <textarea rows={6} spellCheck={false} value={activityRaw} onChange={e=>setActivityRaw(e.target.value)}
         placeholder={LAB_TYPES.includes(activityType)?LAB_EXAMPLES[activityType]:activityType==='ordering'?'We | should | save | energy | every day':
          activityType==='matching'?'renewable | tái tạo\nemissions | khí thải\nwildlife | động vật hoang dã':
            'solar | Renewable\ncoal | Fossil fuel\nwind | Renewable'}/></label>
       {LAB_TYPES.includes(activityType)&&<BoardActivityLabBuilder type={activityType} vi={vi}
        raw={activityRaw} setRaw={setActivityRaw} image={activityImage} setImage={setActivityImage}
        setError={setActivityError}/>}
       <p>{LAB_TYPES.includes(activityType)?(vi?'Lưu ý: nội dung bên trong [[...]], đáp án và quan hệ chấm điểm chỉ được lưu trong bài dạy của giáo viên.':'Answer keys and marked evidence remain teacher-private.'):
        activityType==='ordering'?(vi?'Nhập các cụm theo thứ tự ĐÚNG, ngăn bằng dấu |.':'Enter phrases in the CORRECT order, separated by |.'):
        (vi?'Mỗi dòng: nội dung | đáp án hoặc nhóm.':'One line per item: prompt | answer or category.')}</p>
       {activityError&&<p role="alert">{activityError}</p>}
       <button disabled={page?.locked||(!editingActivityId&&page?.activities?.length>=24)} onClick={addActivity}>
        {editingActivityId?<Save size={16}/>:<Plus size={16}/>}
        {editingActivityId?(vi?'Lưu thay đổi bài tập':'Save activity changes'):(vi?'Tạo & chạy hoạt động':'Create & play')}</button>
       {editingActivityId&&<button onClick={cancelActivityEditing}>
        <X size={16}/>{vi?'Hủy chỉnh sửa':'Cancel editing'}</button>}
       <button disabled={page?.locked||!(page?.activities||[]).some(a=>a.studentVisible!==false)}
        onClick={hideEveryActivity}><EyeOff size={16}/>{vi?'Ẩn toàn bộ bài tập khỏi học sinh':'Hide all activities from students'}</button>
       {(page?.activities||[]).map((x,i)=><div key={x.id} className="bbd-library-item bbd-activity-entry">
        <div><strong>{i+1}. {x.title}</strong><small>{x.type} · {x.items.length} {vi?'mục':'items'} · {x.studentVisible===false||x.teacherOnly===true?(vi?'Ẩn với học sinh':'Teacher-only draft'):(vi?'Hiện cho học sinh':'Published')}</small></div>
        <div className="bbd-side-actions bbd-activity-actions">
         <button onClick={()=>setActiveActivityId(x.id)} title={vi?'Chạy bài tập':'Play activity'}><Play size={15}/>{vi?'Chạy':'Play'}</button>
         <button disabled={page?.locked} onClick={()=>beginActivityEditing(x)} title={vi?'Chỉnh sửa':'Edit'}><Edit3 size={15}/></button>
         <button disabled={page?.locked||page?.activities?.length>=24} onClick={()=>duplicateActivity(x.id)}
          title={vi?'Nhân bản riêng, mặc định ẩn':'Duplicate as unpublished draft'}><Copy size={15}/></button>
         <button disabled={page?.locked||i===0} onClick={()=>orderActivity(x.id,-1)} title={vi?'Đưa lên':'Move up'}><ArrowUp size={15}/></button>
         <button disabled={page?.locked||i===(page?.activities?.length||0)-1} onClick={()=>orderActivity(x.id,1)} title={vi?'Đưa xuống':'Move down'}><ArrowDown size={15}/></button>
         <button disabled={page?.locked||x.teacherOnly===true} onClick={()=>toggleActivityVisibility(x.id)}
           aria-label={x.studentVisible===false?(vi?'Công bố bài tập':'Publish activity'):(vi?'Ẩn bài tập với học sinh':'Hide activity from students')}
           title={x.teacherOnly===true?(vi?'Nội dung chỉ giáo viên':'Teacher-only content'):(x.studentVisible===false?(vi?'Công bố cho học sinh':'Publish to students'):(vi?'Chỉ giáo viên thấy':'Hide from students'))}>
           {x.studentVisible===false?<EyeOff size={15}/>:<Eye size={15}/>}
         </button>
         <button disabled={page?.locked} onClick={()=>deleteActivity(x.id)} title={vi?'Xóa hoạt động':'Delete activity'}><Trash2 size={15}/></button>
        </div>
       </div>)}
      </div>}
      {panel==='library'&&<div className="bbd-side-stack">
      <div className="bbd-side-heading"><h3>{vi?'Thư viện bài dạy':'Lesson library'}</h3>
       <button onClick={()=>void createLesson()}><FilePlus2 size={16}/></button></div>
      <p>{vi?'Các bản nháp lưu riêng trên thiết bị này, không ghi vào sổ điểm hay dữ liệu lớp.':'Private lessons on this device, separate from gradebook and class data.'}</p>
      <button onClick={()=>void createLesson()}><Plus size={16}/>{vi?'Tạo bài dạy mới':'New lesson'}</button>
      <button onClick={()=>void duplicateLesson(lesson.id)}><Copy size={16}/>{vi?'Nhân bản bài dạy hiện tại':'Duplicate current lesson'}</button>
      <h4>{vi?'Sao lưu ngoại tuyến (riêng tư)':'Offline backup (private)'}</h4>
      <p>{vi?'JSON có thể chứa ghi chú và đáp án riêng của giáo viên. Không gửi cho học sinh. Chỉ nhập lại bằng cùng tài khoản.':'JSON may contain private notes and answer keys. Do not share with students. Restore using the same account only.'}</p>
      <button onClick={exportPrivateJson}><FileJson size={16}/>{vi?'Tải bản sao JSON':'Download private JSON'}</button>
      <label className="bbd-import-image"><FileUp size={16}/>{vi?'Khôi phục JSON thành bài mới':'Restore JSON as new lesson'}
       <input type="file" accept=".json,application/json" onChange={e=>{void importPrivateJson(e.target.files?.[0]);e.target.value='';}}/></label>
      {backupStatus&&<p role="status" className="bbd-pdf-status">{backupStatus}</p>}
      <label className="bbd-library-search"><Search size={15}/>{vi?'Tìm trong thư viện':'Search lesson library'}
       <input value={libraryQuery} onChange={e=>setLibraryQuery(e.target.value)} placeholder={vi?'Tên bài dạy':'Lesson title'}/></label>
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
      {library.filter(x=>x.title.toLocaleLowerCase().includes(libraryQuery.trim().toLocaleLowerCase())).map(x=>
       <div key={x.id} className={'bbd-library-item'+(x.id===lesson?.id?' active':'')}>
        <div><strong>{x.title}</strong><small>{x.pages} {vi?'trang':'pages'} · {new Date(x.updatedAt).toLocaleDateString()}</small></div>
        <div className="bbd-side-actions"><button disabled={x.id===lesson?.id} onClick={()=>void switchLesson(x.id)}>{vi?'Mở':'Open'}</button>
         <button onClick={()=>void duplicateLesson(x.id)} title={vi?'Nhân bản bài dạy':'Duplicate lesson'}><Copy size={15}/></button>
         <button onClick={()=>void removeLesson(x.id)} title={vi?'Xóa bài dạy':'Delete lesson'}><Trash2 size={15}/></button></div>
       </div>)}
     </div>}
     {panel==='teaching'&&<div className="bbd-side-stack">
      <h3>{vi?'Tiện ích lớp học':'Classroom tools'}</h3>
      <div className={'bbd-timer'+(timerDeadline&&remaining===0?' bbd-timer--finished':'')}>
       <strong role="timer">{timerText}</strong>
       {timerDeadline&&remaining===0&&<p role="status">{vi?'Hết giờ!':'Time is up!'}</p>}
       <div className="bbd-side-actions">
       <button onClick={()=>{if(timerDeadline){setTimerSeconds(remaining);setTimerDeadline(0);}
        else{setTimerDeadline(Date.now()+timerSeconds*1000);setTimerNow(Date.now());}}}>
        {timerDeadline?<Pause size={16}/>:<Play size={16}/>}</button>
       <button onClick={()=>{setTimerDeadline(0);setTimerSeconds(300);}} title={vi?'Đặt lại 5 phút':'Reset to 5 min'}><RotateCcw size={16}/></button></div>
       <div className="bbd-timer-presets">{[3,5,10].map(min=><button key={min} type="button"
        aria-label={(vi?'Đặt giờ ':'Set timer ')+min+(vi?' phút':' minutes')}
        onClick={()=>{setTimerDeadline(0);setTimerSeconds(min*60);setTimerNow(Date.now());}}>{min} {vi?'phút':'min'}</button>)}</div></div>
      <label>{vi?'Thời lượng (phút)':'Minutes'}
       <input type="number" min="1" max="180" value={Math.max(1,Math.round(timerSeconds/60))}
        onChange={e=>{if(!timerDeadline)setTimerSeconds(Math.max(60,Math.min(10800,Number(e.target.value||5)*60)));}}/></label>
      <h4>{vi?'Điểm đội':'Team scores'}</h4>
      {teams.map((team,i)=><div className="bbd-team" key={i}>
       <input aria-label={(vi?'Tên đội ':'Team name ')+(i+1)} maxLength={28} value={team.name}
        onChange={e=>setTeams(t=>t.map((x,j)=>j===i?{...x,name:e.target.value.slice(0,28)}:x))}/>
       <button onClick={()=>setTeams(t=>t.map((x,j)=>j===i?{...x,score:Math.max(0,x.score-1)}:x))}>−</button>
       <strong>{team.score}</strong><button onClick={()=>setTeams(t=>t.map((x,j)=>j===i?{...x,score:x.score+1}:x))}>+</button></div>)}
      <button disabled={teams.length>=8} onClick={addTeam}><Users size={17}/>{vi?'Thêm đội':'Add team'}</button>
      <button onClick={()=>{if(window.confirm(vi?'Đưa điểm tất cả các đội về 0?':'Reset all team scores to zero?'))setTeams(t=>t.map(x=>({...x,score:0})));}}>
       <RefreshCcw size={16}/>{vi?'Đặt lại điểm các đội':'Reset team scores'}</button>
      <h4>{vi?'Chọn ngẫu nhiên':'Random picker'}</h4>
      <textarea rows={3} value={randomNames} onChange={e=>{setRandomNames(e.target.value);resetNamePicker();}}
       placeholder={vi?'Nhập tên, mỗi dòng một người':'One name per line'}/>
      <p className="bbd-picker-progress" aria-live="polite">
       {vi?'Đã chọn':'Picked'}: {randomUsed.length} / {selectBoardNameWithoutRepeat(randomNames,randomUsed).total}
      </p>
      <div className="bbd-side-actions">
       <button disabled={!selectBoardNameWithoutRepeat(randomNames,randomUsed).remaining} onClick={chooseName}>
        {vi?'Chọn không lặp':'Pick without repeats'}</button>
       <button onClick={resetNamePicker}><RotateCcw size={16}/>{vi?'Bắt đầu lại':'Restart'}</button>
      </div>
      {randomChoice&&<strong className="bbd-random-result" role="status">{randomChoice}</strong>}
      {!!randomUsed.length&&!selectBoardNameWithoutRepeat(randomNames,randomUsed).remaining&&
       <p role="status">{vi?'Đã chọn hết danh sách. Nhấn Bắt đầu lại để tiếp tục.':'Everyone has been picked. Restart for another round.'}</p>}
     </div>}
     {panel==='design'&&<div className="bbd-side-stack">
      <h3>{vi?'Chủ đề bảng':'Board theme'}</h3>
      {SHAPES.map(id=><button key={id} className={'bbd-theme-choice'+(theme===id?' active':'')}
       onClick={()=>mutate(d=>({...d,theme:id}))}>{drawTheme[id]}</button>)}
      <h4>{vi?'Hiệu ứng giao diện':'Interface motion'}</h4>
      <p>{vi?'Chọn mức chuyển động. Tắt khi trình chiếu lâu hoặc sử dụng thiết bị cấu hình thấp. Tự tuân theo cài đặt giảm chuyển động của máy.':
       'Choose the motion level. Disable for extended presentations or lower-powered devices. System reduced-motion settings are always respected.'}</p>
      <div className="bbd-motion-options" role="group" aria-label={vi?'Mức hiệu ứng':'Motion level'}>
       {['off','balanced','expressive'].map(id=><button key={id} type="button"
        aria-pressed={motion===id} onClick={()=>setMotion(id)}>
        {id==='off'?(vi?'Tắt':'Off'):id==='balanced'?(vi?'Tinh tế':'Subtle'):(vi?'Sống động':'Expressive')}</button>)}
      </div>
      <h4>{vi?'Nền trang':'Page background'}</h4>
      {['plain','grid','lines','dots'].map(x=><button key={x} onClick={()=>editPage(p=>({...p,background:x}))}
       className={'bbd-theme-choice'+(page?.background===x?' active':'')}>{x}</button>)}
      <label className="bbd-import-image"><FilePlus2 size={16}/>{vi?'Nhập PDF (tối đa 12 trang)':'Import PDF (up to 12 pages)'}
       <input type="file" accept=".pdf,application/pdf" disabled={pdfBusy}
        onChange={e=>{void addPdfPages(e.target.files?.[0]);e.target.value='';}}/></label>
      {pdfStatus&&<span role="status" className="bbd-pdf-status">{pdfStatus}</span>}
      <button disabled={pdfBusy} onClick={()=>void exportStudentPdf()}>
       <Download size={16}/>{vi?'Xuất PDF bài dạy cho học sinh':'Export student PDF'}</button>
      <button disabled={pdfBusy} onClick={()=>void exportStudentPdf(true)}>
       <Download size={16}/>{vi?'Xuất PDF kèm bài tập (không đáp án)':'Export PDF with answer-free worksheets'}</button>
      <label className="bbd-import-image"><ImagePlus size={16}/>{vi?'Thêm ảnh (tối đa 2 MB)':'Insert image (max 2 MB)'}
       <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{insertImage(e.target.files?.[0]);e.target.value='';}}/></label>
      <button onClick={exportPNG}><Download size={16}/>{vi?'Xuất trang SVG':'Export SVG page'}</button>
      <p>{vi?'Nét viết và trang bài dạy được lưu riêng trên trình duyệt này.':'Your lesson draft is saved privately on this device.'}</p>
     </div>}
    </aside>}
   </div>
   <footer className="bbd-footer">
    <span className="bbd-footer-status">{vi?'Bài dạy đang soạn':'Draft lesson'} · {lesson?.pages.length||1} {vi?'trang':'pages'}</span>
    <div className="bbd-pagination">
     <button onClick={()=>pageAt(Math.max(0,lesson.pages.findIndex(p=>p.id===lesson.activePageId)-1))}><ChevronLeft size={17}/></button>
     <span>{lesson.pages.findIndex(p=>p.id===lesson.activePageId)+1} / {lesson.pages.length}</span>
     <button onClick={()=>pageAt(Math.min(lesson.pages.length-1,lesson.pages.findIndex(p=>p.id===lesson.activePageId)+1))}><ChevronRight size={17}/></button>
    </div>
    <button onClick={toggleInspector}>{vi?'Brian Board · Bản nháp cá nhân':'Brian Board · Personal draft'}</button>
   </footer>
  </section>,document.body)}
 </>;
}
