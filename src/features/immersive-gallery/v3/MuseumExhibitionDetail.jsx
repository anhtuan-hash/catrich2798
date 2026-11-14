import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft,ArrowRight,Award,BarChart3,BookOpen,CheckCircle2,ChevronRight,Clock3,Copy,Download,Eye,FileText,FolderOpen,Home,Images,Info,Landmark,Layers3,Maximize2,MoreHorizontal,Presentation,Share2,ShieldCheck,Users,Trash2,X} from 'lucide-react';
import MuseumScene from './MuseumScene.jsx';
import './museumExhibition.css';
import {MuseumHeroArt} from './MuseumDashboard.jsx';
import {saveTextFile} from './museumApi.js';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const short=(value,length=300)=>String(value??'').trim().slice(0,length);
function Metric({icon:Icon,value,label,subtitle,tone}){
 return <div className={'bml-exh-metric bml-exh-metric-'+tone}>
  <span className="bml-exh-metric-icon"><Icon size={25}/></span>
  <div><strong>{value}</strong><span>{label}</span>{subtitle?<small>{subtitle}</small>:null}</div>
 </div>;
}
function OverviewCards({data,onNavigate,language}){
 const groups=data?.groups||[],reviews=data?.reviews||[];
 const submitted=reviews.filter(r=>['submitted','ttcm_review','approved_locked','published'].includes(r.state)).length;
 const pending=reviews.filter(r=>r.state==='submitted'||r.state==='ttcm_review').length;
 return <div className="bml-exh-overview-grid">
  <section className="bml-exh-overview-card bml-exh-overview-lesson">
   <div className="bml-exh-card-heading"><BookOpen size={20}/><h3>{t(language,'Liên kết bài học','Lesson workspace')}</h3></div>
   <button type="button" className="bml-exh-linked-lesson" onClick={()=>onNavigate?.('lessons')}>
    <span>{t(language,'Mở các bài học đã giao','Open your assigned lessons')}</span><ChevronRight size={20}/>
   </button>
   <p>{t(language,'Dạy trực tiếp, giao nhiệm vụ và hướng dẫn học sinh tạo tác phẩm ngay trong BRIAN Museum Lab.','Teach live, assign group tasks and create artworks inside BRIAN Museum Lab.')}</p>
   <button type="button" className="bml-exh-text-link" onClick={()=>onNavigate?.('live')}>
    <Presentation size={17}/>{t(language,'Mở Teacher Live','Open Teacher Live')}<ArrowRight size={15}/>
   </button>
  </section>
  <section className="bml-exh-overview-card bml-exh-overview-progress">
   <div className="bml-exh-card-heading"><BarChart3 size={20}/><h3>{t(language,'Tổng hợp hoạt động học sinh','Classwork overview')}</h3></div>
   <small className="bml-exh-card-scope">{t(language,'Tất cả bài học trong Museum Lab, không chỉ triển lãm này.','Across Museum Lab lessons, not only this exhibition.')}</small>
   <div className="bml-exh-progress-rows">
    <div><CheckCircle2 size={17}/><span>{t(language,'Bản nộp đã ghi nhận','Recorded submissions')}</span><strong>{data?submitted:'—'}</strong></div>
    <div><Clock3 size={17}/><span>{t(language,'Đang chờ duyệt','Awaiting review')}</span><strong>{data?pending:'—'}</strong></div>
    <div><Users size={17}/><span>{t(language,'Nhóm học tập','Student groups')}</span><strong>{data?groups.length:'—'}</strong></div>
   </div>
  </section>
  <section className="bml-exh-overview-card bml-exh-overview-competition">
   <div className="bml-exh-card-heading"><Award size={20}/><h3>{t(language,'Hồ sơ dự thi','Competition dossier')}</h3></div>
   <p>{t(language,'Chuẩn bị giáo án hai tiết, minh chứng học sinh thật và tài liệu số cho hội thi.','Prepare the two-period lesson plan, authentic learning evidence and digital materials.')}</p>
   <button type="button" className="bml-exh-competition-action" onClick={()=>onNavigate?.('evidence')}>
    <FolderOpen size={18}/>{t(language,'Xem hồ sơ dự thi','Open competition dossier')}<ChevronRight size={17}/>
   </button>
  </section>
 </div>;
}
export default function MuseumExhibitionDetail({gallery,language='vi',onBack,onNavigate,data,isDemo=false,onDelete=null,busy=false,startInCinema=false}){
 const [section,setSection]=useState('space'),[moreOpen,setMoreOpen]=useState(false),[notice,setNotice]=useState('');
 const [cinemaOpen,setCinemaOpen]=useState(Boolean(startInCinema));
 const enterCinemaRef=useRef(null);
 const rooms=useMemo(()=>Array.isArray(gallery?.rooms)?gallery.rooms:[],[gallery?.rooms]);
 const exhibitCount=rooms.reduce((total,room)=>total+(room.exhibits?.length||0),0);
 const visibleStatus=gallery?.status==='published'&&!isDemo;
 const subtitle=short(gallery?.summary,250);
 const link=typeof window==='undefined'?'':window.location.origin+window.location.pathname+
  '#/tool/immersive-gallery?exhibition='+encodeURIComponent(isDemo?'demo':gallery?.slug||gallery?.id||'');
 const announce=(message)=>{setNotice(message);window.setTimeout(()=>setNotice(''),4000);};
 const copyLink=async()=>{
  setMoreOpen(false);
  if(data?.offlineReadOnly){announce('Share the original offline ZIP archive to let another person open this exhibition.');return;}
  try{
   if(navigator.share){await navigator.share({title:gallery?.title||'BRIAN Museum Lab',url:link});return;}
   await navigator.clipboard.writeText(link);
   announce(t(language,'Đã sao chép liên kết. Người xem vẫn cần quyền truy cập Brian.','Link copied. Viewers still need Brian access.'));
  }catch(e){
   if(e?.name!=='AbortError')announce(t(language,'Không thể chia sẻ tự động.','Unable to share automatically.'));
  }
 };
 const downloadDetails=()=>{
  setMoreOpen(false);
  const lines=['BRIAN MUSEUM LAB · EXHIBITION',gallery?.title||'',
   subtitle,'',
   ...rooms.flatMap((room,i)=>[
    String(i+1)+'. '+short(room.title,160),
    ...(room.exhibits||[]).map((e,j)=>String(j+1)+') '+short(e.title,140)+' — '+short(e.description,800)),
    ''
   ]),
   isDemo?'DEMO — Illustrative content, not authentic student work.':'',
   'Generated from currently visible exhibition content.'];
  saveTextFile('BRIAN_Museum_Exhibition_Summary.txt','text/plain;charset=utf-8',lines.join('\n'));
 };
 // Teachers use the exact same full-viewport MuseumScene cinema mode as student
 // creators. Keep the management page mounted underneath for information,
 // sharing and returning to the Exhibition catalogue.
 const openCinema=()=>{setSection('space');setMoreOpen(false);setCinemaOpen(true);};
 const closeCinema=()=>{setCinemaOpen(false);
  window.requestAnimationFrame?.(()=>enterCinemaRef.current?.focus?.());};
 useEffect(()=>{
  if(!cinemaOpen||typeof document==='undefined')return undefined;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const frame=window.requestAnimationFrame?.(()=>{
   document.querySelector('[data-testid="museum-teacher-cinema-portal"] .bml-cinema-close')?.focus?.();
  });
  return()=>{if(frame!=null)window.cancelAnimationFrame?.(frame);document.body.style.overflow=oldOverflow;};
 },[cinemaOpen]);
 return <>
 <div className="bml-exhibition-detail bml-screen" data-testid="museum-exhibition-detail">
  <nav className="bml-exh-breadcrumbs" aria-label={t(language,'Đường dẫn','Breadcrumb')}>
   <button type="button" onClick={()=>onNavigate?.('home')}><Home size={15}/>{t(language,'Trang chủ','Home')}</button>
   <ChevronRight size={14}/><button type="button" onClick={onBack}>{t(language,'Triển lãm','Exhibitions')}</button>
   <ChevronRight size={14}/><strong>{short(gallery?.title,90)}</strong>
  </nav>
  <section className="bml-exh-hero">
   <div className="bml-exh-hero-copy">
    <span className="bml-overline">{t(language,'TRIỂN LÃM TƯƠNG TÁC','INTERACTIVE EXHIBITION')}</span>
    <h1>{short(gallery?.title,140)}</h1>
    <p>{subtitle||t(language,'Khám phá các tác phẩm và câu chuyện tiếng Anh trong không gian số.','Explore artwork and English stories in a digital museum.')}</p>
    <div className="bml-exh-hero-meta">
     <span className={'bml-exh-status '+(visibleStatus?'is-published':isDemo?'is-demo':'is-private')}>
      <CheckCircle2 size={16}/>{isDemo?'DEMO':visibleStatus?t(language,'Đã xuất bản','Published'):t(language,'Triển lãm nội bộ','School exhibition')}
     </span>
     
     {isDemo?<small>{t(language,'Dữ liệu minh họa · không phải tác phẩm thật','Synthetic sample · not student evidence')}</small>:null}
    </div>
   </div>
   <div className="bml-exh-hero-visual"><MuseumHeroArt/></div>
  </section>
  <section className="bml-exh-museum-frame" data-testid="museum-exhibition-frame">
   <div className="bml-exh-toolbar">
    <div className="bml-exh-section-tabs" role="tablist" aria-label={t(language,'Nội dung triển lãm','Exhibition sections')}>
     <button type="button" role="tab" aria-selected={section==='space'} className={section==='space'?'is-active':''}
      onClick={()=>setSection('space')}><Layers3 size={17}/>{t(language,'Không gian triển lãm','Exhibition space')}</button>
     <button type="button" role="tab" aria-selected={section==='about'} className={section==='about'?'is-active':''}
      onClick={()=>setSection('about')}><Info size={17}/>{t(language,'Thông tin & hoạt động','Information & activity')}</button>
    </div>
    <div className="bml-exh-toolbar-actions">
     <button type="button" className="bml-exh-round-action" onClick={openCinema} title={t(language,'Mở bảo tàng toàn màn hình','Open full-screen museum')} aria-label={t(language,'Mở bảo tàng toàn màn hình','Open full-screen museum')}><Maximize2 size={19}/></button>
     <button type="button" className="bml-exh-round-action" onClick={copyLink} title={t(language,'Chia sẻ','Share')} aria-label={t(language,'Chia sẻ','Share')}><Share2 size={19}/></button>
     <div className="bml-exh-more-wrap">
      <button type="button" className="bml-exh-round-action" aria-expanded={moreOpen} aria-label={t(language,'Tùy chọn','More options')}
       onClick={()=>setMoreOpen(v=>!v)}><MoreHorizontal size={20}/></button>
      {moreOpen?<div className="bml-exh-menu" role="menu">
       <button type="button" role="menuitem" onClick={copyLink}><Copy size={16}/>{t(language,'Sao chép liên kết','Copy link')}</button>
       <button type="button" role="menuitem" onClick={downloadDetails}><Download size={16}/>{t(language,'Tải nội dung (.txt)','Download text summary')}</button>
       <button type="button" role="menuitem" onClick={()=>{setMoreOpen(false);setSection('about');}}><Info size={16}/>{t(language,'Xem thông tin','View information')}</button>
       {onDelete?<button type="button" role="menuitem" disabled={busy} className="bml-exh-delete-action" onClick={()=>{setMoreOpen(false);onDelete();}}><Trash2 size={16}/>Delete exhibition</button>:null}
      </div>:null}
     </div>
    </div>
   </div>
   {notice?<div className="bml-exh-notice" role="status"><CheckCircle2 size={16}/>{notice}<button aria-label="Close" onClick={()=>setNotice('')}><X size={16}/></button></div>:null}
   {section==='space'?<div role="tabpanel">
     {!cinemaOpen?<><button ref={enterCinemaRef} type="button" className="bml-exh-enter-cinema" onClick={openCinema}>
      <Maximize2 size={18}/>{t(language,'Tham quan bảo tàng toàn màn hình','Open full-screen museum')}
     </button><MuseumScene gallery={gallery} language={language} compact initial3D/></>:null}
    </div>:<div className="bml-exh-info-panel" role="tabpanel">
     <div>
      <span className="bml-overline">{t(language,'CÂU CHUYỆN TRIỂN LÃM','EXHIBITION STORY')}</span>
      <h2>{short(gallery?.title,140)}</h2>
      <p>{subtitle||t(language,'Triển lãm chưa có mô tả.','This exhibition has no description yet.')}</p>
      <div className="bml-exh-info-privacy"><ShieldCheck size={19}/>{t(language,'Triển lãm và tác phẩm tuân theo quyền truy cập Brian; chia sẻ liên kết không tự mở quyền.','Exhibitions respect Brian access permissions; sharing never changes visibility.')}</div>
     </div>
     <div><h3>{t(language,'Danh sách phòng & tác phẩm','Rooms and exhibits')}</h3>
      {rooms.map((room,i)=><div className="bml-exh-room-listing" key={room.id||i}>
       <strong>{String(i+1).padStart(2,'0')} · {short(room.title,160)}</strong>
       <small>{room.exhibits?.length||0} {t(language,'hiện vật','exhibits')}</small>
       <ul>{(room.exhibits||[]).map((e,j)=><li key={e.id||j}>{short(e.title,160)}</li>)}</ul>
      </div>)}
     </div>
    </div>}
  </section>
  <div className="bml-exh-metrics" aria-label={t(language,'Thông tin triển lãm','Exhibition statistics')}>
   <Metric icon={Layers3} value={rooms.length} label={t(language,'Phòng triển lãm','Gallery rooms')} tone="blue"/>
   <Metric icon={Images} value={exhibitCount} label={t(language,'Hiện vật','Exhibits')} tone="green"/>
   <Metric icon={Users} value="—" label={t(language,'Học sinh tham gia','Students participating')} subtitle={t(language,'Chưa có dữ liệu xác thực','Not measured')} tone="violet"/>
   <Metric icon={Eye} value="—" label={t(language,'Lượt xem','Views')} subtitle={t(language,'Chưa triển khai thống kê','Not yet tracked')} tone="amber"/>
  </div>
  <OverviewCards data={data} onNavigate={onNavigate} language={language}/>
  <footer className="bml-exh-footer"><span><Landmark size={18}/> BRIAN Museum Lab <span aria-hidden="true">·</span> V3.2</span>
   <span>Teach Better Together ♡</span></footer>
 </div>
 {cinemaOpen&&typeof document!=='undefined'?createPortal(
  <div className="bml bml-paper bml-teacher-cinema-portal" data-testid="museum-teacher-cinema-portal">
   <div className="bml-review-cinema-overlay" role="dialog" aria-modal="true"
    aria-label={t(language,'Tham quan triển lãm toàn màn hình','Full-screen museum exhibition')}>
    <MuseumScene gallery={gallery} language={language} embedded cinema initial3D
     onClose={closeCinema}/>
   </div>
  </div>,document.body):null}
 </>;
}
