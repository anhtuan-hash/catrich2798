import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import '../../src/index.css';
import '../../src/styles/GlobalFontSystem.css';
import '../../src/styles/GlobalLayout16x9Authority.css';
import { APPS } from '../../src/data/apps.js';
import WebAppsRedesign from '../../src/pages/WebAppsRedesign.jsx';
import { WebsiteAppCard } from '../../src/components/ExternalAppsIntegration.jsx';
import Footer from '../../src/components/Footer.jsx';
import { useAppsScrapbookScope } from '../../src/utils/appsScrapbookTheme.js';
import AppsScrapbookAdminPanel from '../../src/components/admin/AppsScrapbookAdminPanel.jsx';
import '../../src/features/apps-scrapbook/apps-scrapbook.css';
// These are loaded after the panel in the real Settings drawer, too.
import '../../src/styles/SettingsGoogleM3.css';
import '../../src/styles/SettingsLauncher2.css';
import '../../src/styles/SettingsLauncherDrawerRedesign.css';
import '../../src/styles/SettingsLauncherPortalCompat.css';

const admin = { role: 'admin', provider: 'supabase', approved: true, name: 'Nguyễn Anh Tuấn' };
const apps = [...APPS, { slug: 'shared-test', shared: true, externalUrl: 'https://example.com/teacher', titleVi: 'Ứng dụng dùng chung', title: 'Shared app', descVi: 'Trò chơi lớp học dùng chung đã được duyệt.' }];
function Fixture() {
  const [route, setRoute] = useState('apps');
  const [user, setUser] = useState(admin);
  const [settings, setSettings] = useState(true);
  const [language, setLanguage] = useState('vi');
  const [grid, setGrid] = useState(null);
  useAppsScrapbookScope(route);
  useEffect(() => {
    setGrid(document.getElementById('apps-directory-grid'));
    window.appsFixture = { setRoute, setUser, setSettings, setLanguage };
  }, []);
  return <>
    <div className="app-shell metro-shell metro-clean-system" data-route={route}>
      <main id="bes-main-content">
        <WebAppsRedesign apps={apps} language={language} currentUser={user} setLanguage={setLanguage} publicReadonly={!user} />
      </main>
      <Footer language={language} route={route} />
    </div>
    {user && grid && createPortal(<WebsiteAppCard app={{ id: 'approved-worksheet', title: 'Trợ lí tạo Worksheet', icon: 'WEB', sourceType: 'url' }} language={language} onOpen={app => { window.lastApprovedApp = app.id; }} />, grid)}
    {settings && <div className="settings-launcher-portal"><div className="settings-launcher-drawer">
      <header className="settings-launcher-drawer-header"><div><small>BRIAN ENGLISH · SETTINGS</small><strong>Điều hướng</strong></div></header>
      <div className="settings-launcher-drawer-body"><AppsScrapbookAdminPanel currentUser={user} language={language} /></div>
    </div></div>}
  </>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
