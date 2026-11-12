import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROOM_TEMPLATES,ROOM_KEYS,normalizeTransform,validTransform,validSlug,slugify,safeVideoUrl,validateExhibition,validateExhibit,useLiteQuality} from '../src/features/immersive-gallery/sceneTemplates.js';
test('three unique room templates are available',()=>{assert.deepEqual(ROOM_KEYS,['classic','culture','lab']);for(const r of ROOM_KEYS)assert.ok(ROOM_TEMPLATES[r].wall);});
test('valid gallery slug strict validation',()=>{assert.equal(validSlug('climate-exhibit'),true);for(const s of ['','bad space','../admin','A','!','-a','a/../../x'])assert.equal(validSlug(s),false);});
test('Vietnamese titles normalize to safe slugs',()=>assert.equal(slugify('Global Warming! 2026'),'global-warming-2026'));
test('invalid transform resets to bounded safe geometry',()=>{const result=normalizeTransform({position:[NaN,999,0],rotation:['a',0,0],scale:[0,1,1]});assert.deepEqual(result.position,[0,2,-7.72]);assert.deepEqual(result.scale,[1,1,1]);});
test('valid placement passes without modification',()=>{const v={position:[0,2,-7],rotation:[0,0,0],scale:[1,1,1]};assert.equal(validTransform(v),true);assert.deepEqual(normalizeTransform(v),v);});
test('unsafe transform rejected',()=>{assert.equal(validTransform({position:[Infinity,0,0],rotation:[0,0,0],scale:[1,1,1]}),false);});
test('XSS and unauthorized URLs not embedded',()=>{for(const x of ['javascript:alert(1)','https://evil.example/payload','http://youtu.be/12345678901'])assert.equal(safeVideoUrl(x),'');});
test('YouTube watch URL converts to no-cookie embed',()=>assert.equal(safeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
test('approved privacy embed remains idempotent',()=>assert.equal(safeVideoUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'));
test('gallery enforces title and slug',()=>{assert.ok(validateExhibition({title:'',slug:'bad@',visibility:'public'}).length>0);assert.deepEqual(validateExhibition({title:'Culture',slug:'culture',visibility:'private'}),[]);});
test('model must be curated and known',()=>{const base={title:'Exhibit',kind:'model',transform:{position:[0,2,-7],rotation:[0,0,0],scale:[1,1,1]}};assert.ok(validateExhibit({...base,model_key:'remote'}).includes('model'));assert.deepEqual(validateExhibit({...base,model_key:'globe'}),[]);});
test('image requires authorized asset',()=>{assert.ok(validateExhibit({title:'Art',kind:'image',transform:{position:[0,2,-7],rotation:[0,0,0],scale:[1,1,1]}}).includes('asset'));});
test('lite preset stays lite',()=>assert.equal(useLiteQuality('lite'),'lite'));
test('module is lazy-loaded in ToolPage only',()=>{const s=fs.readFileSync('src/pages/ToolPage.jsx','utf8');assert.match(s,/const ImmersiveGallery = lazy/);const main=fs.readFileSync('src/main.jsx','utf8');assert.doesNotMatch(main,/from .*GalleryCanvas/);});
test('gallery is disabled by default in the SQL migration',()=>{const s=fs.readFileSync('supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql','utf8');assert.match(s,/values \(true, false\)/);assert.match(s,/enable row level security/);assert.match(s,/revoke all .* from anon/);assert.match(s,/gallery_storage_select/);assert.match(s,/gallery_immutable_exhibit/);});
test('feature is hidden from Brian apps until flag is enabled',()=>{const s=fs.readFileSync('src/main.jsx','utf8');assert.match(s,/galleryEnabled/);assert.match(s,/item.slug !== 'immersive-gallery' \|\| galleryEnabled/);});
console.log('Gallery R1 static/contract tests complete. Database RLS and Playwright tests require staging data and are NOT asserted by this suite.');

test('migration uses valid named SQL dollar quoting',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql','utf8');
 assert.match(sql,/as \$gallery_lock\$/);
 assert.match(sql,/end; \$gallery_lock\$;/);
 assert.match(sql,/as \$gallery_publish_guard\$/);
 assert.match(sql,/end; \$gallery_publish_guard\$;/);
});
test('private assets require active visibility check and a publish guard',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261112140000_brian_immersive_gallery_r1.sql','utf8');
 const p=sql.slice(sql.indexOf('create policy gallery_assets_select'),sql.indexOf('create policy gallery_assets_insert'));
 assert.match(p,/g\.visibility='school'/);
 assert.match(p,/g\.status='published'/);
 assert.match(p,/s\.enabled=true/);
 assert.match(sql,/Only approved exhibits may be published/);
 assert.match(sql,/gallery_publish_guard_trigger/);
});
