import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/styles/GlobalFontSystem.css';
import Navigation from '../../src/components/GlobalCompactNavigation.jsx';
import DashboardTab from '../../src/components/GlobalDashboardNavigationTab.jsx';
import HomeroomTab from '../../src/components/GlobalHomeroomNavigationTab.jsx';
import GradebookTab from '../../src/components/GlobalGradebookNavigationTab.jsx';
import AssessmentTab from '../../src/components/GlobalLessonCheckNavigationTab.jsx';
import AttendanceTab from '../../src/components/GlobalAttendanceNavigationTab.jsx';
import Footer from '../../src/components/Footer.jsx';
import Studio from '../../src/pages/LessonCheckStudio.jsx';
import Setting from '../../src/features/assessment-scrapbook/AssessmentScrapbookSetting.jsx';
import { useAssessmentScrapbookActive } from '../../src/features/assessment-scrapbook/theme.js';
import '../../src/styles/GlobalLayout16x9Authority.css';
import '../../src/components/GlobalNavigationPastelPalette.css';
import '../../src/components/GlobalNavigationTextOnlyCompact.css';
import '../../src/styles/SettingsLauncherPortalCompat.css';
import '../../src/features/assessment-scrapbook/assessment-scrapbook.css';

const params = new URLSearchParams(location.search);
const role = params.get('role') || 'admin';
const language = params.get('lang') || 'en';
const tool = { slug: 'lesson-check-studio', title: 'Assessment', titleVi: 'Kiểm tra' };
const user = { id:'11111111-1111-4000-8000-111111111111', authId:'11111111-1111-4000-8000-111111111111',
  name: 'Minh An', role, provider: 'supabase', approved: true,
  permissions: {mode:'all', allowed:[]} };

function Fixture() {
  const [slug, setSlug] = useState(tool.slug);
  const route = slug ? 'tool' : 'home';
  const active = useAssessmentScrapbookActive(route, slug);
  const props = { route, language, currentUser:user, assessmentScrapbookActive:active, selectedTool:slug ? {...tool,slug} : null };
  React.useEffect(() => { window.assessmentFixture = {setSlug}; }, []);
  return <div className="app-shell metro-shell metro-clean-system" data-route={route} data-tool={slug || 'home'} data-assessment-scrapbook={active ? 'on' : undefined}>
    <div className="bes-top-chrome"><Navigation {...props}/></div>
    <DashboardTab {...props}/><HomeroomTab {...props}/><GradebookTab {...props}/><AssessmentTab {...props}/><AttendanceTab {...props}/>
    <main id="bes-main-content" className="wp8-page-stage wp8-door-page" data-route={route}>
      <div className="bqa-content-safe-frame" data-quick-access-safe-frame="false">
        {slug === tool.slug && <Studio language={language} currentUser={user}/>}
      </div>
    </main>
    <Footer language={language} route={route} currentUser={user} assessmentScrapbookActive={active}/>
  </div>;
}

createRoot(document.getElementById('root')).render(params.has('settings')
  ? <div className="settings-launcher-portal"><div className="settings-launcher-drawer"><div className="settings-launcher-drawer-body"><Setting currentUser={user} language={language}/></div></div></div>
  : <Fixture/>);
