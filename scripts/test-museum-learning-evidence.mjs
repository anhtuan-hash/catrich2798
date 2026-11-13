import test from 'node:test';
import assert from 'node:assert/strict';
import {roundRobin,validatePeer,surveySummary,surveyCitation,changedExhibits,normalizeArtMeta,contestBasename,evidenceMissing} from '../src/features/immersive-gallery/v3/learningEvidence.js';
import {normalizeGuestDraft} from '../src/features/immersive-gallery/creatorPassPolicy.js';
import {documentFromStudio,normalizeStudio} from '../src/features/immersive-gallery/v3/museumData.js';
import {LIVE_STAGES} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {p2Document} from '../src/features/immersive-gallery/v3/museumDossier.js';
import {csv} from '../src/features/immersive-gallery/v3/evidenceExport.js';
test('every participating group gives and receives one review, never itself',()=>{
 for(let n=2;n<=30;n++){
  const groups=Array.from({length:n},(_,i)=>({id:String(i),label:'Group '+i}));
  const p=roundRobin(groups);
  assert.equal(new Set(p.map(x=>x.to_group)).size,n);assert.equal(new Set(p.map(x=>x.from_group)).size,n);
  assert.ok(p.every(x=>x.from_group!==x.to_group));assert.deepEqual(p,roundRobin(groups.reverse()));
 }
 assert.deepEqual(roundRobin([{id:'1',label:'Only group'}]),[]);
});
test('frozen survey counts preserve N and do not accept empty or fabricated shape',()=>{
 assert.equal(surveySummary({counts:[0,0,0,0]}),null);
 assert.equal(surveySummary({counts:[1,-1,3,4]}),null);
 assert.equal(surveySummary({counts:[1,1.5,3,4]}),null);
 const s=surveySummary({counts:[1,2,0,0],source:'paper',created_at:'2026-11-13',untrusted:'secret'});
 assert.equal(s.n,3);assert.equal(s.options[1].percent,66.67);assert.equal(s.untrusted,undefined);
 assert.match(surveyCitation(s),/group choices, not individual habits/);
});
test('feedback requires useful text and a bounded clarity score',()=>{
 const p={learned:'I learned about wasted energy.',clarify:'Please state who turns off the lights.',rating:3};
 assert.ok(validatePeer(p));for(const rating of [0,5,1.5,'3'])assert.ok(!validatePeer({...p,rating}));
 assert.ok(!validatePeer({...p,clarify:'good'}));
});
test('learning evidence survives student to server to student normalization',()=>{
 const studio={title:'Our museum',learning:{roles:'Editor A; designer B',feasibility:'Class monitors can check lights.',issue:'Problem',evidence:'Evidence',solution:'Solution'},artMeta:{issue:{alt:'An empty room with lights on',source:'Original group drawing',rights:'Created by this group'}},survey:{id:'snapshot',counts:[1,2,3,0]}};
 const assignment={max_rooms:3,max_exhibits:12};
 const doc=normalizeGuestDraft(documentFromStudio(studio),assignment);
 assert.equal(doc.learning.roles,studio.learning.roles);assert.equal(doc.artMeta.issue.alt,studio.artMeta.issue.alt);
 assert.equal(normalizeStudio(doc).survey.n,6);
 assert.deepEqual(changedExhibits(doc,{...doc,learning:{...doc.learning,solution:'Revised solution'}}),['solution']);
 assert.ok(evidenceMissing(doc).includes('Frozen class survey chart'));
});
test('P2 contains exactly the teacher 11 stages and correct 45+45 timing',()=>{
 const p=p2Document({},{});
 for(const stage of LIVE_STAGES)assert.ok(p.includes(stage.title));
 for(const period of [1,2])assert.equal(LIVE_STAGES.filter(s=>s.period===period).reduce((n,s)=>n+s.minutes,0),45);
 assert.match(p,/NASA/);assert.match(p,/United Nations/);assert.match(p,/Offline contingency/);
 assert.equal(contestBasename('Nguyễn Anh Tuấn'),'TiengAnh_THPT_Nguyen-Anh-Tuan_STEM_');
});
test('CSV cells reject formula execution while preserving actual feedback',()=>{
 const output=csv([['=HYPERLINK("bad")','Normal, feedback','line\nnext']]);
 assert.ok(output.includes("'=HYPERLINK"));assert.ok(output.includes('"Normal, feedback"'));
});
