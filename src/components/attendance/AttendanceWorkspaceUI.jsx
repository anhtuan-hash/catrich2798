import React from 'react';

/**
 * Reusable attendance design-system components.
 * This module only renders UI. It does not import Supabase, modify permissions,
 * or own the state that controls attendance sessions.
 */
const PATHS={
  quick:<><path d="M9 3h6m-5-2h4M6 6h12a2 2 0 0 1 2 2v12H4V8a2 2 0 0 1 2-2z"/><path d="m8 13 3 3 5-5"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18m-11 4h4"/></>,
  manage:<><path d="M4 20V7l8-4 8 4v13M4 10h16M8 14h3v6m4-6h2m-2 3h2"/></>,
  history:<><path d="M3 12a9 9 0 1 0 3-6.7M3 3v5h5"/><path d="M12 7v5l4 2"/></>,
  report:<><path d="M5 3h14v18H5zM9 16v-4m3 4V8m3 8v-6"/></>,
  archive:<><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 14h4"/></>,
  supplemental:<><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="9"/></>,
  teacher:<><circle cx="10" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 14 0v2m1-8h4m-2-2v4"/></>,
  users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6m1 5a5 5 0 0 1 3 5"/></>,
  check:<><path d="m4 12 5 5L20 6"/></>,
  alert:<><path d="M12 3 2 21h20L12 3zm0 7v4m0 4h.01"/></>,
  clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  filter:<><path d="M4 6h16M7 12h10m-7 6h4"/></>,
  refresh:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/></>,
  shield:<><path d="m12 2 8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="m8 12 3 3 5-6"/></>,
};
export function AttendanceUiIcon({name='report',size=20}) {
  return <svg className="awu-icon" aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{PATHS[name]||PATHS.report}</svg>;
}

const VIEW_INFO={
  quick:{eyebrow:'CHUYÊN CẦN HÔM NAY',title:'Điểm danh lớp học',description:'Chọn lớp, ghi nhận chuyên cần và xác nhận buổi học.',icon:'quick'},
  calendar:{eyebrow:'LỊCH HỌC',title:'Lịch điểm danh',description:'Theo dõi lịch dạy, phòng học và tình trạng điểm danh theo ngày.',icon:'calendar'},
  manage:{eyebrow:'QUẢN LÝ ĐÀO TẠO',title:'Quản lý lớp học',description:'Quản lý lớp phụ đạo, bồi dưỡng, giáo viên và danh sách học sinh.',icon:'manage'},
  history:{eyebrow:'TRA CỨU',title:'Lịch sử điểm danh',description:'Xem buổi học đã chốt, học sinh vắng và nhật ký thay đổi.',icon:'history'},
  report:{eyebrow:'THỐNG KÊ & XUẤT FILE',title:'Báo cáo chuyên cần',description:'Phân tích chuyên cần theo giáo viên hoặc học sinh và xuất báo cáo.',icon:'report'},
  archive:{eyebrow:'BẢO VỆ DỮ LIỆU',title:'Kho lưu trữ',description:'Quản lý dữ liệu đã lưu, khôi phục và phê duyệt yêu cầu xóa.',icon:'archive'},
  supplemental:{eyebrow:'BUỔI HỌC BỔ SUNG',title:'Học bổ sung',description:'Điểm danh và theo dõi các buổi học bổ sung.',icon:'supplemental'},
  teacher:{eyebrow:'QUẢN TRỊ',title:'Giờ giáo viên',description:'Quản lý điều kiện mở điểm danh và thời gian giảng dạy.',icon:'teacher'},
};
export const attendanceViewInfo=(view)=>VIEW_INFO[view]||VIEW_INFO.quick;


const ATTENDANCE_FEATURE_TILES = [
  { view:'quick', title:'Điểm danh', description:'Ghi nhận sĩ số và tình trạng học sinh.', icon:'quick' },
  { view:'calendar', title:'Lịch điểm danh', description:'Xem lịch học và các buổi đã ghi nhận.', icon:'calendar' },
  { view:'manage', title:'Quản lý lớp', description:'Quản lý lớp, giáo viên và danh sách học sinh.', icon:'manage' },
  { view:'history', title:'Lịch sử', description:'Tra cứu chuyên cần và các thay đổi theo buổi.', icon:'history' },
  { view:'supplemental', title:'Học bổ sung', description:'Theo dõi và quản lý buổi học bổ sung.', icon:'supplemental' },
  { view:'report', title:'Báo cáo', description:'Phân tích chuyên cần và xuất dữ liệu.', icon:'report' },
];

/* Small product illustrations: purely decorative, no external image requests or student data. */
export function AttendanceFeatureArtwork({view='quick'}) {
  return <svg className="awu-feature-artwork" viewBox="0 0 210 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <ellipse cx="117" cy="145" rx="83" ry="10" className="awu-art-shadow"/>
    {view==='quick' ? <g transform="rotate(-8 111 80)">
      <rect x="53" y="15" width="113" height="131" rx="15" className="awu-art-edge"/>
      <rect x="57" y="13" width="105" height="127" rx="13" className="awu-art-paper"/>
      <rect x="92" y="8" width="36" height="14" rx="6" className="awu-art-primary"/>
      {[43,71,99].map((y,i)=><g key={y}><circle cx="80" cy={y} r="9" className="awu-art-circle"/><path d={'M75 '+y+' l4 4 7 -8'} className="awu-art-tick"/><rect x="98" y={y-4} width={i===1?45:38} height="5" rx="2.5" className="awu-art-line"/><rect x="98" y={y+6} width="25" height="4" rx="2" className="awu-art-light"/></g>)}
    </g> : null}
    {view==='calendar' ? <g transform="rotate(-7 107 78)">
      <rect x="38" y="20" width="139" height="121" rx="14" className="awu-art-paper"/>
      <path d="M39 35a15 15 0 0 1 15-15h108a15 15 0 0 1 15 15v23H39V35Z" className="awu-art-primary"/>
      <path d="M72 14v19M143 14v19" className="awu-art-wire"/>
      {[0,1,2,3].map((r)=>[0,1,2,3,4].map(c=><rect key={r+'-'+c} x={52+c*22} y={70+r*16} width="14" height="10" rx="3" className={r===2&&c===2?'awu-art-highlight':'awu-art-light'}/>))}
      <circle cx="156" cy="117" r="20" className="awu-art-circle"/><path d="m147 117 6 6 12-15" className="awu-art-tick"/>
    </g> : null}
    {view==='manage' ? <g transform="rotate(-7 113 87)">
      {[0,1,2].map((n)=><g key={n}><rect x={42+n*8} y={32+n*32} width="133" height="37" rx="10" className="awu-art-paper"/><circle cx={61+n*8} cy={50+n*32} r="11" className="awu-art-circle"/><rect x={78+n*8} y={44+n*32} width="56" height="5" rx="2.5" className="awu-art-line"/><rect x={78+n*8} y={54+n*32} width="34" height="4" rx="2" className="awu-art-light"/><circle cx={157+n*8} cy={50+n*32} r="5" className="awu-art-primary"/></g>)}
    </g> : null}
    {view==='history' ? <g transform="rotate(6 109 81)">
      <rect x="54" y="16" width="112" height="131" rx="13" className="awu-art-paper"/>
      <rect x="70" y="31" width="64" height="7" rx="3" className="awu-art-line"/>
      <path d="M84 57v68" className="awu-art-track"/>
      {[63,88,113].map((y,i)=><g key={y}><circle cx="84" cy={y} r="8" className={i===2?'awu-art-highlight':'awu-art-circle'}/><rect x="102" y={y-5} width="47" height="5" rx="2.5" className="awu-art-line"/><rect x="102" y={y+5} width="28" height="4" rx="2" className="awu-art-light"/></g>)}
    </g> : null}
    {view==='supplemental' ? <g transform="rotate(-7 108 83)">
      <rect x="37" y="94" width="137" height="25" rx="7" className="awu-art-primary"/>
      <rect x="51" y="69" width="128" height="23" rx="6" className="awu-art-paper"/>
      <rect x="45" y="45" width="136" height="22" rx="6" className="awu-art-highlight"/>
      <rect x="58" y="22" width="117" height="21" rx="6" className="awu-art-paper"/>
      <path d="M65 32h55M61 57h65M68 80h64M56 105h62" className="awu-art-book-line"/>
      <circle cx="155" cy="103" r="18" className="awu-art-circle"/><path d="M155 94v18m-9-9h18" className="awu-art-tick"/>
    </g> : null}
    {view==='report' ? <g transform="rotate(-7 112 82)">
      <rect x="46" y="18" width="127" height="128" rx="13" className="awu-art-paper"/>
      <rect x="62" y="35" width="68" height="6" rx="3" className="awu-art-line"/>
      <path d="M64 119h94" className="awu-art-axis"/>
      <rect x="72" y="88" width="14" height="31" rx="4" className="awu-art-primary"/>
      <rect x="94" y="69" width="14" height="50" rx="4" className="awu-art-highlight"/>
      <rect x="116" y="79" width="14" height="40" rx="4" className="awu-art-primary"/>
      <rect x="138" y="55" width="14" height="64" rx="4" className="awu-art-highlight"/>
      <path d="m71 72 29-16 26 6 22-20" className="awu-art-graph"/>
    </g> : null}
  </svg>;
}

export function AttendanceAppHero() {
  return <section className="awu-app-hero" aria-label="Tổng quan ứng dụng điểm danh">
    <div className="awu-app-hero__copy">
      <span className="awu-app-hero__eyebrow">ESL BRIAN · ỨNG DỤNG ĐIỂM DANH</span>
      <h2>Điểm danh lớp phụ đạo <span>&amp; bồi dưỡng</span></h2>
      <p>Quản lý buổi học, theo dõi chuyên cần và tổng hợp báo cáo trong một không gian.</p>
      <div className="awu-app-hero__benefits"><span><AttendanceUiIcon name="check" size={15}/> Ghi nhận nhanh</span><span><AttendanceUiIcon name="calendar" size={15}/> Theo dõi từng buổi</span><span><AttendanceUiIcon name="report" size={15}/> Báo cáo trực quan</span></div>
    </div>
    <div className="awu-app-hero__scene" aria-hidden="true">
      <div className="awu-app-hero__sheet awu-app-hero__sheet--back"><span/><span/><span/></div>
      <div className="awu-app-hero__screen">
        <div className="awu-app-hero__screen-top"><i/><span/><span/></div>
        <div className="awu-app-hero__screen-body">
          <div className="awu-app-hero__screen-col"><b/><span/><span/><span/><span/></div>
          <div className="awu-app-hero__chart"><span/><span/><span/><span/><span/><span/></div>
        </div>
        <div className="awu-app-hero__screen-bottom"><i/><i/><i/></div>
      </div>
      <div className="awu-app-hero__approval"><AttendanceUiIcon name="check" size={22}/></div>
    </div>
  </section>;
}

export function AttendanceFeatureDeck({items=[],showSupplemental=false,activeView='quick',onNavigate}) {
  const allowed=new Set(items.map(item=>item.tab));
  if (showSupplemental) allowed.add('supplemental');
  const features=ATTENDANCE_FEATURE_TILES.filter(feature=>allowed.has(feature.view));
  if(!features.length) return null;
  return <nav className="awu-feature-deck" aria-label="Truy cập nhanh các phân hệ điểm danh">
    {features.map(feature=><button key={feature.view} type="button"
      className={'awu-feature-tile is-'+feature.view+(activeView===feature.view?' is-current':'')}
      onClick={()=>onNavigate?.(feature.view)} aria-current={activeView===feature.view?'page':undefined}>
      <span className="awu-feature-tile__icon"><AttendanceUiIcon name={feature.icon} size={19}/></span>
      <span className="awu-feature-tile__title">{feature.title}</span>
      <span className="awu-feature-tile__description">{feature.description}</span>
      <span className="awu-feature-tile__art"><AttendanceFeatureArtwork view={feature.view}/></span>
      <span className="awu-feature-tile__arrow" aria-hidden="true">↗</span>
    </button>)}
  </nav>;
}

/** The same page heading, data-strip and actions across all attendance tabs. */
export function AttendanceViewHeader({view,items=[],action=null,subheading=null}) {
  const meta=attendanceViewInfo(view);
  return <header className="awu-page-head" data-awu-page={view}>
    <div className="awu-page-head__identity">
      <span className="awu-page-head__icon"><AttendanceUiIcon name={meta.icon} size={24}/></span>
      <div className="awu-page-head__copy">
        <div className="awu-page-head__breadcrumb"><span>ESL Brian</span><span aria-hidden="true">/</span><strong>Điểm danh</strong><span aria-hidden="true">/</span><span>{meta.title}</span></div>
        <div className="awu-page-head__eyebrow">{meta.eyebrow}</div>
        <h1>{subheading||meta.title}</h1>
        <p>{meta.description}</p>
      </div>
    </div>
    {items.length===0 ? <div className="awu-page-head__visual" aria-hidden="true"><AttendanceFeatureArtwork view={view}/></div> : null}
    {(items.length>0||action) ? <div className="awu-page-head__right">
      {items.length>0 && <div className="awu-page-head__indicators" aria-label="Thống kê nhanh">
        {items.map(({label,value,tone='blue',icon})=><div key={label} className={"awu-page-head__indicator is-"+tone}>
          {icon?<AttendanceUiIcon name={icon} size={15}/>:null}
          <span>{label}</span><b>{value??'—'}</b>
        </div>)}
      </div>}
      {action}
    </div> : null}
  </header>;
}

/** Shared semantic card header for report/class/archive panels. */
export function AttendancePanelHeading({icon='filter',eyebrow,title,description,aside,children,className='',iconClassName=''}) {
  return <header className={'awu-panel-head ' + className}>
    <div className="awu-panel-head__copy">
      <span className={"awu-panel-head__icon " + iconClassName}><AttendanceUiIcon name={icon} size={19}/></span>
      <div>{eyebrow&&<span className="awu-panel-head__eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>{description&&<p>{description}</p>}</div>
    </div>
    {aside&&<div className="awu-panel-head__aside">{aside}</div>}
    {children}
  </header>;
}

export function AttendanceStatCard({label,value,tone='blue',icon='report',hint}) {
  return <article className={"awu-stat-card is-"+tone}>
    <span className="awu-stat-card__icon"><AttendanceUiIcon name={icon} size={23}/></span>
    <span className="awu-stat-card__body"><small>{label}</small><strong>{value??'—'}</strong>{hint&&<em>{hint}</em>}</span>
  </article>;
}
export function AttendanceEmpty({title='Chưa có dữ liệu',description,icon='search'}) {
  return <div className="awu-empty"><span><AttendanceUiIcon name={icon} size={28}/></span><strong>{title}</strong>{description&&<p>{description}</p>}</div>;
}
