import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Eye, GraduationCap, LayoutGrid, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { APPS } from '../data/apps.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { readDashboardHero } from '../utils/dashboardHeroCms.js';
import { readLessonCheckHero } from '../utils/lessonCheckHeroCms.js';
import './GuestPreview.css';

// The real app registry and already-approved public games are safe to display.
// Staff administration and student-specific tools never appear in the guest catalog.
const PRIVATE_APP_SLUGS = new Set(['gradebook-studio', 'brian-team', 'sync-doctor', 'student-support', 'data-governance']);
const PUBLIC_APP_CATALOG = APPS.filter((app) => !PRIVATE_APP_SLUGS.has(app.slug));
const SECTION = { apps: 'apps', dashboard: 'dashboard', attendance: 'attendance', tool: 'assessment' };
const METRIC_LAYOUT = {
  dashboard: [
    {key:'all',vi:'Công việc trong hệ thống',en:'Recorded work items',tone:'blue',icon:BarChart3},
    {key:'tasks',vi:'Nhiệm vụ đã ghi nhận',en:'Recorded tasks',tone:'mint',icon:ClipboardCheck},
    {key:'announcements',vi:'Thông báo chuyên môn',en:'Department announcements',tone:'violet',icon:Users},
    {key:'published_events',vi:'Sự kiện đã công bố',en:'Published events',tone:'orange',icon:CalendarDays},
  ],
  assessment: [
    {key:'all',vi:'Hoạt động kiểm tra',en:'Assessment activities',tone:'blue',icon:ClipboardCheck},
    {key:'vocabulary',vi:'Từ vựng',en:'Vocabulary',tone:'mint',icon:GraduationCap},
    {key:'grammar',vi:'Ngữ pháp',en:'Grammar',tone:'violet',icon:LayoutGrid},
    {key:'mixed',vi:'Tổng hợp',en:'Mixed focus',tone:'orange',icon:Users},
  ],
  attendance: [
    {key:'all',vi:'Buổi điểm danh đã ghi nhận',en:'Recorded attendance sessions',tone:'blue',icon:CalendarDays},
    {key:'completed',vi:'Buổi đã hoàn tất',en:'Completed sessions',tone:'mint',icon:CheckCircle2},
    {key:'cancelled',vi:'Buổi đã hủy',en:'Cancelled sessions',tone:'orange',icon:Users},
  ],
};

function GuestPill({ children }) { return <span className="brian-guest-preview__pill"><Eye size={14} aria-hidden="true"/>{children}</span>; }
function GuestSection({ title, subtitle, children }) { return <section className="brian-guest-preview__section"><div className="brian-guest-preview__section-head"><h2>{title}</h2><p>{subtitle}</p></div>{children}</section>; }
function useApprovedPublicContent(route) {
  const section = SECTION[route] || 'apps';
  const [state, setState] = useState({ rows: [], games: [], hero: null, status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ rows: [], games: [], hero: null, status: 'loading' });
    const update = (patch) => { if (alive) setState((old) => ({ ...old, ...patch })); };
    async function load() {
      if (!isSupabaseConfigured || !supabase) { update({status:'unavailable'}); return; }
      try {
        if (section === 'apps') {
          // RLS allows only approved games for anon. No external URL is requested.
          const {data,error} = await supabase.from('custom_game_platforms').select('id,label,icon,status').eq('status','approved').order('label').limit(100);
          if (error) throw error;
          update({games: data || [], status: 'ready'});
          return;
        }
        const [feed, hero] = await Promise.all([
          supabase.from('bes_guest_preview_feed').select('section,entry_key,kind,label,count_value,item_date,refreshed_at').eq('section',section).limit(100),
          section === 'dashboard' ? readDashboardHero({includeDraft:false}) : section === 'assessment' ? readLessonCheckHero({includeDraft:false}) : Promise.resolve(null),
        ]);
        if (feed.error) throw feed.error;
        update({ rows: feed.data || [], hero: hero?.published || null, status: 'ready' });
      } catch {
        update({status:'unavailable'});
      }
    }
    load();
    return () => { alive = false; };
  },[section]);
  return state;
}
function AppsLive({ en, games }) {
  const entries = [
    ...PUBLIC_APP_CATALOG.map(app=>({id:'app:'+app.slug, icon:app.icon||'BE', group:en?app.group:app.groupVi||app.group, title:en?app.title:app.titleVi||app.title, description:en?app.desc:app.descVi||app.desc})),
    ...games.filter(g=>g.status==='approved'&&g.label).map(g=>({id:'game:'+g.id,icon:g.icon||'🎮',group:en?'Approved classroom games':'Trò chơi đã được duyệt',title:g.label,description:en?'Published classroom activity':'Ứng dụng lớp học được duyệt và công bố'})),
  ];
  return <GuestSection title={en?'Actual application catalog':'Danh mục ứng dụng thực tế'} subtitle={en?'Current app definitions and approved public games. App launch is disabled for guests.':'Dữ liệu từ danh mục BRIAN và trò chơi đã công bố. Khách chỉ xem, không thể mở công cụ.'}>
    <div className="brian-guest-preview__app-grid">{entries.map((item,i)=><article key={item.id} className="brian-guest-preview__app-card">
      <div className={'brian-guest-preview__app-symbol brian-guest-preview__app-symbol--'+(i%4)}>{item.icon}</div>
      <div><span className="brian-guest-preview__app-group">{item.group}</span><h3>{item.title}</h3><p>{item.description}</p></div>
      <span className="brian-guest-preview__disabled"><LockKeyhole size={13}/>{en?'Sign in to launch':'Đăng nhập để sử dụng'}</span>
    </article>)}</div>
  </GuestSection>;
}
function LiveSummary({ section,en,rows,status }) {
  const lookup = useMemo(()=>new Map(rows.filter(r=>r.kind==='metric').map(r=>[r.entry_key,Number(r.count_value)])),[rows]);
  const cards = METRIC_LAYOUT[section]||[];
  const synced = rows.find(r=>r.refreshed_at)?.refreshed_at;
  return <>
    {status!=='ready' ? <div className="brian-guest-preview__surface" role="status">{en?'Public data is temporarily unavailable. No sample values are substituted.':'Chưa tải được dữ liệu công khai. Hệ thống không thay bằng số liệu giả.'}</div> : null}
    {status==='ready'&&<div className="brian-guest-preview__summary-grid">
      {cards.map(({key,vi,en:english,tone,icon:Icon})=><article key={key} className={'brian-guest-preview__metric is-'+tone}><Icon size={22}/><strong>{lookup.has(key)?lookup.get(key).toLocaleString('vi-VN'):'—'}</strong><span>{en?english:vi}</span></article>)}
    </div>}
    {synced&&<p className="brian-guest-preview__source">{en?'Real aggregated records · last refreshed':'Số liệu tổng hợp thực tế · cập nhật lúc'}: {new Date(synced).toLocaleString(en?'en-US':'vi-VN')}</p>}
  </>;
}
function AttendanceTrend({ en, rows }) {
  const daily=rows.filter(r=>r.kind==='trend'&&r.item_date).sort((a,b)=>a.item_date.localeCompare(b.item_date)).slice(-24);
  if(!daily.length)return null;
  const max=Math.max(...daily.map(r=>Number(r.count_value)||0),1);
  return <GuestSection title={en?'Actual recorded sessions by day':'Số buổi điểm danh thực tế theo ngày'} subtitle={en?'Aggregated counts only: no names, rosters, marks or individual attendance statuses.':'Chỉ thống kê số buổi; không công bố tên học sinh, danh sách lớp, điểm hoặc trạng thái của cá nhân.'}>
    <div className="brian-guest-preview__surface"><div className="brian-guest-preview__live-chart" aria-label={en?'Recent attendance session trend':'Biểu đồ phiên điểm danh gần đây'}>
      {daily.map(item=><div key={item.entry_key} className="brian-guest-preview__live-bar" title={item.item_date+': '+item.count_value}><strong>{item.count_value}</strong><span style={{height:Math.max(8,Number(item.count_value)/max*150)+'px'}}/><small>{item.item_date.slice(5)}</small></div>)}
    </div></div>
  </GuestSection>;
}
function AssessmentLive({en,rows}) {
  const labels={vocabulary:['Từ vựng','Vocabulary'],grammar:['Ngữ pháp','Grammar'],mixed:['Tổng hợp','Mixed']};
  const focusRows=rows.filter(r=>['vocabulary','grammar','mixed'].includes(r.entry_key));
  return <GuestSection title={en?'Actual assessment activity distribution':'Phân loại hoạt động kiểm tra thực tế'} subtitle={en?'Counts reflect existing teacher-authored assessment records, without exposing questions, answers or student results.':'Thống kê từ kho hoạt động thật; không công bố đề kiểm tra, đáp án hay kết quả học sinh.'}>
    <div className="brian-guest-preview__app-grid">{focusRows.map((r,i)=><article key={r.entry_key} className="brian-guest-preview__app-card">
      <div className={'brian-guest-preview__app-symbol brian-guest-preview__app-symbol--'+i}><ClipboardCheck size={24}/></div>
      <div><span className="brian-guest-preview__app-group">{en?'Real activity bank':'Kho hoạt động thật'}</span><h3>{labels[r.entry_key][en?1:0]}</h3><p>{Number(r.count_value).toLocaleString('vi-VN')} {en?'recorded activities':'hoạt động đã ghi nhận'}</p></div><span className="brian-guest-preview__disabled"><LockKeyhole size={13}/>{en?'Read only':'Chỉ xem'}</span>
    </article>)}</div>
  </GuestSection>;
}
function DashboardLive({en,rows}) {
  const summary=rows.find(r=>r.entry_key==='all')?.count_value;
  return <GuestSection title={en?'Actual platform workload':'Tổng quan dữ liệu hoạt động thực tế'} subtitle={en?'The public view shows counts from real system records, but not private task descriptions or personal schedules.':'Số liệu lấy từ bản ghi thật của hệ thống; nội dung công việc nội bộ và lịch cá nhân vẫn được bảo vệ.'}>
    <div className="brian-guest-preview__steps">
      <span>{en?'Recorded work items':'Công việc đã ghi nhận'}: <strong>{summary==null?'—':Number(summary).toLocaleString('vi-VN')}</strong></span>
      <span>{en?'Private schedules':'Lịch làm việc riêng'} · <LockKeyhole size={14} aria-hidden="true"/></span>
      <span>{en?'Role-based details':'Chi tiết theo quyền'} · <LockKeyhole size={14} aria-hidden="true"/></span>
    </div>
  </GuestSection>;
}
export default function GuestPreview({route,language='vi'}) {
  const en=language==='en';
  const section=SECTION[route]||'apps';
  const {rows,games,hero,status}=useApprovedPublicContent(route);
  const title=section==='apps'?(en?'Applications':'Ứng dụng'):section==='dashboard'?'Dashboard':section==='assessment'?(en?'Assessment':'Kiểm tra'):(en?'Attendance':'Điểm danh');
  const Icon=section==='apps'?LayoutGrid:section==='dashboard'?BarChart3:section==='assessment'?ClipboardCheck:CalendarDays;
  const media=hero?.backgroundUrl;
  return <div className="brian-guest-preview" data-public-preview={route} data-real-public-data="true">
    <header className="brian-guest-preview__hero brian-guest-preview__live-hero" style={media&&hero.backgroundType!=='video'?{backgroundImage:'linear-gradient(90deg,rgba(247,251,255,.95),rgba(245,251,255,.75)),url('+JSON.stringify(media)+')',backgroundPosition:'center',backgroundSize:'cover'}:undefined}>
      {media&&hero.backgroundType==='video'&&<video className="brian-guest-preview__hero-video" src={media} autoPlay muted loop playsInline preload="metadata"/>}
      <div><GuestPill>{en?'Actual published information · read only':'Dữ liệu thực được phép công khai · chỉ đọc'}</GuestPill><h1><Icon size={32}/>{title}</h1><p>{(section==='dashboard'&&hero?.descriptionVi)?en?hero.descriptionEn:hero.descriptionVi:en?'View real public BRIAN information. Private details and all management actions require sign-in.':'Theo dõi thông tin thực đã được phép công khai của BRIAN. Dữ liệu riêng tư và mọi thao tác quản lý đều yêu cầu đăng nhập.'}</p></div>
      <div className="brian-guest-preview__hero-mark"><ShieldCheck size={40}/><span>{en?'Private records protected':'Dữ liệu riêng tư được bảo vệ'}</span></div>
    </header>
    {section==='apps'?<AppsLive en={en} games={games}/>:<>
      <LiveSummary section={section} en={en} rows={rows} status={status}/>
      {section==='attendance'?<AttendanceTrend en={en} rows={rows}/>:section==='assessment'?<AssessmentLive en={en} rows={rows}/>:<DashboardLive en={en} rows={rows}/>}
    </>}
    <aside className="brian-guest-preview__cta"><div><LockKeyhole size={22}/><div><strong>{en?'Want to use BRIAN?':'Bạn muốn sử dụng BRIAN?'}</strong><p>{en?'Sign in to access your assigned features and private records.':'Đăng nhập để thao tác và xem hồ sơ được cấp quyền.'}</p></div></div><a href="#/login" data-guest-allow="true">{en?'Sign in':'Đăng nhập'}<ArrowRight size={17}/></a></aside>
  </div>;
}
