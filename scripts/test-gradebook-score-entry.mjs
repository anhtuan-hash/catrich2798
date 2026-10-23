import assert from 'node:assert/strict';
import { normalizeTeacherScoreInput, scoreEntryDraftIsAllowed } from '../src/utils/gradebookScoreEntry.mjs';

const examples = [
  ['', ''],
  ['0', '0'],
  ['9', '9'],
  ['10', '10'],
  ['100', '10'],
  ['96', '9.6'],
  ['85', '8.5'],
  ['818', '8.2'],
  ['825', '8.3'],
  ['999', '10'],
  ['8.25', '8.25'],
  ['8,25', '8.25'],
  ['8.5', '8.5'],
  ['0.5', '0.5'],
  ['.5', '0.5'],
  [' 96 ', '9.6'],
];
for (const [input, expected] of examples) {
  assert.equal(normalizeTeacherScoreInput(input), expected,
    `Shorthand parse failed: ${JSON.stringify(input)} should become ${expected}`);
}
for (const input of ['10.5', '99.9', '8188', '-1', 'abc', '.']) {
  assert.equal(normalizeTeacherScoreInput(input), null,
    `Invalid score should not be committed: ${input}`);
}
for (const [draft, valid] of [['818', true], ['9.', true], ['8,', true], ['8.25', true], ['8188', false], ['12.345', false]]) {
  assert.equal(scoreEntryDraftIsAllowed(draft), valid,
    `Draft acceptance mismatch: ${draft}`);
}
console.log('Gradebook shorthand entry: all normalization and validation checks passed.');
