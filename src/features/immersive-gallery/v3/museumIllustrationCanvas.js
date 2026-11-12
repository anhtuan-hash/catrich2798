// Original canvas illustrations for the eighteen English STEAM projects.
// No remote images, prompts, third-party assets, student names or fabricated photos.
// Draws genuine visual content into a CanvasTexture-compatible image surface.
const C={
 ink:'#173c43',cream:'#fff9e9',white:'#ffffff',teal:'#16796f',
 sea:'#0a7d96',deep:'#104c71',sky:'#95dded',yellow:'#f7ce67',
 grass:'#82bc66',green:'#257d57',coral:'#ff947e',pink:'#f9b0ae',
 blue:'#60b6d6',navy:'#2b5276'
};
function rr(ctx,x,y,w,h,r,fill,stroke,width=4){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function ellipse(ctx,x,y,rx,ry,fill,rot=0,stroke=null,width=4){
 ctx.beginPath();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2);
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
}
function seg(ctx,pts,color,width=5,close=false,fill=null){
 ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 if(close)ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
}
function txt(ctx,value,x,y,size,color,weight='700',width=900){
 ctx.fillStyle=color;ctx.font=weight+' '+size+'px Arial,sans-serif';ctx.textBaseline='top';ctx.textAlign='left';
 ctx.fillText(String(value),x,y,width);
}
function wrap(ctx,text,x,y,maxW,size,maxLines,color){
 ctx.fillStyle=color;ctx.font='500 '+size+'px Arial,sans-serif';ctx.textBaseline='top';ctx.textAlign='left';
 let line='',count=0;
 for(const word of String(text||'').split(/\s+/)){
  const cand=(line+' '+word).trim();
  if(ctx.measureText(cand).width>maxW&&line){
   ctx.fillText(line,x,y+count*(size+10),maxW);count++;line=word;
   if(count>=maxLines)return;
  }else line=cand;
 }
 if(line&&count<maxLines)ctx.fillText(line,x,y+count*(size+10),maxW);
}
function wave(ctx,y,color,amplitude=13){
 ctx.beginPath();ctx.moveTo(-30,y);
 for(let x=-30;x<=1050;x+=20)ctx.lineTo(x,y+Math.sin(x/78+y/40)*amplitude);
 ctx.lineTo(1050,630);ctx.lineTo(-30,630);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function fish(ctx,x,y,scale=1,color=C.yellow,dir=1){
 ctx.save();ctx.translate(x,y);ctx.scale(scale*dir,scale);
 ellipse(ctx,0,0,59,32,color,0,C.deep,3);
 seg(ctx,[[-48,0],[-98,-36],[-92,37],[-48,0]],C.deep,3,true,color);
 ellipse(ctx,32,-6,5,5,C.ink);
 seg(ctx,[[0,-23],[8,-42],[25,-23]],C.deep,2,false,null);
 ctx.restore();
}
function seaweed(ctx,x,y,s=1,color=C.green){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 for(let k=0;k<4;k++){
  const dx=(k-1.5)*19;
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(dx*2,-90,dx*-1,-130,dx,-215);
  ctx.lineWidth=11;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();
  ellipse(ctx,dx*.7,-105,23,9,color,-.8+k*.4);
 }
 ctx.restore();
}
function seaFrame(ctx,accent){
 const sky=ctx.createLinearGradient(0,0,0,620);
 sky.addColorStop(0,'#89d5de');sky.addColorStop(.40,'#65c3d4');sky.addColorStop(1,'#16598b');
 rr(ctx,0,0,1000,620,0,sky);
 ellipse(ctx,810,112,88,88,'#fff8cd');
 for(let k=0;k<12;k++)ellipse(ctx,55+k*83,90+(k%3)*56,3+k%3*2,3+k%2*2,'rgba(255,255,255,.65)');
 wave(ctx,235,'rgba(240,255,251,.28)',9);
 wave(ctx,300,'rgba(38,152,171,.31)',16);
 wave(ctx,435,'rgba(19,94,144,.55)',15);
 wave(ctx,540,'rgba(12,76,117,.42)',11);
 seg(ctx,[[0,576],[160,550],[300,583],[480,560],[670,590],[1000,555]],'#8abf9e',4,false);
 fish(ctx,185,352,.63,C.yellow);
 fish(ctx,735,427,.43,'#ffb28f',-1);
 seaweed(ctx,90,605,.85,'#197f65');
 seaweed(ctx,865,616,.79,'#2d997e');
 ctx.strokeStyle=accent;ctx.lineWidth=5;
}
function turtle(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ellipse(ctx,-112,2,63,29,'#78ae78',-.45,C.deep,4);
 ellipse(ctx,90,8,73,27,'#78ae78',.32,C.deep,4);
 ellipse(ctx,-10,75,53,25,'#88bb8c',.4,C.deep,4);
 ellipse(ctx,-16,-64,60,25,'#88bb8c',-.3,C.deep,4);
 ellipse(ctx,0,0,125,83,'#346c57',-.1,C.deep,6);
 ellipse(ctx,0,0,98,62,'#b6cb79',-.1,C.ink,3);
 seg(ctx,[[-56,-46],[0,-60],[45,-12],[6,39],[-56,6],[-56,-46]],'#477c61',5);
 seg(ctx,[[45,-12],[95,-22],[67,42],[6,39]],'#477c61',5);
 ellipse(ctx,148,-3,36,28,'#78ae78',0,C.deep,4);
 ellipse(ctx,162,-11,5,5,C.ink);
 ctx.restore();
}
function coral(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 const branches=[[0,0],[0,-70],[-35,-110],[-35,-166]];
 seg(ctx,branches,C.coral,19);
 seg(ctx,[[0,-70],[38,-130],[48,-177]],C.coral,15);
 seg(ctx,[[0,-32],[69,-62],[93,-114]],C.coral,17);
 seg(ctx,[[-31,-108],[-86,-136],[-99,-189]],C.coral,13);
 seg(ctx,[[41,-140],[93,-172]],C.coral,10);
 ctx.restore();
}
function bottle(ctx,x,y,s=1,rot=-.16){
 ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(s,s);
 rr(ctx,-50,-98,100,188,23,'rgba(232,251,253,.70)','#367e9c',7);
 rr(ctx,-22,-138,44,47,6,'#ceeef0','#367e9c',5);
 rr(ctx,-29,-151,58,20,5,C.teal);
 rr(ctx,-53,-15,106,63,6,'#b1e2cf',null);
 seg(ctx,[[-34,17],[31,17]],'#408d85',5);
 ctx.restore();
}
function net(ctx){
 ctx.save();ctx.translate(460,118);ctx.rotate(.12);
 for(let x=0;x<=260;x+=36)seg(ctx,[[x,0],[x,345]],'#f6ddba',4);
 for(let y=0;y<=345;y+=36)seg(ctx,[[0,y],[260,y]],'#f6ddba',4);
 fish(ctx,131,208,.75,C.coral,-1);
 ctx.restore();
}
function dolphin(ctx){
 ctx.save();ctx.translate(440,255);ctx.rotate(-.20);
 ctx.beginPath();
 ctx.moveTo(-210,44);ctx.bezierCurveTo(-110,-100,140,-115,231,-9);
 ctx.bezierCurveTo(260,4,283,-2,327,-27);ctx.bezierCurveTo(315,5,285,45,234,48);
 ctx.bezierCurveTo(130,127,-74,135,-210,44);ctx.closePath();
 ctx.fillStyle=C.deep;ctx.fill();
 seg(ctx,[[-60,-40],[8,-138],[61,-47]],C.deep,4,true,C.deep);
 seg(ctx,[[-205,44],[-275,-13],[-265,102],[-205,44]],C.deep,4,true,C.deep);
 ellipse(ctx,169,-8,7,7,C.white);
 ctx.restore();
 for(let k=0;k<3;k++){
  ctx.beginPath();ctx.arc(685,150,55+k*35,-.84,.84);ctx.strokeStyle=C.white;ctx.lineWidth=9;ctx.stroke();
 }
}
function beach(ctx){
 rr(ctx,0,480,1000,140,0,'#eacb93');
 ellipse(ctx,800,155,92,92,'#fff3b4');
 seg(ctx,[[200,515],[207,360],[225,318]],'#6a9275',8);
 seg(ctx,[[225,318],[301,345],[239,370],[178,348],[225,318]],'#c8e895',5,true,'#7db888');
 rr(ctx,530,458,200,104,22,'#e5a78b',C.deep,5);
 for(let k=0;k<4;k++)rr(ctx,547+k*45,465,24,85,7,'#fcf7ed');
 bottle(ctx,410,508,.50,.6);
}
function marineIllustration(ctx,def,idx,part){
 seaFrame(ctx,def.palette[1]);
 const lower=def.key==='marine-11';
 if(!lower&&idx===0){bottle(ctx,555,376,1.55,.28);fish(ctx,390,500,.8,'#f3ca63');}
 if(!lower&&idx===1)turtle(ctx,506,323,1.45);
 if(!lower&&idx===2){coral(ctx,430,600,1.45);coral(ctx,665,615,1.07);fish(ctx,530,289,.9,C.yellow);}
 if(!lower&&idx===3)net(ctx);
 if(!lower&&idx===4)beach(ctx);
 if(!lower&&idx===5){turtle(ctx,500,312,1.1);fish(ctx,740,290,.7,'#f3b67a');seg(ctx,[[680,395],[560,430],[460,385]],C.white,7); }
 if(lower&&idx===0){bottle(ctx,550,380,1.30,.17);seg(ctx,[[375,235],[700,580]],C.yellow,20);}
 if(lower&&idx===1)dolphin(ctx);
 if(lower&&idx===2){coral(ctx,310,618,1.5);coral(ctx,730,629,1.3);fish(ctx,480,280,1.1,C.yellow);}
 if(lower&&idx===3){beach(ctx);seg(ctx,[[170,455],[310,490],[435,460],[570,506]],C.deep,12);}
 if(lower&&idx===4){for(let k=0;k<6;k++)seaweed(ctx,228+k*100,600,.88+k%2*.25,'#3dba88');fish(ctx,528,225,.65,C.yellow);}
 if(lower&&idx===5){
  rr(ctx,330,188,415,325,20,'#fff8e7','#4a8295',6);
  seg(ctx,[[367,247],[523,333],[698,241]],'#d8a788',7);
  for(let k=0;k<4;k++)seg(ctx,[[388,361+k*32],[684,361+k*32]],'#a1b8b2',7);
 }
 // Stage-specific marker is visual, rather than a huge typography overlay.
 if(part===0){ellipse(ctx,850,475,56,56,'#fff0c5');txt(ctx,'!',835,426,80,C.coral);}
 if(part===1){ellipse(ctx,850,475,56,56,'#fffdf0');ellipse(ctx,835,463,24,24,null,0,C.deep,8);seg(ctx,[[851,481],[888,521]],C.deep,11);}
 if(part===2){ellipse(ctx,850,475,56,56,'#e1f6d4');seg(ctx,[[813,471],[840,496],[887,441]],C.green,16);}
}
function schoolBase(ctx,def){
 const grad=ctx.createLinearGradient(0,0,0,630);grad.addColorStop(0,'#d3ede6');grad.addColorStop(1,'#f8e6c7');
 rr(ctx,0,0,1000,620,0,grad);
 ellipse(ctx,860,98,71,71,'#ffdc7c');
 rr(ctx,0,450,1000,170,0,'#bfd3ab');
 rr(ctx,168,150,675,310,12,'#f7efd3','#236a60',8);
 rr(ctx,236,107,538,70,11,C.teal);
 for(let i=0;i<4;i++)rr(ctx,214+i*158,216,110,125,6,'#b5dae3','#5c9a94',5);
 rr(ctx,468,302,90,158,0,'#d6c79d','#4c867d',5);
 for(let i=0;i<4;i++)ellipse(ctx,50+i*278,476,67,40,'#7caf77');
}
function leaf(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ellipse(ctx,0,0,38,72,C.green,-.4);
 seg(ctx,[[26,-52],[-22,57]],'#b2d78a',5);
 ctx.restore();
}
function lightbulb(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ellipse(ctx,0,0,65,68,C.yellow,0,C.ink,8);
 rr(ctx,-32,57,64,45,6,'#c1d8d0',C.ink,5);
 seg(ctx,[[-30,9],[-6,34],[20,8]],'#ad7929',5);
 for(let k=0;k<8;k++){
  const a=k*Math.PI/4;seg(ctx,[[Math.cos(a)*90,Math.sin(a)*90],[Math.cos(a)*121,Math.sin(a)*121]],'#e6aa45',7);
 }
 ctx.restore();
}
function waterdrop(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ctx.beginPath();ctx.moveTo(0,-128);
 ctx.bezierCurveTo(-115,-12,-120,55,-54,107);
 ctx.bezierCurveTo(-10,150,90,125,111,58);
 ctx.bezierCurveTo(127,-12,65,-75,0,-128);
 ctx.closePath();ctx.fillStyle='#43a9d5';ctx.fill();ctx.lineWidth=8;ctx.strokeStyle=C.deep;ctx.stroke();
 ellipse(ctx,-27,5,14,46,'rgba(255,255,255,.68)',-.5);
 ctx.restore();
}
function bicycle(ctx,x,y,s=1){
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ellipse(ctx,-130,65,88,88,null,0,C.ink,11);
 ellipse(ctx,145,65,88,88,null,0,C.ink,11);
 seg(ctx,[[-130,65],[-10,-77],[50,65],[-130,65]],C.teal,13);
 seg(ctx,[[-10,-77],[145,65],[50,65]],C.teal,13);
 seg(ctx,[[145,65],[85,-104],[127,-120]],C.ink,9);
 seg(ctx,[[-10,-77],[-40,-119],[10,-119]],C.ink,9);
 ellipse(ctx,48,65,17,17,C.yellow);
 ctx.restore();
}
function schoolIllustration(ctx,idx,part){
 schoolBase(ctx);
 if(idx===0){
  rr(ctx,350,332,354,194,35,'#f5ca70',C.ink,9);
  rr(ctx,375,360,300,132,25,'#fff8e9','#9eb16c',6);
  ellipse(ctx,465,429,59,37,'#88bd77');ellipse(ctx,551,419,60,44,'#ed9a74');
  bottle(ctx,760,387,.65,0);
 }
 if(idx===1){
  lightbulb(ctx,530,327,1.4);
  seg(ctx,[[160,515],[248,516],[280,480]],'#efce64',16);
  seg(ctx,[[815,500],[760,500],[723,447]],'#efce64',16);
 }
 if(idx===2){waterdrop(ctx,505,348,1.47);
  seg(ctx,[[690,262],[810,262],[810,376]],C.ink,16);rr(ctx,750,256,106,38,13,'#79a4a5');}
 if(idx===3){
  for(let i=0;i<5;i++){
   rr(ctx,235+i*112,470-i%2*18,84,94,13,'#b88962',C.ink,5);
   seg(ctx,[[277+i*112,460],[277+i*112,333-i%2*70]],C.green,11);
   leaf(ctx,262+i*112,338-i%2*70,.65);leaf(ctx,298+i*112,309-i%2*70,.67);
  }
  ellipse(ctx,700,264,24,16,C.yellow);ellipse(ctx,744,235,24,16,C.coral);
 }
 if(idx===4){
  for(let i=0;i<3;i++){
   ctx.save();ctx.translate(315+i*72,360-i*50);ctx.rotate(.1-i*.08);
   rr(ctx,-72,-99,190,270,8,C.white,C.ink,4);
   for(let k=0;k<5;k++)seg(ctx,[[-36,-51+k*31],[85,-51+k*31]],'#a1c0b5',5);
   ctx.restore();
  }
  rr(ctx,635,288,211,196,12,C.teal,C.ink,6);
  rr(ctx,662,322,158,110,7,'#d6efe7');
  ellipse(ctx,735,377,40,35,C.green);
 }
 if(idx===5){bicycle(ctx,500,365,1.2);
  for(let i=0;i<3;i++){leaf(ctx,205+i*275,520,.46);}
 }
 if(part===0)ellipse(ctx,883,114,45,45,'#f9b4a4');
 if(part===1)ellipse(ctx,883,114,45,45,'#a8d9e6');
 if(part===2)ellipse(ctx,883,114,45,45,'#b4df99');
}
export function drawMuseumArtwork(ctx,def,entry,part,index){
 const ocean=def.key!=='school-11';
 const dark=def.palette[0],bright=def.palette[1],soft=def.palette[2];
 ctx.clearRect(0,0,1024,768);
 // Warm paper art board with subtle layers.
 ctx.fillStyle='#f8f6ef';ctx.fillRect(0,0,1024,768);
 ctx.save();ctx.shadowColor='rgba(20,60,50,.2)';ctx.shadowBlur=25;
 rr(ctx,32,24,960,722,19,'#fffdf7');ctx.restore();
 rr(ctx,47,39,930,109,10,dark);
 txt(ctx,'PÉTRUS KÝ  /  DISCOVERY MUSEUM',77,58,21,'#e8f5e7');
 txt(ctx,entry[1],77,92,42,C.white,'700',770);
 rr(ctx,828,55,112,59,14,soft);
 txt(ctx,String(index+1).padStart(2,'0')+' / 06',847,69,25,dark);
 ctx.save();ctx.translate(47,163);ctx.scale(.93,.91);
 if(ocean)marineIllustration(ctx,def,index,part);
 else schoolIllustration(ctx,index,part);
 ctx.restore();
 // Translucent paper scrap at lower-left of main illustration.
 ctx.save();ctx.translate(72,585);ctx.rotate(-.025);
 ctx.shadowColor='rgba(0,0,0,.11)';ctx.shadowBlur=9;
 rr(ctx,0,0,524,95,6,C.cream);ctx.restore();
 txt(ctx,['THE PROBLEM','THE EVIDENCE','OUR SOLUTION'][part],99,602,38,dark,'800',468);
 txt(ctx,entry[0].toUpperCase(),101,653,20,C.teal,'700',465);
 // Short curated English line, long explanation remains available on click.
 txt(ctx,entry[part===0?2:part===1?3:5],65,713,24,dark,'500',900);
 ctx.save();ctx.globalAlpha=.42;
 rr(ctx,68,29,98,17,3,'#f8de98');rr(ctx,865,727,75,17,3,'#f8de98');
 ctx.restore();
}
