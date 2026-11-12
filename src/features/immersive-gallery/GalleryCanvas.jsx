import React,{useEffect,useRef,useState} from 'react';
import {ROOM_TEMPLATES,useLiteQuality} from './sceneTemplates.js';

// Dependency-free WebGL room renderer. No new npm dependencies or Hobby build overhead.
// Scene is rendered on demand, with a reduced frame budget for mobile GPUs.
// R3F / real glTF model loader remains a tracked R1 gap (see GALLERY_QA_REPORT.md).
const VERT=`attribute vec3 aPosition; attribute vec3 aColor; uniform mat4 uMatrix; varying vec3 vColor; void main(){vColor=aColor;gl_Position=uMatrix*vec4(aPosition,1.0);}`;
const FRAG=`precision mediump float; varying vec3 vColor; void main(){gl_FragColor=vec4(vColor,1.0);}`;
function rgb(h){const c=String(h||'#e4ded5').replace('#','');return [0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255||0);}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function norm(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l);}
function lookAt(eye,target){const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function matmul(a,b){const o=new Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)o[col*4+row]+=a[k*4+row]*b[col*4+k];return o;}
function project(mat,p,w,h){const x=p[0],y=p[1],z=p[2],v=[x,y,z,1],o=[0,0,0,0];for(let row=0;row<4;row++)for(let col=0;col<4;col++)o[row]+=mat[col*4+row]*v[col];if(o[3]<=0.01)return null;return [(o[0]/o[3]+1)*w/2,(1-o[1]/o[3])*h/2];}
function quad(out,a,b,c,d,color){const col=rgb(color);for(const p of [a,b,c,a,c,d])out.push(...p,...col);}
function box(out,cx,cy,cz,w,h,d,color){const x=cx,y=cy,z=cz,X=w/2,Y=h/2,Z=d/2;
  quad(out,[x-X,y-Y,z+Z],[x+X,y-Y,z+Z],[x+X,y+Y,z+Z],[x-X,y+Y,z+Z],color);
  quad(out,[x+X,y-Y,z-Z],[x-X,y-Y,z-Z],[x-X,y+Y,z-Z],[x+X,y+Y,z-Z],color);
  quad(out,[x-X,y-Y,z-Z],[x-X,y-Y,z+Z],[x-X,y+Y,z+Z],[x-X,y+Y,z-Z],color);
  quad(out,[x+X,y-Y,z+Z],[x+X,y-Y,z-Z],[x+X,y+Y,z-Z],[x+X,y+Y,z+Z],color);
  quad(out,[x-X,y+Y,z+Z],[x+X,y+Y,z+Z],[x+X,y+Y,z-Z],[x-X,y+Y,z-Z],color);
  quad(out,[x-X,y-Y,z-Z],[x+X,y-Y,z-Z],[x+X,y-Y,z+Z],[x-X,y-Y,z+Z],color);
}
function roomGeometry(template,exhibits,selectedId){
 const theme=ROOM_TEMPLATES[template]||ROOM_TEMPLATES.classic;const out=[];
 quad(out,[-7,0,9],[7,0,9],[7,0,-9],[-7,0,-9],theme.floor);
 quad(out,[-7,6,-9],[7,6,-9],[7,6,9],[-7,6,9],theme.ceiling);
 quad(out,[-7,0,-9],[7,0,-9],[7,6,-9],[-7,6,-9],theme.wall);
 quad(out,[-7,0,9],[-7,0,-9],[-7,6,-9],[-7,6,9],theme.wall);
 quad(out,[7,0,-9],[7,0,9],[7,6,9],[7,6,-9],theme.wall);
 // architectural trim, wall piers, pedestal, skylight.
 for(let i=-6;i<=6;i+=3){box(out,i,0.22,-8.8,0.12,0.42,0.22,theme.accent);box(out,i,5.76,-8.8,0.12,0.20,0.22,'#ffffff');}
 box(out,0,5.93,0,4,0.04,5,'#fdfdf8');
 if(template==='culture'){for(const x of [-5,5])box(out,x,3,-8.75,0.3,5.8,0.45,theme.accent);}
 if(template==='lab'){for(const x of [-3,3]){box(out,x,0.3,-3,1.6,0.6,1.7,'#eef2f6');box(out,x,0.65,-3,1.7,0.12,1.8,theme.accent);}}
 for(const e of exhibits.slice(0,30)){
  const p=e.transform?.position||[0,2,-7.72],s=e.transform?.scale||[1,1,1];
  const x=p[0],y=p[1],z=p[2],w=1.6*s[0],h=1.3*s[1];
  const hue=e.id===selectedId?'#f2af5e':theme.accent;
  box(out,x,y,z, w+0.17,h+0.17,0.08,hue);
  box(out,x,y,z+0.052,w,h,0.045,e.kind==='model'?'#cad9c4':'#fdf7ef');
  if(e.kind==='model'){box(out,x,y,z+0.14,w*0.45,h*0.6,0.22,theme.accent);}
  else {box(out,x,y,z+0.10,w*0.72,h*0.06,0.025,theme.accent);box(out,x,y-0.22*h,z+0.105,w*0.6,h*0.035,0.025,'#d9cebd');}
 }
 return new Float32Array(out);
}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'WebGL shader error');return s;}
export default function GalleryCanvas({template='classic',exhibits=[],selectedId='',onSelect,quality='auto',language='vi',resetKey=0}){
 const node=useRef(null),state=useRef(null),[error,setError]=useState(''),[coords,setCoords]=useState({x:0,z:5}),[view,setView]=useState(false);
 const mode=useLiteQuality(quality);
 useEffect(()=>{
  const canvas=node.current;if(!canvas)return undefined;
  let gl;try{gl=canvas.getContext('webgl',{antialias:mode!=='lite',alpha:false,preserveDrawingBuffer:false,depth:true});if(!gl)throw new Error('WebGL unavailable');}
  catch(e){setError(e.message);return undefined;}
  let program,buffer,vertex,fragment;let dead=false,raf=0,dirty=true,lastFrame=0;
  const camera={x:0,z:5,yaw:0,pitch:0},keys=new Set();state.current={camera,keys};
  let mat=perspective(Math.PI/3,1,0.05,75),points=[],drag=false,lastPoint=null,moved=false;
  const lost=e=>{e.preventDefault();setError('Kết nối đồ hoạ gián đoạn. Hãy chọn chế độ danh sách 2D.');};
  canvas.addEventListener('webglcontextlost',lost);
  try {
   vertex=shader(gl,gl.VERTEX_SHADER,VERT);fragment=shader(gl,gl.FRAGMENT_SHADER,FRAG);
   program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'WebGL link error');
   buffer=gl.createBuffer();gl.useProgram(program);
   const geometry=roomGeometry(template,exhibits,selectedId);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,geometry,gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(program,'aPosition'),col=gl.getAttribLocation(program,'aColor');
   gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);
   gl.enableVertexAttribArray(col);gl.vertexAttribPointer(col,3,gl.FLOAT,false,24,12);
   gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.94,.94,.91,1);
   const update=ts=>{
    if(dead)return;
    const fps=mode==='lite'?30:60;
    if(ts-lastFrame<1000/fps){raf=requestAnimationFrame(update);return;}
    const dt=Math.min(.05,(ts-lastFrame)/1000)||.016;lastFrame=ts;
    if(document.visibilityState==='hidden'){raf=requestAnimationFrame(update);return;}
    const speed=(keys.has('Shift')?4.5:2.7)*dt;
    const forward=Number(keys.has('w')||keys.has('ArrowUp'))-Number(keys.has('s')||keys.has('ArrowDown'));
    const sideways=Number(keys.has('d')||keys.has('ArrowRight'))-Number(keys.has('a')||keys.has('ArrowLeft'));
    if(forward||sideways){camera.x=Math.max(-6,Math.min(6,camera.x+(Math.sin(camera.yaw)*forward+Math.cos(camera.yaw)*sideways)*speed));camera.z=Math.max(-7,Math.min(8,camera.z+(-Math.cos(camera.yaw)*forward+Math.sin(camera.yaw)*sideways)*speed));dirty=true;}
    if(dirty){
     const dpr=Math.min(window.devicePixelRatio||1,mode==='high'?1.7:mode==='lite'?1:1.3);
     const w=Math.min(1600,Math.max(1,Math.floor(canvas.clientWidth*dpr))),h=Math.min(1100,Math.max(1,Math.floor(canvas.clientHeight*dpr)));
     if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
     gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
     const eye=[camera.x,1.7,camera.z],target=[camera.x+Math.sin(camera.yaw),1.7+camera.pitch,camera.z-Math.cos(camera.yaw)];
     mat=matmul(perspective(Math.PI/3,w/h,.05,75),lookAt(eye,target));
     gl.uniformMatrix4fv(gl.getUniformLocation(program,'uMatrix'),false,new Float32Array(mat));
     gl.drawArrays(gl.TRIANGLES,0,geometry.length/6);
     points=exhibits.map(e=>{const p=e.transform?.position||[0,2,-7.72];return{id:e.id,point:project(mat,p,w,h)}}).filter(p=>p.point);
     setCoords({x:+camera.x.toFixed(1),z:+camera.z.toFixed(1)});dirty=false;
    }
    raf=requestAnimationFrame(update);
   };
   const keydown=e=>{if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift'].includes(e.key)){keys.add(e.key);dirty=true;if(e.key.startsWith('Arrow'))e.preventDefault();}};
   const keyup=e=>{keys.delete(e.key);};
   const down=e=>{if(e.button!==0&&e.pointerType==='mouse')return;drag=true;moved=false;lastPoint=[e.clientX,e.clientY];canvas.setPointerCapture?.(e.pointerId);};
   const move=e=>{if(!drag||!lastPoint)return;const dx=e.clientX-lastPoint[0],dy=e.clientY-lastPoint[1];if(Math.abs(dx)+Math.abs(dy)>2)moved=true;camera.yaw+=dx*0.006;camera.pitch=Math.max(-.55,Math.min(.55,camera.pitch-dy*.003));lastPoint=[e.clientX,e.clientY];dirty=true;};
   const up=e=>{if(!drag)return;drag=false;if(!moved){const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;const closest=points.map(p=>({id:p.id,d:Math.hypot(p.point[0]-x,p.point[1]-y)})).sort((a,b)=>a.d-b.d)[0];if(closest?.d<75)onSelect?.(closest.id);}};
   const wheel=e=>{e.preventDefault();camera.z=Math.max(-7,Math.min(8,camera.z+Math.sign(e.deltaY)*.35));dirty=true;};
   const mark=()=>{dirty=true;};const resize=new ResizeObserver(mark);resize.observe(canvas);
   window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
   const onBlur=()=>keys.clear();window.addEventListener('blur',onBlur);
   raf=requestAnimationFrame(update);setView(true);
   return()=>{dead=true;cancelAnimationFrame(raf);resize.disconnect();window.removeEventListener('blur',onBlur);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('webglcontextlost',lost);keys.clear();gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);state.current=null;};
  }catch(e){setError(e.message);try{gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);}catch{};return()=>canvas.removeEventListener('webglcontextlost',lost);}
 },[template,exhibits,selectedId,mode,resetKey,onSelect]);
 const pad=(key,down)=>{const s=state.current;if(!s)return;if(down)s.keys.add(key);else s.keys.delete(key);};
 return <div className="big-webgl-shell" aria-label={language==='vi'?'Phòng triển lãm ba chiều':'3D exhibition room'}>
   {error?<div className="big-canvas-error" role="alert">{error}</div>:<canvas ref={node} aria-label={language==='vi'?'Kéo để nhìn xung quanh, WASD để di chuyển, nhấn hiện vật để xem':'Drag to look, WASD to walk, select an exhibit'} />}
   <div className="big-scene-hud" aria-hidden="true">{view?`${coords.x}, ${coords.z}`:''}</div>
   <div className="big-touch-pad" aria-label="Mobile navigation">{[['↑','w'],['←','a'],['↓','s'],['→','d']].map(([text,key])=><button key={key} type="button" onPointerDown={e=>{e.preventDefault();pad(key,true);}} onPointerUp={()=>pad(key,false)} onPointerCancel={()=>pad(key,false)} onPointerLeave={()=>pad(key,false)}>{text}</button>)}</div>
 </div>;
}
