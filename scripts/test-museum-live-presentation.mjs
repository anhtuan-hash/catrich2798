import assert from 'node:assert/strict';
import test from 'node:test';
import { LIVE_STAGES, sessionStage } from '../src/features/immersive-gallery/v3/liveLesson.js';
import { liveReadAudience, presentationFor, responseMatchesActivity, validPresentation } from '../src/features/immersive-gallery/v3/livePresentation.js';

test('an ordinary group state request uses the verified group session', () => {
  const request = { method: 'GET', headers: { cookie: 'brian_gcp=test' } };
  assert.equal(liveReadAudience(request, 'state'), 'guest');
  assert.equal(liveReadAudience({ ...request, headers: {} }, 'state'), 'guest');
  assert.equal(liveReadAudience({ ...request, headers: { 'x-museum-public': '1' } }, 'state'), 'public');
  assert.equal(liveReadAudience({ ...request, method: 'POST', headers: { 'x-museum-public': '1' } }, 'control'), 'guest');
  assert.equal(liveReadAudience({ ...request, headers: { authorization: 'Bearer teacher' } }, 'state'), 'staff');
});

test('all lesson stages have an appropriate default presentation', () => {
  assert.equal(LIVE_STAGES.length, 11);
  assert.deepEqual(presentationFor(undefined), { view: "task", questionIndex: 0 });
  for (const [index, stage] of LIVE_STAGES.entries()) {
    const { view, questionIndex } = presentationFor(index);
    assert.equal(view, [1, 3].includes(index) ? 'video' : 'task');
    assert.equal(validPresentation(index, stage, view, questionIndex), true);
  }
});

test('teacher tabs and question numbers apply only to the intended activity', () => {
  assert.ok(validPresentation(0, LIVE_STAGES[0], 'vote', 0));
  assert.ok(validPresentation(7, LIVE_STAGES[7], 'next', 0));
  assert.equal(validPresentation(2, LIVE_STAGES[2], 'vote', 0), false);
  for (const index of [1, 3]) {
    const stage = sessionStage({ media_board: {} }, index);
    assert.ok(validPresentation(index, stage, 'check', 2));
    assert.equal(validPresentation(index, stage, 'check', 3), false);
    assert.equal(validPresentation(index, stage, 'video', 2), false);
    const saved = { stageIndex: index, view: 'check', questionIndex: 2 };
    assert.deepEqual(presentationFor(index, saved), { view: 'check', questionIndex: 2 });
    assert.deepEqual(presentationFor(index + 1, saved), { view: 'task', questionIndex: 0 });
  }
});

test('late group responses stay associated with their original session and activity', () => {
  const active = { id: 'class-11-4', stage_index: 2 };
  assert.ok(responseMatchesActivity({ sessionId: active.id, stageIndex: 2 }, active));
  assert.equal(responseMatchesActivity({ sessionId: active.id, stageIndex: 0 }, active), false);
  assert.equal(responseMatchesActivity({ sessionId: 'class-11-3', stageIndex: 2 }, active), false);
  assert.ok(responseMatchesActivity({}, active));
});
