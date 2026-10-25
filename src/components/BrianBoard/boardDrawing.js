/** Shared pure drawing helpers — no storage, network or Brian Focus coupling. */
export const BOARD_PEN_PRESETS={
 fine:{width:2,opacity:1,pressure:false,label:'Fine pen'},
 classic:{width:5,opacity:1,pressure:false,label:'Classic pen'},
 fountain:{width:8,opacity:1,pressure:true,label:'Pressure fountain pen'},
 marker:{width:14,opacity:.46,pressure:false,label:'Soft marker'}
};
export const BOARD_GRID_SIZE=25;
export const clampDrawing=(value,minimum,maximum)=>Math.min(maximum,Math.max(minimum,value));
export function snapBoardPoint(point,enabled=false,step=BOARD_GRID_SIZE){
 if(!point)return {x:0,y:0};
 const x=Number(point.x)||0,y=Number(point.y)||0;
 return enabled?{x:Math.round(x/step)*step,y:Math.round(y/step)*step}:{x,y};
}
/** Keep regular pen strokes unsnapped; Shift constrains lines/arrows to 45-degree bearings. */
export function constrainBoardShape(start,end,shape,{shift=false,snap=false}={}){
 const first=snapBoardPoint(start,snap),last=snapBoardPoint(end,snap);
 let dx=last.x-first.x,dy=last.y-first.y;
 if(shift&&(shape==='rect'||shape==='ellipse'||shape==='triangle')){
  const side=Math.max(Math.abs(dx),Math.abs(dy));
  dx=Math.sign(dx||1)*side;dy=Math.sign(dy||1)*side;
 }else if(shift&&(shape==='line'||shape==='arrow')){
  const length=Math.hypot(dx,dy),bearing=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;
  dx=Math.cos(bearing)*length;dy=Math.sin(bearing)*length;
 }
 return {x:first.x,y:first.y,x2:first.x+dx,y2:first.y+dy};
}
export function smoothBoardPath(points=[]){
 if(!points.length)return '';
 const pts=points.filter(p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y)));
 if(!pts.length)return '';
 if(pts.length===1)return 'M '+pts[0].x+' '+pts[0].y+' l 0.01 0.01';
 if(pts.length===2)return 'M '+pts[0].x+' '+pts[0].y+' L '+pts[1].x+' '+pts[1].y;
 let d='M '+pts[0].x+' '+pts[0].y;
 for(let i=1;i<pts.length-1;i++){
  const a=pts[i],b=pts[i+1];
  d+=' Q '+a.x+' '+a.y+' '+((a.x+b.x)/2).toFixed(1)+' '+((a.y+b.y)/2).toFixed(1);
 }
 const last=pts.at(-1);
 return d+' L '+last.x+' '+last.y;
}
/** Pressure is stored as a per-point attribute, capped for UI/TV/PDF performance. */
export function pressureBoardSegments(points=[],baseWidth=5,maxSegments=300){
 if(points.length<2)return [];
 const step=Math.max(1,Math.ceil((points.length-1)/maxSegments)),segments=[];
 for(let i=0;i<points.length-1;i+=step){
  const a=points[i],b=points[Math.min(points.length-1,i+step)];
  const p=(clampDrawing(Number(a.pressure)||.5,.05,1)+clampDrawing(Number(b.pressure)||.5,.05,1))/2;
  segments.push({x1:Number(a.x)||0,y1:Number(a.y)||0,x2:Number(b.x)||0,y2:Number(b.y)||0,
   width:Math.max(.65,baseWidth*(.35+1.15*p))});
 }
 return segments;
}
export function boardShapeGeometry(shape,x,y,x2,y2){
 const a=Number(x)||0,b=Number(y)||0,c=Number(x2)||0,d=Number(y2)||0;
 if(shape==='triangle')return {type:'polygon',points:[[(a+c)/2,Math.min(b,d)],[Math.max(a,c),Math.max(b,d)],[Math.min(a,c),Math.max(b,d)]]};
 if(shape==='arrow'){
  const angle=Math.atan2(d-b,c-a),size=Math.min(45,Math.max(16,Math.hypot(c-a,d-b)*.16));
  const left=[c-size*Math.cos(angle-Math.PI/6),d-size*Math.sin(angle-Math.PI/6)];
  const right=[c-size*Math.cos(angle+Math.PI/6),d-size*Math.sin(angle+Math.PI/6)];
  return {type:'polyline',points:[[a,b],[c,d],left,[c,d],right]};
 }
 return null;
}
