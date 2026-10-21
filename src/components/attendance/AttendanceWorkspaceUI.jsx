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
  quick:{eyebrow:'ĐIỂM DANH HÔM NAY',title:'Điểm danh nhanh',description:'Chọn lớp học, ghi nhận chuyên cần và chốt buổi học.',icon:'quick'},
  calendar:{eyebrow:'LỊCH HỌC',title:'Lịch điểm danh',description:'Theo dõi lịch dạy, phòng học và tình trạng điểm danh theo ngày.',icon:'calendar'},
  manage:{eyebrow:'QUẢN LÝ ĐÀO TẠO',title:'Quản lý lớp học',description:'Quản lý lớp phụ đạo, bồi dưỡng, giáo viên và danh sách học sinh.',icon:'manage'},
  history:{eyebrow:'TRA CỨU',title:'Lịch sử điểm danh',description:'Xem buổi học đã chốt, học sinh vắng và nhật ký thay đổi.',icon:'history'},
  report:{eyebrow:'THỐNG KÊ & XUẤT FILE',title:'Báo cáo chuyên cần',description:'Phân tích chuyên cần theo giáo viên hoặc học sinh và xuất báo cáo.',icon:'report'},
  archive:{eyebrow:'BẢO VỆ DỮ LIỆU',title:'Kho lưu trữ',description:'Quản lý dữ liệu đã lưu, khôi phục và phê duyệt yêu cầu xóa.',icon:'archive'},
  supplemental:{eyebrow:'BUỔI HỌC BỔ SUNG',title:'Học bổ sung',description:'Điểm danh và theo dõi các buổi học bổ sung.',icon:'supplemental'},
  teacher:{eyebrow:'QUẢN TRỊ',title:'Giờ giáo viên',description:'Quản lý điều kiện mở điểm danh và thời gian giảng dạy.',icon:'teacher'},
};
export const attendanceViewInfo=(view)=>VIEW_INFO[view]||VIEW_INFO.quick;

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
