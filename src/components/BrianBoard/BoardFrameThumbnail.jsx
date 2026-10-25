import React,{useMemo} from 'react';
import {renderBoardObject} from './BoardCanvas.jsx';
import {spatialObjectBounds} from './boardSpatial.js';

/** Teacher-only, clipped content preview; not a student or TV projection. */
export default function BoardFrameThumbnail({frame,objects=[]}){
 const selected=useMemo(()=>objects.filter(object=>{
  if(object.hidden)return false;
  const b=spatialObjectBounds(object);if(!b)return false;
  return b.x<frame.x+frame.width&&b.x+b.width>frame.x&&
   b.y<frame.y+frame.height&&b.y+b.height>frame.y;
 }).slice(-28),[objects,frame.x,frame.y,frame.width,frame.height]);
 return <svg className="bbd-v8-frame-thumbnail" role="img" aria-label={'Frame preview '+frame.title}
  viewBox={[frame.x,frame.y,frame.width,frame.height].join(' ')}
  preserveAspectRatio="xMidYMid meet">
  <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} fill="#fffefa"/>
  {selected.map(o=>renderBoardObject(o,null,false,undefined,null))}
  <rect x={frame.x+2} y={frame.y+2} width={frame.width-4} height={frame.height-4}
   rx="9" fill="none" stroke="#96c1a6" strokeWidth="7"/>
 </svg>;
}
