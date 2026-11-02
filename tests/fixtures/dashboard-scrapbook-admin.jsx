import React from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/index.css';
import '../../src/styles/GlobalFontSystem.css';
import DashboardScrapbookAdminPanel from '../../src/components/admin/DashboardScrapbookAdminPanel.jsx';
// Preserve the real Settings import order: portal styles load after the panel.
import '../../src/styles/SettingsGoogleM3.css';
import '../../src/styles/SettingsLauncher2.css';
import '../../src/styles/SettingsLauncherDrawerRedesign.css';
import '../../src/styles/SettingsLauncherPortalCompat.css';

createRoot(document.getElementById('root')).render(
  <div className="settings-launcher-portal">
    <div className="settings-launcher-drawer">
      <header className="settings-launcher-drawer-header"><div><small>BRIAN ENGLISH · SETTINGS</small><strong>Điều hướng</strong></div></header>
      <div className="settings-launcher-drawer-body">
        <DashboardScrapbookAdminPanel currentUser={{ role: 'admin', provider: 'supabase' }} />
      </div>
    </div>
  </div>,
);
