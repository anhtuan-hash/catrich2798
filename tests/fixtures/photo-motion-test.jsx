import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PhotoTransitionStage from '../../src/components/PhotoTransitionStage.jsx';

const art = [
  ['#fa923a','#442554'],
  ['#239ab2','#082d53'],
  ['#ac7fd7','#364d89'],
  ['#62aa84','#1b473f'],
  ['#c97273','#422e52'],
  ['#efbe4e','#654d18'],
].map(([a,b], i) => 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">' +
  '<defs><linearGradient id="g"><stop stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
  '<rect width="640" height="400" fill="url(#g)"/>' +
  '<circle cx="330" cy="180" r="' + (60 + i*12) + '" fill="white" opacity=".4"/>' +
  '<text x="65" y="330" font-size="140" fill="white" font-family="sans-serif">' + i + '</text></svg>'));
function Fixture() {
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState('fade');
  const [direction, setDirection] = useState(1);
  const photo = { id: 'test-photo-' + index };
  return <div>
    <div style={{padding:'15px',display:'flex',gap:'10px'}}>
      <select id="transition-mode" value={mode} onChange={(event) => setMode(event.target.value)}>
        {['fade','slide','zoom','reveal','blur'].map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button id="next-photo" onClick={() => {setDirection(1);setIndex((i)=>(i+1)%art.length)}}>Next photo</button>
      <button id="previous-photo" onClick={() => {setDirection(-1);setIndex((i)=>(i-1+art.length)%art.length)}}>Previous photo</button>
    </div>
    <div style={{position:'relative',width:'min(900px,100vw)',height:'480px',overflow:'hidden'}}>
      <PhotoTransitionStage photo={photo} src={art[index]} mode={mode} direction={direction} alt={'Artwork '+index}/>
    </div>
  </div>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
