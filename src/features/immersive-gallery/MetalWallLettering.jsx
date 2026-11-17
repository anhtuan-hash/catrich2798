import React,{useEffect,useMemo} from 'react';
import {DataTexture,LinearFilter,RepeatWrapping} from 'three';
import {buildMetalLettering} from './metalLetteringGeometry.js';

const brushSize=64;
const brushPixels=new Uint8Array(brushSize*brushSize*4);
let seed=281;
for(let y=0;y<brushSize;y++){
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 const shade=154+seed%102;
 for(let x=0;x<brushSize;x++){
  const i=(y*brushSize+x)*4;
  brushPixels.set([shade,shade,shade,255],i);
 }
}

export default function MetalWallLettering({
 lines,position,rotation,name,maxWidth,size=.63,lineStep=size,align='center',depth=.048,finish='bronze'
}){
 const copy=lines.join('\n');
 const geometry=useMemo(()=>buildMetalLettering(copy.split('\n'),{size,maxWidth,lineStep,align,depth}),
  [copy,size,maxWidth,lineStep,align,depth]);
 const brush=useMemo(()=>{
  const texture=new DataTexture(brushPixels,brushSize,brushSize);
  texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.repeat.set(4,8);
  texture.magFilter=texture.minFilter=LinearFilter;
  texture.needsUpdate=true;
  return texture;
 },[]);
 useEffect(()=>()=>{geometry?.solid.dispose();geometry?.shadow.dispose();},[geometry]);
 useEffect(()=>()=>brush.dispose(),[brush]);
 if(!geometry)return null;

 const enamel=finish==='red';
 return <group name={name} position={position} rotation={rotation}>
  <mesh geometry={geometry.shadow} position={[.018,-.022,.002]}>
   <meshBasicMaterial color="#382718" transparent opacity={.24} depthWrite={false}
    polygonOffset polygonOffsetFactor={-1} toneMapped={false}/>
  </mesh>
  <mesh geometry={geometry.shadow} position={[.040,-.052,.001]}>
   <meshBasicMaterial color="#4d3b2b" transparent opacity={.11} depthWrite={false}
    polygonOffset polygonOffsetFactor={-1} toneMapped={false}/>
  </mesh>
  <mesh geometry={geometry.solid} position={[0,0,.019]}>
   <meshStandardMaterial color={enamel?'#a92b20':'#816039'} metalness={enamel?.32:.62}
    roughness={.61} roughnessMap={brush} vertexColors
    emissive={enamel?'#3d100b':'#462c10'} emissiveIntensity={.20}/>
  </mesh>
 </group>;
}
