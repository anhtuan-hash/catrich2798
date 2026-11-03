import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/styles/GlobalFontSystem.css';
import DashboardTab from '../../src/components/GlobalDashboardNavigationTab.jsx';
import HomeroomTab from '../../src/components/GlobalHomeroomNavigationTab.jsx';
import GradebookTab from '../../src/components/GlobalGradebookNavigationTab.jsx';
import LessonCheckTab from '../../src/components/GlobalLessonCheckNavigationTab.jsx';
import AttendanceTab from '../../src/components/GlobalAttendanceNavigationTab.jsx';
import Navigation from '../../src/components/GlobalCompactNavigation.jsx';
import Channel from '../../src/components/GlobalTtcmNavigationTab.jsx';
import MobileReader from '../../src/components/GlobalTtcmMobileAdapter.jsx';
import Setting from '../../src/features/ttcm-scrapbook/TtcmScrapbookSetting.jsx';
import '../../src/components/GlobalNavigationPastelPalette.css';
import '../../src/components/GlobalNavigationTextOnlyCompact.css';
import '../../src/styles/SettingsLauncherPortalCompat.css';

const query = new URLSearchParams(location.search);
const role = query.get('role') || 'admin';
const user = { id: role, name: role === 'teacher' ? 'Giáo viên mẫu' : 'Quản trị mẫu', role, approved: true, provider: 'supabase' };
createRoot(document.getElementById('root')).render(query.has('settings')
  ? <div className="settings-launcher-portal"><div className="settings-launcher-drawer"><Setting language="vi" /></div></div>
  : <div className="app-shell metro-shell metro-clean-system" data-route="home">
    <div className="bes-top-chrome"><Navigation route="home" language="vi" currentUser={user} /></div>
    <DashboardTab currentUser={user} /><HomeroomTab currentUser={user} />
    <GradebookTab currentUser={user} /><LessonCheckTab currentUser={user} /><AttendanceTab currentUser={user} />
    <Channel currentUser={user} /><MobileReader />
  </div>);
