import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ClipboardList, Clock3, Download, FolderPlus, Heart, History, Layers3, LoaderCircle, Play, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Trash2, Users, X } from 'lucide-react';
import { listLessonCheckTeacherAccess, saveLessonCheckActivity } from '../../utils/lessonCheckActivities.js';
import {
 assessActivityQuality, bulkGrantActivities, listActivityJournal, listActivityVersions,
 listGrantAudit, listInterventions, loadAssessmentWorkspace, logActivityUse, readActivityVersion,
 saveIntervention, storeAssessmentWorkspace,
} from '../../utils/lessonCheckWorkbench.js';
import './Assessment4Workbench.css';

const initial = { favorites: [], recentIds: [], collections: [], runner: {} };
const uid = user => user?.id || user?.authId || '';
const fmt = value => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const csvCell = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
function csvDownload(filename, columns, rows) {
 const csv = '\uFEFF' + [columns,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
 const href = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8' }));
 const a=document.createElement('a'); a.href=href; a.download=filename; a.click();
 setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function Title({ children, detail }) {
 return <div className="a4-heading"><div><h3>{children}</h3>{detail ? <p>{detail}</p>:null}</div></div>;
}
function ActivityMini({ item, onOpen, onStar, favorite, more }) {
 return <article className="a4-activity">
   {item.thumbnailUrl ? <img alt="" loading="lazy" src={item.thumbnailUrl}/> : <div className="a4-image-empty"><Layers3/></div>}
   <div className="a4-activity-copy"><strong>{item.title}</strong><small>Khối {item.grade || '—'} · Unit {item.unitNo || '—'} · {item.focusArea || 'mixed'}</small><div className="a4-mini-actions">
      <button type="button" onClick={()=>onOpen(item)} disabled={!item.hasAccess && !item.isLeader}><Play size={14}/> {item.hasAccess || item.isLeader ? 'Mở hoạt động' : 'Yêu cầu quyền'}</button>
      {onStar ? <button type="button" onClick={()=>onStar(item.id)} aria-label="Yêu thích">{favorite ? '♥' : '♡'}</button>:null}
      {more}
   </div></div>
 </article>;
}

export default function Assessment4Workbench({ activities=[], currentUser, isLeader=false, onLaunch, onRefresh }) {
 const userId=uid(currentUser);
 const [tab,setTab]=useState('mine');
 const [data,setData]=useState(initial);
 const [ready,setReady]=useState(false);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const [search,setSearch]=useState('');
 const [grade,setGrade]=useState('all');
 const [unit,setUnit]=useState('all');
 const [focus,setFocus]=useState('all');
 const [sort,setSort]=useState('recent');
 const [collectionName,setCollectionName]=useState('');
 const [selectedCollection,setSelectedCollection]=useState('');
 const [pickActivity,setPickActivity]=useState('');
 const [journal,setJournal]=useState([]);
 const [interventions,setInterventions]=useState([]);
 const [audit,setAudit]=useState([]);
 const [teacherChoices,setTeacherChoices]=useState([]);
 const [selectedTeachers,setSelectedTeachers]=useState([]);
 const [selectedActivities,setSelectedActivities]=useState([]);
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
  let live=true;setReady(false);
  loadAssessmentWorkspace(userId).then(result=>{
   if(!live)return;
   if(result.ok){setData(result.state);savedRef.current=JSON.stringify(result.state);}
   else setNotice(result.message || 'Chưa thể tải không gian làm việc.');
   setReady(result.ok);
  });
  refreshRecords();
  return ()=>{live=false;};
 },[userId,refreshRecords]);
 useEffect(()=>{
  if(!ready)return undefined;
  const serialized=JSON.stringify(data);
  if(savedRef.current===serialized)return undefined;
  const timer=setTimeout(async()=>{
   const result=await storeAssessmentWorkspace(userId,data);
   if(result.ok)savedRef.current=serialized;
   else setNotice('Không lưu được thay đổi lên Supabase: '+result.message);
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
 const markRecent=id=>amend(d=>({recentIds:[id,...d.recentIds.filter(x=>x!==id)].slice(0,30)}));
 const launch=async activity=>{
  if(!activity)return;
  if(isLeader || activity.hasAccess) {
   markRecent(activity.id);
   const result=await logActivityUse(userId,activity,{className:runner.className||'',eventType:'opened'});
   if(!result.ok)setNotice('Hoạt động vẫn mở được, nhưng chưa ghi nhật ký: '+result.message);
  }
  onLaunch?.(activity);
 };
 const star=id=>amend(d=>({favorites:d.favorites.includes(id)?d.favorites.filter(x=>x!==id):[...d.favorites,id]}));
 const collectionUpdate=(id,update)=>amend(d=>({collections:d.collections.map(c=>c.id===id?{...c,...update(c)}:c)}));
 const createCollection=()=>{
  const title=collectionName.trim().slice(0,100);
  if(!title)return;
  const id=crypto.randomUUID();
  amend(d=>({collections:[...d.collections,{id,title,activityIds:[],createdAt:new Date().toISOString()}]}));
  setSelectedCollection(id);setCollectionName('');setNotice('Đã tạo bộ sưu tập.');
 };
 const move=(id,direction)=>{
  if(!selected)return;
  const ids=[...selected.activityIds], index=ids.indexOf(id),next=index+direction;
  if(index<0||next<0||next>=ids.length)return;
  [ids[index],ids[next]]=[ids[next],ids[index]];
  collectionUpdate(selected.id,()=>({activityIds:ids}));
 };
 const startRunner=()=>{
  if(!selected?.activityIds?.length){setNotice('Hãy thêm hoạt động vào bộ sưu tập trước.');return;}
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
  if(result.ok){setNotice('Đã ghi nhận vào nhật ký lớp.');setJournalNote('');refreshRecords();}
  else setNotice(result.message);
 };
 const filtered=useMemo(()=>{
  let items=activities.filter(a=>(isLeader || a.hasAccess || tab==='mine') && (!search || [a.title,a.unitTitle,a.lessonTitle,a.notes,a.classLabel].some(v=>String(v||'').toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))))
   && (grade==='all'||String(a.grade)===grade)
   && (unit==='all'||String(a.unitNo)===unit)
   && (focus==='all'||(focus==='skills'?['reading','listening','speaking'].includes(a.focusArea):a.focusArea===focus)));
  if(tab==='mine')items=items.filter(a=>isLeader||a.hasAccess);
  if(sort==='recent')items.sort((a,b)=>data.recentIds.indexOf(a.id)-data.recentIds.indexOf(b.id));
  else if(sort==='title')items.sort((a,b)=>a.title.localeCompare(b.title,'vi'));
  else items.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  return items;
 },[activities,isLeader,tab,search,grade,unit,focus,sort,data.recentIds]);
 async function fetchTeachers(){
  if(!activities.length)return;
  const r=await listLessonCheckTeacherAccess(activities[0].id);
  if(r.ok)setTeacherChoices(r.teachers);else setNotice(r.message);
 }
 useEffect(()=>{if(tab==='permissions'&&isLeader&&!teacherChoices.length)fetchTeachers();},[tab,isLeader,activities.length]);
 async function grantBulk(){
  if(!selectedActivities.length||!selectedTeachers.length){setNotice('Chọn ít nhất một hoạt động và một giáo viên.');return;}
  setWorking(true);
  const result=await bulkGrantActivities(selectedActivities,selectedTeachers,grantAction==='grant',grantAction==='grant'&&expiresOn?new Date(expiresOn+'T23:59:59').toISOString():null);
  setWorking(false);
  setNotice(result.ok?'Đã xử lý '+result.count+' quyền; đang đồng bộ…':result.message);
  if(result.ok){await onRefresh?.();await refreshRecords();}
 }
 async function getVersions(activityId){
  setVersionActivity(activityId);const r=await listActivityVersions(activityId);
  if(r.ok)setVersions(r.items);else setNotice(r.message);
 }
 async function restoreVersion(v){
  const current=table.get(v.activity_id);
  if(!current || !window.confirm('Khôi phục nội dung phiên bản cũ? Phiên bản hiện tại sẽ được lưu vào lịch sử.'))return;
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
  setWorking(false);setNotice(done.ok?'Đã khôi phục nội dung và giữ bản sao cũ.':done.message);
  if(done.ok){getVersions(current.id);onRefresh?.();}
 }
 async function addIntervention(){
  setWorking(true);const r=await saveIntervention(userId,intervention);setWorking(false);
  setNotice(r.ok?'Đã lưu kế hoạch hỗ trợ.':r.message);
  if(r.ok){setIntervention({studentRef:'',studentName:'',className:'',focusArea:'',actionPlan:'',baselineGrade:'',followupGrade:'',dueOn:'',status:'planned'});refreshRecords();}
 }
 const quality=useMemo(()=>assessActivityQuality(activities),[activities]);
 const allTabs=[
  ['mine','Của tôi'],['collections','Bộ sưu tập'],['runner','Lesson Runner'],
  ['journal','Nhật ký lớp'],['analytics','Phân tích'],['interventions','Can thiệp'],
  ...(isLeader?[['permissions','Phân quyền'],['versions','Lịch sử phiên bản'],['quality','Chất lượng'],['evidence','Minh chứng']]:[])
 ];
 const completed=journal.filter(j=>j.event_type==='completed');
 const today=Date.now();
 const due=interventions.filter(i=>i.status!=='completed'&&i.due_on&&new Date(i.due_on).getTime()<today);
 return <section className="a4-workbench" aria-label="BRIAN Assessment 4.0">
  <header className="a4-hero"><div><small>BRIAN ASSESSMENT 4.0 · WORKSPACE</small><h2>Trung tâm hoạt động & đánh giá</h2><p>Học liệu của tôi · Tổ chức lớp · Theo dõi kết quả · Minh chứng chuyên môn</p></div>
   <button type="button" onClick={()=>{refreshRecords();onRefresh?.();}}><RefreshCw size={16}/> Đồng bộ</button></header>
  <nav className="a4-tabs" aria-label="Chức năng Assessment 4.0">{allTabs.map(([id,name])=><button key={id} type="button" className={tab===id?'active':''} onClick={()=>setTab(id)}>{name}</button>)}</nav>
  {notice?<div className="a4-notice" role="status">{notice}<button type="button" aria-label="Đóng" onClick={()=>setNotice('')}><X size={15}/></button></div>:null}
  {!ready?<div className="a4-loading"><LoaderCircle/> Đang kết nối không gian làm việc cá nhân…</div>:null}
  {ready && tab==='mine'? <>
   <div className="a4-stats"><div><strong>{data.favorites.length}</strong><span>Yêu thích</span></div><div><strong>{data.recentIds.length}</strong><span>Đã mở gần đây</span></div><div><strong>{data.collections.length}</strong><span>Bộ sưu tập</span></div><div><strong>{allowed.length}</strong><span>Có quyền truy cập</span></div></div>
   <Title detail="Đánh dấu trái tim để ghim hoạt động; mọi mục được đồng bộ riêng theo tài khoản.">My Activity Workspace</Title>
   <div className="a4-filter"><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên trò chơi, chuyên đề, Unit…"/></label>
    <select aria-label="Khối" value={grade} onChange={e=>setGrade(e.target.value)}><option value="all">Mọi khối</option>{['10','11','12'].map(v=><option key={v}>{v}</option>)}</select>
    <select aria-label="Unit" value={unit} onChange={e=>setUnit(e.target.value)}><option value="all">Mọi Unit</option>{Array.from({length:10},(_,i)=><option value={String(i+1)} key={i}>Unit {i+1}</option>)}</select>
    <select aria-label="Chuyên đề" value={focus} onChange={e=>setFocus(e.target.value)}><option value="all">Mọi chuyên đề</option>{['vocabulary','grammar','skills','mixed','unclassified','reading','listening','speaking'].map(x=><option key={x} value={x}>{x}</option>)}</select>
    <select aria-label="Sắp xếp" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Ưu tiên gần đây</option><option value="title">A–Z</option><option value="newest">Mới cập nhật</option></select>
   </div>
   <div className="a4-card-grid">{filtered.slice(0,60).map(item=><ActivityMini key={item.id} item={item} onOpen={launch} onStar={star} favorite={data.favorites.includes(item.id)}/>)}</div>
   {!filtered.length?<p className="a4-empty">Chưa có hoạt động phù hợp bộ lọc hoặc quyền truy cập.</p>:null}
  </>:null}
  {ready && tab==='collections'?<>
   <Title detail="Tạo bộ sưu tập theo Unit, lớp hoặc tiết học. Mỗi bộ là một trình tự có thể sử dụng lại.">Activity Collections</Title>
   <div className="a4-form"><input value={collectionName} onChange={e=>setCollectionName(e.target.value)} placeholder="Ví dụ: Unit 5 – Inventions – tiết 2" maxLength={100}/><button onClick={createCollection}><FolderPlus size={15}/> Tạo bộ mới</button></div>
   <div className="a4-collections">{data.collections.map(c=><button key={c.id} className={selectedCollection===c.id?'active':''} onClick={()=>setSelectedCollection(c.id)}>{c.title} <small>{c.activityIds.length}</small></button>)}</div>
   {selected?<><div className="a4-section-head"><strong>{selected.title}</strong><button onClick={()=>{if(window.confirm('Xóa bộ sưu tập này?')){amend(d=>({collections:d.collections.filter(c=>c.id!==selected.id)}));setSelectedCollection('');}}}><Trash2 size={14}/> Xóa bộ</button></div>
    <div className="a4-form"><select value={pickActivity} onChange={e=>setPickActivity(e.target.value)}><option value="">Chọn hoạt động đã được cấp quyền</option>{allowed.filter(a=>!selected.activityIds.includes(a.id)).map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select><button onClick={()=>{if(pickActivity){collectionUpdate(selected.id,c=>({activityIds:[...c.activityIds,pickActivity]}));setPickActivity('');}}}><Plus size={15}/> Thêm</button></div>
    <div className="a4-items">{selected.activityIds.map((id,i)=><div key={id}><span>{i+1}. {table.get(id)?.title||'Hoạt động không còn tồn tại'}</span><div><button onClick={()=>move(id,-1)} disabled={i===0}>↑</button><button onClick={()=>move(id,1)} disabled={i===selected.activityIds.length-1}>↓</button><button onClick={()=>collectionUpdate(selected.id,c=>({activityIds:c.activityIds.filter(v=>v!==id)}))}>×</button></div></div>)}</div>
    <button className="a4-primary" onClick={startRunner}><Play size={15}/> Tổ chức chuỗi hoạt động</button>
   </>:<p className="a4-empty">Tạo hoặc chọn một bộ sưu tập để thêm hoạt động.</p>}
  </>:null}
  {ready && tab==='runner'?<>
   <Title detail="Chuyển giữa các hoạt động trong cùng tiết học; thứ tự và tiến độ được đồng bộ trên tài khoản.">Lesson Runner</Title>
   <div className="a4-form"><select value={runner.collectionId||''} onChange={e=>{amend({runner:{...runner,collectionId:e.target.value,index:0}});setRunning(false);}}><option value="">Chọn bộ sưu tập</option>{data.collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
    <input aria-label="Lớp" value={runner.className||''} placeholder="Lớp sử dụng, ví dụ 12.6" onChange={e=>amend({runner:{...runner,className:e.target.value.slice(0,60)}})}/>
    <label className="a4-minutes">Phút / hoạt động <input type="number" min={1} max={60} value={runner.minutes||5} onChange={e=>amend({runner:{...runner,minutes:Math.max(1,Math.min(60,Number(e.target.value)||1))}})}/></label>
   </div>
   {activeRunner?<div className="a4-runner"><div className="a4-runner-timer"><small>HOẠT ĐỘNG {runnerIndex+1} / {sequence.length}</small><h3>{activeRunner.title}</h3><strong>{String(Math.floor(runnerSeconds/60)).padStart(2,'0')}:{String(runnerSeconds%60).padStart(2,'0')}</strong><div className="a4-runner-actions">
    <button onClick={()=>{if(!runnerSeconds)setRunnerSeconds((runner.minutes||5)*60);setRunning(v=>!v);}}>{running?'Tạm dừng':'Bắt đầu đếm giờ'}</button>
    <button onClick={()=>{setRunning(false);setRunnerSeconds((runner.minutes||5)*60);}}>Đặt lại</button>
    <button className="a4-primary" onClick={()=>launch(activeRunner)}><Play size={15}/> Mở trò chơi</button>
   </div></div><div className="a4-runner-actions"><button disabled={runnerIndex===0} onClick={()=>navigateRunner(-1)}><ChevronLeft size={16}/> Trước</button><button onClick={recordDone}><Check size={15}/> Đã thực hiện</button><button disabled={runnerIndex===sequence.length-1} onClick={()=>navigateRunner(1)}>Tiếp <ChevronRight size={16}/></button></div>
   <textarea value={journalNote} onChange={e=>setJournalNote(e.target.value)} placeholder="Ghi chú kết quả hoạt động (không bắt buộc)" rows={2}/></div>:<p className="a4-empty">Chọn một bộ sưu tập có hoạt động. Tiến độ sẽ được lưu để bạn quay lại tiếp tục.</p>}
  </>:null}
  {ready && tab==='journal'?<>
   <Title detail="Các lần giáo viên mở hoặc hoàn thành hoạt động. Chọn lớp ngay trong Lesson Runner để gắn nhật ký với lớp học.">Class Activity Journal</Title>
   <div className="a4-stats"><div><strong>{journal.length}</strong><span>Lượt sử dụng</span></div><div><strong>{completed.length}</strong><span>Đã hoàn thành</span></div><div><strong>{new Set(journal.map(i=>i.class_name).filter(Boolean)).size}</strong><span>Số lớp</span></div></div>
   <div className="a4-table"><div className="a4-table-head"><span>Ngày</span><span>Hoạt động</span><span>Lớp</span><span>Trạng thái</span></div>{journal.slice(0,120).map(j=><div key={j.id}><span>{fmt(j.created_at)}</span><span>{j.activity_title}</span><span>{j.class_name||'—'}</span><span>{j.event_type==='completed'?'Đã thực hiện':'Đã mở'}</span></div>)}</div>
   {!journal.length?<p className="a4-empty">Nhật ký trống. Mở hoặc hoàn thành một hoạt động để ghi nhận.</p>:null}
  </>:null}
  {ready && tab==='analytics'?<>
   <Title detail="Báo cáo tổng hợp minh bạch từ nhật ký và hồ sơ can thiệp, không sử dụng AI. Báo cáo điểm chuyên sâu vẫn nằm ở mục Báo cáo của Assessment.">Assessment Analytics 2.0</Title>
   <div className="a4-stats"><div><strong>{new Set(journal.map(j=>j.activity_id).filter(Boolean)).size}</strong><span>Hoạt động từng dùng</span></div><div><strong>{completed.length}</strong><span>Lượt hoàn thành</span></div><div><strong>{interventions.length}</strong><span>Biện pháp hỗ trợ</span></div><div><strong>{due.length}</strong><span>Biện pháp quá hạn</span></div></div>
   <div className="a4-section-head"><strong>Tần suất sử dụng theo chuyên đề</strong></div>
   {['vocabulary','grammar','reading','listening','speaking','mixed','unclassified'].map(area=>{
    const count=journal.filter(j=>table.get(j.activity_id)?.focusArea===area).length;
    const max=Math.max(1,journal.length);
    return <div className="a4-bar" key={area}><span>{area}</span><div><i style={{width:String(count/max*100)+'%'}}/></div><strong>{count}</strong></div>;
   })}
   <div className="a4-section-head"><strong>Biện pháp điều chỉnh</strong><button onClick={()=>setTab('interventions')}>Xem chi tiết →</button></div>
   <p className="a4-muted">{interventions.filter(i=>i.status==='completed').length} hoàn thành / {interventions.length} biện pháp; kết quả cải thiện được xác định từ điểm trước và sau thực tế.</p>
  </>:null}
  {ready && tab==='interventions'?<>
   <Title detail="Theo dõi học sinh cần củng cố, kế hoạch hỗ trợ và kết quả đánh giá lại. Mỗi hồ sơ thuộc về giáo viên tạo.">Intervention Tracker</Title>
   <div className="a4-form a4-form-grid">
    <input placeholder="Mã học sinh" value={intervention.studentRef} onChange={e=>setIntervention(v=>({...v,studentRef:e.target.value}))}/>
    <input placeholder="Họ tên học sinh" value={intervention.studentName} onChange={e=>setIntervention(v=>({...v,studentName:e.target.value}))}/>
    <input placeholder="Lớp" value={intervention.className} onChange={e=>setIntervention(v=>({...v,className:e.target.value}))}/>
    <input placeholder="Chuyên đề cần hỗ trợ" value={intervention.focusArea} onChange={e=>setIntervention(v=>({...v,focusArea:e.target.value}))}/>
    <label>Điểm trước <input type="number" min={0} max={10} step={0.01} value={intervention.baselineGrade} onChange={e=>setIntervention(v=>({...v,baselineGrade:e.target.value}))}/></label>
    <label>Điểm sau <input type="number" min={0} max={10} step={0.01} value={intervention.followupGrade} onChange={e=>setIntervention(v=>({...v,followupGrade:e.target.value}))}/></label>
    <label>Đánh giá lại <input type="date" value={intervention.dueOn} onChange={e=>setIntervention(v=>({...v,dueOn:e.target.value}))}/></label>
    <select value={intervention.status} onChange={e=>setIntervention(v=>({...v,status:e.target.value}))}><option value="planned">Dự kiến</option><option value="in_progress">Đang hỗ trợ</option><option value="completed">Hoàn thành</option></select>
    <textarea rows={2} placeholder="Biện pháp hỗ trợ / điều chỉnh dạy học" value={intervention.actionPlan} onChange={e=>setIntervention(v=>({...v,actionPlan:e.target.value}))}/>
   </div>
   <button className="a4-primary" onClick={addIntervention} disabled={working}><Plus size={15}/> {intervention.id?'Lưu cập nhật':'Thêm biện pháp'}</button>
   <div className="a4-table"><div className="a4-table-head"><span>Học sinh / Lớp</span><span>Chuyên đề</span><span>Trước → Sau</span><span>Trạng thái</span></div>{interventions.slice(0,150).map(i=><button type="button" key={i.id} onClick={()=>setIntervention({id:i.id,studentRef:i.student_ref,studentName:i.student_name,className:i.class_name,focusArea:i.focus_area,baselineGrade:i.baseline_grade??'',followupGrade:i.followup_grade??'',actionPlan:i.action_plan,dueOn:i.due_on||'',status:i.status})}><span>{i.student_name} · {i.class_name}</span><span>{i.focus_area}</span><span>{i.baseline_grade??'—'} → {i.followup_grade??'—'}</span><span>{i.status}</span></button>)}</div>
  </>:null}
  {ready && isLeader && tab==='permissions'?<>
   <Title detail="Cấp / thu hồi nhiều quyền trong một lần. Bắt buộc xác nhận; Supabase kiểm tra vai trò TTCM trên máy chủ.">Permission Center 2.0</Title>
   <div className="a4-permission-grids"><div><strong>Chọn hoạt động ({selectedActivities.length})</strong><div className="a4-scroll">{activities.map(a=><label key={a.id}><input type="checkbox" checked={selectedActivities.includes(a.id)} onChange={e=>setSelectedActivities(v=>e.target.checked?[...v,a.id]:v.filter(id=>id!==a.id))}/>{a.title}</label>)}</div></div><div><strong>Chọn giáo viên ({selectedTeachers.length})</strong><div className="a4-scroll">{teacherChoices.map(t=><label key={t.userId}><input type="checkbox" checked={selectedTeachers.includes(t.userId)} onChange={e=>setSelectedTeachers(v=>e.target.checked?[...v,t.userId]:v.filter(id=>id!==t.userId))}/>{t.name} <small>{t.email}</small></label>)}</div></div></div>
   <div className="a4-form"><select value={grantAction} onChange={e=>setGrantAction(e.target.value)}><option value="grant">Cấp quyền</option><option value="revoke">Thu hồi quyền</option></select><label>Hết hạn (tùy chọn) <input type="date" disabled={grantAction==='revoke'} value={expiresOn} onChange={e=>setExpiresOn(e.target.value)}/></label><button className="a4-primary" disabled={working||!selectedActivities.length||!selectedTeachers.length} onClick={()=>{if(window.confirm('Xác nhận '+(grantAction==='grant'?'cấp':'thu hồi')+' '+(selectedActivities.length*selectedTeachers.length)+' quyền?'))grantBulk();}}>Áp dụng phân quyền</button></div>
   <div className="a4-section-head"><strong>Nhật ký cấp quyền gần đây</strong></div><div className="a4-table"><div className="a4-table-head"><span>Thời điểm</span><span>Hoạt động</span><span>Giáo viên</span><span>Thao tác</span></div>{audit.slice(0,80).map(a=><div key={a.id}><span>{fmt(a.recorded_at)}</span><span>{table.get(a.activity_id)?.title||a.activity_id}</span><span>{teacherChoices.find(t=>t.userId===a.teacher_id)?.name||a.teacher_id}</span><span>{a.action==='grant'?'Cấp':'Thu hồi'}</span></div>)}</div>
  </>:null}
  {ready && isLeader && tab==='versions'?<>
   <Title detail="Tự lưu bản nội dung trước khi sửa; khôi phục bằng quyền tổ trưởng, không mất phiên bản hiện tại.">Activity Version History</Title>
   <div className="a4-form"><select value={versionActivity} onChange={e=>getVersions(e.target.value)}><option value="">Chọn hoạt động</option>{activities.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select></div>
   <div className="a4-items">{versions.map(v=><div key={v.id}><span>#{v.id} · {fmt(v.created_at)} · {v.metadata?.title||table.get(v.activity_id)?.title}</span><button disabled={working} onClick={()=>restoreVersion(v)}><RotateCcw size={14}/> Khôi phục</button></div>)}</div>
   {versionActivity&&!versions.length?<p className="a4-empty">Chưa có phiên bản cũ. Lịch sử được tạo khi cập nhật nội dung từ thời điểm bật tính năng.</p>:null}
  </>:null}
  {ready && isLeader && tab==='quality'?<>
   <Title detail="Kiểm tra thiếu ảnh, thiếu nhãn, nguồn chưa xác định và tiêu đề trùng; không tự động sửa học liệu.">Resource Quality Control</Title>
   <div className="a4-stats"><div><strong>{activities.length}</strong><span>Tổng hoạt động</span></div><div><strong>{quality.length}</strong><span>Cần rà soát</span></div><div><strong>{activities.filter(a=>a.focusArea==='unclassified').length}</strong><span>Chưa phân loại</span></div><div><strong>{activities.filter(a=>!a.thumbnailUrl).length}</strong><span>Thiếu thumbnail</span></div></div>
   <div className="a4-items">{quality.slice(0,150).map(a=><div key={a.id}><span><strong>{a.title}</strong><small>{a.flags.join(' · ')}</small></span><button onClick={()=>onLaunch?.(a)}>Xem</button></div>)}</div>
   <button onClick={()=>csvDownload('assessment-quality.csv',['Hoạt động','Khối','Unit','Cần rà soát'],quality.map(a=>[a.title,a.grade,a.unitNo,a.flags.join('; ')]))}><Download size={15}/> Xuất báo cáo chất lượng</button>
  </>:null}
  {ready && isLeader && tab==='evidence'?<>
   <Title detail="Tổng hợp từ nhật ký và hồ sơ điều chỉnh thực tế; không tạo hoặc suy diễn dữ liệu minh chứng.">Department Evidence Center</Title>
   <div className="a4-stats"><div><strong>{completed.length}</strong><span>Hoạt động ghi nhận hoàn thành</span></div><div><strong>{new Set(completed.map(j=>j.teacher_id)).size}</strong><span>Giáo viên</span></div><div><strong>{new Set(completed.map(j=>j.class_name).filter(Boolean)).size}</strong><span>Lớp</span></div><div><strong>{interventions.filter(i=>i.status==='completed').length}</strong><span>Can thiệp hoàn tất</span></div></div>
   <div className="a4-evidence-actions"><button onClick={()=>csvDownload('assessment-journal-evidence.csv',['Ngày','Giáo viên ID','Lớp','Hoạt động','Kết quả','Phút','Ghi chú'],journal.map(j=>[j.created_at,j.teacher_id,j.class_name,j.activity_title,j.event_type,j.duration_minutes,j.notes]))}><Download size={15}/> Xuất nhật ký hoạt động CSV</button><button onClick={()=>csvDownload('assessment-interventions-evidence.csv',['Lớp','Học sinh','Chuyên đề','Điểm đầu','Điểm sau','Biện pháp','Trạng thái'],interventions.map(i=>[i.class_name,i.student_name,i.focus_area,i.baseline_grade,i.followup_grade,i.action_plan,i.status]))}><Download size={15}/> Xuất minh chứng can thiệp CSV</button></div>
   <p className="a4-muted">Minh chứng chỉ dựa trên hoạt động đã ghi nhận trong cơ sở dữ liệu, cần giáo viên đối chiếu khi sử dụng trong báo cáo chính thức.</p>
  </>:null}
 </section>;
}
