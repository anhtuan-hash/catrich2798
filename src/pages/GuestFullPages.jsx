import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Eye,
  FolderOpen, Gamepad2, GraduationCap, Grid2X2, Layers3, List, LockKeyhole,
  MonitorPlay, Search, ShieldCheck, Users, BarChart3,
} from 'lucide-react';
import { APPS } from '../data/apps.js';
import { supabase, isSupabaseConfigured } from '../utils/supabase.js';
import { readDashboardHero } from '../utils/dashboardHeroCms.js';
import { readLessonCheckHero } from '../utils/lessonCheckHeroCms.js';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import DashboardWorkPlanner from '../components/DashboardWorkPlanner.jsx';
import DashboardNewsHub from '../components/DashboardNewsHub.jsx';
import './LessonCheckStudio.css';
import './LessonCheckApprovedMockupOne.css';
import './LessonCheckHeroIndependent.css';
import './LessonCheckAlignAppGutters.css';
import './LessonCheckHeroCompact.css';
import '../styles/teacher-dashboard-google-authentic.css';
import '../styles/teacher-dashboard-calendar-split.css';
import '../styles/teacher-dashboard-editorial-hero.css';
import './GuestFullPages.css';

const PRIVATE_TOOLS = new Set(['gradebook-studio', 'brian-team', 'sync-doctor', 'student-support', 'data-governance']);
const PUBLIC_APPS = APPS.filter((item) => !PRIVATE_TOOLS.has(item.slug));
const ROUTE_SECTION = { apps:'apps', dashboard:'dashboard', tool:'assessment', attendance:'attendance' };
const STAT_KEYS = {
  dashboard: [['all','Công việc đã ghi nhận','Recorded tasks'],['tasks','Nhiệm vụ','Tasks'],['announcements','Thông báo tổ','Department notices'],['published_events','Sự kiện đã công bố','Published events']],
  assessment: [['all','Hoạt động','Activities'],['vocabulary','Từ vựng','Vocabulary'],['grammar','Ngữ pháp','Grammar'],['mixed','Tổng hợp','Mixed']],
  attendance: [['all','Buổi điểm danh','Attendance sessions'],['completed','Đã hoàn tất','Completed'],['cancelled','Đã hủy','Cancelled']],
};

/**
 * Only intercept interactions; do not cover the page with a modal/backdrop and
 * never call preventDefault on wheel, touchmove, pointermove or page-scroll keys.
 * Page navigation and the Sign in link live outside this boundary.
 */
function GuestReadOnlyBoundary({children,language='vi'}) {
  const inertAction = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const keyboard = (event) => {
    const target = event.target;
    const interactive = target instanceof Element && Boolean(target.closest('button,a,input,textarea,select,[role="button"],[contenteditable="true"]'));
    if (!interactive) return;
    const key = event.key;
    if (['Tab','ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape'].includes(key)) return;
    // A guest must not activate via keyboard, paste, type or submit, either.
    inertAction(event);
  };
  return <div className="brian-guest-full__readonly" data-guest-read-only="true" aria-label={language==='vi'?'Nội dung chỉ xem; có thể cuộn trang':'Read-only content; scrolling available'}
    onClickCapture={inertAction} onAuxClickCapture={inertAction}
    onSubmitCapture={inertAction} onChangeCapture={inertAction}
    onBeforeInputCapture={inertAction} onInputCapture={inertAction}
    onPasteCapture={inertAction} onDragStartCapture={inertAction}
    onDropCapture={inertAction} onContextMenuCapture={inertAction}
    onKeyDownCapture={keyboard}>{children}</div>;
}

function usePublicReadonlyData(section) {
  const [state,setState]=useState({status:'loading',stats:[],entries:[],games:[],hero:null});
  useEffect(()=>{
    let alive=true;
    setState({status:'loading',stats:[],entries:[],games:[],hero:null});
    async function load(){
      if(!isSupabaseConfigured||!supabase) {
        if(alive)setState(p=>({...p,status:'unavailable'}));return;
      }
      try {
        if(section==='apps'){
          const {data,error}=await supabase.from('custom_game_platforms')
            .select('id,label,icon,status').eq('status','approved').order('label').limit(100);
          if(error)throw error;
          if(alive)setState({status:'ready',stats:[],entries:[],games:data||[],hero:null});
          return;
        }
        const [stat,detail,hero] = await Promise.all([
          supabase.from('bes_guest_preview_feed')
            .select('section,entry_key,kind,label,count_value,item_date,refreshed_at').eq('section',section).limit(150),
          supabase.from('bes_guest_preview_entries')
            .select('section,entry_id,title,subtitle,tag,grade,unit_no,image_url,entry_date,status,total_count,present_count,refreshed_at')
            .eq('section',section).order('entry_date',{ascending:false,nullsFirst:false}).limit(1000),
          section==='dashboard'?readDashboardHero({includeDraft:false}):
            section==='assessment'?readLessonCheckHero({includeDraft:false}):Promise.resolve(null),
        ]);
        if(stat.error)throw stat.error;
        if(detail.error)throw detail.error;
        if(alive)setState({status:'ready',stats:stat.data||[],entries:detail.data||[],games:[],hero:hero?.published||null});
      }catch(error){
        if(alive)setState(p=>({...p,status:'unavailable'}));
      }
    }
    load();
    return ()=>{alive=false;};
  },[section]);
  return state;
}
function CountStrip({section,stats,language}){
  const en=language==='en';
  const counts=new Map(stats.filter(r=>r.kind==='metric').map(r=>[r.entry_key,Number(r.count_value)]));
  return <div className="brian-guest-full__stats">
    {(STAT_KEYS[section]||[]).map(([key,vi,english],i)=><article className={'brian-guest-full__stat tone-'+(i%4)} key={key}>
      <div>{i===0?<CalendarDays size={23}/>:i===1?<ClipboardCheck size={23}/>:i===2?<GraduationCap size={23}/>:<BarChart3 size={23}/>}</div>
      <strong>{counts.has(key)?counts.get(key).toLocaleString('vi-VN'):'—'}</strong>
      <span>{en?english:vi}</span>
    </article>)}
  </div>;
}
function PublicPreviewBanner({language,section}){
  const en=language==='en';
  return <div className="brian-guest-full__banner"><Eye size={16}/>
    <span>{en?'Public read-only view. Full page scroll is enabled; actions are disabled.':'Chế độ khách: xem toàn trang, cuộn tự do; không cho phép thao tác.'}</span>
    <LockKeyhole size={15}/>
  </div>;
}
function GuestApps({games,language}){
  const items=[
    ...PUBLIC_APPS,
    ...games.filter(g=>g.status==='approved'&&g.label).map(g=>({
      slug:'public-game-'+g.id,title:g.label,titleVi:g.label,icon:g.icon||'🎮',
      desc:'Approved classroom activity',descVi:'Hoạt động lớp học đã được duyệt',
      group:'Shared classroom apps',groupVi:'Ứng dụng đã công bố',groupId:'create',
      status:'Published',statusVi:'Đã công bố',
    })),
  ];
  return <WebAppsRedesign apps={items} language={language} currentUser={null}
    hasApiKey={false} publicReadonly appVisibility={{snapshot:{},hiddenIds:[]}}/>;
}
function PublicHero({section,hero,language}){
  const en=language==='en';
  const heading=section==='dashboard'?'Dashboard':section==='assessment'?'Fun for Assessment':en?'Attendance':'Điểm danh';
  const media=hero?.backgroundUrl;
  return <header className={'brian-guest-full__hero hero-'+section} style={media&&hero.backgroundType!=='video'?{backgroundImage:'linear-gradient(90deg,rgba(255,255,255,.89),rgba(255,255,255,.4)),url('+JSON.stringify(media)+')',backgroundSize:'cover',backgroundPosition:'center'}:undefined}>
    {media&&hero.backgroundType==='video'&&<video className="brian-guest-full__hero-video" src={media} autoPlay muted loop playsInline preload="metadata"/>}
    <div className="brian-guest-full__hero-content">
      <span className="brian-guest-full__eyebrow"><Eye size={14}/>{en?'REAL PUBLIC CONTENT · READ ONLY':'NỘI DUNG THỰC · CHỈ XEM'}</span>
      <h1>{heading}</h1>
      <p>{section==='dashboard'&&hero?.descriptionVi?(en?hero.descriptionEn:hero.descriptionVi):
      en?'Explore the complete public presentation. Sign in to use controls or access private records.':
      'Xem đầy đủ phần nội dung được phép công khai và cuộn toàn trang. Đăng nhập để thao tác hoặc truy cập hồ sơ riêng tư.'}</p>
    </div>
    {section==='assessment'&&(!media||hero.showMascot)&&<img className="brian-guest-full__assessment-mascot" src="/lesson-check-hero-mascot-minimal.svg" alt=""/>}
    <div className="brian-guest-full__hero-shield"><ShieldCheck size={30}/><span>{en?'Private records protected':'Dữ liệu riêng được bảo vệ'}</span></div>
  </header>;
}
function GuestAssessment({entries,stats,hero,language}){
  const en=language==='en';
  const byFocus=(focus)=>entries.filter(r=>r.tag===focus).length;
  return <div className="brian-guest-full__section brian-guest-full__assessment">
    <PublicHero section="assessment" hero={hero} language={language}/>
    <CountStrip section="assessment" stats={stats} language={language}/>
    <section className="brian-guest-full__actionstrip" aria-label={en?'Assessment controls':'Điều khiển kiểm tra'}>
      {[[ClipboardCheck,en?'Start assessment':'Bắt đầu đánh giá'],[BarChart3,en?'Reports':'Báo cáo'],[FolderOpen,en?'Activity collections':'Bộ sưu tập'],[Users,en?'Teaching queue':'Buổi dạy']].map(([Icon,label])=>
        <button key={label} type="button"><Icon size={18}/>{label}<LockKeyhole size={12}/></button>)}
    </section>
    <div className="brian-guest-full__library-title"><div><span>GLOBAL SUCCESS</span><h2>{en?'Assessment activity library':'Kho hoạt động kiểm tra'}</h2></div><strong>{entries.length} {en?'activities':'hoạt động'}</strong></div>
    <div className="lcs-arcade-tabs brian-guest-full__tabs">
      <button type="button" className="is-active"><Grid2X2 size={17}/>{en?'All':'Tất cả'} <b>{entries.length}</b></button>
      <button type="button" className="is-vocabulary"><BookOpen size={17}/>Vocabulary <b>{byFocus('vocabulary')}</b></button>
      <button type="button" className="is-grammar"><Layers3 size={17}/>Grammar <b>{byFocus('grammar')}</b></button>
      <button type="button"><MonitorPlay size={17}/>{en?'Skills':'Kỹ năng'} <b>{entries.length-byFocus('vocabulary')-byFocus('grammar')-byFocus('mixed')}</b></button>
    </div>
    <div className="brian-guest-full__filtermock">
      <span><Search size={17}/>{en?'Search activities':'Tìm kiếm hoạt động'}</span>
      <span>{en?'All grades':'Tất cả khối'}</span><span>{en?'All units':'Tất cả Unit'}</span>
      <span><List size={17}/> Grid / List</span>
    </div>
    <div className="brian-guest-full__activity-grid">
      {entries.map(item=><article className="brian-guest-full__activity-card" key={item.entry_id}>
        <div className="lcs-card-media has-static-thumbnail is-locked brian-guest-full__activity-media">
          {item.image_url?<img className="lcs-card-thumbnail-image" src={item.image_url} loading="lazy" decoding="async" alt=""/>:
          <div className="brian-guest-full__noimage"><Gamepad2 size={30}/></div>}
          <div className="lcs-card-media-shade" aria-hidden="true"/>
          <div className="lcs-card-media-top"><span className={'lcs-focus-indicator is-'+(item.tag||'unclassified')}>{(item.tag||'ACTIVITY').toUpperCase()}</span></div>
        </div>
        <div className="brian-guest-full__activity-copy"><small>GLOBAL SUCCESS {item.grade||''} · UNIT {item.unit_no??'—'}</small><h3>{item.title}</h3><p>{item.subtitle||'Global Success'}</p></div>
        <div className="brian-guest-full__locked"><LockKeyhole size={14}/>{en?'Sign in to open':'Đăng nhập để mở'}</div>
      </article>)}
    </div>
  </div>;
}
function GuestDashboard({entries,stats,hero,language}){
  const en=language==='en';
  const now=new Date();
  // Reuse the genuine Dashboard planner and newsroom, fed only redacted day-level counts.
  const timeline=useMemo(()=>entries.filter(item=>item.entry_date).map(item=>({
      id:item.entry_id,date:item.entry_date+'T12:00:00',
      countWeight:Math.max(1,Number(item.total_count)||1),
      title:(Number(item.total_count)||0)+' '+(en?'recorded work items':'công việc đã ghi nhận'),
      description:en?'This date contains real internal records; details require a signed-in authorized account.':'Đây là số lượng công việc thật theo ngày. Nội dung nội bộ chỉ dành cho người được cấp quyền.',
      sourceLabel:'BRIAN',done:true,
    })),[entries,en]);
  return <div className="brian-guest-full__section brian-guest-full__dashboard gd-page">
    <PublicHero section="dashboard" hero={hero} language={language}/>
    <CountStrip section="dashboard" stats={stats} language={language}/>
    <DashboardWorkPlanner timeline={timeline} now={now} language={language} loading={false}
      coverage={{start:now.toISOString(),end:now.toISOString()}} onOpenFull={()=>{}} onOpenItem={()=>{}}/>
    <DashboardNewsHub language={language}/>
  </div>;
}
function GuestAttendance({entries,stats,language}){
  const en=language==='en';
  const total=(n)=>Number(n||0).toLocaleString('vi-VN');
  const grouped=useMemo(()=>{
    const map=new Map();
    entries.forEach(row=>{const key=row.entry_date||'—';map.set(key,(map.get(key)||0)+1);});
    return [...map.entries()].sort((a,b)=>b[0].localeCompare(a[0]));
  },[entries]);
  return <div className="brian-guest-full__section brian-guest-full__attendance">
    <PublicHero section="attendance" language={language}/>
    <CountStrip section="attendance" stats={stats} language={language}/>
    <div className="brian-guest-full__attendance-tabs">
      {[[CalendarDays,en?'Calendar':'Lịch điểm danh'],[ClipboardCheck,en?'Quick attendance':'Điểm danh nhanh'],[List,en?'History':'Lịch sử'],[BarChart3,en?'Reports':'Báo cáo']].map(([Icon,label],i)=>
        <button type="button" key={label} className={i===2?'is-active':''}><Icon size={17}/>{label}</button>)}
    </div>
    <div className="brian-guest-full__attendance-stats"><div><h2>{en?'Recorded attendance history':'Lịch sử điểm danh thực tế'}</h2><p>{en?'The entire list is visible; student identities and individual statuses are not published.':'Hiển thị toàn bộ các buổi đã ghi nhận, không công khai danh sách và trạng thái cá nhân của học sinh.'}</p></div><span>{entries.length} {en?'sessions':'buổi'}</span></div>
    <div className="brian-guest-full__history-layout">
      <section className="brian-guest-full__history-list">
        <header><CalendarDays size={20}/>{en?'Attendance sessions':'Các buổi điểm danh'}</header>
        {entries.map((item,index)=><article key={item.entry_id} className="brian-guest-full__history-row">
          <span className="brian-guest-full__history-number">{index+1}</span>
          <div><strong>{item.title}</strong><small>{item.subtitle||'English'} · {item.entry_date||'—'}</small></div>
          <span className={'brian-guest-full__history-status '+(item.status==='cancelled'?'cancelled':'complete')}>
            {item.status==='cancelled'?(en?'Cancelled':'Đã hủy'):(en?'Completed':'Đã chốt')}</span>
          <strong className="brian-guest-full__history-count">{item.status==='cancelled'?'—':total(item.present_count)+'/'+total(item.total_count)}</strong>
        </article>)}
      </section>
      <aside className="brian-guest-full__history-aside">
        <h3>{en?'Sessions by day':'Tổng số buổi theo ngày'}</h3>
        <div className="brian-guest-full__history-days">{grouped.map(([day,count])=><div key={day}><time>{day}</time><strong>{count}</strong></div>)}</div>
      </aside>
    </div>
  </div>;
}
function PublicSignin({language}){
  const en=language==='en';
  return <aside className="brian-guest-full__signin"><div><LockKeyhole size={20}/><span><strong>{en?'Want to use BRIAN?':'Bạn muốn sử dụng BRIAN?'}</strong><small>{en?'Sign in to manage records, start assessments or view protected data.':'Đăng nhập để quản lý, tổ chức kiểm tra hoặc xem dữ liệu được phân quyền.'}</small></span></div><a data-guest-allow="true" href="#/login">{en?'Sign in':'Đăng nhập'}<ArrowRight size={17}/></a></aside>;
}
export default function GuestFullPages({route,language='vi'}){
  const section=ROUTE_SECTION[route]||'apps';
  const {status,stats,entries,games,hero}=usePublicReadonlyData(section);
  return <div className="brian-guest-full" data-real-public-data="true" data-guest-full-pages={section}>
    <PublicPreviewBanner section={section} language={language}/>
    {status==='unavailable'&&<div className="brian-guest-full__unavailable" role="status">{language==='vi'?'Không tải được dữ liệu công khai. Vui lòng thử lại sau.':'Published data is unavailable.'}</div>}
    <GuestReadOnlyBoundary language={language}>
      {section==='apps'?<GuestApps games={games} language={language}/>:
      section==='dashboard'?<GuestDashboard entries={entries} stats={stats} hero={hero} language={language}/>:
      section==='assessment'?<GuestAssessment entries={entries} stats={stats} hero={hero} language={language}/>:
      <GuestAttendance entries={entries} stats={stats} language={language}/>}
    </GuestReadOnlyBoundary>
    <PublicSignin language={language}/>
  </div>;
}
