import assert from 'node:assert/strict';
import {initialState,sanitizeState} from '../src/components/BrianInstantTools/instantToolsCore.mjs';
import {
 WHEEL_MAX_ITEMS,WHEEL_THEMES,wheelSanitizeRows,wheelSegments,pickWheelSegment,
 wheelTargetForSegment,makeWheelHistory,sanitiseWheelStudio,wheelCsv,parseWheelCsv,shuffleWheelRows
} from '../src/components/BrianInstantTools/wheelStudioCore.mjs';
const st=initialState();
assert.equal(st.wheel.rows.length,4);
assert.equal(st.wheel.mode,'normal');
const migrated=sanitizeState({version:1,state:{wheel:{names:['Alpha','Beta','Gamma'],rotation:90,winner:'Beta'}}});
assert.deepEqual(migrated.wheel.rows.map(r=>r.label),['Alpha','Beta','Gamma']);
assert.equal(migrated.wheel.winner,'Beta');
const rows=wheelSanitizeRows([{id:'a',label:'Alpha',weight:1,color:'#ffffff'},
 {id:'b',label:'Beta',weight:3,color:'#00aaee'},{id:'c',label:'Gamma',weight:2,enabled:false}]);
const segs=wheelSegments(rows,'aurora');
assert.equal(segs.length,2);
assert.ok(Math.abs(segs[0].end-90)<1e-9);
assert.ok(Math.abs(segs[1].end-360)<1e-9);
assert.equal(pickWheelSegment(segs,()=>0).label,'Alpha');
assert.equal(pickWheelSegment(segs,()=>1).label,'Beta');
assert.equal(pickWheelSegment(segs,()=>3).label,'Beta');
const angle=wheelTargetForSegment(45,segs[1]);
const final=((angle%360)+360)%360;
const expected=((360-segs[1].center)%360+360)%360;
assert.ok(Math.abs(final-expected)<.001);
assert.ok(angle>2000);
const history=makeWheelHistory([],segs[1],'accumulation');
assert.equal(history.length,1);
assert.equal(history[0].mode,'accumulation');
const preset=sanitiseWheelStudio({rows,mode:'elimination',theme:'candy',duration:7,confetti:false,mystery:true,
 counts:{a:3,b:4},history});
assert.equal(preset.mode,'elimination');assert.equal(preset.confetti,false);assert.equal(preset.mystery,true);
assert.equal(preset.counts.b,4);assert.equal(preset.history.length,1);
assert.equal(wheelSegments(preset.rows,preset.theme).length,2);
const csv=wheelCsv(rows),again=parseWheelCsv(csv);
assert.deepEqual(again.map(r=>r.label),rows.map(r=>r.label));
assert.deepEqual(again.map(r=>r.weight),rows.map(r=>r.weight));
assert.equal(again[2].enabled,false);
assert.equal(shuffleWheelRows(rows,()=>0).length,rows.length);
const withSaved=sanitiseWheelStudio({rows,savedLists:[
 {id:'classA',label:'Class A',rows,mode:'accumulation',theme:'sunset',duration:10}
]});
assert.equal(withSaved.savedLists.length,1);
assert.equal(withSaved.savedLists[0].rows.length,3);
assert.equal(withSaved.savedLists[0].theme,'sunset');
assert.equal(withSaved.savedLists[0].mode,'accumulation');
assert.equal(Object.keys(WHEEL_THEMES).length,4);
assert.equal(WHEEL_MAX_ITEMS,60);
assert.equal(sanitiseWheelStudio({rows:[{id:'evil',label:'x'.repeat(400),weight:999}]}).rows[0].label.length,45);
assert.equal(sanitiseWheelStudio({rows:[{id:'bad',label:'X',color:'url(javascript:evil)',weight:-4}]}).rows[0].color,'');
assert.equal(sanitiseWheelStudio({rows:[{id:'bad',label:'X',weight:-4}]}).rows[0].weight,1);
console.log('PASS Wheel Studio — weighted probability, pointer alignment, 3 modes, migration, bounds and CSV.');
