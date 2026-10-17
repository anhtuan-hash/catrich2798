import assert from 'node:assert/strict';
import { buildRoomGeometry, mountQuestWorld, roomCameraPosition } from '../src/features/questatlas/webglRoom.mjs';

// All three room themes must produce different, bounded, finite geometry.
// Vertex format is xyz + RGB and each triangle must contain three vertices.
const worlds=['temple','cyber','library'];
const shapes=worlds.map(w=>buildRoomGeometry(w));
for(const shape of shapes) {
  assert.ok(shape instanceof Float32Array);
  assert.ok(shape.length>1000 && shape.length<100000,'3D geometry must fit device budget');
  assert.equal(shape.length%18,0,'6 floats/vertex, 3 vertices/triangle');
  assert.ok(shape.every(Number.isFinite),'room contains a non-finite position or color');
}
assert.equal(new Set(shapes.map(x=>x.length)).size,3,'each world needs distinct architecture');
for(const w of worlds){
  const end=buildRoomGeometry(w,1);
  assert.ok(end.length>buildRoomGeometry(w,0).length,'unlock geometry should respond to solving puzzles');
}
// Opaque walls are at ±5. Every camera orbit, pitch and zoom must remain inside.
for(let step=0;step<=36;step++)for(const pitch of [-1.1,0,1.1])for(const zoom of [1.9,3.2,3.55]){
  const [x,y,z]=roomCameraPosition(step*Math.PI/18,pitch,zoom);
  assert.ok(Math.abs(x)<4.95 && y>0.15 && y<4.95 && z>-4.95 && z<4.95,
    'camera must stay inside interior or scene walls will occlude the view');
}
let fallback=0;
assert.equal(mountQuestWorld({getContext:()=>null},'temple',()=>fallback++),null);
assert.equal(fallback,1,'WebGL unavailable must use CSS fallback');

const calls=[], listeners=new Map();
const gl={
  VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,
  ARRAY_BUFFER:34962,DYNAMIC_DRAW:35048,FLOAT:5126,
  DEPTH_TEST:2929,LEQUAL:515,COLOR_BUFFER_BIT:16384,DEPTH_BUFFER_BIT:256,TRIANGLES:4,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,
  createProgram:()=>({}),attachShader(){},linkProgram(){},deleteShader(){},
  getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({}),
  createBuffer:()=>({}),bindBuffer(){},bufferData(t,a){calls.push(['buffer',a.length]);},
  useProgram(){},enableVertexAttribArray(){},vertexAttribPointer(){},uniform3fv(){},
  enable(){},depthFunc(){},viewport(){},clearColor(){},clear(){},uniformMatrix4fv(){},
  drawArrays(...args){calls.push(['draw',args[2]]);},deleteBuffer(){},deleteProgram(){},
};
const canvas={
  width:0,height:0,clientWidth:1000,clientHeight:650,
  getContext:()=>gl,
  addEventListener:(event,listener)=>listeners.set(event,listener),
  removeEventListener:(event)=>listeners.delete(event),
  setPointerCapture(){},
};
const original={window:globalThis.window,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};
globalThis.window={devicePixelRatio:3};
globalThis.requestAnimationFrame=(callback)=>{callback();return 1;};
globalThis.cancelAnimationFrame=()=>{};
try{
  const world=mountQuestWorld(canvas,'cyber',()=>{throw Error('unexpected fallback')});
  assert.equal(typeof world.dispose,'function');
  assert.equal(typeof world.setProgress,'function');
  assert.equal(typeof world.orbit,'function');
  assert.equal(typeof world.reset,'function');
  assert.ok(canvas.width<=1800 && canvas.height<=1100,'mobile GPU resolution must be capped');
  const initial=calls.filter(x=>x[0]==='draw').length;
  world.setProgress(.5);
  world.setProgress(1);
  world.orbit(.3);
  world.zoom(-1);
  world.reset();
  listeners.get('pointerdown')({clientX:10,clientY:20,pointerId:1});
  listeners.get('pointermove')({clientX:40,clientY:10});
  listeners.get('pointerup')({});
  let prevented=false;
  listeners.get('wheel')({deltaY:1,preventDefault:()=>{prevented=true;}});
  assert.equal(prevented,true);
  let keyPrevented=false;
  listeners.get('keydown')({key:'ArrowLeft',preventDefault:()=>{keyPrevented=true;}});
  assert.equal(keyPrevented,true);
  assert.ok(calls.filter(x=>x[0]==='draw').length>initial,'interactions must redraw scene');
  world.dispose();
  assert.equal(listeners.size,0,'all 3D listeners must be cleaned on close');
}finally{
  if(original.window===undefined)delete globalThis.window;else globalThis.window=original.window;
  if(original.raf===undefined)delete globalThis.requestAnimationFrame;else globalThis.requestAnimationFrame=original.raf;
  if(original.caf===undefined)delete globalThis.cancelAnimationFrame;else globalThis.cancelAnimationFrame=original.caf;
}
console.log('QuestAtlas WebGL PASS: 3 unique worlds, solved-door state, GPU budget, keyboard/touch and cleanup.');
