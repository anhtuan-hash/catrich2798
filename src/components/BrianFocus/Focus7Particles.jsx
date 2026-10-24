import React, { useEffect, useRef } from 'react';
import {browserFocusMotionBudget} from './focusMotionBudget.js';
/** Ambient canvas, pointer-transparent, bounded, visibility-aware and low-power safe. */
export default function Focus7Particles({mode='off',density=35,performance='balanced'}){
 const canvas=useRef(null);
 useEffect(()=>{
  const budget=browserFocusMotionBudget(performance);
  if(mode==='off'||!budget.enabled)return undefined;
  const el=canvas.current,ctx=el?.getContext('2d',{alpha:true});
  if(!ctx)return undefined;
  let id=0,alive=true,last=0,particles=[],w=0,h=0,visible=!document.hidden;
  const resize=()=>{
    const pixel=Math.min(window.devicePixelRatio||1,budget.dpr);
    w=window.innerWidth;h=window.innerHeight;
    el.width=Math.round(w*pixel);el.height=Math.round(h*pixel);
    el.style.width=w+'px';el.style.height=h+'px';
    ctx.setTransform(pixel,0,0,pixel,0,0);
    const count=Math.min(110,Math.max(5,Math.round((Number(density)||35)*.75*budget.particles)));
    particles=Array.from({length:count},(_,i)=>({
      x:Math.random()*w,y:Math.random()*h,v:.1+Math.random()*.65,
      r:.8+Math.random()*2.5,phase:Math.random()*Math.PI*2,drift:Math.random()*.8-.4,
      angle:Math.random()*Math.PI*2,
    }));
  };
  const frame=time=>{
    if(!alive||!visible)return;
    id=requestAnimationFrame(frame);
    if(time-last<1000/budget.fps)return;
    const dt=Math.min(50,time-last||32)/32;last=time;
    ctx.clearRect(0,0,w,h);
    if(mode==='fog'){
      for(let i=0;i<3;i++){
        const x=w*(.15+i*.35)+Math.sin(time*.00013+i)*28;
        const g=ctx.createRadialGradient(x,h*.62,1,x,h*.62,w*.38);
        g.addColorStop(0,'rgba(228,237,248,.065)');g.addColorStop(1,'rgba(228,237,248,0)');
        ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      }
      return;
    }
    for(const p of particles){
      const fall=mode==='rain'?8:mode==='snow'?1.3:mode==='leaves'?1.7:mode==='fireflies'?-.25:.35;
      p.y+=p.v*fall*dt;p.x+=(p.drift+(mode==='leaves'?Math.sin(time*.001+p.phase)*1.1:0))*dt;
      if(p.y>h+20)p.y=-12;
      if(p.y< -20)p.y=h+12;
      if(p.x>w+20)p.x=-12;if(p.x< -20)p.x=w+12;
      ctx.save();ctx.translate(p.x,p.y);
      if(mode==='rain'){
        ctx.strokeStyle='rgba(198,220,251,.34)';ctx.lineWidth=.8;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-2,15);ctx.stroke();
      } else if(mode==='leaves'){
        ctx.rotate(time*.0007+p.angle);ctx.fillStyle='rgba(239,171,100,.42)';
        ctx.beginPath();ctx.ellipse(0,0,p.r*2.5,p.r,Math.PI/5,0,Math.PI*2);ctx.fill();
      } else {
        const twinkle=mode==='fireflies'?.2+.45*(.5+.5*Math.sin(time*.003+p.phase)):.2;
        ctx.fillStyle=mode==='fireflies'?'rgba(255,223,132,'+twinkle+')':mode==='snow'?'rgba(241,249,255,.46)':'rgba(251,244,227,.28)';
        ctx.beginPath();ctx.arc(0,0,p.r*(mode==='fireflies'?1.6:1),0,2*Math.PI);ctx.fill();
      }
      ctx.restore();
    }
  };
  const visibility=()=>{
    visible=!document.hidden;
    cancelAnimationFrame(id);
    if(visible){last=0;id=requestAnimationFrame(frame);}
  };
  resize();window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',visibility);
  if(visible)id=requestAnimationFrame(frame);
  return()=>{alive=false;cancelAnimationFrame(id);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);ctx.clearRect(0,0,w,h);};
 },[mode,density,performance]);
 if(mode==='off')return null;
 return <canvas ref={canvas} className="bfc7-particles" aria-hidden="true"/>;
}
