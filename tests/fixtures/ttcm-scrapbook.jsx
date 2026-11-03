import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
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
    <Channel currentUser={user} /><MobileReader />
  </div>);
