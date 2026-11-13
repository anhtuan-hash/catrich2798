import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const architecture=fs.readFileSync('src/features/immersive-gallery/PekMuseumArchitecture.jsx','utf8');
const canvas=fs.readFileSync('src/features/immersive-gallery/GalleryCanvasR3F.jsx','utf8');
const visitor=fs.readFileSync('src/features/immersive-gallery/v3/MuseumScene.jsx','utf8');
const css=fs.readFileSync('src/features/immersive-gallery/pekMuseum.css','utf8');
test('campus-inspired design is explicitly identified, not presented as a photoreal school replica',()=>{
 assert.match(architecture,/NOT a scan or faithful replica/);
 assert.match(architecture,/TRƯỜNG TRUNG – TIỂU HỌC PÉTRUS KÝ/);
 assert.match(architecture,/THE PIONEERS/);
 for(const value of ['THÂN THIỆN','TRÁCH NHIỆM','HỢP TÁC','PHÁT TRIỂN']){
  assert.ok(architecture.includes(value));
 }
});
test('school hall is a 3D exhibition environment with actual framed artworks and original geometry',()=>{
 for(const motif of ['SchoolPineSeal','PavilionWindows','SchoolValue','BookSculpture','SculpturePine',
 'pointLight','boxGeometry','cylinderGeometry','ringGeometry','ExhibitWallLabel']){
  assert.ok(architecture.includes(motif),'Missing school motif: '+motif);
 }
 assert.match(canvas,/schoolEdition/);
 assert.match(canvas,/PekMuseumArchitecture/);
 assert.match(canvas,/ExhibitWallLabel title=\{exhibit.title\}/);
 assert.match(canvas,/kind==='image'/);
 assert.match(canvas,/ArtworkImage assetId=\{exhibit.asset_id\}/);
});
test('default Gallery R1 remains supported without school architecture',()=>{
 assert.match(canvas,/schoolEdition=false/);
 assert.match(canvas,/cinemaEdition\?<PekDiscoveryHallV4/);
 assert.match(canvas,/:<PekMuseumArchitecture/);
 assert.match(visitor,/schoolEdition cinemaEdition=\{cinema\}/);
});
test('accessible close-up and full-room views without changing gallery data',()=>{
 assert.match(canvas,/Đến gần tranh/);
 assert.match(canvas,/Toàn cảnh/);
 assert.match(css,/big-pek-tools/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.doesNotMatch(architecture,/fetch\(|https?:\/\/|localStorage|sessionStorage/);
});

test('V4 Museum Cinema geometry is real Three.js scene content, not an image-background mockup',()=>{
 const hall=fs.readFileSync('src/features/immersive-gallery/PekDiscoveryHallV4.jsx','utf8');
 const cinema=fs.readFileSync('src/features/immersive-gallery/v3/museumCinemaPreview.css','utf8');
 for(const motif of ['Skylight','WindowBays','MuseumFurniture','SchoolCrest',
  'spotLight','torusGeometry','sphereGeometry','meshStandardMaterial','useTexture']){
  assert.ok(hall.includes(motif),'Missing V4 feature: '+motif);
 }
 assert.match(hall,/petrus-ky-original\.png/);
 assert.doesNotMatch(hall,/mockup\.(png|jpg)|backgroundImage|stock-photo/);
 assert.match(cinema,/bml-museum-cinema/);
 assert.match(cinema,/height:100%/);
});
