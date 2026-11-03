import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import '../../src/styles/GlobalFontSystem.css';
import AttendanceWorkspace from '../../src/pages/AttendanceWorkspace.jsx';
import GuestAttendanceStudio from '../../src/components/GuestAttendanceStudio.jsx';
import Footer from '../../src/components/Footer.jsx';
import Navigation from '../../src/components/GlobalCompactNavigation.jsx';
import Panel from '../../src/components/admin/AttendanceScrapbookAdminPanel.jsx';
import {getRuntimeState} from '../../src/services/runtime/core.js';
import {useAttendanceScrapbookScope} from '../../src/utils/attendanceScrapbookTheme.js';
import '../../src/supplementalLearningRouteBootstrap.js';
import '../../src/styles/GlobalLayout16x9Authority.css';
import '../../src/components/GlobalNavigationPastelPalette.css';
import '../../src/components/GlobalNavigationTextOnlyCompact.css';
import '../../src/features/attendance-scrapbook/attendance-scrapbook.css';
import '../../src/styles/SettingsLauncherPortalCompat.css';

function Fixture(){
  const [route,setRoute]=useState('attendance');
  const [settings,showSettings]=useState(false);
  const {profile}=getRuntimeState();
  const guest=profile.role==='guest';
  useAttendanceScrapbookScope(route);
  useEffect(()=>{ window.attendanceFixture={setRoute,showSettings}; },[]);
  return <>
    <div className="app-shell metro-shell metro-clean-system" data-route={route}>
      <div className="bes-top-chrome"><Navigation route={route} language="vi" currentUser={guest?null:profile}/></div>
      <main id="bes-main-content">
        {route==='attendance' && (guest?<GuestAttendanceStudio language="vi"/>:<AttendanceWorkspace currentUser={profile}/>)}
      </main>
      <Footer language="vi" route={route}/>
    </div>
    {settings && <div className="settings-launcher-portal"><div className="settings-launcher-drawer"><div className="settings-launcher-drawer-body"><Panel currentUser={profile}/></div></div></div>}
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
