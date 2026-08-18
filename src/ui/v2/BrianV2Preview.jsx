import React, { useEffect, useState } from 'react';
import BrianV2Shell from './BrianV2Shell.jsx';
import B2Home from './pages/B2Home.jsx';
import B2Apps from './pages/B2Apps.jsx';
import B2TeachingHub from './pages/B2TeachingHub.jsx';
import B2Games from './pages/B2Games.jsx';
import B2Resources from './pages/B2Resources.jsx';
import B2Homeroom from './pages/B2Homeroom.jsx';
import B2Classes from './pages/B2Classes.jsx';
import B2Students from './pages/B2Students.jsx';
import B2Dashboard from './pages/B2Dashboard.jsx';
import B2Reports from './pages/B2Reports.jsx';
import B2Settings from './pages/B2Settings.jsx';
import B2Admin from './pages/B2Admin.jsx';
import B2UILab from './pages/B2UILab.jsx';
import { B2Button, B2EmptyState } from './components/B2UI.jsx';
import './BrianV2Preview.css';

const READY_VIEWS = new Set(['home', 'apps', 'teaching-tools', 'games', 'resources', 'homeroom', 'classes', 'students', 'dashboard', 'reports', 'settings', 'admin', 'ui-lab']);

function readPreviewView() {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '').trim();
  return READY_VIEWS.has(raw) ? raw : 'home';
}

export default function BrianV2Preview() {
  const [view, setView] = useState(readPreviewView);

  useEffect(() => {
    const onHash = () => setView(readPreviewView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next) => {
    if (!READY_VIEWS.has(next)) return;
    if (window.location.hash.replace(/^#/, '') !== next) window.location.hash = next;
    setView(next);
  };

  let content = null;
  if (view === 'home') content = <B2Home navigate={navigate} />;
  else if (view === 'apps') content = <B2Apps navigate={navigate} />;
  else if (view === 'teaching-tools') content = <B2TeachingHub />;
  else if (view === 'games') content = <B2Games />;
  else if (view === 'resources') content = <B2Resources />;
  else if (view === 'homeroom') content = <B2Homeroom />;
  else if (view === 'classes') content = <B2Classes />;
  else if (view === 'students') content = <B2Students />;
  else if (view === 'dashboard') content = <B2Dashboard />;
  else if (view === 'reports') content = <B2Reports />;
  else if (view === 'settings') content = <B2Settings />;
  else if (view === 'admin') content = <B2Admin />;
  else if (view === 'ui-lab') content = <B2UILab />;
  else {
    content = (
      <B2EmptyState
        icon="◇"
        title="Màn hình này chưa được migrate sang V2"
        description="Shadow UI chỉ công bố từng khu vực sau khi component, responsive và trạng thái tương tác đã được kiểm thử."
        action={<B2Button variant="primary" onClick={() => navigate('home')}>Về Trang chủ V2</B2Button>}
      />
    );
  }

  return <BrianV2Shell active={view} onNavigate={navigate}>{content}</BrianV2Shell>;
}
