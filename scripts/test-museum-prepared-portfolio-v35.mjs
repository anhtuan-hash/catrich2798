import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PREPARED_COLLECTIONS,preparedCollectionFor,preparedGallery} from '../src/features/immersive-gallery/v3/museumPreparedCollections.js';
const lessonUi=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLessonFlow.jsx','utf8');
const galleryUi=fs.readFileSync('src/features/immersive-gallery/v3/MuseumExplore.jsx','utf8');
const app=fs.readFileSync('src/features/immersive-gallery/v3/MuseumLabApp.jsx','utf8');
test('exactly three matching THPT lessons and 18 differentiated projects',()=>{
 assert.deepEqual(PREPARED_COLLECTIONS.map(c=>[c.classScope,c.title]),[
  ['12.1','Protecting Marine Life'],
  ['11.4','Sustainable School'],
  ['11.3','Protecting Marine Life']
 ]);
 assert.equal(PREPARED_COLLECTIONS.reduce((sum,c)=>sum+c.projects.length,0),18);
 for(const collection of PREPARED_COLLECTIONS){
  assert.equal(collection.projects.length,6);
  assert.equal(new Set(collection.projects.map(p=>p.title)).size,6);
  assert.equal(collection.origin,'teacher_authored_content');
  for(const p of collection.projects){
   for(const key of ['issue','evidence','source','solution','reviewQuestion','revisionGuide']){
    assert.ok(p[key].length>(key==='source'?10:18),p.title+' missing '+key);
   }
  }
 }
});
test('matching is restricted to both exact class and lesson title',()=>{
 assert.equal(preparedCollectionFor({class_scope:'11.4',title:'Sustainable School'})?.key,'school-11');
 assert.equal(preparedCollectionFor({class_scope:'11.3',title:'Protecting Marine Life'})?.key,'marine-11');
 assert.equal(preparedCollectionFor({class_scope:'12.1',title:'Protecting Marine Life'})?.key,'marine-12');
 assert.equal(preparedCollectionFor({class_scope:'12.2',title:'Protecting Marine Life'}),null);
 assert.equal(preparedCollectionFor({class_scope:'11.4',title:'Protecting Marine Life'}),null);
});
test('each gallery has six interactive rooms and 18 complete original artifacts',()=>{
 for(const c of PREPARED_COLLECTIONS){
  const gallery=preparedGallery(c.key);
  assert.equal(gallery.rooms.length,6);
  assert.equal(gallery.rooms.flatMap(r=>r.exhibits).length,18);
  assert.equal(gallery.origin,'teacher_authored_content');
  assert.equal(gallery.accept_submissions,false);
  assert.equal(gallery.visibility,'private');
  for(const room of gallery.rooms)for(const e of room.exhibits){
   assert.ok(e.title&&e.description.length>30);
   assert.match(e.title,/The Problem|The Evidence|Our Solution/);
   assert.equal(e.asset_id,null);
  }
  assert.equal(preparedGallery(c.key,3).rooms.length,1);
 }
});
test('catalog does not create server-side student events, scores or invented grades',()=>{
 const content=fs.readFileSync('src/features/immersive-gallery/v3/museumPreparedCollections.js','utf8');
 assert.doesNotMatch(content,/staffRequest\(|guestRequest\(|supabase\.from\(|fetch\(|insert\(|submitted_at:|scoreRubric\(/);
 assert.match(lessonUi,/preparedCollectionFor\(a\)/);
 assert.match(lessonUi,/onOpenCollection\?\./);
 assert.match(galleryUi,/data-testid=\{'museum-collection-'\+c.key\}/);
 assert.match(app,/openCollection/);
});


test('Green Campus first group displays three static pre-rendered AVIF artworks',()=>{
 const first=preparedGallery('school-11').rooms[0].exhibits;
 const expected=['problem','evidence','solution'];
 assert.equal(first.length,3);
 first.forEach((art,i)=>{
  const path='/museum/artwork/green-campus-0'+(i+1)+'-'+expected[i]+'.avif';
  assert.equal(art.kind,'image');
  assert.equal(art.image_url,path);
  const contents=fs.readFileSync('public'+path);
  assert.ok(contents.length>30000,'Artwork must contain a full-resolution image');
  assert.equal(contents.toString('ascii',4,12),'ftypavif');
 });
 assert.equal(new Set(first.map(e=>e.image_url)).size,3);
});
