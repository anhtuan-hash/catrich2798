#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const cwd = process.cwd();
const bridgePath = path.join(cwd, 'public', 'bes-supabase-bridge-v10900hf2.js');
const workHubPath = path.join(cwd, 'public', 'bes-unified-work-hub-v10900hf2.js');
const indexPath = path.join(cwd, 'index.html');
const pkgPath = path.join(cwd, 'package.json');

const bridge = fs.readFileSync(bridgePath, 'utf8');
const workHub = fs.readFileSync(workHubPath, 'utf8');
const html = fs.readFileSync(indexPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const checks = [];

function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('bridge declares HF2 version', bridge.includes("10.90.0-HF2"));
check('bridge exposes rpc()', bridge.includes('rpc:function(functionName,params)'));
check('bridge REST RPC endpoint exists', bridge.includes("'/rest/v1/rpc/'"));
check('bridge forwards RPC to native client', bridge.includes("typeof ready.native.rpc==='function'"));
check('Work Hub declares HF2 version', workHub.includes("var VERSION = '10.90.0-HF2'"));
check('Work Hub only accepts RPC-capable client', workHub.includes("typeof candidate.rpc === 'function'"));
check('Work Hub has guarded callRpc helper', workHub.includes('function callRpc(name, body)'));
check('Work Hub context uses callRpc', workHub.includes("callRpc('work_hub_my_context')"));
check('Work Hub people uses callRpc', workHub.includes("callRpc('work_hub_people')"));
check('Work Hub dashboard uses callRpc', workHub.includes("callRpc('work_hub_dashboard')"));
check('Work Hub transition uses callRpc', workHub.includes("callRpc('work_hub_transition_item'"));
check('Work Hub reloads when bridge becomes ready', workHub.includes("'bes-supabase-bridge-ready'"));
check('HF2 bridge tag exists', html.includes('/bes-supabase-bridge-v10900hf2.js'));
check('HF2 Work Hub tag exists', html.includes('/bes-unified-work-hub-v10900hf2.js'));
check('old HF1 bridge tag removed', !html.includes('/bes-supabase-bridge-v10900hf1.js'));
check('old Work Hub runtime tag removed', !html.includes('/bes-unified-work-hub-v10890.js'));
check(
  'bridge loads before Work Hub',
  html.indexOf('/bes-supabase-bridge-v10900hf2.js') <
    html.indexOf('/bes-unified-work-hub-v10900hf2.js')
);
check(
  'verify script exists',
  Boolean(pkg.scripts && pkg.scripts['verify:v10.90.0-hf2'])
);

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

const accessToken =
  b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
  b64url({
    sub: '11111111-1111-4111-8111-111111111111',
    email: 'teacher@example.com',
    role: 'authenticated'
  }) +
  '.signature';

const anonKey =
  b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
  b64url({ role: 'anon' }) +
  '.signature';

const values = new Map([
  [
    'sb-testproject-auth-token',
    JSON.stringify({
      access_token: accessToken,
      refresh_token: 'r',
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        email: 'teacher@example.com'
      }
    })
  ],
  [
    'bes-work-hub-public-config-v10890',
    JSON.stringify({
      url: 'https://testproject.supabase.co',
      key: anonKey,
      savedAt: Date.now()
    })
  ]
]);

const localStorage = {
  get length() { return values.size; },
  key(index) { return Array.from(values.keys())[index] ?? null; },
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); }
};

let request = null;
const context = {
  console,
  setTimeout,
  clearTimeout,
  Promise,
  URL,
  URLSearchParams,
  Date,
  JSON,
  Array,
  Object,
  String,
  RegExp,
  encodeURIComponent,
  decodeURIComponent,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  CustomEvent: function(name, options) {
    this.type = name;
    this.detail = options && options.detail;
  },
  location: {
    href: 'https://app.example.com/#/work-hub',
    origin: 'https://app.example.com'
  },
  fetch: async (url, options = {}) => {
    request = { url: String(url), options };
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () =>
        JSON.stringify({
          authenticated: true,
          user_id: '11111111-1111-4111-8111-111111111111',
          role: 'teacher'
        })
    };
  },
  document: {
    scripts: [],
    hidden: false,
    addEventListener() {},
    dispatchEvent() {}
  },
  window: null
};

context.window = {
  localStorage,
  location: context.location,
  addEventListener() {},
  dispatchEvent() {},
  setTimeout,
  clearTimeout,
  fetch: context.fetch,
  document: context.document
};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(bridge, context, {
  filename: 'bes-supabase-bridge-v10900hf2.js'
});

const client = context.window.supabaseClient;
check('runtime installs compatibility client', Boolean(client && client.__besRuntimeBridge));
check('runtime client now exposes rpc', typeof client.rpc === 'function');

const result = await client.rpc('work_hub_my_context');
check('RPC returns data without error', result && !result.error && result.data.authenticated === true);
check(
  'RPC uses PostgREST function endpoint',
  request.url ===
    'https://testproject.supabase.co/rest/v1/rpc/work_hub_my_context'
);
check('RPC uses POST', request.options.method === 'POST');
check('RPC sends authenticated bearer token', request.options.headers.Authorization === 'Bearer ' + accessToken);
check('RPC sends public API key', request.options.headers.apikey === anonKey);
check('RPC sends JSON object body', request.options.body === '{}');

console.log(`Work Hub RPC Compatibility Test: ${checks.length}/${checks.length} đạt.`);
checks.forEach((name, index) => {
  console.log(`${String(index + 1).padStart(2, '0')}. ${name}`);
});
