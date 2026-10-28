import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/components/GlobalCompactNavigation.css';
import '../../src/components/GlobalNavigationPastelPalette.css';
import '../../src/components/GlobalNavigationTextOnlyCompact.css';
import '../../src/components/GlobalNavigationUtilityIcons.css';
import '../../src/components/DashboardTopChromeMockup.css';
import '../../src/styles/mobile/mobile-compact-topbar.css';
import '../../src/components/HalloweenNavigationSkin.css';
import '../../src/components/HalloweenNavigationRefinement.css';

function Fixture() {
  const [enabled,setEnabled] = useState(true);
  const [mobile,setMobile] = useState(false);
  const [clicks,setClicks] = useState(0);
  useEffect(() => {
    document.documentElement.classList.toggle('bes-mobile-shell-active',mobile);
    return () => document.documentElement.classList.remove('bes-mobile-shell-active');
  }, [mobile]);
  return <div className="app-shell" data-route="home">
    <div style={{padding:'8px'}}>
      <button id="theme-toggle" onClick={() => setEnabled((v) => !v)}>Toggle Halloween nav</button>
      <button id="mobile-toggle" onClick={() => setMobile((v) => !v)}>Toggle mobile</button>
      <output id="nav-click-count">{clicks}</output>
    </div>
    {mobile ? <div className="bes-mobile-shell" data-halloween-nav={enabled ? 'true' : 'false'}>
      <header className="bes-mobile-topbar bes-mobile-topbar--compact">
        <button id="mobile-menu" className="bes-mobile-icon-button bes-mobile-topbar__menu" onClick={() => setClicks((v) => v + 1)}>☰</button>
        <button className="bes-mobile-brand" onClick={() => setClicks((v) => v + 1)}>BRIAN</button>
        <button className="bes-mobile-avatar-button" onClick={() => setClicks((v) => v + 1)}>A</button>
      </header>
    </div> : <div className="bes-top-chrome">
      <nav className="brian-nav" data-halloween-nav={enabled ? 'true' : 'false'}>
        <button className="brian-nav__brand" onClick={() => setClicks((v) => v+1)}>Brian English</button>
        <div className="brian-nav__primary">
          <button data-nav-key="home" className="is-active" onClick={() => setClicks((v) => v+1)}>Trang chủ</button>
          <button data-nav-key="apps" onClick={() => setClicks((v) => v+1)}>Ứng dụng</button>
          <button className="brian-nav__dashboard-tab" onClick={() => setClicks((v) => v+1)}>Dashboard</button>
          <button className="brian-nav__homeroom-tab" onClick={() => setClicks((v) => v+1)}>Chủ nhiệm</button>
          <button className="brian-nav__gradebook-tab" onClick={() => setClicks((v) => v+1)}>Sổ điểm</button>
          <button className="brian-nav__lesson-check-tab" onClick={() => setClicks((v) => v+1)}>Kiểm tra</button>
          <button className="brian-nav__attendance-tab" onClick={() => setClicks((v) => v+1)}>Điểm danh</button>
          <button className="brian-nav__reports-tab" onClick={() => setClicks((v) => v+1)}><span className="brian-nav__reports-copy"><span className="brian-nav__reports-label">Báo cáo</span></span></button>
          <button className="brian-nav__ttcm-tab" onClick={() => setClicks((v) => v+1)}><span>TTCM</span><b className="brian-nav__ttcm-badge">2</b></button>
        </div>
        <button className="brian-nav__login" onClick={() => setClicks((v) => v+1)}>Đăng nhập</button>
      </nav>
    </div>}
    <section id="outside-hero" style={{background:'rgb(250, 251, 253)',color:'rgb(20, 45, 74)',padding:'22px'}}>Original Hero: unaffected by navbar background</section>
  </div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
