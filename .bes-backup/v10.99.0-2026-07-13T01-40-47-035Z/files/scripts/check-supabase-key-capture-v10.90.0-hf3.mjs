#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const cwd = process.cwd();
const files = {
  capture: path.join(cwd, 'public', 'bes-supabase-key-capture-v10900hf3.js'),
  bridge: path.join(cwd, 'public', 'bes-supabase-bridge-v10900hf3.js'),
  workHub: path.join(cwd, 'public', 'bes-unified-work-hub-v10900hf3.js'),
  index: path.join(cwd, 'index.html')
};
let passed = 0, failed = 0;
function check(condition, label) { if (condition) { passed++; console.log('✓', label); } else { failed++; console.error('✗', label); } }
for (const [name,file] of Object.entries(files)) check(fs.existsSync(file), `${name} tồn tại`);
if (failed) process.exit(1);
const capture = fs.readFileSync(files.capture,'utf8');
const bridge = fs.readFileSync(files.bridge,'utf8');
const html = fs.readFileSync(files.index,'utf8');
check(!/result\.key\s*=\s*session\.access_token/.test(bridge), 'Không dùng access token làm apikey');
check(/Invalid API key/i.test(bridge), 'Có cơ chế tự sửa Invalid API key');
check(/BESSupabaseKeyCapture/.test(capture) && /fetch-request/.test(capture), 'Có hook bắt apikey từ fetch');
check(/xhr/.test(capture) && /setRequestHeader/.test(capture), 'Có hook bắt apikey từ XHR');
check(/role\s*===\s*['"]anon['"]/.test(capture + bridge), 'Chỉ chấp nhận anon JWT');
check(html.indexOf('bes-supabase-key-capture-v10900hf3.js') < html.search(/<script\b[^>]*type=["']module["']/i), 'Key Capture được nạp trước Vite module');
check((html.match(/bes-supabase-key-capture-v10900hf3\.js/g)||[]).length === 1, 'Không trùng Key Capture tag');
check((html.match(/bes-supabase-bridge-v10900hf3\.js/g)||[]).length === 1, 'Không trùng Bridge tag');
check((html.match(/bes-unified-work-hub-v10900hf3\.js/g)||[]).length === 1, 'Không trùng Work Hub tag');

// Runtime smoke test for capture: an authenticated token must be rejected as apikey,
// while a real anon JWT from the app request must be captured.
function b64(value){ return Buffer.from(JSON.stringify(value)).toString('base64url'); }
const anon = `${b64({alg:'HS256',typ:'JWT'})}.${b64({role:'anon',iss:'supabase'})}.signature12345678901234567890`;
const auth = `${b64({alg:'HS256',typ:'JWT'})}.${b64({role:'authenticated',sub:'user-1'})}.signature12345678901234567890`;
const store = new Map();
const listeners = {};
const context = {
  window: null,
  localStorage: { getItem:k=>store.get(k)||null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) },
  Headers: class Headers { constructor(input={}){this.map={};Object.entries(input).forEach(([k,v])=>this.map[k.toLowerCase()]=String(v));} get(k){return this.map[k.toLowerCase()]||null;} },
  XMLHttpRequest: function(){},
  CustomEvent: function(name,init){this.type=name;this.detail=init&&init.detail;},
  atob: s=>Buffer.from(s,'base64').toString('binary'),
  decodeURIComponent,
  console,
  setTimeout,
  clearTimeout
};
context.XMLHttpRequest.prototype = { open(){}, setRequestHeader(){} };
context.window = context;
context.addEventListener = (name,fn)=>{(listeners[name] ||= []).push(fn);};
context.dispatchEvent = event=>{(listeners[event.type]||[]).forEach(fn=>fn(event));};
context.fetch = async ()=>({ok:true});
vm.runInNewContext(capture, context, {filename:'capture.js'});
await context.fetch('https://demo.supabase.co/rest/v1/profiles',{headers:{apikey:auth}});
check(!context.BESSupabaseKeyCapture.getConfig(), 'Không nhận access JWT làm apikey');
await context.fetch('https://demo.supabase.co/rest/v1/profiles',{headers:{apikey:anon}});
const found = context.BESSupabaseKeyCapture.getConfig();
check(found && found.key === anon && found.url === 'https://demo.supabase.co', 'Bắt đúng anon key từ request thật');

console.log(`\nSupabase Key Capture Test: ${passed}/${passed+failed} đạt.`);
if (failed) process.exit(1);
