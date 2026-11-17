const bayWidth=9.85;
const wallMountZ=-7.82;
const tanHalfFov=Math.tan(55*Math.PI/360);
export const collectionHallHeight=6.25;

export function buildCollectionHall(total){
 const counts=Array(4).fill(Math.floor(total/4));
 const order=total<4?[0,1,2,3]:[1,3,0,2];
 for(const index of order.slice(0,total%4))counts[index]++;
 const halfWidth=Math.max(10.15,Math.max(counts[0],counts[2])*bayWidth/2);
 const halfDepth=Math.max(10.15,Math.max(counts[1],counts[3])*bayWidth/2);
 const wallFrames=[
  {x:0,z:-halfDepth,yaw:0,length:halfWidth*2,depth:halfDepth*2},
  {x:halfWidth,z:0,yaw:-Math.PI/2,length:halfDepth*2,depth:halfWidth*2},
  {x:0,z:halfDepth,yaw:Math.PI,length:halfWidth*2,depth:halfDepth*2},
  {x:-halfWidth,z:0,yaw:Math.PI/2,length:halfDepth*2,depth:halfWidth*2},
 ];
 let index=0;
 const walls=wallFrames.map((wall,wallIndex)=>{
  const count=counts[wallIndex];
  const bays=Array.from({length:count},(_,i)=>{
   const x=(i-(count-1)/2)*bayWidth;
   const position=collectionWorldPoint(wall,[x,0,-wallMountZ]);
   return {...wall,index:index++,wallIndex,x,position};
  });
  return {...wall,bays};
 });
 const furnishings=[
  {kind:'bench',x:3,z:-1.8,halfWidth:1.37,halfDepth:.38},
  {kind:'bench',x:-3,z:1.8,halfWidth:1.37,halfDepth:.38},
  {kind:'bamboo',x:halfWidth-.88,z:-halfDepth+.94,halfWidth:.59,halfDepth:.59},
  {kind:'ceramic',x:halfWidth-.91,z:halfDepth-.99,halfWidth:.465,halfDepth:.465},
  {kind:'ceramic',x:-halfWidth+.91,z:-halfDepth+.99,halfWidth:.465,halfDepth:.465},
  {kind:'bamboo',x:-halfWidth+.88,z:halfDepth-.94,halfWidth:.59,halfDepth:.59},
 ];
 return {halfWidth,halfDepth,walls,furnishings,bays:walls.flatMap(wall=>wall.bays)};
}

export function collectionWorldPoint(frame,[x,y,z]){
 const cos=Math.cos(frame.yaw),sin=Math.sin(frame.yaw);
 const [ox,oy,oz]=frame.position??[frame.x,0,frame.z];
 return [ox+x*cos+z*sin,oy+y,oz-x*sin+z*cos];
}

export function collectionCameraView(bay,aspect,type){
 const roomView=type==='room';
 const close=type==='artwork';
 const fit=9/(2*tanHalfFov*Math.max(.28,aspect));
 const wide=roomView&&aspect>=1.35;
 const overviewDistance=wide?Math.max(17.4,29.5/aspect):Math.max(12.7,fit+2);
 const distance=Math.min(bay.depth-1.08,close?Math.max(5.5,fit*.82):roomView?overviewDistance:Math.max(8.4,fit));
 // Aim between neighboring collections while leaving room for the next wall.
 const offset=wide?-Math.sign(bay.x)*Math.min(Math.abs(bay.x),bayWidth/2):0;
 const camera=collectionWorldPoint(bay,[offset+(wide?-3.1:0),roomView?2.72:2.15,wallMountZ+distance]);
 const look=collectionWorldPoint(bay,[offset+(wide?2.3:0),roomView?2.92:2.74,wallMountZ]);
 return {camera,look};
}

export function collectionHallPosition(hall,x,z){
 // Keep visitors in the central circulation area, clear of frames and fins.
 return [
  Math.max(-hall.halfWidth+1.08,Math.min(hall.halfWidth-1.08,x)),
  Math.max(-hall.halfDepth+1.08,Math.min(hall.halfDepth-1.08,z)),
 ];
}

export function collectionFurnishingAt(hall,x,z){
 const clearance=.19;
 return hall.furnishings.some(item=>
  Math.abs(x-item.x)<item.halfWidth+clearance&&Math.abs(z-item.z)<item.halfDepth+clearance
 );
}
