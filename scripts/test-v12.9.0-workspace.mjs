import assert from 'node:assert/strict';
import {
  WORKSPACES,
  getWorkspaceFilterFromHash,
  resolveRouteWorkspaceId,
  resolveToolWorkspaceId,
  resolveWorkspaceId,
  workspaceMatchesItem,
} from '../src/ui-core/runtime/workspaceRegistry.js';

const store = new Map();
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.BroadcastChannel = class BroadcastChannel {
  constructor() {}
  postMessage() {}
  close() {}
};
globalThis.window = {
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
  },
  dispatchEvent() {},
};

const { rememberWorkspaceVisit, getWorkspaceResumeVisit, loadWorkspaceMemory } = await import('../src/ui-core/runtime/workspaceMemory.js');

assert.equal(WORKSPACES.length, 8);
assert.equal(getWorkspaceFilterFromHash('#/apps?workspace=content'), 'content');
assert.equal(resolveRouteWorkspaceId('assessment-core'), 'assessment');
assert.equal(resolveToolWorkspaceId('worksheet-factory'), 'teaching');
assert.equal(resolveToolWorkspaceId('pronunciation-coach'), 'content');
assert.equal(resolveWorkspaceId({ route: 'tool', selectedTool: { slug: 'smart-id' } }), 'ai');
assert.equal(workspaceMatchesItem('assessment', { slug: 'exam-studio' }), true);
assert.equal(workspaceMatchesItem('resources', { slug: 'exam-studio' }), false);

const user = { id: 'teacher-1', email: 'teacher@example.com' };
rememberWorkspaceVisit(user, {
  workspaceId: 'teaching',
  target: '#/tool/worksheet-factory',
  title: 'Worksheet Factory',
  titleVi: 'Worksheet Factory',
  icon: 'WF',
  accent: '#EF7A42',
});
rememberWorkspaceVisit(user, {
  workspaceId: 'assessment',
  target: '#/assessment-core',
  title: 'Assessment Core',
  titleVi: 'Ngân hàng câu hỏi',
  icon: 'AC',
  accent: '#CC7621',
});
assert.equal(getWorkspaceResumeVisit(user, 'teaching')?.target, '#/tool/worksheet-factory');
assert.equal(getWorkspaceResumeVisit(user, 'assessment')?.titleVi, 'Ngân hàng câu hỏi');
assert.equal(loadWorkspaceMemory(user).recent.length, 2);
assert.equal(loadWorkspaceMemory(user).lastGlobal.workspaceId, 'assessment');

console.log('V12.9.0 workspace runtime tests PASS (12/12)');
