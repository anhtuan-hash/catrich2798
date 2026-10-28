import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PhotoTransitionStage from '../../src/components/PhotoTransitionStage.jsx';
import SlideshowLinkedText from '../../src/components/SlideshowLinkedText.jsx';
import '../../src/components/HomePublishedSlideshow.css';
import '../../src/components/HomePublishedSlideshowRefinement.css';
import '../../src/components/HomePublishedSlideshowExhibition.css';
import '../../src/pages/PhotoSlideshow.css';
import '../../src/pages/PhotoSlideshowGalleryV2.css';

const palette = [
  ['#fa923a','#442554'], ['#239ab2','#082d53'], ['#ac7fd7','#364d89'],
  ['#62aa84','#1b473f'], ['#c97273','#422e52'], ['#efbe4e','#654d18'],
];
const sizes = [[640,400],[360,800],[1100,320],[700,700],[500,900],[640,400]];
const art = palette.map(([a,b], i) => {
  const [w,h] = sizes[i];
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<defs><linearGradient id="g"><stop stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>' +
    '<circle cx="' + (w/2) + '" cy="' + (h/2) + '" r="65" fill="white" opacity=".4"/>' +
    '<rect x="5" y="5" width="' + (w-10) + '" height="' + (h-10) + '" stroke="white" stroke-width="10" fill="none"/>' +
    '<text x="30" y="' + (h/2) + '" font-size="95" fill="white" font-family="sans-serif">' + i + '</text></svg>');
});
function Fixture() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState('fade');
  const [layout, setLayout] = useState('home');
  const [direction, setDirection] = useState(1);
  const photo = { id: 'test-photo-' + index };
  const gallery = layout === 'gallery';
  const stage = <div className={gallery ? 'bss-stage' : 'bhs-home__stage'} style={{ width: 'min(900px, 100%)', margin: 0 }}>
    <PhotoTransitionStage photo={photo} src={art[index]} mode={mode} direction={direction} alt={'Artwork '+index}/>
    <div className={gallery ? 'bss-stage-controls' : 'bhs-home__controls'}><span>01 / 06</span></div>
  </div>;
  return <div className="app-shell" data-route={gallery ? 'slideshow' : 'home'}>
    <p id="test-public-link" style={{ margin:'8px',fontSize:'15px',color:'#e5f4ff' }}>
      <SlideshowLinkedText text="🎃 Vote here: https://qrvote.org/c/halloween-showcase-ry29 🎃" />
    </p>
    <div style={{padding:'15px',display:'flex',gap:'10px',flexWrap:'wrap'}}>
      <select id="transition-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
        {['fade','slide','zoom','reveal','blur'].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button id="next-photo" onClick={() => {setDirection(1);setIndex((i)=>(i+1)%art.length)}}>Next photo</button>
      <button id="previous-photo" onClick={() => {setDirection(-1);setIndex((i)=>(i-1+art.length)%art.length)}}>Previous photo</button>
      <button id="toggle-layout" onClick={() => setLayout((v)=>v==='home'?'gallery':'home')}>Switch layout</button>
      <output id="current-index">{index}</output>
    </div>
    <div className={gallery ? 'bss bss--gallery-view' : 'bhs-home'} style={{width:'min(920px,100%)',margin:'0 auto',padding:'10px'}}>
      {gallery ? stage : <div className="bhs-home__exhibition" data-home-exhibition-layout="info-left-artwork-right">
        <aside className="bhs-home__story-panel">
          <div className="bhs-home__story-top">
            <span className="bhs-home__story-kicker">TÁC PHẨM ĐANG XEM</span>
            <div className="bhs-home__story-count-row">
              <strong className="bhs-home__story-count">{String(index + 1).padStart(2, '0')} / 06</strong>
            </div>
          </div>
          <div className="bhs-home__story-main">
            <h3>11.2 Group 1</h3>
            <p>Under a glowing full moon, a mysterious castle rises above a spooky graveyard. Flying bats, playful ghosts, a black cat and a smiling pumpkin bring this vibrant Halloween scene to life.</p>
          </div>
          <div className="bhs-home__story-meta">
            <div className="bhs-home__story-meta-item"><span><small>BỘ SƯU TẬP</small><strong>Halloween Showcase 2026</strong></span></div>
            <div className="bhs-home__story-meta-item"><span><small>THỜI GIAN MỖI ẢNH</small><strong>6 giây</strong></span></div>
          </div>
        </aside>
        {stage}
      </div>}
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
