import React,{useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Presentation,Pen,Highlighter,Eraser,MousePointer2,Hand,Type,Square,Circle,Minus,
 StickyNote,ScanEye,Undo2,Redo2,Plus,Copy,Trash2,Save,CheckCircle2,X,ChevronLeft,
 ChevronRight,CloudOff,Play,Pause,RotateCcw,Timer,Users,Eye,EyeOff,Maximize2,
 Download,Move,Palette,FilePlus2,LockKeyhole,LockKeyholeOpen,Layers,ArrowUp,ArrowDown,ImagePlus,Search,RefreshCcw,FileJson,FileUp,Edit3} from 'lucide-react';
import {isAdminRole,isDepartmentLeaderRole,normalizeSystemRole} from '../../utils/roles.js';
import {GLOBAL_FLOATING_ACTION_EVENT,FLOATING_ACTION_IDS} from '../../utils/unifiedFloatingDock.js';
import {BOARD_W,BOARD_H,newLesson,newPage,normalizeLesson,makeId,THEMES,sanitizeStudentPage} from './boardModel.js';
import {readBoardDraft,saveBoardDraft,listBoardLessons,readBoardLesson,deleteBoardLesson} from './boardStorage.js';
import BoardCanvas from './BoardCanvas.jsx';
import {listBoardCloud,saveBoardCloud,readBoardCloud} from './boardCloud.js';
import {boardStudentPayload,newBoardPresentationId} from './boardPresentation.js';
import {importBoardPdf,exportBoardStudentPdf} from './boardPdf.js';
import {createBoardActivity} from './boardActivities.js';
import {BOARD_BACKUP_MAX_BYTES,duplicateBoardLesson,exportPrivateBoardBackup,importPrivateBoardBackup,
 boardActivityRaw,reviseBoardActivity,duplicateBoardActivity,moveBoardActivity,hideAllBoardActivities,
 selectBoardNameWithoutRepeat} from './boardWorkflow.js';
import BoardActivityStage from './BoardActivityStage.jsx';
import './BrianBoard.css';
import './BoardActivities.css';

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
 const [randomNames,setRandomNames]=useState(''),[randomChoice,setRandomChoice]=useState(''),[randomUsed,setRandomUsed]=useState([]);
 const [presenting,setPresenting]=useState(false),presentationRef=useRef(null);
 const [pdfBusy,setPdfBusy]=useState(false),[pdfStatus,setPdfStatus]=useState('');
 const [activityType,setActivityType]=useState('matching'),[activityTitle,setActivityTitle]=useState(''),
  [activityPrompt,setActivityPrompt]=useState(''),[activityRaw,setActivityRaw]=useState(''),
  [activityError,setActivityError]=useState(''),[activeActivityId,setActiveActivityId]=useState(null),[editingActivityId,setEditingActivityId]=useState(null);
 const [panel,setPanel]=useState('pages'),[library,setLibrary]=useState([]),[libraryError,setLibraryError]=useState(''),[cloudLibrary,setCloudLibrary]=useState([]),[cloudStatus,setCloudStatus]=useState('');
 const [libraryQuery,setLibraryQuery]=useState(''),[backupStatus,setBackupStatus]=useState('');
 const refreshLibrary=async()=>{
  try{setLibrary(await listBoardLessons(ownerId));setLibraryError('');}
  catch(e){setLibraryError(e.message||'Cannot load library');}
 };
 useEffect(()=>{if(open&&panel==='library')void refreshLibrary();},[open,panel,lesson?.id,lesson?.updatedAt]);
 const history=useRef([]),future=useRef([]),docRef=useRef(null),enterRef=useRef(null),closeRef=useRef(null);
 const saving=useRef(Promise.resolve()),dirty=useRef(false),animating=useRef(false);
 const launchRef=useRef(null),lastFocusRef=useRef(null),mounted=useRef(true);
 const page=lesson?.pages.find(x=>x.id===lesson.activePageId)||lesson?.pages[0];
 // Exact TV payload for classroom preview: never read a raw activity in student mode.
 const studentActivityPreview=studentView&&lesson?boardStudentPayload(lesson,activeActivityId).activity:null;
 const activeActivityRef=useRef(activeActivityId);activeActivityRef.current=activeActivityId;
 const theme=lesson?.theme||'ivory';
 useEffect(()=>{
  setColor(old=>{
   if(theme==='midnight'&&old==='#335d63')return '#dcece6';
   if(theme!=='midnight'&&old==='#dcece6')return '#335d63';
   return old;
  });
 },[theme]);
 const activeCamera=page?.camera||camera;
 docRef.current=lesson;
 useEffect(()=>{
  const session=presentationRef.current;
  if(session&&lesson)session.bus.postMessage(boardStudentPayload(lesson,activeActivityId));
 },[lesson,activeActivityId]);
 useEffect(()=>()=>{const session=presentationRef.current;
  if(session){session.bus.postMessage({type:'end'});session.bus.close();presentationRef.current=null;}
 },[]);
 const stopPresentation=()=>{
  const session=presentationRef.current;
  if(session){session.bus.postMessage({type:'end'});session.bus.close();presentationRef.current=null;}
  setPresenting(false);
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
  bus.onmessage=e=>{if(e.data?.type==='request'&&docRef.current)bus.postMessage(boardStudentPayload(docRef.current,activeActivityRef.current));};
  presentationRef.current={id,bus};
  setPresenting(true);
  bus.postMessage(boardStudentPayload(docRef.current,activeActivityRef.current));
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
 const cancelActivityEditing=()=>{
  setEditingActivityId(null);setActivityRaw('');setActivityTitle('');setActivityPrompt('');setActivityError('');
 };
 const beginActivityEditing=activity=>{
  if(page?.locked)return;
  setEditingActivityId(activity.id);setActivityType(activity.type);
  setActivityTitle(activity.title);setActivityPrompt(activity.prompt);
  setActivityRaw(boardActivityRaw(activity));setActivityError('');
 };
 const addActivity=()=>{
  if(!page||page.locked||(!editingActivityId&&page.activities?.length>=24))return;
  try{
   const original=(page.activities||[]).find(a=>a.id===editingActivityId);
   if(editingActivityId&&!original)throw Error('Activity no longer exists; cancel editing and retry');
   const input={type:activityType,title:activityTitle,prompt:activityPrompt,raw:activityRaw};
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
  editPage(p=>({...p,activities:(p.activities||[]).map(activity=>activity.id===id?
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
   if(account!==ownerId)return;
   if(!window.confirm(vi?'Khôi phục thành bài dạy MỚI? Tệp chứa đáp án riêng của giáo viên, không chia sẻ với học sinh.':'Restore as a NEW lesson? This private file can contain teacher answers.'))return;
   if(dirty.current)await persist(docRef.current);
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
     <button onClick={startPresentation} title={vi?'Mở màn hình học sinh (cùng máy)':'Open local student display'} className={presenting?'is-presenting':''}>
      <Presentation size={18}/><span>{presenting?(vi?'Dừng chia sẻ':'Stop TV'):(vi?'Màn hình TV':'TV Display')}</span></button>
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
     {activeActivityId&&page?.activities?.find(a=>a.id===activeActivityId)
       ?studentView?<div className="bbd-activity-stage" aria-label="Student activity preview">
        {!studentActivityPreview?<p role="status">{vi?'Trang hoặc hoạt động này không hiển thị cho học sinh.':'This page or activity is hidden from students.'}</p>:<>
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
         vi={vi} onClose={()=>setActiveActivityId(null)}/>
       :<BoardCanvas page={studentView?sanitizeStudentPage(page):page} tool={studentView?'select':tool} color={color} width={thickness}
       onCommit={commitObj} onErase={eraseObject} onMoveObject={moveObject} zoom={zoom} setZoom={setZoom}
       camera={camera} setCamera={setCamera} contentText={contentText} privateAnswer={privateAnswer} onInteract={interactObject}
       spotlight={spotlight} studentView={studentView}/>}
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
      {['pages','activities','library','teaching','design'].map(id=><button key={id} className={panel===id?'active':''} onClick={()=>setPanel(id)}>
       {id==='pages'?(vi?'Trang':'Pages'):id==='activities'?(vi?'Bài tập':'Activities'):id==='library'?(vi?'Thư viện':'Library'):id==='teaching'?(vi?'Lớp học':'Classroom'):(vi?'Thiết kế':'Design')}</button>)}
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
     {panel==='activities'&&<div className="bbd-side-stack bbd-activity-builder">
       <h3>{vi?'Hoạt động tương tác':'Interactive activities'}</h3>
       <p>{vi?'Tạo bài ghép đôi, sắp xếp câu hoặc phân loại và chạy ngay trên bảng.':'Create and play matching, sentence ordering or sorting activities.'}</p>
       <label>{vi?'Loại hoạt động':'Activity type'}
        <select value={activityType} onChange={e=>{setActivityType(e.target.value);setActivityRaw('');setActivityError('');}}>
         <option value="matching">{vi?'Ghép đôi':'Matching'}</option>
         <option value="ordering">{vi?'Sắp xếp câu':'Sentence ordering'}</option>
         <option value="sorting">{vi?'Phân loại':'Sorting'}</option>
        </select></label>
       <label>{vi?'Tên hoạt động':'Title'}<input maxLength={130} value={activityTitle}
         onChange={e=>setActivityTitle(e.target.value)} placeholder="Planet Earth"/></label>
       <label>{vi?'Yêu cầu':'Instruction'}<input maxLength={130} value={activityPrompt}
         onChange={e=>setActivityPrompt(e.target.value)} placeholder="Match, sort or reorder"/></label>
       <label>{vi?'Nội dung câu hỏi':'Question content'}
        <textarea rows={6} spellCheck={false} value={activityRaw} onChange={e=>setActivityRaw(e.target.value)}
         placeholder={activityType==='ordering'?'We | should | save | energy | every day':
          activityType==='matching'?'renewable | tái tạo\nemissions | khí thải\nwildlife | động vật hoang dã':
            'solar | Renewable\ncoal | Fossil fuel\nwind | Renewable'}/></label>
       <p>{activityType==='ordering'?(vi?'Nhập các cụm theo thứ tự ĐÚNG, ngăn bằng dấu |.':'Enter phrases in the CORRECT order, separated by |.'):
        (vi?'Mỗi dòng: nội dung | đáp án hoặc nhóm.':'One line per item: prompt | answer or category.')}</p>
       {activityError&&<p role="alert">{activityError}</p>}
       <button disabled={page?.locked||page?.activities?.length>=24} onClick={addActivity}>
        <Plus size={16}/>{vi?'Tạo & chạy hoạt động':'Create & play'}</button>
       {(page?.activities||[]).map((x,i)=><div key={x.id} className="bbd-library-item">
        <div><strong>{i+1}. {x.title}</strong><small>{x.type} · {x.items.length} {vi?'mục':'items'} · {x.studentVisible===false?(vi?'Ẩn với học sinh':'Teacher-only draft'):(vi?'Hiện cho học sinh':'Published')}</small></div>
        <div className="bbd-side-actions">
         <button onClick={()=>setActiveActivityId(x.id)}><Play size={15}/>{vi?'Chạy':'Play'}</button>
         <button disabled={page?.locked} onClick={()=>toggleActivityVisibility(x.id)}
           aria-label={x.studentVisible===false?(vi?'Công bố bài tập':'Publish activity'):(vi?'Ẩn bài tập với học sinh':'Hide activity from students')}
           title={x.studentVisible===false?(vi?'Công bố cho học sinh':'Publish to students'):(vi?'Chỉ giáo viên thấy':'Hide from students')}>
           {x.studentVisible===false?<EyeOff size={15}/>:<Eye size={15}/>}
         </button>
         <button disabled={page?.locked} onClick={()=>deleteActivity(x.id)}><Trash2 size={15}/></button>
        </div>
       </div>)}
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
