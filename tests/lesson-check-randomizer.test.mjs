import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shuffleLearners, drawUncalledStudent, makeBalancedGroups } from '../src/utils/lessonCheckRandomizer.js';

const sample = Array.from({length: 35}, (_,i)=>({ref: `S${i+1}`, fullName: `Student ${i+1}`}));
const key = (item) => item.ref;
test('random calls do not repeat before all students have been drawn', () => {
  const called = [];
  for (let i=0;i<sample.length;i++) {
    const next = drawUncalledStudent(sample, called, key, ()=>0);
    assert.ok(next);
    assert.ok(!called.includes(next.ref));
    called.push(next.ref);
  }
  assert.equal(new Set(called).size, sample.length);
  assert.equal(drawUncalledStudent(sample, called, key), null);
  assert.equal(drawUncalledStudent(sample, [], key, ()=>0).ref, 'S1');
});
test('calling a learner never changes the selected population', () => {
  const selected = [sample[4],sample[7],sample[9]];
  const frozen = [...selected];
  const pick = drawUncalledStudent(selected, [sample[4].ref], key, ()=>0);
  assert.equal(pick.ref, sample[7].ref);
  assert.deepEqual(selected, frozen);
});
test('groups are balanced, complete and cover each eligible student once', () => {
  for (const n of [2, 3, 4, 5, 8, 12, 36]) {
    const groups=makeBalancedGroups(sample,n,key,()=>0.42);
    assert.equal(Object.keys(groups).length,sample.length);
    const counts=Object.values(groups).reduce((acc, group)=>(acc[group]=(acc[group]||0)+1,acc),{});
    const sizes=Object.values(counts);
    assert.equal(sizes.length,Math.min(n,sample.length));
    assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1);
  }
});
test('grouping a chosen subset never adds other students', () => {
  const subset=sample.slice(0,7);
  const result=makeBalancedGroups(subset,3,key,()=>0.65);
  assert.equal(Object.keys(result).length,7);
  assert.equal(result.S8,undefined);
  assert.deepEqual(shuffleLearners(sample,()=>0).slice().sort((a,b)=>a.ref.localeCompare(b.ref)),sample.slice().sort((a,b)=>a.ref.localeCompare(b.ref)));
});
test('UI keeps participant selection separate from draws and presents editable teams', () => {
  const component=readFileSync(new URL('../src/components/lessonCheck/AssessmentWorkspace.jsx',import.meta.url),'utf8');
  assert.ok(component.includes("const randomPick = () =>"));
  assert.ok(component.includes("const randomGroups = () =>"));
  const pickAction=component.slice(component.indexOf('  const randomPick = () =>'),component.indexOf('  const addCalledStudent = () =>'));
  assert.ok(!pickAction.includes('setSelectedRefs('));
  assert.ok(!pickAction.includes('setParticipationMode('));
  assert.ok(component.includes('setCalledRefs((current) => [...current, ref])'));
  assert.ok(component.includes('onChange={(event) => reassignGroup('));
  assert.ok(component.includes('Gọi tên tiếp theo'));
  assert.ok(component.includes('Chia lại'));
  assert.ok(component.includes('f4a-spotlight'));
  assert.ok(component.includes('sourceCount <= 1'));
  assert.ok(component.includes('Chia nhóm ngẫu nhiên'));
  assert.ok(component.includes('Trình chiếu'));
});
