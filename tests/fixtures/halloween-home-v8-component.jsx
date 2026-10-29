import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import PhotoTransitionStage from '../../src/components/PhotoTransitionStage.jsx';
import '../../src/components/GlobalCompactNavigation.css';
import '../../src/components/GlobalNavigationPastelPalette.css';
import '../../src/components/GlobalNavigationTextOnlyCompact.css';
import '../../src/components/HalloweenNavigationSkin.css';
import '../../src/components/HalloweenNavigationRefinement.css';
import '../../src/pages/HomeApproved.css';
import '../../src/styles/HomeHeroExperience2026.css';
import '../../src/styles/HomeEditorialWarmV5.css';
import '../../src/styles/HomeEditorialSageV6.css';
import '../../src/styles/HomeEditorialBlueV9.css';
import '../../src/components/HomePublishedSlideshow.css';
import '../../src/components/HomePublishedSlideshowExhibition.css';
import '../../src/components/HomePublishedSlideshowHalloween.css';
import '../../src/components/FooterCompactDisclosure.css';
import '../../src/components/FooterAuthCards.css';
import '../../src/components/FooterIntegrity.css';
import '../../src/components/FooterDashboardMockup.css';
import '../../src/components/FooterPortfolio.css';
import '../../src/components/HalloweenFooterSkin.css';
import '../../src/components/HalloweenFooterRefinement.css';
import '../../src/styles/HalloweenFullHomeV4.css';
import './halloween-home-v4-fixture-only.css';
import HalloweenScene from '../../src/features/halloween-home/HalloweenScene.jsx';

const originalPhoto='/hero/media/hero-1793195941901-36cea510456f.webp';
function Fixture(){
 const [active,setActive]=useState(false),[count,setCount]=useState(0),[portfolio,setPortfolio]=useState(false);
 useEffect(()=>{document.documentElement.dataset.halloweenHomeV4=active?'on':'off';},[active]);
 return <div className="app-shell metro-clean-system" data-route="home" data-halloween-home-v4={active?'on':'off'}>

  <div className="bes-top-chrome" style={{position:'relative',zIndex:80,maxWidth:1460,margin:'auto'}}>
   <nav className="brian-nav" data-halloween-nav={active?'true':'false'}>
    <button className="brian-nav__brand" onClick={()=>setCount(v=>v+1)}>BRIAN English</button>
    <div className="brian-nav__primary">
     <button data-nav-key="home" className="is-active" onClick={()=>setCount(v=>v+1)}>Trang chủ</button>
     <button data-nav-key="apps" onClick={()=>setCount(v=>v+1)}>Ứng dụng</button>
     <button className="brian-nav__dashboard-tab" onClick={()=>setCount(v=>v+1)}>Dashboard</button>
     <button className="brian-nav__homeroom-tab" onClick={()=>setCount(v=>v+1)}>Chủ nhiệm</button>
     <button className="brian-nav__gradebook-tab" onClick={()=>setCount(v=>v+1)}>Sổ điểm</button>
     <button className="brian-nav__lesson-check-tab" onClick={()=>setCount(v=>v+1)}>Kiểm tra</button>
     <button className="brian-nav__attendance-tab" onClick={()=>setCount(v=>v+1)}>Điểm danh</button>
    </div>
    <button className="brian-nav__login" onClick={()=>setCount(v=>v+1)}>Đăng nhập</button>
   </nav>
  </div>
  <div className="bes-halloween-atmosphere" id="global-sticker-simulation"><span style={{fontSize:72,position:'absolute',top:'26%',left:'5%'}}>👻</span></div>
  <main className="wp8-page-stage">
   <div className="bha-home bha-home--editorial-v3">
    <div className="bha-editorial-dateline"><span>BRIAN ENGLISH</span><i/><span>KHÔNG GIAN DẠY HỌC</span><strong>2026—2027</strong></div>
    <section className="bha-hero hero-cms" id="v4-hero">
      <div className="hero-cms__background">
        <img src={originalPhoto} alt="Original CMS published Halloween Hero picture" className="hero-cms__media" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'70% 50%'}} />
      </div>
      {active ? <HalloweenScene zone="hero" /> : null}
      <div className="hero-cms__content">
        <span className="hero-cms__badge">{active?'BRIAN ENGLISH · HALLOWEEN 2026':'BRIAN ENGLISH'}</span>
        <h1>{active?<><span>Happy</span><span>Halloween!</span></>:'Không gian dạy học thông minh'}</h1>
        {active?<><h2>Learn · Play · Create · Grow</h2><p>Turn your English classroom into a world of creativity, curiosity and confidence. Explore interactive tools, fun activities and real learning experiences with BRIAN.</p></>:<p>Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả.</p>}
        <div className="hero-cms__actions"><button className="hero-cms__button is-primary" onClick={()=>setCount(v=>v+1)}>Bắt đầu ngay</button><button className="hero-cms__button" onClick={()=>setCount(v=>v+1)}>Xem hướng dẫn</button></div>
      </div>
    </section>
    <section className="bhs-home" data-halloween-theme={active?'true':'false'} data-home-published-slideshow="true" data-guest-allow="slideshow-viewer" id="v4-slideshow">
      <header className="bhs-home__header"><div className="bhs-home__headline">
       <div className="bhs-home__kicker">BRIAN PHOTO STORY · ĐANG TRÌNH CHIẾU</div>
       <h2>Halloween Showcase 2026</h2><p>Step into a world of spooky imagination and creativity!</p></div>
       <a className="bhs-home__open" href="#/slideshow">Xem bộ ảnh đầy đủ</a>
      </header>
      <div className="bhs-home__exhibition"><aside className="bhs-home__story-panel">
       <div className="bhs-home__story-top"><span className="bhs-home__story-kicker">TÁC PHẨM ĐANG XEM</span><strong className="bhs-home__story-count">02/10</strong></div>
       <div className="bhs-home__story-main"><h3>11.3 Group 2</h3><p>Welcome to a playful Halloween world filled with mysterious witches, pumpkins, friendly ghosts, and magical creatures!</p></div>
      </aside><div className="bhs-home__stage"><PhotoTransitionStage photo={{id:"halloween-v4-fixture-photo",caption:"Artwork displayed without cropping"}} src={originalPhoto} alt="Halloween artwork fixture image" mode="fade" direction={1} />
       <div className="bhs-home__controls"><span className="bhs-home__counter">02 / 10</span><div className="bhs-home__progress"><span style={{width:'24%'}}/></div><button onClick={()=>setCount(v=>v+1)}>⏸</button></div>
      </div>
      {active&&<nav className="bhs-home__filmstrip" data-halloween-filmstrip="true">
       {[originalPhoto,'/hero/media/hero-1793195849950-20a5e8a480a8.jpg','/hero/media/hero-1789370455474-d4260ba6896f.png'].map((src,i)=><button type="button" className={'bhs-home__filmstrip-item'+(i===0?' is-active':'')} key={src} aria-label={'Fixture artwork '+(i+1)} onClick={()=>setCount(v=>v+1)}><img src={src} alt="" loading="eager" /><span>{i+1}</span></button>)}
      </nav>}
      </div>
    </section>
    <section className="bha-practice bha-practice--editorial-v3" id="v4-weekly">{active ? <HalloweenScene zone="practice" /> : null}
      <header className="bha-practice__editorial-header"><div className="bha-practice__editorial-copy">
        <span>WEEKLY ENGLISH PRACTICE</span><h2>Hub bài tập theo tuần</h2><p>Cuộn để xem toàn bộ bài của từng khối và sắp xếp theo ABC hoặc ngày công bố.</p>
      </div><div className="bha-practice__published-count"><span>ĐÃ XUẤT BẢN</span><strong>65</strong></div></header>
      <div className="bha-grades bha-grades--folio">{[10,11,12].map((grade,i)=>
        <article className={'bha-grade bha-grade--with-lessons bha-folio-grade bha-folio-grade--'+grade} key={grade} style={{'--accent':['#346ea8','#c78124','#168b7b'][i],'--soft':['#edf3f8','#fff4e6','#e9f6f1'][i]}}><div className="bha-folio-grade__rule" aria-hidden="true"/>
          <header className="bha-folio-grade__masthead"><span>KHỐI {grade}</span><small>{i===1?21:22} bài</small></header>
          <div className="bha-grade-copy bha-folio-grade__copy"><p className="bha-folio-grade__kicker">✓ THEO TUẦN</p><h3>Tiếng Anh {grade}</h3><small>Term 1 | Grade {grade} | Week 15</small>
          <button onClick={()=>setCount(v=>v+1)}>Vào bài →</button></div>
          <div className="bha-grade-art bha-folio-grade__art" aria-hidden="true"><span className="bha-folio-grade__serial">0{i+1}</span><b>{grade}</b><i/><i/></div>
          <div className="bha-grade-recent" data-v4-simulated-injected-lesson-list>{[1,2,3,4,5].map(n=><article key={n} className="bha-grade-lesson">
            <span>Term 1 | Grade {grade} | Week {n.toString().padStart(2,'0')}</span>
            <button onClick={()=>setCount(v=>v+1)} aria-label={'Mở bài '+n}>▶</button></article>)}</div>
        </article>
      )}</div>
    </section>
   </div>
  </main>
  <footer className="footer footer-v10 signature-footer-v75 signature-footer-v50 signature-footer-collapsible signature-footer-dashboard-global signature-footer-v50-vi"
     data-app-shell-footer="true" data-footer-mode="full" data-footer-route="home" data-halloween-footer={active?'true':'false'}>
   <div className="signature-footer-expanded-panel"><div className="signature-footer-v50-main">
    <section className="signature-footer-v50-brand"><img className="signature-footer-v50-brian-logo" src="/brian-english-brand-logo.png" alt="Brian logo"/>
      <div className="signature-footer-v50-affiliations"><img src="/footer-pek-logo.png" alt="Pétrus Ký"/><img src="/footer-cambridge-logo.png" alt="Cambridge"/></div></section>
    <section className="signature-footer-v50-profile"><span className="signature-footer-v50-language-badge">VI</span>
      <h2>NGUYỄN ANH TUẤN (MR.)</h2><ul className="signature-footer-v50-details">
        {['Trường Trung – Tiểu học Pétrus Ký','Tổ trưởng chuyên môn tiếng Anh','0339 270798','Trung tâm khảo thí VN070','Giám khảo vấn đáp Cambridge'].map((x,i)=><li className={'signature-footer-v50-detail detail-'+['school','role','phone','centre','examiner'][i]} key={x}><span className="signature-footer-v50-detail-icon" aria-hidden="true"/><span>{x}</span></li>)}</ul></section>
    <section className="signature-footer-v50-credentials"><span className="signature-footer-v50-section-label">HỌC VẤN & CHỨNG CHỈ CHUYÊN MÔN</span>
      <ul>{['Cử nhân Ngôn ngữ Anh','Văn bằng sau đại học chuyên ngành Quản lý giáo dục','Thạc sĩ Giảng dạy tiếng Anh','Thạc sĩ Quản lý giáo dục','Thạc sĩ Ngôn ngữ Anh'].map(x=><li key={x}><span className="signature-footer-v50-star">★</span><span>{x}</span></li>)}</ul>
    </section>
   </div></div>
   <div className="signature-footer-dashboard-artwork"><span className="signature-footer-dashboard-signoff">Teach Better Together ♡</span></div>
   <div className="signature-footer-static-summary signature-footer-static-summary--attribution-only">
     <button className="bes-portfolio-footer-trigger" onClick={()=>setPortfolio(true)}>Designed & Developed by <strong>Nguyễn Anh Tuấn</strong></button>
   </div>
  </footer>
  {portfolio&&<div className="bes-portfolio-backdrop"><section className="bes-portfolio-dialog" role="dialog"><button className="bes-portfolio-dialog-close" onClick={()=>setPortfolio(false)}>Close</button></section></div>}
  <div data-visual-qa-controls="true" style={{padding:16,position:'fixed',bottom:8,left:8,zIndex:100,background:'#fff',borderRadius:10,boxShadow:'0 2px 9px #2224'}}>
    <button id="v4-toggle" onClick={()=>setActive(v=>!v)}>{active?'HALLOWEEN ON → Turn OFF':'HALLOWEEN OFF → Turn ON'}</button>
    <output id="v4-clicks">{count}</output>
  </div>
 </div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
