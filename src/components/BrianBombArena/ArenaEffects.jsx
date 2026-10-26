import React from 'react';

// Cosmetic overlay only. No game state or scoring is changed by animations.
const COUNT=28;
const SPARKS=Array.from({length:COUNT},(_,i)=>({
  angle:(360*i/COUNT)+'deg',
  distance:(i%3===0?175:i%3===1?125:205)+'px',
  delay:(i%4*24)+'ms',
  hue:i%5===0?'#fff1a2':i%5===1?'#ff6f9a':i%5===2?'#7cdaff':i%5===3?'#9ef0a9':'#c2a5ff',
}));
export default function ArenaEffects({fx,vi=true}){
  if(!fx)return null;
  const bomb=fx.type==='bomb',bank=fx.type==='bank',win=fx.type==='win';
  const title=fx.feedback==='incorrect'?(vi?'SAI RỒI! −20':'INCORRECT! −20'):
    fx.feedback==='correct'?(vi?'CHÍNH XÁC! +20':'CORRECT! +20'):
    bomb?'BOOM!':win?'VICTORY!':bank?(vi?'ĐÃ CHỐT ĐIỂM!':'BANKED!'):'+'+fx.amount;
  const sub=fx.feedback==='incorrect'?(vi?'💣 Nổ bom: trừ 20 điểm và mất POT, chuyển lượt!':'💣 Bomb: −20 points, lose POT and pass the turn!'):
    fx.feedback==='correct'?(vi?'🎆 Cộng 20 điểm (vào POT khi Thử vận may)':'🎆 +20 points (to POT in Press Your Luck)'):
    bomb?(vi?'Mất toàn bộ POT của lượt này':'Your turn POT was lost'):
    win?(vi?'Chúc mừng đội chiến thắng':'Congratulations!'):
    bank?('+'+fx.amount+' '+(vi?'điểm an toàn':'secured points')):
    (vi?'Cộng vào POT / điểm đội':'Added to POT / team score');
  return <div className={'bba-fx-layer is-'+fx.type} aria-hidden="true" key={fx.id}>
    {bomb?<div className="bba-fx-explosion"><div className="bba-fx-shockwave"/>
      <div className="bba-fx-shockwave is-second"/><span className="bba-fx-fireball">💥</span>
      <div className="bba-fx-smoke"/><div className="bba-fx-smoke is-smoke2"/></div>:null}
    {!bomb?<div className="bba-fx-confetti">{SPARKS.map((spark,i)=><i key={i} style={{
      '--a':spark.angle,'--d':spark.distance,'--delay':spark.delay,'--spark':spark.hue,
    }}/>)}</div>:<div className="bba-fx-confetti is-explosion">{SPARKS.slice(0,18).map((spark,i)=><i key={i} style={{
      '--a':spark.angle,'--d':spark.distance,'--delay':spark.delay,'--spark':i%2?'#ffdb72':'#f4684d',
    }}/>)}</div>}
    <div className="bba-fx-copy"><strong>{title}</strong><small>{sub}</small></div>
  </div>;
}
