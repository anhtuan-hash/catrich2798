import { BUILTIN_POSTER_TEMPLATES } from '../utils/posterTemplateRules.mjs';

const W=1600, H=900;
const schemes={
  halloween:['#100827','#49205f','#ff952e','#f5d8ff'],
  meeting:['#e7f0f9','#f9fbff','#285c99','#183e64'],
  teaching:['#123e37','#287d63','#ffd274','#fff7da'],
  seminar:['#f9f4e9','#e1e8ed','#b58e55','#263d54'],
  training:['#0d305a','#116ca0','#49dddf','#f5fdff'],
  extracurricular:['#351250','#c44480','#ffc761','#fff9e7'],
  general:['#edf4fc','#d4e4f5','#2463ad','#173e64'],
};
const pad=(x)=>String(x).padStart(2,'0');
const displayDate=(raw)=>{
  const d=new Date(raw||'');
  if(!Number.isFinite(d.getTime()))return 'CHƯA XÁC ĐỊNH THỜI GIAN';
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',
    day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d);
  const get=(k)=>parts.find(p=>p.type===k)?.value||'';
  return get('hour')+':'+get('minute')+'  ·  '+get('day')+'/'+get('month')+'/'+get('year');
};
function rounded(ctx,x,y,w,h,r=24){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}
function linesFor(ctx,s,maxWidth,maxLines) {
  const words=String(s||'').trim().split(/\s+/).filter(Boolean);
  const lines=[];let line='';
  for(let i=0;i<words.length;i++){
    const next=line?line+' '+words[i]:words[i];
    if(ctx.measureText(next).width>maxWidth&&line){
      lines.push(line);line=words[i];
      if(lines.length===maxLines-1){const rest=[line,...words.slice(i+1)].join(' ');line=rest;break}
    }else line=next;
  }
  if(line)lines.push(line);
  if(lines.length>maxLines)lines.length=maxLines;
  if(lines.length){
    let last=lines.length-1;
    while(ctx.measureText(lines[last]).width>maxWidth&&lines[last].length>1)lines[last]=lines[last].slice(0,-1);
    if(lines[last]!==line)lines[last]=lines[last].trimEnd()+'…';
  }
  return lines;
}
function decorate(ctx,group,accent){
  ctx.save();ctx.globalAlpha=.25;
  // Oversized circles and restrained line art on the composition's art side.
  const cx=1245,cy=465;
  for(let k=0;k<6;k++){
    ctx.beginPath();ctx.arc(cx,cy,190+k*62,0,Math.PI*2);
    ctx.strokeStyle=accent;ctx.lineWidth=k%2===0?3:1;ctx.stroke();
  }
  ctx.globalAlpha=.75;
  if(group==='halloween'){
    ctx.fillStyle='#ffcf78';ctx.beginPath();ctx.arc(1300,330,125,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#251134';ctx.beginPath();ctx.arc(1340,308,120,0,Math.PI*2);ctx.fill();
    for(const [x,y] of [[1120,545],[1290,655],[1490,490]]){
      ctx.strokeStyle='#ef9a57';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(x-70,y+24);ctx.quadraticCurveTo(x,y-45,x+70,y+24);ctx.stroke();
    }
  } else {
    ctx.globalAlpha=.16;ctx.fillStyle=accent;
    for(let i=0;i<4;i++){ctx.save();ctx.translate(1240+i*48,310+i*70);ctx.rotate(-.35);rounded(ctx,-200,-44,475,140,70);ctx.fill();ctx.restore()}
  }
  ctx.restore();
}
function paintBuiltin(ctx,template) {
  const colors=schemes[template.group]||schemes.general;
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,colors[0]);bg.addColorStop(1,colors[1]);
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  decorate(ctx,template.group,colors[2]);
  ctx.save();ctx.globalAlpha=.16;ctx.fillStyle=colors[2];
  ctx.beginPath();ctx.arc(-80,H+30,350,0,Math.PI*2);ctx.fill();ctx.restore();
}
function coverDraw(ctx,img){
  const scale=Math.max(W/img.width,H/img.height);
  const dw=img.width*scale,dh=img.height*scale;
  ctx.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);
}
async function paintUploaded(ctx,url){
  const res=await fetch(url,{cache:'no-store'});
  if(!res.ok)throw new Error('Không thể đọc nền poster mẫu ('+res.status+').');
  const blob=await res.blob();
  const local=URL.createObjectURL(blob);
  try{
    const img=await new Promise((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Không đọc được ảnh nền poster.'));
      image.src=local;
    });
    coverDraw(ctx,img);
  }finally{URL.revokeObjectURL(local)}
}
function veil(ctx,tone,side){
  const dark=tone!=='light';
  const shadow=dark?'7,13,28':'245,249,255';
  const strong=dark?.86:.94;
  const mid=dark?.57:.75;
  const fill=ctx.createLinearGradient(side==='right'?W:0,0,side==='right'?0:W,0);
  if(side==='center'){
    const centered=ctx.createLinearGradient(0,0,0,H);
    centered.addColorStop(0,'rgba('+shadow+',.82)');
    centered.addColorStop(.65,'rgba('+shadow+',.63)');
    centered.addColorStop(1,'rgba('+shadow+',.90)');
    ctx.fillStyle=centered;
  } else {
    fill.addColorStop(0,'rgba('+shadow+','+strong+')');
    fill.addColorStop(.58,'rgba('+shadow+','+mid+')');
    fill.addColorStop(1,'rgba('+shadow+',.01)');
    ctx.fillStyle=fill;
  }
  ctx.fillRect(0,0,W,H);
}
function write(ctx,event,template){
  const dark=template.tone!=='light',side=template.side||'left';
  const color=dark?'#ffffff':'#153656',muted=dark?'#d7e9f2':'#46627a';
  const accent=dark?'#ffd287':'#1e70bd';
  const right=side==='right',center=side==='center';
  const x=center?W/2:right?W-110:110;
  const align=center?'center':right?'right':'left';
  const maxWidth=center?1250:970;
  ctx.textAlign=align;ctx.textBaseline='alphabetic';
  ctx.fillStyle=accent;ctx.font='800 26px system-ui,-apple-system,Arial';
  ctx.fillText('BRIAN ENGLISH   /   EVENT CENTER',x,106);
  ctx.fillStyle=muted;ctx.font='600 23px system-ui,-apple-system,Arial';
  ctx.fillText((event.organizer||'TỔ TIẾNG ANH THPT').toLocaleUpperCase('vi-VN').slice(0,62),x,150);
  ctx.fillStyle=accent;ctx.font='800 26px system-ui,-apple-system,Arial';
  ctx.fillText((event.category||'SỰ KIỆN').toLocaleUpperCase('vi-VN'),x,229,maxWidth);
  const title=String(event.title||'').trim()||'Sự kiện của nhà trường';
  let size=73,lines;
  for(;size>=47;size-=2){
    ctx.font='800 '+size+'px system-ui,-apple-system,Arial';
    lines=linesFor(ctx,title,maxWidth,4);
    if(lines.length*(size*1.22)<=340)break;
  }
  ctx.fillStyle=color;
  let y=319;
  for(const text of lines){ctx.fillText(text,x,y,maxWidth);y+=size*1.20}
  y=Math.max(638,y+36);
  ctx.fillStyle=accent;ctx.font='800 28px system-ui,-apple-system,Arial';
  ctx.fillText(displayDate(event.event_start_at),x,y,maxWidth);
  if(event.venue_name){
    ctx.fillStyle=muted;ctx.font='600 25px system-ui,-apple-system,Arial';
    const place=linesFor(ctx,'Địa điểm: '+String(event.venue_name),maxWidth,2);
    let lineY=y+50;
    for(const line of place){ctx.fillText(line,x,lineY,maxWidth);lineY+=34}
  }
  ctx.fillStyle=muted;ctx.font='600 18px system-ui,-apple-system,Arial';
  ctx.fillText('TRÂN TRỌNG KÍNH MỜI   •   '+(event.school_year||'NĂM HỌC'),x,823,maxWidth);
  ctx.save();ctx.strokeStyle=accent;ctx.globalAlpha=.5;ctx.lineWidth=2;ctx.beginPath();
  if(right){ctx.moveTo(W-110,861);ctx.lineTo(W-670,861)}
  else if(center){ctx.moveTo(600,861);ctx.lineTo(1000,861)}
  else {ctx.moveTo(110,861);ctx.lineTo(670,861)}
  ctx.stroke();ctx.restore();
}
export async function renderEventPosterFile(event,template=BUILTIN_POSTER_TEMPLATES[0],signedUrl='') {
  if(typeof document==='undefined')throw new Error('Cần trình duyệt để dựng poster.');
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Không thể khởi tạo canvas.');
  if(template.source==='uploaded') {
    if(!signedUrl)throw new Error('Poster mẫu chưa có liên kết ảnh hợp lệ.');
    await paintUploaded(ctx,signedUrl);
  }else paintBuiltin(ctx,template);
  veil(ctx,template.tone,template.side);
  write(ctx,event,template);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob((result)=>result?resolve(result):reject(new Error('Không xuất được ảnh poster.')),'image/png'));
  if(blob.size>10*1024*1024)throw new Error('Poster vượt quá giới hạn 10MB.');
  return new File([blob],'brian-event-'+Date.now()+'.png',{type:'image/png'});
}
