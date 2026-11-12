// Original, deterministic glTF 2.0 binary assets for BRIAN Gallery.
// No external URLs, copyrighted meshes, texture references, extensions, or scripts.
// A curated shape is converted to a valid in-memory GLB for Three.js GLTFLoader.
const CUBE = [
  [-0.55,-0.45,-0.30],[0.55,-0.45,-0.30],[0.55,0.45,-0.30],[-0.55,0.45,-0.30],
  [-0.55,-0.45,0.30],[0.55,-0.45,0.30],[0.55,0.45,0.30],[-0.55,0.45,0.30],
];
const CUBE_TRIANGLES = [
  0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,
  2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5,
];
const PHI = (1 + Math.sqrt(5)) / 2;
const GLOBE = [
  [-1,PHI,0],[1,PHI,0],[-1,-PHI,0],[1,-PHI,0],
  [0,-1,PHI],[0,1,PHI],[0,-1,-PHI],[0,1,-PHI],
  [PHI,0,-1],[PHI,0,1],[-PHI,0,-1],[-PHI,0,1],
].map(p => p.map(v => v / Math.hypot(...p) * 0.68));
const GLOBE_TRIANGLES = [
  0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,
  11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,
  3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1,
];
const CONFIG = Object.freeze({
  globe: {positions:GLOBE,indices:GLOBE_TRIANGLES,color:[0.26,0.56,0.51,1]},
  book: {positions:CUBE,indices:CUBE_TRIANGLES,color:[0.72,0.40,0.30,1]},
  pedestal: {positions:CUBE,indices:CUBE_TRIANGLES,color:[0.63,0.66,0.70,1]},
});
const packU32 = (view,offset,value) => view.setUint32(offset,value,true);
export function createCuratedGlb(key='globe') {
  const asset=CONFIG[key];
  if(!asset)throw new Error('Curated model not approved');
  const vertices=new Float32Array(asset.positions.flat());
  const indices=new Uint16Array(asset.indices);
  const positionsBytes=new Uint8Array(vertices.buffer);
  const indexBytes=new Uint8Array(indices.buffer);
  const alignedIndex=(positionsBytes.length+3)&~3;
  const binLength=(alignedIndex+indexBytes.length+3)&~3;
  const bin=new Uint8Array(binLength);
  bin.set(positionsBytes,0);bin.set(indexBytes,alignedIndex);
  const mins=[0,1,2].map(i=>Math.min(...asset.positions.map(p=>p[i])));
  const maxs=[0,1,2].map(i=>Math.max(...asset.positions.map(p=>p[i])));
  const json={
    asset:{version:'2.0',generator:'BRIAN ORIGINAL CURATED GLB 1.0'},
    scene:0, scenes:[{nodes:[0]}], nodes:[{mesh:0}],
    buffers:[{byteLength:binLength}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:positionsBytes.length,target:34962},
      {buffer:0,byteOffset:alignedIndex,byteLength:indexBytes.length,target:34963}],
    accessors:[{bufferView:0,byteOffset:0,componentType:5126,count:vertices.length/3,type:'VEC3',min:mins,max:maxs},
      {bufferView:1,byteOffset:0,componentType:5123,count:indices.length,type:'SCALAR'}],
    materials:[{pbrMetallicRoughness:{baseColorFactor:asset.color,metallicFactor:0,roughnessFactor:0.65},doubleSided:true}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1,material:0,mode:4}]}],
  };
  const jsonData=new TextEncoder().encode(JSON.stringify(json));
  const jsonLength=(jsonData.length+3)&~3;
  const total=12+8+jsonLength+8+binLength;
  const out=new ArrayBuffer(total),v=new DataView(out),bytes=new Uint8Array(out);
  packU32(v,0,0x46546c67);packU32(v,4,2);packU32(v,8,total);
  packU32(v,12,jsonLength);packU32(v,16,0x4e4f534a);
  bytes.fill(0x20,20,20+jsonLength);bytes.set(jsonData,20);
  const pos=20+jsonLength;
  packU32(v,pos,binLength);packU32(v,pos+4,0x004e4942);bytes.set(bin,pos+8);
  return out;
}
export const CURATED_GLB_KEYS=Object.freeze(Object.keys(CONFIG));
