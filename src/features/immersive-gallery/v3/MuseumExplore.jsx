import React,{useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,ChevronRight,ClipboardList,Eye,Info,Landmark,LockKeyhole,Settings2,Shield,ShieldAlert,ShieldCheck,Users,BookOpen,Plus,Leaf} from 'lucide-react';
import {LESSON_KITS} from './museumData.js';
import {PREPARED_COLLECTIONS,preparedGallery} from './museumPreparedCollections.js';
import {staffRequest,DEMO_GALLERY} from './museumApi.js';
import MuseumScene from './MuseumScene.jsx';
import MuseumExhibitionDetail from './MuseumExhibitionDetail.jsx';
import {KitCover} from './MuseumDashboard.jsx';
const tr=(l,vi,en)=>l==='en'?en:vi;
export function MuseumTemplates({language='vi',onCreate}){
 const kit=LESSON_KITS[0];
 return <div className="bml-screen"><div><div className="bml-overline">ENGLISH 11 · GLOBAL SUCCESS UNIT 5</div>
  <h1>{tr(language,'Kế hoạch bài dạy','Teaching plan')}</h1>
  <p>{tr(language,'Một chủ đề dạy học số trong hai tiết, bám sát Unit 5: Global Warming.',
   'One focused two-period digital lesson aligned with Unit 5: Global Warming.')}</p></div>
  <div className="bml-single-lesson">
   <KitCover kit={kit} size="large"/>
   <div className="bml-single-lesson-copy">
    <span className="bml-overline">OUR CLIMATE ACTION MUSEUM</span>
    <h3>{kit.title}</h3><p>{kit.subtitle}</p>
    <strong>{tr(language,'Câu hỏi định hướng','Driving question')}</strong>
    <p className="bml-single-lesson-question">{kit.challenge}</p><p>{kit.goal}</p>
    <div className="bml-chips"><span>English 11 · Unit 5</span><span>{'2 × 45 min'}</span><span>11 {tr(language,'hoạt động','activities')}</span></div>
    <button type="button" className="bml-primary" onClick={()=>onCreate('climate')}>
     {tr(language,'Tạo bài học từ kế hoạch này','Create lesson from this plan')} <ArrowRight size={17}/></button>
   </div>
  </div>
  <div className="bml-banner bml-info-banner"><Info size={19}/>{tr(language,
    'Mỗi nhóm thực hiện khảo sát ưu tiên thật, viết ba thuyết minh tiếng Anh, tải poster và biểu đồ, thử nghiệm – cải tiến rồi tham quan gallery 3D.',
    'Groups conduct a real priority survey, write three English captions, upload an original poster and chart, test and revise, then visit the 3D gallery.')}</div>
 </div>;
}
const exhibitionFromHash=()=>{
 if(typeof window==='undefined')return '';
 try{return new URLSearchParams(window.location.hash.split('?')[1]||'').get('exhibition')||'';}
 catch{return '';}
};
const setExhibitionHash=key=>{
 if(typeof window==='undefined')return;
 const current=window.location.hash.split('?')[0]||'#/tool/immersive-gallery';
 const url=current+(key?'?exhibition='+encodeURIComponent(key):'');
 window.history.replaceState(null,'',url);
};
export function MuseumGallery({language='vi',onDemo,query='',onNavigate,data}){
 const [galleries,setGalleries]=useState([]),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  import('../galleryData.js').then(async({getGalleryEnabled,listExhibitions})=>{
   const enabled=await getGalleryEnabled();return enabled?listExhibitions():[];
  }).then(items=>{if(active)setGalleries(items||[]);})
    .catch(e=>{if(active)setError(e.message);});
  const initial=exhibitionFromHash();
  if(initial){
   if(initial==='demo')setSelected(DEMO_GALLERY);
   else if(initial.startsWith('collection-')&&PREPARED_COLLECTIONS.some(c=>'collection-'+c.key===initial)){
    setSelected(preparedGallery(initial.slice('collection-'.length)));
   }else import('../galleryData.js').then(({getExhibition})=>getExhibition(initial))
     .then(item=>{if(active)setSelected(item);})
     .catch(e=>{if(active)setError(e.message);});
  }
  return()=>{active=false;};
 },[]);
 const enter=async item=>{
  setBusy(true);setError('');
  try{
   const {getExhibition}=await import('../galleryData.js');
   const full=await getExhibition(item.id);
   setSelected(full);setExhibitionHash(full.slug||full.id);
  }catch(e){setError(e.message);}
  finally{setBusy(false);}
 };
 const leave=()=>{setSelected(null);setExhibitionHash('');};
 if(selected)return <MuseumExhibitionDetail gallery={selected} language={language}
  isDemo={selected.id===DEMO_GALLERY.id} data={data} onBack={leave} onNavigate={onNavigate}/>;
 return <div className="bml-screen" data-testid="museum-showcase">
  <div><div className="bml-overline">MUSEUM SHOWCASE</div><h1>{tr(language,'Triển lãm của chúng ta','Our exhibitions')}</h1>
   <p>{tr(language,'Khám phá các dự án tiếng Anh qua không gian bảo tàng 3D.','Explore English projects in interactive 3D museums.')}</p></div>
  {error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={19}/>{error}</div>:null}
  <div className="bml-gallery-grid">
   {PREPARED_COLLECTIONS.filter(c=>(c.title+' '+c.classScope).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(c=>
    <button type="button" className="bml-gallery-card" key={c.key} data-testid={'museum-collection-'+c.key}
      onClick={()=>{setSelected(preparedGallery(c.key));setExhibitionHash('collection-'+c.key);}}>
     <div className="bml-card-photo"><span className="bml-gallery-badge">{c.classScope} · ENGLISH STEAM</span><Landmark strokeWidth={1.2}/></div>
     <div className="bml-card-caption"><strong>{c.title}</strong>
      <small>{c.groupCount} {tr(language,'nhóm','groups')} · {c.groupCount*3} {tr(language,'tác phẩm','exhibits')}</small>
      <span>{tr(language,'Tham quan bảo tàng 3D','Explore 3D museum')} <ArrowRight size={16}/></span></div>
    </button>)}
   {galleries.filter(g=>(g.title+' '+(g.summary||'')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(g=>
    <button type="button" className="bml-gallery-card" key={g.id} onClick={()=>enter(g)} disabled={busy}>
     <div className="bml-card-photo"><span className="bml-gallery-badge">{g.status?.toUpperCase()||'EXHIBITION'}</span><Leaf strokeWidth={1.35}/></div>
     <div className="bml-card-caption"><strong>{g.title}</strong><small>{g.summary}</small>
      <span>{tr(language,'Mở triển lãm','Open exhibition')} <ArrowRight size={16}/></span></div>
    </button>)}
  </div>
  {!galleries.length?<div className="bml-banner bml-info-banner"><Info size={18}/>{tr(language,
   'Các bộ sưu tập bài học đã sẵn sàng. Bài nộp được duyệt sẽ xuất hiện khi được công bố.',
   'Lesson collections are ready. Approved submissions will appear when published.')}</div>:null}
 </div>;
}
export function MuseumSettings({data,onRefresh,language='vi'}){
 const isAdmin=data?.profile?.role==='admin';
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const act=async(action,body)=>{
  setBusy(true);setError('');setMessage('');
  try{await staffRequest(action,body);await onRefresh();setMessage(tr(language,'Đã lưu thay đổi trên máy chủ.','Server changes saved.'));}
  catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const toggle=async()=>{
  const next=!data.creatorSettings?.enabled;
  if(next&&!window.confirm(tr(language,'Chỉ bật Creator Pass sau khi đã kiểm thử đăng nhập nhóm và phân quyền Admin. Bạn có muốn bật không?','Enable Creator Pass only after verifying group access and Admin permissions. Continue?')))return;
  if(!next&&!window.confirm(tr(language,'Tắt Creator Pass sẽ khóa truy cập phiên khách. Bạn muốn tiếp tục?','Disabling Creator Pass will block guest access. Continue?')))return;
  await act('feature-settings',{enabled:next});
 };
 return <div className="bml-screen" data-testid="museum-settings"><div><span className="bml-overline">SCHOOL MANAGEMENT</span>
  <h1>{tr(language,'Cài đặt & phân quyền','Settings & permissions')}</h1><p>{tr(language,'Đơn giản hóa quyền truy cập, vẫn bảo vệ dữ liệu học sinh.','Simple permissions with strict student-data protection.')}</p></div>
  {error?<div className="bml-banner bml-danger-banner" role="alert"><ShieldAlert size={20}/>{error}</div>:null}
  {message?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={20}/>{message}</div>:null}
  <div className="bml-settings-layout">
   <section className="bml-surface"><div className="bml-eval-heading"><LockKeyhole size={21}/><h2>{tr(language,'Học sinh không cần tài khoản','No student accounts')}</h2></div>
    <p>{tr(language,'Học sinh vào bằng mã QR và mã bí mật riêng cho nhóm. Không có quyền vào dữ liệu nội bộ của Brian.','Students use a QR invitation plus a separate private group passcode; no Brian account is created.')}</p>
    <div className="bml-switch-row"><div><strong>Student Creator Pass</strong><small>{tr(language,'Cho phép nhóm mở Studio theo mã mời','Allow students to enter via group invites')}</small></div>
     <span className={data?.creatorSettings?.enabled?'bml-pill-on':'bml-pill-off'}>{data?.creatorSettings?.enabled?'ON':'OFF'}</span></div>
    {isAdmin?<button type="button" className={data.creatorSettings?.enabled?'bml-outline':'bml-primary'} disabled={busy} onClick={toggle}>
     {data.creatorSettings?.enabled?tr(language,'Tạm khóa Creator Pass','Disable Creator Pass'):tr(language,'Bật Creator Pass sau nghiệm thu','Enable Creator Pass after QA')}</button>:
     <div className="bml-banner bml-info-banner"><Shield size={18}/>{tr(language,'Chỉ Admin được phép thay đổi quyền kích hoạt.','Only an Admin can change this switch.')}</div>}
    <div className="bml-switch-row"><div><strong>{tr(language,'Tải tranh ảnh vào bảo tàng 3D','Student artwork uploads to 3D')}</strong>
      <small>{tr(language,'JPG / PNG / WebP → PNG đã tái mã hóa, kho ảnh riêng tư và kiểm tra quyền nhóm','JPG / PNG / WebP → re-encoded PNG; private storage and group permissions')}</small></div>
     <span className={data?.creatorSettings?.upload_enabled?'bml-pill-on':'bml-pill-off'}>{data?.creatorSettings?.upload_enabled?'ON':'OFF'}</span></div>
    {isAdmin?<button type="button" className="bml-outline" disabled={busy||!data?.creatorSettings?.enabled}
      onClick={()=>{
       const enable=!data?.creatorSettings?.upload_enabled;
       if(enable&&!window.confirm(tr(language,
         'Chỉ bật sau khi đã kiểm thử tải ảnh thật, quyền nhóm và thiết bị học sinh. Bạn xác nhận mở tải ảnh?',
         'Only enable after genuine media, group-scope and student-device QA. Confirm enable?')))return;
       act('artwork-settings',{enabled:enable});
      }}>{data?.creatorSettings?.upload_enabled?
        tr(language,'Tắt tải tranh ảnh học sinh','Disable artwork uploads'):
        tr(language,'Cho phép tải tranh ảnh sau nghiệm thu','Enable artwork uploads after QA')}</button>:null}
   </section>
   <section className="bml-surface"><div className="bml-eval-heading"><ShieldCheck size={21}/><h2>{tr(language,'Admin quản lý trực tiếp','Admin-controlled workflow')}</h2></div>
    <p>{tr(language,
      'Admin trực tiếp tạo bài học, giao mã nhóm, đọc và chấm bài nộp, yêu cầu sửa, phê duyệt và công bố triển lãm. Không cần phân công giáo viên hoặc người duyệt TTCM.',
      'The Admin creates lessons, issues group passes, scores submissions, requests revisions, approves and publishes exhibitions directly. No teacher or department reviewer is assigned.')}</p>
    <div className="bml-checklist">
     <div className="bml-check-item"><CheckCircle2 size={21}/><div><strong>{tr(language,'1. Giao nhiệm vụ','1. Assign')}</strong><small>{tr(language,'Admin tạo bài và phát Creator Pass cho từng nhóm.','The Admin creates assignments and issues group passes.')}</small></div></div>
     <div className="bml-check-item"><CheckCircle2 size={21}/><div><strong>{tr(language,'2. Duyệt bài nộp','2. Review')}</strong><small>{tr(language,'Admin chấm rubric, duyệt trực tiếp hoặc yêu cầu chỉnh sửa.','The Admin scores and directly approves or returns submissions.')}</small></div></div>
     <div className="bml-check-item"><CheckCircle2 size={21}/><div><strong>{tr(language,'3. Công bố và quản lý','3. Publish and manage')}</strong><small>{tr(language,'Admin công bố bản đã duyệt và quản lý xóa khỏi danh sách an toàn.','The Admin publishes approved work and manages safe archive actions.')}</small></div></div>
    </div>
   </section>
  </div>
  <div className="bml-banner bml-info-banner"><Info size={18}/>{tr(language,'Quy trình công bố: nhóm học sinh nộp → Admin kiểm tra/chấm rubric → Admin phê duyệt → Admin công bố. Các bản đã công bố được bảo vệ khỏi xóa nhầm.','Publication: student group submits → Admin reviews and scores → Admin approves → Admin publishes. Published versions are protected from accidental deletion.')}</div>
 </div>;
}
