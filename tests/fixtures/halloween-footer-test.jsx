import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../src/components/FooterCompactDisclosure.css';
import '../../src/components/FooterAuthCards.css';
import '../../src/components/FooterIntegrity.css';
import '../../src/components/FooterDashboardMockup.css';
import '../../src/components/FooterPortfolio.css';
import '../../src/components/HalloweenFooterSkin.css';

function Fixture() {
  const [dialog,setDialog]=useState(false);
  return <div className="app-shell metro-clean-system" data-route="home">
    <section id="hero-unmodified" style={{padding:20,backgroundColor:'rgb(245, 248, 252)',color:'rgb(22, 48, 72)'}}>BRIAN Home Hero must remain unchanged</section>
    <footer className="footer footer-v10 signature-footer-v75 signature-footer-v50 signature-footer-collapsible signature-footer-dashboard-global signature-footer-v50-vi"
      data-app-shell-footer="true" data-footer-mode="full" data-footer-route="home" data-halloween-footer="false">
      <div className="signature-footer-expanded-panel">
        <div className="signature-footer-v50-main">
          <section className="signature-footer-v50-brand">
            <img className="signature-footer-v50-brian-logo" src="/brian-english-brand-logo.png" alt="Brian English" />
            <div className="signature-footer-v50-affiliations">
              <img src="/footer-pek-logo.png" alt="Pétrus Ký School" />
              <span className="signature-footer-v50-logo-divider" aria-hidden="true" />
              <img src="/footer-cambridge-logo.png" alt="Cambridge" />
            </div>
          </section>
          <section className="signature-footer-v50-profile">
            <span className="signature-footer-v50-language-badge">VI</span>
            <h2>NGUYỄN ANH TUẤN (MR.)</h2>
            <ul className="signature-footer-v50-details">
              <li className="signature-footer-v50-detail"><span className="signature-footer-v50-detail-icon" />Trường Trung – Tiểu học Pétrus Ký</li>
              <li className="signature-footer-v50-detail"><span className="signature-footer-v50-detail-icon" />Tổ trưởng chuyên môn tiếng Anh</li>
            </ul>
          </section>
          <section className="signature-footer-v50-credentials">
            <span className="signature-footer-v50-section-label">HỌC VẤN &amp; CHỨNG CHỈ CHUYÊN MÔN</span>
            <ul><li><span className="signature-footer-v50-star">★</span><span>Cử nhân Ngôn ngữ Anh</span></li>
              <li><span className="signature-footer-v50-star">★</span><span>Thạc sĩ Ngôn ngữ Anh</span></li></ul>
          </section>
        </div>
      </div>
      <div className="signature-footer-dashboard-artwork" aria-hidden="true">
        <svg className="signature-footer-dashboard-landscape" viewBox="0 0 1440 150"><path d="M0 110H1440V150H0Z" fill="#e5f7ed" /></svg>
        <span className="signature-footer-dashboard-signoff">Teach Better Together ♡</span>
      </div>
      <div className="signature-footer-static-summary signature-footer-static-summary--attribution-only">
        <button className="bes-portfolio-footer-trigger" onClick={()=>setDialog(true)}><span>Designed &amp; Developed by</span><strong>Nguyễn Anh Tuấn</strong></button>
      </div>
    </footer>
    {dialog&&<div className="bes-portfolio-backdrop"><section className="bes-portfolio-dialog" role="dialog"><button className="bes-portfolio-dialog-close" onClick={()=>setDialog(false)}>Đóng</button><p>BRIAN Portfolio</p></section></div>}
  </div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
