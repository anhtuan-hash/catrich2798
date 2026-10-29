import assert from 'node:assert/strict';
import {parseJuryEntry,buildJuryRankings} from '../src/utils/photoJuryRanking.js';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const live=read('src/components/PhotoJuryLive.jsx');
const gallery=read('src/pages/PhotoSlideshow.jsx');
const style=read('src/components/PhotoJuryLive.css');
const check=(c,m)=>{assert.ok(c,m);console.log('✓ '+m);};
assert.deepEqual(parseJuryEntry('11.4 Group 1  | Halloween',13),{className:'11.4',groupNumber:1,label:'11.4 Group 1'});
assert.deepEqual(parseJuryEntry('11.5 Nhóm 2 | Demo',1),{className:'11.5',groupNumber:2,label:'11.5 Group 2'});
assert.equal(parseJuryEntry('Unrelated text',0).className,null);
const slides=[
{id:'a',caption:'11.1 Group 1 | Story A',imageUrl:'https://example.test/a.jpg'},
{id:'b',caption:'11.1 Group 2 | Story B',imageUrl:'https://example.test/b.jpg'},
{id:'c',caption:'11.1 Group 3 | Story C',imageUrl:'https://example.test/c.jpg'},
{id:'d',caption:'11.2 Group 1 | Story D',imageUrl:'https://example.test/d.jpg'},
{id:'e',caption:'11.2 Group 2 | Story E',imageUrl:'https://example.test/e.jpg'},
{id:'f',caption:'11.3 Group 1 | Story F',imageUrl:'https://example.test/f.jpg'},
];
const scores=[
{slideId:'a',average:80,scoredCount:2},
{slideId:'b',average:90,scoredCount:1},
{slideId:'d',average:92.5,scoredCount:3},
{slideId:'e',average:0,scoredCount:1},
{slideId:'f',average:100,scoredCount:1},
];
const data=buildJuryRankings(slides,scores);
check(data.groups.length===6,'one artwork row per entry; missing score remains visible');
check(data.classes.length===3,'distinct classes derived only from album captions');
assert.equal(data.groups[0].label,'11.3 Group 1');
assert.equal(data.groups[0].score,100);
assert.equal(data.groups.at(-1).score,null);
assert.equal(data.classes[0].name,'11.3');
assert.equal(data.classes[0].score,100);
assert.equal(data.classes.find(c=>c.name==='11.1').score,85);
assert.equal(data.classes.find(c=>c.name==='11.1').scoredGroups,2);
assert.equal(data.classes.find(c=>c.name==='11.1').totalGroups,3);
assert.equal(data.classes.find(c=>c.name==='11.2').score,46.25);
assert.equal(data.groups.find(g=>g.slideId==='e').score,0);
check(data.groups.find(g=>g.slideId==='a').scoredCount===2,'each artwork keeps anonymous count of scored judges');
const ties=buildJuryRankings(slides.slice(0,2),[{slideId:'a',average:90},{slideId:'b',average:90}]);
assert.equal(ties.groups[0].slideId,'a');
const empty=buildJuryRankings(slides,[]);
assert.ok(empty.groups.every(row=>row.score===null));
assert.ok(empty.classes.every(row=>row.score===null));
check(live.includes("useState('classes')"),'class ranking is default');
check(live.includes("setMode('groups')"),'group ranking toggle available');
check(live.includes('buildJuryRankings(slides,snapshot?.artworks||[])'),'rank only current album and server aggregates');
check(live.includes('entry.name===current?.className')&&live.includes('entry.slideId===slideId'),'highlight currently displayed class/group');
check(live.includes("POLL_MS=5000"),'live updates still poll every 5s');
check(live.includes("aria-pressed={mode==='classes'}")&&live.includes("aria-pressed={mode==='groups'}"),'accessible toggle states');
check(gallery.includes("slides={ordered.map(item=>({id:item.id,caption:item.caption,imageUrl:imageUrl(item.image_path)}))}"),'gallery provides labels and photos');
check(style.includes('.bss-jury-rank-row.is-current')&&style.includes('.bss-jury-rank-track'),'QRvote-style ranking rows and bars');
check(!live.includes('full_name')&&!live.includes('invite_id'),'no private judge metadata exposed in public UI');
console.log('BRIAN Live Jury class and group ranking QA PASS');
