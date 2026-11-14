import React from 'react';
import CompetitionBanner from './CompetitionBanner.jsx';
import SideNavigation, {NAV_ITEMS} from './SideNavigation.jsx';
import Footer from './Footer.jsx';
import {Search,Bell} from 'lucide-react';

// ImmersiveShell — route-scoped Swiss chrome.
// CONTRACT props: {activeNav, onNavigate(id), children, language, staff, data}.
// `staff` is the dashboard payload (profile/assignments/groups/reviews/...);
// `data` is accepted as an alias and falls back to staff when omitted.
// Banner is rendered first; footer last. Nothing leaks outside .igv2.
const NAV_LABEL = Object.fromEntries(NAV_ITEMS.map(n => [n.id, n.label]));

export default function ImmersiveShell({activeNav, onNavigate, children, language='en', staff, data}) {
  const payload = data || staff || {};
  const teacherInitial = (payload?.profile?.name || 'N').trim().charAt(0).toUpperCase();
  const teacherName = payload?.profile?.name || 'Tuấn';
  return (
    <div className="igv2" data-testid="immersive-gallery-v2" data-ui-locale={language==='en'?'en-US':'vi-VN'}>
      <CompetitionBanner />
      <div className="workspace">
        <SideNavigation activeNav={activeNav} onNavigate={onNavigate} staff={payload} />
        <main className="main" id="igv2-main">
          <div className="utility">
            <div className="utility-left">
              BRIAN / IMMERSIVE GALLERY <span style={{color:'#c9ccce'}}>/</span>{' '}
              <strong style={{color:'#273a4b'}}>{NAV_LABEL[activeNav] || 'Overview'}</strong>
            </div>
            <div className="utility-right">
              <button type="button" className="micro-pill" aria-label="Search">
                <Search className="icon" size={13} aria-hidden="true" /> Search
              </button>
              <span className="iconbox" aria-hidden="true"><Bell size={16} /></span>
              <span className="u-avatar" aria-hidden="true">{teacherInitial}</span>
              <strong style={{color:'#23374f'}}>{teacherName}</strong>
            </div>
          </div>
          {children}
        </main>
      </div>
      <Footer staff={payload} />
    </div>
  );
}
