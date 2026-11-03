import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {AttendanceFeatureDeck} from '../../src/components/attendance/AttendanceWorkspaceUI.jsx';
import '../../src/pages/AttendanceWorkspace.css';
import '../../src/pages/AttendanceWorkspaceHero.css';
import Panel from '../../src/components/admin/AttendanceScrapbookAdminPanel.jsx';
import {useAttendanceScrapbookScope} from '../../src/utils/attendanceScrapbookTheme.js';
import '../../src/features/attendance-scrapbook/attendance-scrapbook.css';
const sections={quick:'attendance-rollcall',calendar:'attendance-daily-overview',manage:'attendance-manage-detail-roster-card',history:'ahv3__detail',report:'att-report-m3'};
function Fixture(){
 const [view,go]=useState('quick'),[route,setRoute]=useState('attendance');
 useAttendanceScrapbookScope(route);
 return <div className="app-shell metro-clean-system" data-route={route}>
 <Panel currentUser={{provider:'supabase',role:'admin',approved:true}}/>
 <button onClick={()=>setRoute(route==='attendance'?'home':'attendance')}>Change route</button>
 <div className="attendance-workspace-page"><section className="attendance-shell is-standalone">
 <header className="attendance-topbar"><div className="attendance-title"><strong>Điểm danh lớp phụ đạo &amp; bồi dưỡng</strong></div></header>
 <AttendanceFeatureDeck items={Object.keys(sections).map(tab=>({tab}))} showSupplemental activeView={view} onNavigate={go}/>
 <article data-view={view} className={sections[view]}><label>Ghi chú<input defaultValue=""/></label></article>
 </section></div>{view==='supplemental'&&<div id="bes-supplemental-learning-admin"><div className="bes-supplemental-editor-card">Tạo lớp học bổ sung</div></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<Fixture/>);
