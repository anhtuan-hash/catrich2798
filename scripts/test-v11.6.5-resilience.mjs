#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = process.cwd();
const runtimePath = path.join(root, 'public/bes-ai-governance-v1165/ai-governance-resilience.js');
const source = fs.readFileSync(runtimePath, 'utf8');

class FakeElement {
  constructor() {
    this.dataset = {};
    this.children = [];
    this.style = {};
    this.className = '';
    this.innerHTML = '';
  }
  appendChild(child) { this.children.push(child); return child; }
  remove() {}
  addEventListener() {}
  querySelectorAll() { return []; }
  querySelector() { return null; }
  getClientRects() { return []; }
  matches() { return false; }
  closest() { return null; }
  getAttribute() { return null; }
  setAttribute() {}
}
class FakeInput extends FakeElement {}
class FakeSelect extends FakeElement {}
class FakeTextarea extends FakeElement {}

function makeContext(responses) {
  const calls = [];
  const storage = new Map();
  const originalFetch = async (input, init = {}) => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push({ url: String(input), body });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { 'content-type': 'application/json' },
    });
  };
  const documentElement = new FakeElement();
  const document = {
    documentElement,
    body: new FakeElement(),
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById() { return null; },
    createElement() { return new FakeElement(); },
  };
  const localStorage = {
    get length() { return storage.size; },
    key(index) { return [...storage.keys()][index] ?? null; },
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
  };
  const immediate = (callback) => { callback(); return 1; };
  const window = {
    fetch: originalFetch,
    addEventListener() {},
    dispatchEvent() {},
    setTimeout: immediate,
    clearTimeout() {},
  };
  const context = {
    window,
    document,
    location: { hash: '#/tool/worksheet-factory' },
    localStorage,
    sessionStorage: localStorage,
    console,
    Request,
    Response,
    Headers,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    BroadcastChannel: class BroadcastChannel { postMessage() {} close() {} },
    MutationObserver: class MutationObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
    Element: FakeElement,
    HTMLInputElement: FakeInput,
    HTMLSelectElement: FakeSelect,
    HTMLTextAreaElement: FakeTextarea,
    CSS: { escape: (value) => String(value) },
    getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    requestAnimationFrame: (callback) => callback(),
    setTimeout: immediate,
    clearTimeout() {},
    structuredClone,
  };
  window.window = window;
  window.document = document;
  window.location = context.location;
  window.localStorage = localStorage;
  window.CustomEvent = context.CustomEvent;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: runtimePath });
  return { context, calls };
}

const longGovernance = `AI Governance policy and audit log. ${'quota action engine daily token budget '.repeat(80)}`;
const longUser = `Tạo worksheet B2-C1. ${'Nội dung nguồn giáo dục cần xử lý chi tiết. '.repeat(120)}`;

{
  const { context, calls } = makeContext([
    { status: 402, body: { error: { message: 'Prompt tokens limit exceeded: 1131 > 522. To increase, visit https://openrouter.ai/settings/credits and upgrade to a paid account' } } },
    { status: 200, body: { choices: [{ message: { content: 'ok' } }] } },
  ]);
  const response = await context.window.fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      provider: 'openrouter',
      model: 'qwen/qwen3-30b-a3b',
      messages: [
        { role: 'system', content: longGovernance },
        { role: 'user', content: longUser },
      ],
      max_tokens: 1400,
    }),
  });
  assert.equal(response.ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].body.model, 'qwen/qwen3-30b-a3b');
  assert.ok(JSON.stringify(calls[1].body).length < JSON.stringify(calls[0].body).length / 2);
  assert.ok(!JSON.stringify(calls[1].body).includes('audit log'));
}

{
  const { context, calls } = makeContext([
    { status: 402, body: { error: { message: 'Prompt tokens limit exceeded: 1131 > 522. To increase, visit https://openrouter.ai/settings/credits' } } },
    { status: 402, body: { error: { message: 'Insufficient credits. Upgrade to a paid account.' } } },
    { status: 200, body: { choices: [{ message: { content: 'free ok' } }] } },
  ]);
  const response = await context.window.fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-4.1-mini',
      messages: [{ role: 'user', content: longUser }],
      max_tokens: 900,
    }),
  });
  assert.equal(response.ok, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].body.model, 'openrouter/free');
  assert.equal(calls[2].body.provider, undefined);
}

console.log('V11.6.5 resilience runtime tests PASS (2/2)');
