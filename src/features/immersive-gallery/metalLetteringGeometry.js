import {BufferAttribute,ExtrudeGeometry,ShapeGeometry} from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import typeface from './fonts/petrus-gallery-lettering.json' with {type:'json'};

const font=new FontLoader().parse(typeface);
const curveSegments=4;

export function hasMetalLetteringGlyphs(text){
 return [...text.normalize('NFC')].every(glyph=>Object.hasOwn(typeface.glyphs,glyph));
}

function mergeLines(lines){
 if(lines.length===1)return lines[0];
 const result=mergeGeometries(lines);
 lines.forEach(geometry=>geometry.dispose());
 return result;
}

export function buildMetalLettering(lines,{size,maxWidth,lineStep=size,align='center',depth=.048}){
 const faces=[];
 const shadows=[];
 const scale=Math.min(1,maxWidth/Math.max(...lines.map(line=>
  [...line.normalize('NFC')].reduce((sum,key)=>sum+(typeface.glyphs[key]?.ha??typeface.glyphs['?'].ha),0)
 ))*typeface.resolution/size);
 const bevel=Math.min(.010,size*.02);
 for(const [i,line] of lines.entries()){
  if(!line.trim())continue;
  const shapes=font.generateShapes(line.normalize('NFC'),size*scale);
  const shadow=new ShapeGeometry(shapes,curveSegments);
  shadow.computeBoundingBox();
  const {min,max}=shadow.boundingBox;
  const x=align==='left'?-min.x:-(min.x+max.x)/2;
  const y=(lines.length/2-.5-i)*lineStep-(min.y+max.y)/2;
  shadow.translate(x,y,0);
  shadows.push(shadow);
  const solid=new ExtrudeGeometry(shapes,{
   depth,curveSegments,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel*.78,bevelSegments:2
  });
  solid.translate(x,y,0);
  // One material and draw call per sign. A darker cut edge makes the front
  // visually distinct even across walls with different light directions.
  const normal=solid.getAttribute('normal');
  const color=new Float32Array(normal.count*3);
  for(let j=0;j<normal.count;j++){
   const shade=.52+.48*Math.max(0,normal.getZ(j));
   color.set([shade,shade,shade],j*3);
  }
  solid.setAttribute('color',new BufferAttribute(color,3));
  solid.clearGroups();
  faces.push(solid);
 }
 if(!faces.length)return null;
 return {solid:mergeLines(faces),shadow:mergeLines(shadows)};
}
