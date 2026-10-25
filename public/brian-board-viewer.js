/** Read-only local classroom display. No auth tokens, AI, SQL, or teacher notes. */
const params=new URLSearchParams(location.hash.slice(1));
const token=params.get('board')||'';
const svg=document.getElementById('svg'),status=document.getElementById('status');
const title=document.getElementById('title'),notice=document.getElementById('notice');
const activityBox=document.getElementById('activity');
const ns='http://www.w3.org/2000/svg';
const make=(name,attrs={})=>{
 const el=document.createElementNS(ns,name);
 for(const [key,value] of Object.entries(attrs))if(value!==undefined&&value!==null)
   el.setAttribute(key,String(value));
 return el;
};
function add(parent,el){parent.appendChild(el);return el;}
function viewerSmoothPath(points=[]){
 if(!points.length)return '';
 if(points.length===1)return 'M '+points[0].x+' '+points[0].y+' l 0.01 0.01';
 if(points.length===2)return 'M '+points[0].x+' '+points[0].y+' L '+points[1].x+' '+points[1].y;
 let d='M '+points[0].x+' '+points[0].y;
 for(let i=1;i<points.length-1;i++){
  const a=points[i],b=points[i+1];
  d+=' Q '+a.x+' '+a.y+' '+((a.x+b.x)/2).toFixed(1)+' '+((a.y+b.y)/2).toFixed(1);
 }
 const last=points.at(-1);return d+' L '+last.x+' '+last.y;
}
function viewerShapeGeometry(o){
 const a=Number(o.x)||0,b=Number(o.y)||0,c=Number(o.x2)||0,d=Number(o.y2)||0;
 if(o.shape==='triangle')return {type:'polygon',points:[[(a+c)/2,Math.min(b,d)],[Math.max(a,c),Math.max(b,d)],[Math.min(a,c),Math.max(b,d)]]};
 if(o.shape==='arrow'){
  const angle=Math.atan2(d-b,c-a),size=Math.min(45,Math.max(16,Math.hypot(c-a,d-b)*.16));
  const left=[c-size*Math.cos(angle-Math.PI/6),d-size*Math.sin(angle-Math.PI/6)];
  const right=[c-size*Math.cos(angle+Math.PI/6),d-size*Math.sin(angle+Math.PI/6)];
  return {type:'polyline',points:[[a,b],[c,d],left,[c,d],right]};
 }
 return null;
}
function drawing(o){
 if(!o||typeof o!=='object')return null;
 const visible=o.studentVisible!==false&&o.teacherOnly!==true;
 if(!visible)return null;
 if(o.kind==='stroke'&&Array.isArray(o.points)){
  const pts=o.points.slice(0,4000);
  if(o.pressureSensitive===true&&pts.length>1){
   const group=make('g',{opacity:o.opacity??1}),step=Math.max(1,Math.ceil((pts.length-1)/300));
   for(let i=0;i<pts.length-1;i+=step){
    const a=pts[i],b=pts[Math.min(pts.length-1,i+step)];
    const press=x=>Math.min(1,Math.max(.05,Number(x.pressure)||.5));
    const width=Math.max(.65,(Number(o.width)||4)*(.35+1.15*(press(a)+press(b))/2));
    add(group,make('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:o.color||'#355c63',
     'stroke-width':width,'stroke-linecap':'round'}));
   }
   return group;
  }
  const d=o.smoothed===true?viewerSmoothPath(pts):
   pts.map((p,i)=>(i?'L':'M')+(Number(p.x)||0)+' '+(Number(p.y)||0)).join(' ');
  return make('path',{d,stroke:o.color||'#355c63','stroke-width':o.width||4,
   'stroke-linecap':'round','stroke-linejoin':'round',fill:'none',opacity:o.opacity??1});
 }
 if(o.kind==='shape'){
  const base={fill:/^#[0-9a-fA-F]{6}$/.test(o.fill||'')?o.fill:'none',stroke:o.color||'#355c63','stroke-width':o.width||4};
  const geometry=viewerShapeGeometry(o);
  if(geometry)return make(geometry.type==='polygon'?'polygon':'polyline',{...base,
   fill:geometry.type==='polyline'?'none':base.fill,
   points:geometry.points.map(p=>p.join(',')).join(' ')});
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
  el.textContent=String(o.text||'').slice(0,27);
  if(o.kind==='flashcard'){
   const ans=add(g,make('text',{x:x+12,y:y+72,fill:'#618371','font-size':18}));
   ans.textContent=o.revealed?String(o.publicAnswer||'').slice(0,29):'Tap to reveal';
  }
  return g;
 }
 if(o.kind==='image'&&/^data:image\/(png|jpeg|webp);base64,/i.test(o.src||'')){
  return make('image',{href:o.src,x:o.x,y:o.y,width:o.width||500,height:o.height||300});
 }
 return null;
}
function renderPublicActivity(activity){
 activityBox.replaceChildren();
 if(!activity||!['matching','ordering','sorting'].includes(activity.type)){
  activityBox.hidden=true;svg.style.display='block';return;
 }
 activityBox.hidden=false;svg.style.display='none';
 const h=document.createElement('h2');h.textContent=String(activity.title||'Class activity').slice(0,130);
 activityBox.appendChild(h);
 if(activity.prompt){const p=document.createElement('p');p.textContent=String(activity.prompt).slice(0,130);activityBox.appendChild(p);}
 const container=document.createElement('div');container.className='choices';
 const section=(heading,values)=>{
  const box=document.createElement('section');box.className='group';
  const title=document.createElement('strong');title.textContent=heading;box.appendChild(title);
  (Array.isArray(values)?values:[]).slice(0,24).forEach((label,i)=>{
   const item=document.createElement('div');item.className='choice';
   item.textContent=String(i+1)+'. '+String(label||'').slice(0,130);
   box.appendChild(item);
  });
  container.appendChild(box);
 };
 section(activity.type==='ordering'?'Arrange the words':'Prompts',activity.labels);
 if(activity.type==='matching')section('Answers',activity.options);
 if(activity.type==='sorting')section('Categories',activity.categories);
 activityBox.appendChild(container);
}
function render(data){
 if(data?.schema!==1||data?.type!=='state')return;
 svg.replaceChildren();
 if(data.page?.background==='dots'){
  const g=add(svg,make('g',{opacity:.65,fill:'#abc2b5'}));
  for(let y=18;y<900;y+=36)for(let x=18;x<1600;x+=36)add(g,make('circle',{cx:x,cy:y,r:1.4}));
 }else if(data.page?.background==='grid'){
  const g=add(svg,make('g',{stroke:'#b4c9c0','stroke-width':1,opacity:.7}));
  for(let x=0;x<=1600;x+=38)add(g,make('line',{x1:x,y1:0,x2:x,y2:900}));
  for(let y=0;y<=900;y+=38)add(g,make('line',{x1:0,y1:y,x2:1600,y2:y}));
 }else if(data.page?.background==='lines'){
  const g=add(svg,make('g',{stroke:'#b4c9c0','stroke-width':1,opacity:.7}));
  for(let y=38;y<=900;y+=38)add(g,make('line',{x1:0,y1:y,x2:1600,y2:y}));
 }
 document.body.style.background=data.theme==='midnight'?'#101f29':'#e2ebe6';
 document.getElementById('board').style.background=data.theme==='midnight'?'#15252d':
  data.theme==='classroom'?'#eaf2ec':'#fbfaf6';
 title.textContent=String(data.title||'Brian Board').slice(0,180);
 renderPublicActivity(data.page?data.activity:null);
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
   renderPublicActivity(null);
   status.textContent='Disconnected';return;
  }
  render(event.data);
 };
 bus.postMessage({type:'request'});
 const retry=setInterval(()=>{if(!document.hidden)bus.postMessage({type:'request'});},3000);
 window.addEventListener('beforeunload',()=>{clearInterval(retry);bus.close();});
}
