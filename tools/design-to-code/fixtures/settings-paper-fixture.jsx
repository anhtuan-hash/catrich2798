import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SettingsLauncherHome from '../../../src/components/settings/SettingsLauncherHome.jsx';
import '../../../src/styles/SettingsLauncher2.css';
import '../../../src/features/design-to-code/paper-tokens.css';
import '../../../src/features/design-to-code/settings-paper-layer.css';
import './settings-paper-fixture.css';

function SettingsPaperFixture() {
  const [opened, setOpened] = useState('');
  const [language, setLanguage] = useState('vi');
  const demoUser = { id: 'design-lab-account', name: 'Nguyễn Anh Tuấn', role: 'admin' };
  return <div className="paper-fixture-shell">
    <nav className="paper-fixture-nav" aria-label="Design system demonstration only">
      <span className="paper-fixture-brand">✒ Brian English</span>
      <div className="paper-fixture-navlinks">
        {['Ứng dụng','Dashboard','Chủ nhiệm','Sổ điểm','Kiểm tra','Điểm danh'].map((tab,index)=>
          <span className={'paper-fixture-tab paper-fixture-tone-'+index} key={tab}>{tab}</span>)}
      </div>
      <span className="paper-fixture-user">AT · Tuấn</span>
    </nav>
    <main className="paper-fixture-main">
      <SettingsLauncherHome currentUser={demoUser} language={language} dataSyncEnabled liveSyncEnabled
        paperMode onOpen={setOpened}/>
      <footer className="paper-fixture-footer" aria-label="Visual fixture footer">
        <div><b>✒ BRIAN ENGLISH</b><small>Better Learners · Brighter Futures</small></div>
        <div><b>DESIGN SYSTEM</b><small>Layered Paper Scrapbook Collage</small></div>
        <div><b>CREATIVE LEARNING</b><small>Design &amp; Development · Brian English</small></div>
      </footer>
    </main>
    <output className="paper-fixture-state" aria-live="polite" data-opened-module={opened}>
      {opened ? 'Opened: '+opened : 'Paper design lab — no student or employee data is connected.'}
    </output>
  </div>;
}
createRoot(document.getElementById('root')).render(<SettingsPaperFixture/>);
