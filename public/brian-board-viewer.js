/** Read-only local classroom display. No auth tokens, AI, SQL, or teacher notes. */
const params=new URLSearchParams(location.hash.slice(1));
const token=params.get('board')||'';
const svg=document.getElementById('svg'),status=document.getElementById('status');
const title=document.getElementById('title'),notice=document.getElementById('notice');
const ns='http://www.w3.org/2000/svg';
const make=(name,attrs={})=>{
 const el=document.createElementNS(ns,name);
 for(const [key,value] of Object.entries(attrs))if(value!==undefined&&value!==null)
   el.setAttribute(key,String(value));
 return el;
};
function add(parent,el){parent.appendChild(el);return el;}
function drawing(o){
 if(!o||typeof o!=='object')return null;
 const visible=o.studentVisible!==false&&o.teacherOnly!==true;
 if(!visible)return null;
 if(o.kind==='stroke'&&Array.isArray(o.points)){
  const pts=o.points.slice(0,10000).map(p=>[Number(p.x)||0,Number(p.y)||0]);
  const d=pts.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ');
  return make('path',{d,stroke:o.color||'#355c63','stroke-width':o.width||4,
   'stroke-linecap':'round','stroke-linejoin':'round',fill:'none',opacity:o.opacity??1});
 }
 if(o.kind==='shape'){
  const base={fill:'none',stroke:o.color||'#355c63','stroke-width':o.width||4};
  if(o.shape==='ellipse')return make('ellipse',{...base,cx:(o.x+o.x2)/2,cy:(o.y+o.y2)/2,rx:Math.abs(o.x2-o.x)/2,ry:Math.abs(o.y2-o.y)/2});
  if(o.shape==='line')return make('line',{...base,x1:o.x,y1:o.y,x2:o.x2,y2:o.y2});
  return make('rect',{...base,x:Math.min(o.x,o.x2),y:Math.min(o.y,o.y2),width:Math.abs(o.x2-o.x),height:Math.abs(o.y2-o.y),rx:5});
 }
 if(o.kind==='mask')return make('rect',{x:o.x,y:o.y,width:o.width||240,height:o.height||90,rx:9,fill:'#243b4b'});
 if(o.kind==='text'){
  const el=make('text',{x:o.x,y:o.y,fill:o.color||'#355c63','font-size':o.fontSize||40,'font-weight':550});
  el.textContent=String(o.text||'').slice(0,90);return el;
 }
 if(o.kind==='sticky'||o.kind==='flashcard'){
  const g=make('g'),x=Number(o.x)||0,y=Number(o.y)||0;
  add(g,make('rect',{x,y:y-24,width:360,height:125,rx:14,fill:'#e9f0e1',stroke:'#94b2a2'}));
  const el=add(g,make('text',{x:x+12,y:y+29,fill:'#355c63','font-size':25}));
  el.textContent=String(o.text||'').slice(0,27);return g;
 }
 if(o.kind==='image'&&/^data:image\/(png|jpeg|webp);base64,/i.test(o.src||'')){
  return make('image',{href:o.src,x:o.x,y:o.y,width:o.width||500,height:o.height||300});
 }
 return null;
}
function render(data){
 if(data?.schema!==1||data?.type!=='state')return;
 svg.replaceChildren();
 document.body.style.background=data.theme==='midnight'?'#101f29':'#e2ebe6';
 document.getElementById('board').style.background=data.theme==='midnight'?'#15252d':
  data.theme==='classroom'?'#eaf2ec':'#fbfaf6';
 title.textContent=String(data.title||'Brian Board').slice(0,180);
 if(!data.page){notice.style.display='block';notice.textContent='This page is hidden from students.';}
 else{
  notice.style.display='none';
  (Array.isArray(data.page.objects)?data.page.objects:[]).slice(0,3000).forEach(o=>{
   const el=drawing(o);if(el)add(svg,el);
  });
 }
 status.textContent='Live · '+new Date().toLocaleTimeString();
}
if(!/^[0-9a-f]{36}$/.test(token)||!('BroadcastChannel' in window)){
 status.textContent='Invalid local presentation session';
 notice.style.display='block';
}else{
 const bus=new BroadcastChannel('bbd-local-'+token);
 bus.onmessage=event=>{
  if(event.data?.type==='end'){
   svg.replaceChildren();notice.style.display='block';notice.textContent='Presentation ended.';
   status.textContent='Disconnected';return;
  }
  render(event.data);
 };
 bus.postMessage({type:'request'});
 const retry=setInterval(()=>{if(!document.hidden)bus.postMessage({type:'request'});},3000);
 window.addEventListener('beforeunload',()=>{clearInterval(retry);bus.close();});
}
