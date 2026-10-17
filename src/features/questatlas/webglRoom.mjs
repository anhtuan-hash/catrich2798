// Dependency-free WebGL 3D exploration preview. Teacher view only, no network/AI.
const VERTEX = [
  'attribute vec3 aPos;',
  'attribute vec3 aColor;',
  'uniform mat4 uMVP;',
  'varying vec3 vColor;',
  'varying float vDepth;',
  'void main(){ vec4 pos=uMVP*vec4(aPos,1.0); gl_Position=pos; vColor=aColor; vDepth=clamp((pos.w-2.0)/14.0,0.0,0.55); }'
].join('\n');
const FRAGMENT = [
  'precision mediump float;',
  'varying vec3 vColor;',
  'varying float vDepth;',
  'uniform vec3 uFog;',
  'void main(){gl_FragColor=vec4(mix(vColor,uFog,vDepth),1.0);}'
].join('\n');
const COLORS = {
  temple: { wall:[0.41,0.32,0.27], floor:[0.24,0.17,0.14], accent:[0.98,0.69,0.25], fog:[0.09,0.07,0.14] },
  cyber: { wall:[0.12,0.20,0.32], floor:[0.08,0.14,0.24], accent:[0.19,0.95,0.91], fog:[0.03,0.06,0.17] },
  library: { wall:[0.29,0.21,0.26], floor:[0.15,0.11,0.14], accent:[0.94,0.66,0.34], fog:[0.10,0.06,0.12] }
};

function shader(gl,type,source){
  const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error('WebGL shader: '+gl.getShaderInfoLog(sh));
  return sh;
}
function program(gl){
  const p=gl.createProgram(),a=shader(gl,gl.VERTEX_SHADER,VERTEX),b=shader(gl,gl.FRAGMENT_SHADER,FRAGMENT);
  gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);
  gl.deleteShader(a);gl.deleteShader(b);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error('WebGL link failed');
  return p;
}
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,n)=>a.map(v=>v*n);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=(a)=>scale(a,1/(Math.hypot(...a)||1));
function lookAt(eye,target){
  const z=norm(add(eye,scale(target,-1))),x=norm(cross([0,1,0],z)),y=cross(z,x);
  return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
}
function perspective(aspect){
  const f=1/Math.tan(Math.PI/6),near=.1,far=80;
  return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
}
function mul(a,b){
  const out=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++){
    let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[col*4+k];out[col*4+row]=v;
  }
  return out;
}
export function buildRoomGeometry(world, progress=0){
  const theme=COLORS[world]||COLORS.temple, data=[];
  function quad(a,b,c,d,color){
    for(const vertex of [a,b,c,a,c,d])data.push(...vertex,...color);
  }
  function cube(x,y,z,w,h,d,color){
    const l=x-w/2,r=x+w/2,bt=y,top=y+h,front=z+d/2,back=z-d/2;
    quad([l,bt,front],[r,bt,front],[r,top,front],[l,top,front],color);
    quad([r,bt,back],[l,bt,back],[l,top,back],[r,top,back],scale(color,.71));
    quad([l,bt,back],[l,bt,front],[l,top,front],[l,top,back],scale(color,.8));
    quad([r,bt,front],[r,bt,back],[r,top,back],[r,top,front],scale(color,.66));
    quad([l,top,front],[r,top,front],[r,top,back],[l,top,back],scale(color,1.08));
  }
  const wall=theme.wall,accent=theme.accent,floor=theme.floor;
  quad([-5,0,-5],[5,0,-5],[5,0,5],[-5,0,5],floor);
  quad([-5,0,-5],[-5,5,-5],[5,5,-5],[5,0,-5],wall);
  quad([-5,0,5],[-5,5,5],[-5,5,-5],[-5,0,-5],scale(wall,.8));
  quad([5,0,-5],[5,5,-5],[5,5,5],[5,0,5],scale(wall,.75));
  quad([-5,5,-5],[-5,5,5],[5,5,5],[5,5,-5],scale(wall,.48));
  // Grid floor and architectural beams establish reliable depth cues.
  for(let v=-4;v<=4;v+=2){cube(v,.005,0,.025,.018,10,scale(accent,.32));cube(0,.005,v,10,.018,.025,scale(accent,.25));}
  for(const x of [-3.7,3.7]){cube(x,0,-2.8,.65,4.6,.7,scale(wall,1.45));cube(x,4.35,-2.8,1,.28,.99,accent);}
  // Door and luminous trim: locked chamber visually ahead.
  cube(0,0,-4.67,2.2,3.15,.25,scale(accent,.5));
  cube(0,.12,-4.51,1.74,2.8,.27,scale(theme.fog,.6));
  cube(-1.12,0,-4.35,.12,3.35,.31,accent);
  cube(1.12,0,-4.35,.12,3.35,.31,accent);
  cube(0,3.2,-4.35,2.35,.14,.3,accent);
  cube(0,1.52,-4.21,.09,.3,.12,accent);
  // Side obelisks and illuminated floating prisms.
  for(const x of [-2.6,2.6]){
    cube(x,0,-2,.6,2.4,.6,scale(wall,1.22));
    cube(x,2.36,-2,.75,.14,.75,accent);
    cube(x,2.85,-2,.28,.28,.28,scale(accent,1.04));
  }
  for(const x of [-4,4])cube(x,.05,1,.4,.6,.4,accent);
  // Each world has distinct depth cues and puzzle props, not a palette swap.
  if(world==='temple'){
    for(const x of [-3.7,3.7])for(let z of [-4,-2,0,2])
      cube(x,.025,z,.88,.13,1.35,scale(wall,1.15));
    for(let step=0;step<3;step++)
      cube(0,.01,-3.2+step*.5,2.9+step*.65,.11+step*.07,.5,scale(accent,.30+step*.07));
    for(const x of [-2.1,2.1]) {
      cube(x,0,2.2,.35,1.4,.35,scale(wall,1.35));
      cube(x,1.43,2.2,.72,.13,.72,scale(accent,.86));
    }
  } else if(world==='cyber'){
    for(const x of [-3.75,3.75]) for(const z of [-2.8,-.2,2.4]){
      cube(x,.10,z,.48,1.3,1.15,scale(wall,1.6));
      cube(x+(x>0?-.3:.3),1.05,z,.07,.75,.8,accent);
      cube(x,1.48,z,.55,.09,1.2,accent);
    }
    for(const z of [-3.8,-1.8,.2,2.2])
      cube(0,.025,z,1,.02,.035,scale(accent,.82));
    for(const x of [-2.9,2.9])
      cube(x,2.8,-4.68,.28,.28,.08,accent);
  } else if(world==='library'){
    for(const x of [-4.1,4.1]){
      for(const z of [-3.2,-1.6,0,1.6,3.2]){
        cube(x,0,z,.65,3.9,1.2,scale(wall,1.25));
        for(let shelf=1;shelf<=4;shelf++){
          cube(x,shelf*.85,z,.8,.09,1.29,scale(accent,.48));
          for(let book=0;book<4;book++)
            cube(x+(x>0?-.38:.38),.14+(shelf-1)*.84,z-.43+book*.26,.14,.68,.16,
              book%2?scale(accent,.72):scale(wall,1.85));
        }
      }
    }
    cube(0,0,2.7,1.9,.68,.82,scale(wall,1.54));
    cube(0,.67,2.7,1.75,.07,.74,scale(accent,.60));
  }
  // A brighter frame and opening door mark learning progress (0..1).
  const completed=Math.min(1,Math.max(0,Number(progress)||0));
  cube(0,3.42,-4.37,.2,.12+.24*completed,.22,scale(accent,1.0));
  if(completed>=1) cube(0,0,-4.38,.22,2.55,.13,scale(accent,.32));
  return new Float32Array(data);
}

export function mountQuestWorld(canvas,world,onFallback=()=>{}){
  if(!canvas)return null;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,powerPreference:'low-power'});
  if(!gl){onFallback();return null;}
  let disposed=false,yaw=0,pitch=0,zoom=9,progress=0,drag=null,frame=0;
  const palette=COLORS[world]||COLORS.temple;
  let p,buffer;
  try{
    p=program(gl);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    let geometry=buildRoomGeometry(world,progress);gl.bufferData(gl.ARRAY_BUFFER,geometry,gl.DYNAMIC_DRAW);
    gl.useProgram(p);const pos=gl.getAttribLocation(p,'aPos'),color=gl.getAttribLocation(p,'aColor');
    gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,24,12);
    gl.uniform3fv(gl.getUniformLocation(p,'uFog'),palette.fog);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    let count=geometry.length/6;const mvp=gl.getUniformLocation(p,'uMVP');
    const render=()=>{
      if(disposed)return;
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      const w=Math.min(Math.round(canvas.clientWidth*dpr),1800),h=Math.min(Math.round(canvas.clientHeight*dpr),1100);
      if(w<1||h<1)return;
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
      const eye=[Math.sin(yaw)*zoom,3.1+pitch,Math.cos(yaw)*zoom], view=lookAt(eye,[0,1.6,-1.2]);
      gl.clearColor(...palette.fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(mvp,false,mul(perspective(w/h),view));
      gl.drawArrays(gl.TRIANGLES,0,count);
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(render);};
    const down=(e)=>{drag={x:e.clientX,y:e.clientY,yaw,pitch};canvas.setPointerCapture?.(e.pointerId);};
    const move=(e)=>{if(!drag)return;yaw=drag.yaw+(drag.x-e.clientX)/180;pitch=Math.max(-1.5,Math.min(1.5,drag.pitch+(drag.y-e.clientY)/130));schedule();};
    const up=()=>{drag=null;};
    const wheel=(e)=>{e.preventDefault();zoom=Math.min(13,Math.max(5.8,zoom+Math.sign(e.deltaY)*.65));schedule();};
    const keydown=(e)=>{
      if(e.key==='ArrowLeft')yaw-=.14;
      else if(e.key==='ArrowRight')yaw+=.14;
      else if(e.key==='ArrowUp')pitch=Math.min(1.5,pitch+.14);
      else if(e.key==='ArrowDown')pitch=Math.max(-1.5,pitch-.14);
      else if(e.key==='+'||e.key==='=')zoom=Math.max(5.8,zoom-.6);
      else if(e.key==='-')zoom=Math.min(13,zoom+.6);
      else if(e.key==='Home'){yaw=0;pitch=0;zoom=9;}
      else return;
      e.preventDefault();schedule();
    };
    const controller={
      dispose:()=>{},
      setProgress:(next)=>{
        progress=Math.min(1,Math.max(0,Number(next)||0));
        geometry=buildRoomGeometry(world,progress);
        gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,geometry,gl.DYNAMIC_DRAW);
        count=geometry.length/6;schedule();
      },
      reset:()=>{yaw=0;pitch=0;zoom=9;schedule();},
      zoom:(direction)=>{zoom=Math.min(13,Math.max(5.8,zoom+direction));schedule();},
      orbit:(direction)=>{yaw+=direction;schedule();},
    };
    const lost=(e)=>{e.preventDefault();onFallback();};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    canvas.addEventListener('webglcontextlost',lost);
    canvas.addEventListener('wheel',wheel,{passive:false});
    canvas.addEventListener('keydown',keydown);
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(canvas);
    schedule();
    controller.dispose=()=>{
      disposed=true;cancelAnimationFrame(frame);observer?.disconnect();
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
      canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
      canvas.removeEventListener('webglcontextlost',lost);
      canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keydown);
      gl.deleteBuffer(buffer);gl.deleteProgram(p);
    };
    return controller;
  }catch(e){if(buffer)gl.deleteBuffer(buffer);if(p)gl.deleteProgram(p);onFallback();return null;}
}
