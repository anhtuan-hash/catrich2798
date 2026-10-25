/** Deterministic teacher board measurement tools. Values are board units, not cm.
 * This module never reads school data or requests AI services.
 */
import {makeId} from './boardModel.js';
const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const txt=(text,x,y)=>({id:makeId(),kind:'text',x,y,text,fontSize:28,
 color:'#2d725f',studentVisible:true});
const line=(a,b,color)=>({id:makeId(),kind:'shape',shape:'line',x:a.x,y:a.y,
 x2:b.x,y2:b.y,color,width:4,fill:'none',studentVisible:true});
export function measureRuler(start,end){
 if(!start||!end||distance(start,end)<20)return [];
 const units=Math.round(distance(start,end)*10)/10;
 return [line(start,end,'#22846d'),txt(String(units)+' units',
  (start.x+end.x)/2+12,(start.y+end.y)/2-16)];
}
export function measureAngle(vertex,baseline,endpoint){
 if(!vertex||!baseline||!endpoint||distance(vertex,baseline)<20||distance(vertex,endpoint)<20)return [];
 const first=Math.atan2(baseline.y-vertex.y,baseline.x-vertex.x);
 const second=Math.atan2(endpoint.y-vertex.y,endpoint.x-vertex.x);
 let diff=Math.abs((second-first)*180/Math.PI)%360;
 if(diff>180)diff=360-diff;
 const degrees=Math.round(diff*10)/10;
 return [line(vertex,baseline,'#528ccc'),line(vertex,endpoint,'#22846d'),
  txt(degrees+'°',vertex.x+25,vertex.y-24)];
}
export function drawCompassCircle(center,radiusPoint){
 if(!center||!radiusPoint)return null;
 const radius=distance(center,radiusPoint);
 if(!Number.isFinite(radius)||radius<24)return null;
 return {id:makeId(),kind:'shape',shape:'ellipse',
  x:center.x-radius,y:center.y-radius,x2:center.x+radius,y2:center.y+radius,
  color:'#487fa0',width:4,fill:'none',studentVisible:true};
}
