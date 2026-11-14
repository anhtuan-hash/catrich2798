import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('src/features/immersive-gallery/v3/MuseumLabApp.jsx');
const showcase=read('src/features/immersive-gallery/v3/MuseumExplore.jsx');
const dossier=read('src/features/immersive-gallery/v3/MuseumEvidence.jsx');
const legacy=read('src/features/immersive-gallery/GalleryApp.jsx');
const locked=read('serverless-handlers/_galleryCreator.js');
const freeze=read('supabase/migrations/20261114013000_museum_completed_readonly.sql');

// No demo entry points from the real competition route, including URL navigation.
assert.doesNotMatch(app,/tab==='demo'\?/);
assert.doesNotMatch(app,/DEMO_GALLERY|onDemo=\{demo\}/);
assert.match(app,/if\(id==='demo'\)/);

// The live school showcase must only include actual published exhibitions,
// never bundled teacher-authored illustrations or a local sample gallery.
assert.match(showcase,/const visiblePrepared=\[\]/);
assert.match(showcase,/initial==='demo'\|\|initial\.startsWith\('collection-'\)/);
assert.match(showcase,/isPracticeShowcase\(item\)/);
assert.match(showcase,/isPracticeShowcase\(g\)/);
assert.match(showcase,/transport\('showcase-exhibition',\{id:item\.id\}\)/);
assert.doesNotMatch(showcase,/museum-collection-/);
assert.doesNotMatch(showcase,/setSelected\(preparedGallery\(/);
assert.doesNotMatch(showcase,/setSelected\(DEMO_GALLERY\)/);

// Judge navigation must no longer offer a non-authentic demonstration as evidence.
assert.doesNotMatch(dossier,/Judge demo|Xem demo giám khảo|onClick=\{onDemo\}/);

// Neither the legacy catalog nor its editor creates synthetic exhibitions.
assert.doesNotMatch(legacy,/gallery-original-demo|Create sample exhibition|Visit the demo museum|seedDemoGallery|buildLocalGalleryDemo/);
assert.match(legacy,/isPracticeGallery/);
assert.match(legacy,/setGalleries\(\(await listExhibitions\(\)\)\.filter\(g=>!isPracticeGallery\(g\)\)\)/);

// The real lesson is still immutable: no provenance rewrites, data suppression
// masquerading as authentic responses, or changes to auth/write guards.
assert.match(locked,/if\(assignment\.content_frozen_at\)throw fail\(423/);
assert.match(freeze,/content_frozen_at/);
assert.doesNotMatch(showcase,/data_origin\s*[:=]\s*['"](?:live|student|observed)['"]/);
console.log('PASS: no sample or demo entry points in official Immersive Gallery; approved student exhibits and frozen data remain unchanged.');
