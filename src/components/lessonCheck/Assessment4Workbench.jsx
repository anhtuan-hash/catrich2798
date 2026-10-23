import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Download, FolderPlus, Heart, History, Layers3, LoaderCircle, Play, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Users, X } from 'lucide-react';
import { listAssessmentResults, listAssessmentSessions } from '../../utils/lessonCheckAssessment.js';
import { listLessonCheckTeacherAccess, saveLessonCheckActivity } from '../../utils/lessonCheckActivities.js';
import {
 assessActivityQuality, bulkGrantActivities, listActivityJournal, listActivityVersions,
 listGrantAudit, listInterventions, loadAssessmentWorkspace, logActivityUse, readActivityVersion,
 saveIntervention, storeAssessmentWorkspace,
} from '../../utils/lessonCheckWorkbench.js';
import { listActivityAttributes, saveActivityAttributes } from '../../utils/lessonCheckAttributes.js';
import { listLessonCheckTeacherGroups, saveLessonCheckTeacherGroup, deleteLessonCheckTeacherGroup } from '../../utils/lessonCheckTeacherGroups.js';
import { checkActivityLink } from '../../utils/lessonCheckLinkAudit.js';
import { assessmentText, assessmentLocale } from '../../utils/assessmentBilingual.js';
import './Assessment4Workbench.css';

const initial = { favorites: [], recentIds: [], collections: [], runner: {} };
const uid = user => user?.id || user?.authId || '';
const fmt = (value, language='vi') => value ? new Date(value).toLocaleDateString(assessmentLocale(language)) : '—';
const csvCell = v => { const raw=String(v ?? ''); const safe=['=','+','-','@'].includes(raw.trimStart().charAt(0)) ? "'"+raw : raw; return '"'+safe.replace(/"/g,'""')+'"'; };
function csvDownload(filename, columns, rows) {
 const csv = '\uFEFF' + [columns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
 const href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
 const a=document.createElement('a'); a.href=href; a.download=filename; a.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function Title({ children, detail }) {
 return <div className="a4-heading"><div><h3>{children}</h3>{detail ? <p>{detail}</p>:null}</div></div>;
}
function ActivityMini({ item, onOpen, onStar, favorite, more, language='vi' }) {
 const t=(value)=>assessmentText(value,language);
 return <article className="a4-activity">
   {item.thumbnailUrl ? <img alt="" loading="lazy" src={item.thumbnailUrl}/> : <div className="a4-image-empty"><Layers3/></div>}
   <div className="a4-activity-copy"><strong>{item.title}</strong><small>Khối {item.grade || '—'} · Unit {item.unitNo || '—'} · {item.focusArea || 'mixed'}</small><div className="a4-mini-actions">
      <button type="button" onClick={()=>onOpen(item)} disabled={!item.hasAccess && !item.isLeader}><Play size={14}/> {item.hasAccess || item.isLeader ? 'Mở hoạt động' : 'Yêu cầu quyền'}</button>
      {onStar ? <button type="button" onClick={()=>onStar(item.id)} aria-label="Yêu thích">{favorite ? '♥' : '♡'}</button>:null}
      {more}
   </div></div>
 </article>;
}

export default function Assessment4Workbench({ activities=[], currentUser, isLeader=false, onLaunch, onRefresh, favoriteIds=[], onToggleFavorite, initialTab='mine', initialSelectedActivities=[], language='vi' }) {
 const t=(value)=>assessmentText(value,language);
 const userId=uid(currentUser);
 const [tab,setTab]=useState(initialTab);
 const [data,setData]=useState(initial);
 const [ready,setReady]=useState(false);
 const [workspaceError,setWorkspaceError]=useState('');
 const [retryKey,setRetryKey]=useState(0);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const [search,setSearch]=useState('');
 const [grade,setGrade]=useState('all');
 const [unit,setUnit]=useState('all');
 const [focus,setFocus]=useState('all');
 const [sort,setSort]=useState('recent');
 const [difficulty,setDifficulty]=useState('all');
 const [delivery,setDelivery]=useState('all');
 const [duration,setDuration]=useState('all');
 const [attributes,setAttributes]=useState([]);
 const [attributeId,setAttributeId]=useState('');
 const [attributeDraft,setAttributeDraft]=useState({difficulty:'unclassified',durationMinutes:15,deliveryMode:'whole_class',keywords:'',learningGoal:''});
 const [collectionName,setCollectionName]=useState('');
 const [selectedCollection,setSelectedCollection]=useState('');
 const [pickActivity,setPickActivity]=useState('');
 const [journal,setJournal]=useState([]);
 const [reportSessions,setReportSessions]=useState([]);
 const [reportResults,setReportResults]=useState([]);
 const [interventions,setInterventions]=useState([]);
 const [audit,setAudit]=useState([]);
 const [teacherChoices,setTeacherChoices]=useState([]);
 const [selectedTeachers,setSelectedTeachers]=useState([]);
 const [teacherGroups,setTeacherGroups]=useState([]);
 const [teacherGroupId,setTeacherGroupId]=useState('');
 const [teacherGroupName,setTeacherGroupName]=useState('');
 const [groupBusy,setGroupBusy]=useState(false);
 const [linkAudit,setLinkAudit]=useState({});
 const [linkAuditBusy,setLinkAuditBusy]=useState(false);
 const [linkAuditPage,setLinkAuditPage]=useState(0);
 const [selectedActivities,setSelectedActivities]=useState(initialSelectedActivities);
 const [expiresOn,setExpiresOn]=useState('');
 const [grantAction,setGrantAction]=useState('grant');
 const [versionActivity,setVersionActivity]=useState('');
 const [versions,setVersions]=useState([]);
 const [runnerSeconds,setRunnerSeconds]=useState(0);
 const [running,setRunning]=useState(false);
 const [journalClass,setJournalClass]=useState('');
 const [journalNote,setJournalNote]=useState('');
 const [intervention,setIntervention]=useState({studentRef:'',studentName:'',className:'',focusArea:'',actionPlan:'',baselineGrade:'',followupGrade:'',dueOn:'',status:'planned'});
 const savedRef=useRef('');
 useEffect(()=>{setTab(initialTab);if(initialSelectedActivities.length)setSelectedActivities(initialSelectedActivities);},[initialTab,initialSelectedActivities]);
 const attributeById=useMemo(()=>new Map(attributes.map(a=>[a.activity_id,a])),[attributes]);
 const table=useMemo(()=>new Map(activities.map(item=>[item.id,{...item,isLeader}])),[activities,isLeader]);
 const allowed=useMemo(()=>activities.filter(item=>isLeader || item.hasAccess),[activities,isLeader]);
 const selected=useMemo(()=>data.collections.find(c=>c.id===selectedCollection),[data.collections,selectedCollection]);
 const runner=data.runner || {};
 const sequence=useMemo(()=>(data.collections.find(c=>c.id===runner.collectionId)?.activityIds || []).map(id=>table.get(id)).filter(Boolean),[data.collections,runner.collectionId,table]);
 const runnerIndex=Math.min(Number(runner.index||0),Math.max(0,sequence.length-1));
 const activeRunner=sequence[runnerIndex];

 const refreshRecords=useCallback(async()=>{
  const [j,i,a]=await Promise.all([listActivityJournal({leader:isLeader,userId}),listInterventions({leader:isLeader,userId}),isLeader ? listGrantAudit():Promise.resolve({ok:true,items:[]})]);
  if(j.ok)setJournal(j.items); if(i.ok)setInterventions(i.items); if(a.ok)setAudit(a.items);
  if(!j.ok || !i.ok)setNotice(j.message||i.message);
 },[isLeader,userId]);
 useEffect(()=>{
  let live=true;setReady(false);setWorkspaceError('');
  loadAssessmentWorkspace(userId).then(result=>{
   if(!live)return;
   if(result.ok){setData(result.state);savedRef.current=JSON.stringify(result.state);}
   else setWorkspaceError(result.message || t("Chưa thể tải không gian làm việc."));
   setReady(result.ok);
  }).catch(error=>{if(live)setWorkspaceError(error?.message||t("Không kết nối được Supabase."));});
  refreshRecords();
  listActivityAttributes().then(result=>{if(live && result.ok)setAttributes(result.items);});
  return ()=>{live=false;};
 },[userId,refreshRecords,retryKey]);
 useEffect(()=>{
  if(!ready)return undefined;
  const serialized=JSON.stringify(data);
  if(savedRef.current===serialized)return undefined;
  const timer=setTimeout(async()=>{
   const result=await storeAssessmentWorkspace(userId,data);
   if(result.ok)savedRef.current=serialized;
   else setNotice(t("Không lưu được thay đổi lên Supabase: ")+result.message);
  },700);
  return ()=>clearTimeout(timer);
 },[data,ready,userId]);
 useEffect(()=>{
  if(!running || !activeRunner)return undefined;
  const id=setInterval(()=>setRunnerSeconds(seconds=>Math.max(0,seconds-1)),1000);
  return ()=>clearInterval(id);
 },[running,activeRunner]);
 useEffect(()=>{if(runnerSeconds===0 && running)setRunning(false);},[runnerSeconds,running]);
 const amend=update=>setData(d=>({...d,...(typeof update==='function'?update(d):update)}));
 // The parent launch pathway validates access, logs one genuine open and
 // updates the atomic recent list. Do not duplicate those writes here.
 const launch=async activity=>{
  if(!activity || (!isLeader && !activity.hasAccess))return;
  await onLaunch?.(activity);
 };
 // Same favorite state as the main game gallery. No second, conflicting save path.
 const star=id=>onToggleFavorite?.(id);
 const collectionUpdate=(id,update)=>amend(d=>({collections:d.collections.map(c=>c.id===id?{...c,...update(c)}:c)}));
 const createCollection=()=>{
  const title=collectionName.trim().slice(0,100);
  if(!title)return;
  const id=crypto.randomUUID();
  amend(d=>({collections:[...d.collections,{id,title,activityIds:[],createdAt:new Date().toISOString()}]}));
  setSelectedCollection(id);setCollectionName('');setNotice(t("Đã tạo bộ sưu tập."));
 };
 const move=(id,direction)=>{
  if(!selected)return;
  const ids=[...selected.activityIds], index=ids.indexOf(id),next=index+direction;
  if(index<0||next<0||next>=ids.length)return;
  [ids[index],ids[next]]=[ids[next],ids[index]];
  collectionUpdate(selected.id,()=>({activityIds:ids}));
 };
 const startRunner=()=>{
  if(!selected?.activityIds?.length){setNotice(t("Hãy thêm hoạt động vào bộ sưu tập trước."));return;}
  amend({runner:{collectionId:selected.id,index:0,className:runner.className||'',minutes:runner.minutes||5}});
  setRunnerSeconds((runner.minutes||5)*60);setRunning(false);setTab('runner');
 };
 const navigateRunner=amount=>{
  const next=Math.max(0,Math.min(sequence.length-1,runnerIndex+amount));
  amend({runner:{...runner,index:next}});
  setRunnerSeconds((Number(runner.minutes)||5)*60);setRunning(false);
 };
 const recordDone=async()=>{
  if(!activeRunner)return;
  const result=await logActivityUse(userId,activeRunner,{eventType:'completed',className:runner.className||'',duration:Number(runner.minutes)||5,notes:journalNote});
  if(result.ok){setNotice(t("Đã ghi nhận vào nhật ký lớp."));setJournalNote('');refreshRecords();}
  else setNotice(result.message);
 };
 const filtered=useMemo(()=>{
  let items=activities.filter(a=>(isLeader || a.hasAccess || tab==='mine') && (!search || [a.title,a.unitTitle,a.lessonTitle,a.notes,a.classLabel,attributeById.get(a.id)?.learning_goal,...(attributeById.get(a.id)?.keywords||[])].some(v=>String(v||'').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))))
   && (grade==='all'||String(a.grade)===grade)
   && (unit==='all'||String(a.unitNo)===unit)
   && (focus==='all'||(focus==='skills'?['reading','listening','speaking'].includes(a.focusArea):a.focusArea===focus))
   && (difficulty==='all'||attributeById.get(a.id)?.difficulty===difficulty)
   && (delivery==='all'||attributeById.get(a.id)?.delivery_mode===delivery)
   && (duration==='all'||(duration==='short'?Number(attributeById.get(a.id)?.duration_minutes)<=10:duration==='medium'?Number(attributeById.get(a.id)?.duration_minutes)>10&&Number(attributeById.get(a.id)?.duration_minutes)<=25:Number(attributeById.get(a.id)?.duration_minutes)>25)));
  if(tab==='mine')items=items.filter(a=>isLeader||a.hasAccess);
  if(sort==='recent')items.sort((a,b)=>{const x=data.recentIds.indexOf(a.id),y=data.recentIds.indexOf(b.id);return (x<0?Infinity:x)-(y<0?Infinity:y);});
  else if(sort==='title')items.sort((a,b)=>a.title.localeCompare(b.title,'vi'));
  else items.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return items;
 },[activities,isLeader,tab,search,grade,unit,focus,difficulty,delivery,duration,sort,data.recentIds,attributeById]);
 async function fetchTeachers(){
  if(!activities.length)return;
  const r=await listLessonCheckTeacherAccess(activities[0].id);
  if(r.ok)setTeacherChoices(r.teachers);else setNotice(r.message);
 }
 useEffect(()=>{if(tab==='permissions'&&isLeader&&!teacherChoices.length)fetchTeachers();},[tab,isLeader,activities.length]);
 useEffect(()=>{
  if(!isLeader || tab!=='permissions')return;
  let live=true;
  listLessonCheckTeacherGroups(userId).then(r=>{
   if(!live)return;
   if(r.ok)setTeacherGroups(r.groups);
   else setNotice(r.message);
  });
  return()=>{live=false;};
 },[tab,isLeader,userId]);
 useEffect(()=>{
  if(!['analytics','evidence'].includes(tab))return;
  let live=true;
  Promise.all([listAssessmentSessions('',300),listAssessmentResults('')]).then(([a,b])=>{
   if(!live)return;
   if(a.ok)setReportSessions(a.items);if(b.ok)setReportResults(b.items);
   if(!a.ok||!b.ok)setNotice(a.message||b.message);
  });
  return()=>{live=false;};
 },[tab]);

 const chooseTeacherGroup=id=>{
   const group=teacherGroups.find(g=>g.id===id);
   setTeacherGroupId(id);
   setTeacherGroupName(group?.name||'');
   if(group)setSelectedTeachers(group.member_ids||[]);
 };
 async function saveTeacherGroup(){
   const name=teacherGroupName.trim();
   if(!name || !selectedTeachers.length){setNotice(t("Nhập tên nhóm và chọn giáo viên."));return;}
   setGroupBusy(true);
   const r=await saveLessonCheckTeacherGroup(userId,{
     id:teacherGroupId||undefined,name,memberIds:selectedTeachers
   });
   setGroupBusy(false);
   if(!r.ok){setNotice(r.message);return;}
   setTeacherGroups(current=>[...current.filter(item=>item.id!==r.group.id),r.group].sort((a,b)=>a.name.localeCompare(b.name,'vi')));
   setTeacherGroupId(r.group.id);
   setNotice(t("Đã lưu nhóm giáo viên. Có thể sử dụng lại ở các lần cấp quyền sau."));
 }
 async function removeTeacherGroup(){
   if(!teacherGroupId || !window.confirm(t("Xóa nhóm giáo viên này? Quyền đã cấp trước đó không bị thay đổi.")))return;
   setGroupBusy(true);
   const r=await deleteLessonCheckTeacherGroup(userId,teacherGroupId);
   setGroupBusy(false);
   if(!r.ok){setNotice(r.message);return;}
   setTeacherGroups(current=>current.filter(g=>g.id!==teacherGroupId));
   setTeacherGroupId('');setTeacherGroupName('');
   setNotice(t("Đã xóa nhóm lưu sẵn; các quyền được cấp trước đây vẫn giữ nguyên."));
 }
 async function auditVisibleLinks(){
   if(linkAuditBusy)return;
   setLinkAuditBusy(true);
   const queue=[...quality,...activities.filter(a=>!quality.some(q=>q.id===a.id))];
   const pageCount=Math.max(1,Math.ceil(queue.length/20));
   const page=linkAuditPage%pageCount;
   const targets=queue.slice(page*20,(page+1)*20);
   try{
     for(let start=0;start<targets.length;start+=3){
       const batch=targets.slice(start,start+3);
       const results=await Promise.all(batch.map(async activity=>{
         try{return {id:activity.id,result:await checkActivityLink(activity)};}
         catch{return {id:activity.id,result:{status:'unknown',reason:'Không kết nối được dịch vụ kiểm tra; chưa thể kết luận hỏng.'}};}
       }));
       setLinkAudit(old=>Object.fromEntries([...Object.entries(old),...results.map(r=>[r.id,r.result])]));
     }
     setLinkAuditPage((page+1)%pageCount);
     setNotice(t("Đã kiểm tra ")+targets.length+t(" nguồn (")+(page+1)+'/'+pageCount+t(" đợt). Các nguồn bị CORS chặn không được kết luận là hỏng."));
   }finally{setLinkAuditBusy(false);}
 }
 async function grantBulk(){
  if(!selectedActivities.length||!selectedTeachers.length){setNotice(t("Chọn ít nhất một hoạt động và một giáo viên."));return;}
  setWorking(true);
  const result=await bulkGrantActivities(selectedActivities,selectedTeachers,grantAction==='grant',grantAction==='grant'&&expiresOn?new Date(expiresOn+'T23:59:59').toISOString():null);
  setWorking(false);
  setNotice(result.ok?t("Đã xử lý ")+result.count+t(" quyền; đang đồng bộ…"):result.message);
  if(result.ok){await onRefresh?.();await refreshRecords();}
 }
 async function getVersions(activityId){
  setVersionActivity(activityId);const r=await listActivityVersions(activityId);
  if(r.ok)setVersions(r.items);else setNotice(r.message);
 }
 async function restoreVersion(v){
  const current=table.get(v.activity_id);
  if(!current || !window.confirm(t("Khôi phục nội dung phiên bản cũ? Phiên bản hiện tại sẽ được lưu vào lịch sử.")))return;
  const r=await readActivityVersion(v.id);
  if(!r.ok){setNotice(r.message);return;}
  const meta=r.item.metadata || {};
  const code=r.item.embed_code;
  const kind=meta.embed_kind==='html'?'html':'url';
  const draft={id:current.id,title:meta.title||current.title,bookKey:meta.book_key||'global-success',
   grade:meta.grade,unitNo:meta.unit_no,unitTitle:meta.unit_title,lessonKey:meta.lesson_key,
   lessonTitle:meta.lesson_title,className:meta.class_label,type:meta.activity_type,
   notes:meta.notes,sourceHost:meta.source_host,focusArea:meta.focus_area||current.focusArea,embedCode:code};
  setWorking(true);
  const done=await saveLessonCheckActivity(draft,{kind});
  setWorking(false);setNotice(done.ok?t("Đã khôi phục nội dung và giữ bản sao cũ."):done.message);
  if(done.ok){getVersions(current.id);onRefresh?.();}
 }
 async function addIntervention(){
  setWorking(true);const r=await saveIntervention(userId,intervention);setWorking(false);
  setNotice(r.ok?t("Đã lưu kế hoạch hỗ trợ."):r.message);
  if(r.ok){setIntervention({studentRef:'',studentName:'',className:'',focusArea:'',actionPlan:'',baselineGrade:'',followupGrade:'',dueOn:'',status:'planned'});refreshRecords();}
 }
 const quality=useMemo(()=>assessActivityQuality(activities),[activities]);
 const allTabs=[
  ['mine','Của tôi'],['collections','Bộ sưu tập'],['runner','Lesson Runner'],
  ['journal','Nhật ký lớp'],['analytics','Phân tích'],['interventions','Can thiệp'],
  ...(isLeader?[['permissions','Phân quyền'],['versions','Lịch sử phiên bản'],['quality','Chất lượng'],['evidence','Minh chứng']]:[])
 ];
 const completed=journal.filter(j=>j.event_type==='completed');
 const unitResults=useMemo(()=>{
  const groups=new Map();
  reportResults.forEach(r=>{if(!Number.isFinite(r.grade10))return;const key=String(r.unitNo||'—');const group=groups.get(key)||{sum:0,n:0};group.sum+=r.grade10;group.n+=1;groups.set(key,group);});
  return [...groups].sort((a,b)=>Number(a[0])-Number(b[0])).map(([unit,value])=>({unit,count:value.n,average:value.sum/value.n}));
 },[reportResults]);
 const studentProgress=useMemo(()=>{
  const byStudent=new Map();
  for(const r of reportResults){if(!Number.isFinite(r.grade10))continue;const key=[r.className,r.studentRef].join(':');const item=byStudent.get(key)||{name:r.studentName,className:r.className,results:[]};item.results.push(r);byStudent.set(key,item);}
  return [...byStudent.values()].filter(i=>i.results.length>=2).map(i=>{
   i.results.sort((a,b)=>String(a.completedAt).localeCompare(String(b.completedAt)));
   return {...i,before:i.results[0].grade10,after:i.results[i.results.length-1].grade10};
  }).sort((a,b)=>(a.after-a.before)-(b.after-b.before));
 },[reportResults]);
 const today=Date.now();
 const due=interventions.filter(i=>i.status!=='completed'&&i.due_on&&new Date(i.due_on).getTime()<today);
 return <section className="a4-workbench" aria-label="BRIAN Assessment 5.0">
  <header className="a4-hero"><div><small>BRIAN ASSESSMENT 5.0 · WORKSPACE</small><h2>{t("Trung tâm hoạt động & đánh giá")}</h2><p>{t("Học liệu của tôi · Tổ chức lớp · Theo dõi kết quả · Minh chứng chuyên môn")}</p></div>
   <button type="button" onClick={()=>{refreshRecords();onRefresh?.();}}><RefreshCw size={16}/> {t("Đồng bộ")}</button></header>
  <nav className="a4-tabs" aria-label={t("Chức năng Assessment 5.0")}>{allTabs.map(([id,name])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>setTab(id)}>{t(name)}</button>)}</nav>
  {notice?<div className="a4-notice" role="status">{assessmentText(notice,language)}<button type="button" aria-label={t("Đóng")} onClick={()=>setNotice('')}><X size={15}/></button></div>:null}
  {!ready?<div className="a4-loading">{workspaceError?<><strong>{workspaceError}</strong> <button type="button" onClick={()=>setRetryKey(v=>v+1)}>{t("Thử lại")}</button></>:<><LoaderCircle/> {t("Đang kết nối không gian làm việc cá nhân…")}</>}</div>:null}
  {ready && tab==='mine'? <>
   <div className="a4-stats"><div><strong>{favoriteIds.length}</strong><span>{t("Yêu thích")}</span></div><div><strong>{data.recentIds.length}</strong><span>{t("Đã mở gần đây")}</span></div><div><strong>{data.collections.length}</strong><span>{t("Bộ sưu tập")}</span></div><div><strong>{allowed.length}</strong><span>{t("Có quyền truy cập")}</span></div></div>
   <Title detail={t("Đánh dấu trái tim để ghim hoạt động; mọi mục được đồng bộ riêng theo tài khoản.")}>My Activity Workspace</Title>
   <div className="a4-filter"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("Tên trò chơi, chuyên đề, Unit…")}/></label>
    <select aria-label={t("Khối")} value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">{t("Mọi khối")}</option>{['10','11','12'].map(v=><option key={v}>{v}</option>)}</select>
    <select aria-label="Unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="all">{t("Mọi Unit")}</option>{Array.from({length:10},(_,i)=><option value={String(i+1)} key={i}>Unit {i+1}</option>)}</select>
    <select aria-label={t("Chuyên đề")} value={focus} onChange={e=>setFocus(e.target.value)}><option value="all">{t("Mọi chuyên đề")}</option>{['vocabulary','grammar','skills','mixed','unclassified','reading','listening','speaking'].map(x=><option key={x} value={x}>{x}</option>)}</select>
    <select aria-label={t("Trình độ CEFR")} value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">{t("Mọi trình độ")}</option>{['A1','A2','B1','B2','C1','C2','mixed','unclassified'].map(v=><option key={v}>{v}</option>)}</select>
    <select aria-label={t("Hình thức")} value={delivery} onChange={e=>setDelivery(e.target.value)}><option value="all">{t("Mọi hình thức")}</option><option value="individual">{t("Cá nhân")}</option><option value="group">{t("Nhóm")}</option><option value="whole_class">{t("Cả lớp")}</option><option value="hybrid">{t("Kết hợp")}</option></select>
    <select aria-label={t("Thời lượng")} value={duration} onChange={e=>setDuration(e.target.value)}><option value="all">{t("Mọi thời lượng")}</option><option value="short">{t("≤10 phút")}</option><option value="medium">{t("11–25 phút")}</option><option value="long">{t("Trên 25 phút")}</option></select>
    <select aria-label={t("Sắp xếp")} value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">{t("Ưu tiên gần đây")}</option><option value="title">A–Z</option><option value="newest">{t("Mới cập nhật")}</option></select>
   </div>
   <div className="a4-card-grid">{filtered.slice(0,60).map(item=><ActivityMini language={language} key={item.id} item={table.get(item.id)} onOpen={launch} onStar={star} favorite={favoriteIds.includes(item.id)}/>)}</div>
   {!filtered.length?<p className="a4-empty">{t("Chưa có hoạt động phù hợp bộ lọc hoặc quyền truy cập.")}</p>:null}
  </>:null}
  {ready && tab==='collections'?<>
   <Title detail={t("Tạo bộ sưu tập theo Unit, lớp hoặc tiết học. Mỗi bộ là một trình tự có thể sử dụng lại.")}>Activity Collections</Title>
   <div className="a4-form"><input value={collectionName} onChange={e=>setCollectionName(e.target.value)} placeholder={t("Ví dụ: Unit 5 – Inventions – tiết 2")} maxLength={100}/><button onClick={createCollection}><FolderPlus size={15}/> {t("Tạo bộ mới")}</button></div>
   <div className="a4-collections">{data.collections.map(c=><button key={c.id} className={selectedCollection===c.id?'active':''} onClick={()=>setSelectedCollection(c.id)}>{c.title} <small>{c.activityIds.length}</small></button>)}</div>
   {selected?<><div className="a4-section-head"><strong>{selected.title}</strong><button onClick={()=>{if(window.confirm(t("Xóa bộ sưu tập này?"))){amend(d=>({collections:d.collections.filter(c=>c.id!==selected.id)}));setSelectedCollection('');}}}><Trash2 size={14}/> {t("Xóa bộ")}</button></div>
    <div className="a4-form"><select value={pickActivity} onChange={e=>setPickActivity(e.target.value)}><option value="">{t("Chọn hoạt động đã được cấp quyền")}</option>{allowed.filter(a=>!selected.activityIds.includes(a.id)).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select><button onClick={()=>{if(pickActivity){collectionUpdate(selected.id,c=>({activityIds:[...c.activityIds,pickActivity]}));setPickActivity('');}}}><Plus size={15}/> {t("Thêm")}</button></div>
    <div className="a4-items">{selected.activityIds.map((id,i)=><div key={id}><span>{i+1}. {table.get(id)?.title||t("Hoạt động không còn tồn tại")}</span><div><button onClick={()=>move(id,-1)} disabled={i===0}>↑</button><button onClick={()=>move(id,1)} disabled={i===selected.activityIds.length-1}>↓</button><button onClick={()=>collectionUpdate(selected.id,c=>({activityIds:c.activityIds.filter(v=>v!==id)}))}>{t("×")}</button></div></div>)}</div>
    <button className="a4-primary" onClick={startRunner}><Play size={15}/> {t("Tổ chức chuỗi hoạt động")}</button>
   </>:<p className="a4-empty">{t("Tạo hoặc chọn một bộ sưu tập để thêm hoạt động.")}</p>}
  </>:null}
  {ready && tab==='runner'?<>
   <Title detail={t("Chuyển giữa các hoạt động trong cùng tiết học; thứ tự và tiến độ được đồng bộ trên tài khoản.")}>Lesson Runner</Title>
   <div className="a4-form"><select value={runner.collectionId||''} onChange={e=>{amend({runner:{...runner,collectionId:e.target.value,index:0}});setRunning(false);}}><option value="">{t("Chọn bộ sưu tập")}</option>{data.collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
    <input aria-label={t("Lớp")} value={runner.className||''} placeholder={t("Lớp sử dụng, ví dụ 12.6")} onChange={e=>amend({runner:{...runner,className:e.target.value.slice(0,60)}})}/>
    <label className="a4-minutes">{t("Phút / hoạt động")} <input type="number" min={1} max={60} value={runner.minutes||5} onChange={e=>amend({runner:{...runner,minutes:Math.max(1,Math.min(60,Number(e.target.value)||1))}})}/></label>
   </div>
   {activeRunner?<div className="a4-runner"><div className="a4-runner-timer"><small>HOẠT ĐỘNG {runnerIndex+1} / {sequence.length}</small><h3>{activeRunner.title}</h3><strong>{String(Math.floor(runnerSeconds/60)).padStart(2,'0')}:{String(runnerSeconds%60).padStart(2,'0')}</strong><div className="a4-runner-actions">
    <button onClick={()=>{if(!runnerSeconds)setRunnerSeconds((runner.minutes||5)*60);setRunning(v=>!v);}}>{running?t("Tạm dừng"):t("Bắt đầu đếm giờ")}</button>
    <button onClick={()=>{setRunning(false);setRunnerSeconds((runner.minutes||5)*60);}}>{t("Đặt lại")}</button>
    <button className="a4-primary" onClick={()=>launch(activeRunner)}><Play size={15}/> {t("Mở trò chơi")}</button>
   </div></div><div className="a4-runner-actions"><button disabled={runnerIndex===0} onClick={()=>navigateRunner(-1)}><ChevronLeft size={16}/> {t("Trước")}</button><button onClick={recordDone}><Check size={15}/> {t("Đã thực hiện")}</button><button disabled={runnerIndex===sequence.length-1} onClick={()=>navigateRunner(1)}>{t("Tiếp")} <ChevronRight size={16}/></button></div>
   <textarea value={journalNote} onChange={e=>setJournalNote(e.target.value)} placeholder={t("Ghi chú kết quả hoạt động (không bắt buộc)")} rows={2}/></div>:<p className="a4-empty">{t("Chọn một bộ sưu tập có hoạt động. Tiến độ sẽ được lưu để bạn quay lại tiếp tục.")}</p>}
  </>:null}
  {ready && tab==='journal'?<>
   <Title detail={t("Các lần giáo viên mở hoặc hoàn thành hoạt động. Chọn lớp ngay trong Lesson Runner để gắn nhật ký với lớp học.")}>Class Activity Journal</Title>
   <div className="a4-stats"><div><strong>{journal.length}</strong><span>{t("Lượt sử dụng")}</span></div><div><strong>{completed.length}</strong><span>{t("Đã hoàn thành")}</span></div><div><strong>{new Set(journal.map(i=>i.class_name).filter(Boolean)).size}</strong><span>{t("Số lớp")}</span></div></div>
   <div className="a4-table"><div className="a4-table-head"><span>{t("Ngày")}</span><span>{t("Hoạt động")}</span><span>{t("Lớp")}</span><span>{t("Trạng thái")}</span></div>{journal.slice(0,120).map(j=><div key={j.id}><span>{fmt(j.created_at,language)}</span><span>{j.activity_title}</span><span>{j.class_name||'—'}</span><span>{j.event_type==='completed'?t("Đã thực hiện"):t("Đã mở")}</span></div>)}</div>
   {!journal.length?<p className="a4-empty">{t("Nhật ký trống. Mở hoặc hoàn thành một hoạt động để ghi nhận.")}</p>:null}
  </>:null}
  {ready && tab==='analytics'?<>
   <Title detail={t("Báo cáo tổng hợp minh bạch từ nhật ký và hồ sơ can thiệp, không sử dụng AI. Báo cáo điểm chuyên sâu vẫn nằm ở mục Báo cáo của Assessment.")}>Assessment Analytics 2.0</Title>
   <div className="a4-stats"><div><strong>{new Set(journal.map(j=>j.activity_id).filter(Boolean)).size}</strong><span>{t("Hoạt động từng dùng")}</span></div><div><strong>{completed.length}</strong><span>{t("Lượt hoàn thành")}</span></div><div><strong>{interventions.length}</strong><span>{t("Biện pháp hỗ trợ")}</span></div><div><strong>{due.length}</strong><span>{t("Biện pháp quá hạn")}</span></div></div>
   <div className="a4-section-head"><strong>{t("Tần suất sử dụng theo chuyên đề")}</strong></div>
   {['vocabulary','grammar','reading','listening','speaking','mixed','unclassified'].map(area=>{
    const count=journal.filter(j=>table.get(j.activity_id)?.focusArea===area).length;
    const max=Math.max(1,journal.length);
    return <div className="a4-bar" key={area}><span>{area}</span><div><i style={{width:String(count/max*100)+'%'}}/></div><strong>{count}</strong></div>;
   })}
   <div className="a4-section-head"><strong>{t("Điểm trung bình theo Unit (dữ liệu thực từ các phiên đánh giá)")}</strong></div>
   {unitResults.length?unitResults.map(row=><div key={row.unit} className="a4-bar"><span>Unit {row.unit}</span><div><i style={{width:String(row.average*10)+'%'}}/></div><strong>{row.average.toFixed(1)} /10</strong></div>):<p className="a4-empty">{t("Chưa có dữ liệu điểm theo Unit.")}</p>}
   <div className="a4-section-head"><strong>{t("Học sinh có ít nhất hai lần được đánh giá")}</strong></div>
   <div className="a4-table"><div className="a4-table-head"><span>{t("Lớp")}</span><span>{t("Học sinh")}</span><span>{t("Lần đầu")}</span><span>{t("Lần gần nhất")}</span></div>{studentProgress.slice(0,40).map((row,i)=><div key={i}><span>{row.className}</span><span>{row.name}</span><span>{row.before.toFixed(1)}</span><span>{row.after.toFixed(1)} ({row.after-row.before>=0?'+':''}{(row.after-row.before).toFixed(1)})</span></div>)}</div>
   <div className="a4-section-head"><strong>{t("Biện pháp điều chỉnh")}</strong><button onClick={()=>setTab('interventions')}>{t("Xem chi tiết →")}</button></div>
   <p className="a4-muted">{interventions.filter(i=>i.status==='completed').length} {language==='en'?'completed':'hoàn thành'} / {interventions.length} {language==='en'?'measures; improvement is based on actual before-and-after scores.':'biện pháp; kết quả cải thiện được xác định từ điểm trước và sau thực tế.'}</p>
  </>:null}
  {ready && tab==='interventions'?<>
   <Title detail={t("Theo dõi học sinh cần củng cố, kế hoạch hỗ trợ và kết quả đánh giá lại. Mỗi hồ sơ thuộc về giáo viên tạo.")}>Intervention Tracker</Title>
   <div className="a4-form a4-form-grid">
    <input placeholder={t("Mã học sinh")} value={intervention.studentRef} onChange={e=>setIntervention(v=>({...v,studentRef:e.target.value}))}/>
    <input placeholder={t("Họ tên học sinh")} value={intervention.studentName} onChange={e=>setIntervention(v=>({...v,studentName:e.target.value}))}/>
    <input placeholder={t("Lớp")} value={intervention.className} onChange={e=>setIntervention(v=>({...v,className:e.target.value}))}/>
    <input placeholder={t("Chuyên đề cần hỗ trợ")} value={intervention.focusArea} onChange={e=>setIntervention(v=>({...v,focusArea:e.target.value}))}/>
    <label>{t("Điểm trước")} <input type="number" min={0} max={10} step={0.01} value={intervention.baselineGrade} onChange={e=>setIntervention(v=>({...v,baselineGrade:e.target.value}))}/></label>
    <label>{t("Điểm sau")} <input type="number" min={0} max={10} step={0.01} value={intervention.followupGrade} onChange={e=>setIntervention(v=>({...v,followupGrade:e.target.value}))}/></label>
    <label>{t("Đánh giá lại")} <input type="date" value={intervention.dueOn} onChange={e=>setIntervention(v=>({...v,dueOn:e.target.value}))}/></label>
    <select value={intervention.status} onChange={e=>setIntervention(v=>({...v,status:e.target.value}))}><option value="planned">{t("Dự kiến")}</option><option value="in_progress">{t("Đang hỗ trợ")}</option><option value="completed">{t("Hoàn thành")}</option></select>
    <textarea rows={2} placeholder={t("Biện pháp hỗ trợ / điều chỉnh dạy học")} value={intervention.actionPlan} onChange={e=>setIntervention(v=>({...v,actionPlan:e.target.value}))}/>
   </div>
   <button className="a4-primary" onClick={addIntervention} disabled={working}><Plus size={15}/> {intervention.id?t("Lưu cập nhật"):t("Thêm biện pháp")}</button>
   <div className="a4-table"><div className="a4-table-head"><span>{t("Học sinh / Lớp")}</span><span>{t("Chuyên đề")}</span><span>{t("Trước → Sau")}</span><span>{t("Trạng thái")}</span></div>{interventions.slice(0,150).map(i=><button type="button" key={i.id} onClick={()=>setIntervention({id:i.id,studentRef:i.student_ref,studentName:i.student_name,className:i.class_name,focusArea:i.focus_area,baselineGrade:i.baseline_grade??'',followupGrade:i.followup_grade??'',actionPlan:i.action_plan,dueOn:i.due_on||'',status:i.status})}><span>{i.student_name} · {i.class_name}</span><span>{i.focus_area}</span><span>{i.baseline_grade??'—'} → {i.followup_grade??'—'}</span><span>{i.status}</span></button>)}</div>
  </>:null}
  {ready && isLeader && tab==='permissions'?<>
   <Title detail={t("Cấp / thu hồi nhiều quyền trong một lần. Bắt buộc xác nhận; Supabase kiểm tra vai trò TTCM trên máy chủ.")}>Permission Center 2.0</Title>
   <div className="a4-group-manager" aria-label={t("Nhóm giáo viên dùng lại")}>
     <div><strong>{t("Nhóm giáo viên dùng lại")}</strong><small>{t("Lưu danh sách để cấp quyền nhiều lần; thay đổi nhóm không tự động sửa quyền đã cấp.")}</small></div>
     <div className="a4-form">
       <select aria-label={t("Chọn nhóm giáo viên")} value={teacherGroupId} onChange={e=>chooseTeacherGroup(e.target.value)}>
         <option value="">{t("+ Nhóm mới")}</option>
         {teacherGroups.map(g=><option key={g.id} value={g.id}>{g.name} ({g.member_ids.length} GV)</option>)}
       </select>
       <input aria-label={t("Tên nhóm giáo viên")} value={teacherGroupName} maxLength={100} onChange={e=>setTeacherGroupName(e.target.value)} placeholder={t("Ví dụ: Giáo viên khối 11")}/>
       <button disabled={groupBusy || !teacherGroupName.trim() || !selectedTeachers.length} onClick={saveTeacherGroup}>{t("Lưu nhóm từ giáo viên đã chọn")}</button>
       {teacherGroupId?<button disabled={groupBusy} onClick={removeTeacherGroup}><Trash2 size={14}/> {t("Xóa nhóm")}</button>:null}
     </div>
   </div>
   <div className="a4-permission-grids"><div><strong>{language==='en'?'Select activities':'Chọn hoạt động'} ({selectedActivities.length})</strong><div className="a4-scroll">{activities.map(a=><label key={a.id}><input type="checkbox" checked={selectedActivities.includes(a.id)} onChange={e=>setSelectedActivities(v=>e.target.checked?[...v,a.id]:v.filter(id=>id!==a.id))}/>{a.title}</label>)}</div></div><div><strong>{language==='en'?'Select teachers':'Chọn giáo viên'} ({selectedTeachers.length})</strong><div className="a4-scroll">{teacherChoices.map(t=><label key={t.userId}><input type="checkbox" checked={selectedTeachers.includes(t.userId)} onChange={e=>setSelectedTeachers(v=>e.target.checked?[...v,t.userId]:v.filter(id=>id!==t.userId))}/>{t.name} <small>{t.email}</small></label>)}</div></div></div>
   <div className="a4-form"><select value={grantAction} onChange={e=>setGrantAction(e.target.value)}><option value="grant">{t("Cấp quyền")}</option><option value="revoke">{t("Thu hồi quyền")}</option></select><label>{t("Hết hạn (tùy chọn)")} <input type="date" disabled={grantAction==='revoke'} value={expiresOn} onChange={e=>setExpiresOn(e.target.value)}/></label><button className="a4-primary" disabled={working||!selectedActivities.length||!selectedTeachers.length} onClick={()=>{if(window.confirm(language==='en' ? `Confirm ${grantAction==='grant'?'granting':'revoking'} ${selectedActivities.length*selectedTeachers.length} permissions?` : `Xác nhận ${grantAction==='grant'?'cấp':'thu hồi'} ${selectedActivities.length*selectedTeachers.length} quyền?`)) grantBulk();}}>{t("Áp dụng phân quyền")}</button></div>
   <div className="a4-section-head"><strong>{t("Nhật ký cấp quyền gần đây")}</strong></div><div className="a4-table"><div className="a4-table-head"><span>{t("Thời điểm")}</span><span>{t("Hoạt động")}</span><span>{t("Giáo viên")}</span><span>{t("Thao tác")}</span></div>{audit.slice(0,80).map(a=><div key={a.id}><span>{fmt(a.recorded_at,language)}</span><span>{table.get(a.activity_id)?.title||a.activity_id}</span><span>{teacherChoices.find(t=>t.userId===a.teacher_id)?.name||a.teacher_id}</span><span>{a.action==='grant'?t("Cấp"):t("Thu hồi")}</span></div>)}</div>
  </>:null}
  {ready && isLeader && tab==='versions'?<>
   <Title detail={t("Tự lưu bản nội dung trước khi sửa; khôi phục bằng quyền tổ trưởng, không mất phiên bản hiện tại.")}>Activity Version History</Title>
   <div className="a4-form"><select value={versionActivity} onChange={e=>getVersions(e.target.value)}><option value="">{t("Chọn hoạt động")}</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
   <div className="a4-items">{versions.map(v=><div key={v.id}><span>#{v.id} · {fmt(v.created_at,language)} · {v.metadata?.title||table.get(v.activity_id)?.title}</span><button disabled={working} onClick={()=>restoreVersion(v)}><RotateCcw size={14}/> {t("Khôi phục")}</button></div>)}</div>
   {versionActivity&&!versions.length?<p className="a4-empty">{t("Chưa có phiên bản cũ. Lịch sử được tạo khi cập nhật nội dung từ thời điểm bật tính năng.")}</p>:null}
  </>:null}
  {ready && isLeader && tab==='quality'?<>
   <Title detail={t("Kiểm tra thiếu ảnh, thiếu nhãn, nguồn chưa xác định và tiêu đề trùng; không tự động sửa học liệu.")}>Resource Quality Control</Title>
   <div className="a4-stats"><div><strong>{activities.length}</strong><span>{t("Tổng hoạt động")}</span></div><div><strong>{quality.length}</strong><span>{t("Cần rà soát")}</span></div><div><strong>{activities.filter(a=>a.focusArea==='unclassified').length}</strong><span>{t("Chưa phân loại")}</span></div><div><strong>{activities.filter(a=>!a.thumbnailUrl).length}</strong><span>{t("Thiếu thumbnail")}</span></div></div>
   <div className="a4-section-head"><strong>{t("Thông tin sử dụng & phân loại hoạt động")}</strong></div>
   <div className="a4-form"><select value={attributeId} onChange={e=>{const a=attributeById.get(e.target.value);setAttributeId(e.target.value);setAttributeDraft({difficulty:a?.difficulty||'unclassified',durationMinutes:a?.duration_minutes||15,deliveryMode:a?.delivery_mode||'whole_class',keywords:(a?.keywords||[]).join(', '),learningGoal:a?.learning_goal||''});}}><option value="">{t("Chọn hoạt động để bổ sung metadata")}</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
   {attributeId?<div className="a4-form a4-form-grid"><select value={attributeDraft.difficulty} onChange={e=>setAttributeDraft(v=>({...v,difficulty:e.target.value}))}>{['unclassified','A1','A2','B1','B2','C1','C2','mixed'].map(v=><option key={v}>{v}</option>)}</select><label>{t("Thời lượng (phút)")}<input type="number" min={1} max={120} value={attributeDraft.durationMinutes} onChange={e=>setAttributeDraft(v=>({...v,durationMinutes:e.target.value}))}/></label><select value={attributeDraft.deliveryMode} onChange={e=>setAttributeDraft(v=>({...v,deliveryMode:e.target.value}))}><option value="whole_class">{t("Cả lớp")}</option><option value="individual">{t("Cá nhân")}</option><option value="group">{t("Nhóm")}</option><option value="hybrid">{t("Kết hợp")}</option></select><input placeholder={t("Từ khóa, phân tách bằng dấu phẩy")} value={attributeDraft.keywords} onChange={e=>setAttributeDraft(v=>({...v,keywords:e.target.value}))}/><textarea rows={2} placeholder={t("Mục tiêu học tập")} value={attributeDraft.learningGoal} onChange={e=>setAttributeDraft(v=>({...v,learningGoal:e.target.value}))}/><button disabled={working} onClick={async()=>{setWorking(true);const r=await saveActivityAttributes(attributeId,attributeDraft,userId);setWorking(false);setNotice(r.ok?'Đã lưu và áp dụng bộ lọc nâng cao.':r.message);if(r.ok)setAttributes(a=>[...a.filter(x=>x.activity_id!==attributeId),r.item]);}}>{t("Lưu phân loại")}</button></div>:null}
   <div className="a4-items">{quality.slice(0,150).map(a=><div key={a.id}><span><strong>{a.title}</strong><small>{a.flags.join(' · ')}</small></span><button onClick={()=>onLaunch?.(a)}>Xem</button></div>)}</div>
   <div className="a4-link-audit">
     <div><strong>{t("Kiểm tra liên kết học liệu")}</strong><small>{t("Chỉ kiểm tra tối đa 20 nguồn cần rà soát mỗi lượt. HTTP 404/410 mới xác định hỏng; CORS, hết giờ và nguồn cần đăng nhập không được tính là hỏng.")}</small></div>
     <button type="button" disabled={linkAuditBusy || !activities.length} onClick={auditVisibleLinks}>{linkAuditBusy?t("Đang kiểm tra…"):(t("Kiểm tra 20 nguồn · đợt ")+(linkAuditPage+1)+'/'+Math.max(1,Math.ceil(activities.length/20)))}</button>
   </div>
   {Object.keys(linkAudit).length>0?<div className="a4-items" aria-live="polite">{Object.entries(linkAudit).map(([id,result])=><div key={id}><span><strong>{table.get(id)?.title||id}</strong><small>{result.reason}</small></span><span className={'a4-link-status is-'+result.status}>{({healthy:t("Hợp lệ"),broken:t("Liên kết hỏng"),unknown:t("Chưa xác minh"),restricted:t("Giới hạn truy cập"),invalid:t("URL không hợp lệ"),manual:t("Cần xem thủ công")})[result.status]||result.status}</span></div>)}</div>:null}
   <button onClick={()=>csvDownload('assessment-quality.csv',[t("Hoạt động"),t("Khối"),'Unit',t("Cần rà soát"),t("Kiểm tra URL"),t("Lý do")],quality.map(a=>[a.title,a.grade,a.unitNo,a.flags.join('; '),linkAudit[a.id]?.status||'',linkAudit[a.id]?.reason||'']))}><Download size={15}/> {t("Xuất báo cáo chất lượng")}</button>
  </>:null}
  {ready && isLeader && tab==='evidence'?<>
   <Title detail={t("Tổng hợp từ nhật ký và hồ sơ điều chỉnh thực tế; không tạo hoặc suy diễn dữ liệu minh chứng.")}>Department Evidence Center</Title>
   <div className="a4-stats"><div><strong>{completed.length}</strong><span>{t("Hoạt động ghi nhận hoàn thành")}</span></div><div><strong>{new Set(completed.map(j=>j.teacher_id)).size}</strong><span>{t("Giáo viên")}</span></div><div><strong>{new Set(completed.map(j=>j.class_name).filter(Boolean)).size}</strong><span>{t("Lớp")}</span></div><div><strong>{interventions.filter(i=>i.status==='completed').length}</strong><span>{t("Can thiệp hoàn tất")}</span></div></div>
   <div className="a4-evidence-actions"><button onClick={()=>csvDownload('assessment-session-evidence.csv',[t("Lớp"),t("Hoạt động"),'Unit',t("Giáo viên"),t("Trạng thái"),t("Điểm trung bình"),t("Điều chỉnh")],reportSessions.map(x=>[x.className,x.activityTitle,x.unitNo,x.teacherName,x.status,x.averageGrade10,x.teachingAdjustment]))}><Download size={15}/> {t("Xuất kết quả phiên đánh giá CSV")}</button><button onClick={()=>csvDownload('assessment-journal-evidence.csv',[t("Ngày"),t("Giáo viên ID"),t("Lớp"),t("Hoạt động"),t("Kết quả"),t("Phút"),t("Ghi chú")],journal.map(j=>[j.created_at,j.teacher_id,j.class_name,j.activity_title,j.event_type,j.duration_minutes,j.notes]))}><Download size={15}/> {t("Xuất nhật ký hoạt động CSV")}</button><button onClick={()=>csvDownload('assessment-interventions-evidence.csv',[t("Lớp"),t("Học sinh"),t("Chuyên đề"),t("Điểm đầu"),t("Điểm sau"),t("Biện pháp"),t("Trạng thái")],interventions.map(i=>[i.class_name,i.student_name,i.focus_area,i.baseline_grade,i.followup_grade,i.action_plan,i.status]))}><Download size={15}/> {t("Xuất minh chứng can thiệp CSV")}</button></div>
   <p className="a4-muted">{t("Minh chứng chỉ dựa trên hoạt động đã ghi nhận trong cơ sở dữ liệu, cần giáo viên đối chiếu khi sử dụng trong báo cáo chính thức.")}</p>
  </>:null}
 </section>;
}
