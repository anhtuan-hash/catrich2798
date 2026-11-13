import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import JSZip from 'jszip';
import {LIVE_STAGES,LIVE_TOTAL_MINUTES,LIVE_PERIOD_MINUTES} from '../src/features/immersive-gallery/v3/liveLesson.js';
import {portfolioProvenance,portfolioStageRows,portfolioExitRows,portfolioThinkingRows,portfolioPeerFocusRows} from '../src/features/immersive-gallery/v3/museumPortfolioV54.js';
import {loadPresenterRecovery,savePresenterRecovery,shouldRestorePanel,RECOVERY_KEY} from '../src/features/immersive-gallery/v3/museumPresenterRecovery.js';
import {presentationCueCards,speakingTime} from '../src/features/immersive-gallery/v3/museumSpeakingCues.js';
import {buildEvidenceZip} from '../src/features/immersive-gallery/v3/evidenceExport.js';
const read=p=>fs.readFileSync(p,'utf8');
const sample={assignment:{id:'a',title:'Our English Museum'},groups:[{id:'g1',label:'Group 01'},{id:'g2',label:'Group 02'}],checkpoints:[],
 responses:[{group_id:'g1',stage_index:10,value:'I will ask the teacher to check unused lights.',created_at:'2026-11-13T11:00:00Z'}],
 microResponses:[{group_id:'g2',stage_index:6,choice:1,reason:'Our artwork needs a named source.',submitted_at:'2026-11-13T10:00:00Z'}],
 feedback:[],media:[],survey:null,
 livePeerFeedback:{rooms:[{id:'room1',owner_group_id:'g2'}],reviews:[{room_id:'room1',from_group_id:'g1',target_exhibit:'evidence',learned:'A safety rule matters.',clarify:'Explain limits.',rating:4}]},
 presentationProvenance:{data_origin:'scripted_presentation',teacher_visible_note:'Prepared content for presentation',authored_drafts:10,curated_peer_feedback:20}};
test('lesson plan remains 11 authentic activities in two 45-minute periods',()=>{
 assert.equal(LIVE_STAGES.length,11);assert.equal(LIVE_TOTAL_MINUTES,90);
 assert.deepEqual(LIVE_PERIOD_MINUTES,[45,45]);
 assert.equal(LIVE_STAGES[9].id,'present');
});
test('rehearsal cues use original group words, no invented survey percentages',()=>{
 const cues=presentationCueCards({issue:'An unused classroom light',evidence:'Four of ten group priorities',solution:'Teacher-approved exit check'});
 assert.equal(cues.length,3);
 assert.equal(cues[0].text,'An unused classroom light');
 assert.equal(cues[1].text,'Four of ten group priorities');
 assert.equal(speakingTime(45),'00:45');assert.equal(speakingTime(70),'01:00');
 assert.equal(speakingTime(-1),'00:00');
});
test('microphone only starts on explicit click; recording never uploaded',()=>{
 const src=read('src/features/immersive-gallery/v3/MuseumSpeakingStudio.jsx');
 assert.match(src,/onClick=\{start\}/);
 assert.match(src,/getUserMedia\(\{audio:true\}\)/);
 assert.match(src,/rec\.start\(250\)/);
 assert.match(src,/if\(n>=60\)stop\(\)/);
 assert.match(src,/getTracks\(\)\.forEach\(t=>t\.stop\(\)\)/);
 assert.match(src,/URL\.revokeObjectURL/);
 assert.doesNotMatch(src,/\bfetch\(|localStorage|sendBeacon|navigator\.sendBeacon/);
 const student=read('src/features/immersive-gallery/v3/MuseumLabStudent.jsx');
 assert.match(student,/stageIndex===9&&liveInfo\?\.stageOpen/);
 assert.match(student,/museum-open-speaking/);
});
test('11 different teacher stage cues respect Motion OFF and OS reduced motion',()=>{
 const css=read('src/features/immersive-gallery/v3/museumStageMotionV54.css');
 for(const stage of LIVE_STAGES)assert.match(css,new RegExp('data-stage-id="'+stage.id+'"'));
 const ids=[...css.matchAll(/@keyframes\s+(bml-v54-[\w-]+)/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,11+1); // 11 activity cues plus survey chart
 assert.match(css,/bml-motion-on/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 const teacher=read('src/features/immersive-gallery/v3/MuseumLiveTeacher.jsx');
 assert.match(teacher,/data-stage-id=\{stage\?\.id\|\|'none'\}/);
 assert.match(teacher,/data-motion=\{motionOn\?'on':'off'\}/);
});
test('session-tab recovery retains only known fields, no unknown class access or secrets',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const allowed=['a1','a2'];
 assert.equal(savePresenterRecovery(storage,{assignmentId:'a1',sessionId:'s2',stageIndex:9,motionOn:false,panel:'video',showVoiceover:false,showVideoLab:true,secret:'do not store'},allowed),true);
 const raw=data.get(RECOVERY_KEY);
 assert.doesNotMatch(raw,/secret/);
 const record=loadPresenterRecovery(storage,allowed);
 assert.equal(record.assignmentId,'a1');assert.equal(record.motionOn,false);
 assert.equal(record.panel,'video');
 assert.equal(shouldRestorePanel(record,{id:'s2',stageIndex:9,status:'active'}),true);
 assert.equal(shouldRestorePanel(record,{id:'s2',stageIndex:8,status:'active'}),false);
 assert.equal(loadPresenterRecovery(storage,['a3']),null);
 assert.equal(savePresenterRecovery(storage,{assignmentId:'unauthorized'},allowed),false);
});
test('group-stage portfolio rows do not infer grades from recorded responses',()=>{
 const stages=portfolioStageRows(sample);
 assert.equal(stages.length,11);
 assert.equal(stages[10][5],1);
 assert.equal(stages[6][6],1);
 assert.equal(stages[9][5],0);
 assert.equal(portfolioExitRows(sample)[0][0],'Group 01');
 assert.equal(portfolioThinkingRows(sample)[0][0],'Group 02');
 assert.equal(portfolioPeerFocusRows(sample)[0][2],'evidence');
 assert.match(portfolioProvenance(sample).classification,/NOT independently observed/);
});
test('ZIP portfolio includes explicit provenance, exit tickets and stage matrix without signed links',async()=>{
 const file=await buildEvidenceZip(sample,[]);
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 for(const name of ['Record_provenance.csv','11_activity_evidence_matrix.csv','Exit_tickets.csv',
 'Thinking_challenges.csv','Peer_feedback_by_exhibit.csv','Group_reflections.csv']){
  assert.ok(zip.file('P2/Minh_chung/'+name),name);
 }
 const info=await zip.file('P2/README.txt').async('string');
 assert.match(info,/NOT independently observed/);
 const m=await zip.file('P2/Minh_chung/11_activity_evidence_matrix.csv').async('string');
 assert.match(m,/Present and Discuss/);
 const csv=await zip.file('P2/Minh_chung/Peer_feedback_by_exhibit.csv').async('string');
 assert.match(csv,/evidence/);
 const records=await zip.file('P2/Minh_chung/records.json').async('string');
 assert.doesNotMatch(records,/signedUrl|group_passcode/);
});
