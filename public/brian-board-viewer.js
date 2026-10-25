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
 if(o.kind==='mask')return o.revealed?null:make('rect',{x:o.x,y:o.y,width:o.width||240,height:o.height||90,rx:9,fill:'#243b4b'});
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
function renderPublicActivity(activity,live=null){
 activityBox.replaceChildren();
 const types=['matching','ordering','sorting','hotspot','drag_label','cloze_snap',
  'error_detective','evidence_hunter','four_corners','flashcard_duel','mystery_reveal',
  'stress_tap','concept_connection'];
 if(!activity||!types.includes(activity.type)){
  activityBox.hidden=true;svg.style.display='block';return;
 }
 activityBox.hidden=false;svg.style.display='none';
 const text=(tag,value,cls)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.textContent=String(value??'').slice(0,2500);return el;
 };
 const heading=text('h2',activity.title||'Class activity');
 activityBox.appendChild(heading);
 if(activity.prompt)activityBox.appendChild(text('p',activity.prompt));
 const index=Math.max(0,Math.min((activity.items?.length||activity.labels?.length||1)-1,Number(live?.index)||0));
 const item=activity.items?.[index];
 const special=['matching','ordering','sorting'].includes(activity.type);
 const content=document.createElement('div');content.className='tv-lab';
 if(!special)content.appendChild(text('p','Challenge '+(index+1)+' / '+(activity.items?.length||activity.labels?.length||1),'tv-progress'));
 if(!special&&live?.seconds!=null)content.appendChild(text('p','Time: '+Math.floor(live.seconds/60)+':'+String(live.seconds%60).padStart(2,'0'),'tv-progress'));
 if(live?.scores?.length){
  const scores=document.createElement('div');scores.className='tv-scores';
  live.scores.forEach(row=>scores.appendChild(text('span',row.name+'  '+row.score)));
  content.appendChild(scores);
 }
 const list=(heading,values)=>{
  const group=document.createElement('section');group.className='group';
  group.appendChild(text('strong',heading));
  (Array.isArray(values)?values:[]).slice(0,24).forEach((value,i)=>{
   group.appendChild(text('div',(i+1)+'. '+String(value??''),'choice'));
  });
  content.appendChild(group);
 };
 const photograph=(mystery=false)=>{
  const frame=document.createElement('div');frame.className='tv-photo';
  if(activity.image){
   const pic=document.createElement('img');pic.src=activity.image;pic.alt='Classroom image';
   frame.appendChild(pic);
  }else frame.appendChild(text('div','Interactive classroom picture','tv-photo-placeholder'));
  if(activity.type==='drag_label'){
   (activity.items||[]).forEach((target,i)=>{
    const dot=text('span',i+1,'tv-pin');
    dot.style.left=target.x+'%';dot.style.top=target.y+'%';frame.appendChild(dot);
   });
  }
  if(mystery&&!live?.revealed){
   for(let i=0;i<16;i++){
    const tile=text('span',i+1,'tv-cover');
    tile.style.left=(i%4*25)+'%';tile.style.top=(Math.floor(i/4)*25)+'%';
    if(live?.opened?.includes(i))tile.classList.add('open');
    frame.appendChild(tile);
   }
  }
  content.appendChild(frame);
 };
 if(special){
  list(activity.type==='ordering'?'Reorder these pieces':'Prompts',activity.labels);
  if(activity.type==='matching')list('Answer bank',activity.options);
  if(activity.type==='sorting')list('Categories',activity.categories);
 }else if(activity.type==='hotspot'){
  content.appendChild(text('p',item?.label||activity.labels?.[index],'tv-question'));
  photograph();
 }else if(activity.type==='drag_label'){
  list('Drag each label to a numbered position',activity.labels);
  photograph();
 }else if(activity.type==='cloze_snap'){
  content.appendChild(text('p',activity.labels?.[index],'tv-question'));list('Word bank',activity.options);
 }else if(activity.type==='error_detective'){
  content.appendChild(text('p',item?.label,'tv-question'));list('Possible corrections',item?.options);
 }else if(activity.type==='evidence_hunter'){
  content.appendChild(text('p',activity.passage,'tv-passage'));
  content.appendChild(text('p',item?.label,'tv-question'));
  list('Answers',item?.options);
 }else if(activity.type==='four_corners'){
  content.appendChild(text('p',item?.label,'tv-question'));
  const corners=document.createElement('div');corners.className='tv-corners';
  (item?.options||[]).forEach((value,i)=>corners.appendChild(text('div','ABCD'[i]+'. '+value,'tv-corner tv-corner-'+i)));
  content.appendChild(corners);
 }else if(activity.type==='flashcard_duel'){
  content.appendChild(text('p',item?.label,'tv-flashcard'));
 }else if(activity.type==='mystery_reveal'){
  content.appendChild(text('p',item?.label,'tv-question'));photograph(true);
 }else if(activity.type==='stress_tap'){
  list('Select the primary stressed syllable',item?.syllables);
 }else if(activity.type==='concept_connection'){
  list('Concept nodes',activity.labels);list('Relations',activity.categories);
 }
 activityBox.appendChild(content);
}
let pointerState=null;
function renderPointer(update){
 const old=svg.querySelector('#bbd-tv-pointer');old?.remove();
 if(!update?.point)return;
 const point=update.point;
 const x=Number(point.x),y=Number(point.y);
 if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>100000||Math.abs(y)>100000)return;
 const view=svg.viewBox.baseVal;
 const g=add(svg,make('g',{id:'bbd-tv-pointer','pointer-events':'none'}));
 if(update.mode==='spotlight'){
  const defs=add(g,make('defs')),mask=add(defs,make('mask',{id:'bbd-tv-pointer-mask'}));
  add(mask,make('rect',{x:view.x-100,y:view.y-100,width:view.width+200,height:view.height+200,fill:'#fff'}));
  add(mask,make('circle',{cx:x,cy:y,r:145,fill:'#000'}));
  add(g,make('rect',{x:view.x-100,y:view.y-100,width:view.width+200,height:view.height+200,
   fill:'#040a11','fill-opacity':'.78',mask:'url(#bbd-tv-pointer-mask)'}));
  add(g,make('circle',{cx:x,cy:y,r:145,fill:'none',stroke:'#f8d88d','stroke-width':3}));
 }else{
  add(g,make('circle',{cx:x,cy:y,r:13,fill:'#ff4b69',stroke:'#fff','stroke-width':4}));
  add(g,make('circle',{cx:x,cy:y,r:29,fill:'none',stroke:'#ff4b69','stroke-opacity':'.45','stroke-width':4}));
 }
}
function render(data){
 if(data?.schema!==1||data?.type!=='state')return;
 const raw=data.viewport||{},num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
 const w=Math.max(200,Math.min(10000,num(raw.width,1600))),
  h=Math.max(112.5,Math.min(10000,num(raw.height,900))),
  x=Math.max(-100000,Math.min(100000,num(raw.x,0))),
  y=Math.max(-100000,Math.min(100000,num(raw.y,0)));
 svg.setAttribute('viewBox',[x,y,w,h].join(' '));
 svg.replaceChildren();
 const defs=add(svg,make('defs')),pattern=add(defs,make('pattern',{
  id:'bbd-tv-grid',width:38,height:38,patternUnits:'userSpaceOnUse'}));
 if(data.page?.background==='grid'){
  add(pattern,make('path',{d:'M 38 0 L 0 0 0 38',fill:'none',stroke:'#b4c9c0','stroke-width':1}));
  add(svg,make('rect',{x,y,width:w,height:h,fill:'url(#bbd-tv-grid)',opacity:.75}));
 }else if(data.page?.background==='lines'){
  add(pattern,make('line',{x1:0,y1:37,x2:38,y2:37,stroke:'#b4c9c0','stroke-width':1}));
  add(svg,make('rect',{x,y,width:w,height:h,fill:'url(#bbd-tv-grid)',opacity:.75}));
 }else if(data.page?.background==='dots'){
  add(pattern,make('circle',{cx:18,cy:18,r:1.4,fill:'#abc2b5'}));
  add(svg,make('rect',{x,y,width:w,height:h,fill:'url(#bbd-tv-grid)',opacity:.75}));
 }
 document.body.style.background=data.theme==='midnight'?'#101f29':'#e2ebe6';
 document.getElementById('board').style.background=data.theme==='midnight'?'#15252d':
  data.theme==='classroom'?'#eaf2ec':'#fbfaf6';
 title.textContent=String(data.title||'Brian Board').slice(0,180);
 renderPublicActivity(data.page?data.activity:null,data.live);
 if(!data.page){notice.style.display='block';notice.textContent='This page is hidden from students.';}
 else{
  notice.style.display='none';
  (Array.isArray(data.page.objects)?data.page.objects:[]).slice(0,3000).forEach(o=>{
   const el=drawing(o);if(el)add(svg,el);
  });
 }
 renderPointer(pointerState);
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
   renderPublicActivity(null);pointerState=null;
   status.textContent='Disconnected';return;
  }
  if(event.data?.type==='pointer'){
   const next=event.data;
   pointerState=next?.point?{point:{x:Number(next.point.x),y:Number(next.point.y)},
    mode:next.mode==='spotlight'?'spotlight':'laser'}:null;
   renderPointer(pointerState);return;
  }
  render(event.data);
 };
 bus.postMessage({type:'request'});
 const retry=setInterval(()=>{if(!document.hidden)bus.postMessage({type:'request'});},3000);
 window.addEventListener('beforeunload',()=>{clearInterval(retry);bus.close();});
}
