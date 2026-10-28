import React from 'react';
import {createRoot} from 'react-dom/client';
import Footer from '../../src/components/Footer.jsx';
function Test() {
  return <div className="app-shell metro-clean-system" data-route="home">
    <section id="hero-unmodified" style={{padding:20,backgroundColor:'rgb(245, 248, 252)',color:'rgb(22, 48, 72)'}}>BRIAN Home Hero must remain unchanged</section>
    <Footer language="vi" route="home" />
  </div>;
}
createRoot(document.getElementById('root')).render(<Test/>);
