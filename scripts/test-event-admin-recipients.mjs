import assert from 'node:assert/strict';
import { isRequiredEventRecipient, resolveEventRecipientIds } from '../src/features/events/utils/eventAudience.mjs';

const profiles=[
  {id:'admin-a',role:'admin',approved:true},
  {id:'admin-b',role:'admin',approved:true},
  {id:'head',role:'department_head',approved:true},
  {id:'teacher-a',role:'teacher',approved:true},
  {id:'teacher-b',role:'teacher',approved:true},
  {id:'teacher-unapproved',role:'teacher',approved:false},
  {id:'student',role:'student',approved:true}
];
assert.equal(isRequiredEventRecipient(profiles[0]),true);
assert.equal(isRequiredEventRecipient(profiles[2]),true);
assert.equal(isRequiredEventRecipient(profiles[3]),false);
assert.equal(isRequiredEventRecipient({...profiles[2],approved:false}),false);
assert.deepEqual(resolveEventRecipientIds(profiles,['teacher-a']),
  ['teacher-a','admin-a','admin-b','head']);
assert.deepEqual(resolveEventRecipientIds(profiles,['admin-b','teacher-a','admin-a','teacher-a']),
  ['admin-b','teacher-a','admin-a','head']);
assert.deepEqual(resolveEventRecipientIds(profiles,['teacher-unapproved','student']),
  ['admin-a','admin-b','head']);
assert.deepEqual(resolveEventRecipientIds(profiles,[]),
  ['admin-a','admin-b','head']);
console.log('Event Admin/TTCM recipient coverage, deduplication and approval checks passed.');
