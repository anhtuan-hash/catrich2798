#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const cwd=process.cwd();
const bridgePath=path.join(cwd,'public','bes-supabase-bridge-v10900hf1.js');
const indexPath=path.join(cwd,'index.html');
const pkgPath=path.join(cwd,'package.json');
const source=fs.readFileSync(bridgePath,'utf8');
const html=fs.readFileSync(indexPath,'utf8');
const pkg=JSON.parse(fs.readFileSync(pkgPath,'utf8'));
const checks=[];
function check(name,condition){assert.ok(condition,name);checks.push(name);}

check('bridge asset declares HF1 version',source.includes("10.90.0-HF1"));
check('discovers Supabase auth-token storage',source.includes('sb-[a-z0-9-]+-auth-token'));
check('reuses Work Hub public config cache',source.includes('bes-work-hub-public-config-v10890'));
check('contains REST fallback',source.includes('/rest/v1/'));
check('provides getSession',source.includes('getSession:async function'));
check('provides query builder',source.includes('function restBuilder'));
check('provides polling-compatible channel',source.includes('function noOpChannel'));
check('exports diagnostics',source.includes('BESSupabaseBridge'));
check('bridge tag exists in index',html.includes('/bes-supabase-bridge-v10900hf1.js'));
check('bridge loads before Smart Knowledge',html.indexOf('/bes-supabase-bridge-v10900hf1.js')<html.indexOf('/bes-smart-knowledge-v10900.js'));
check('verify script exists',Boolean(pkg.scripts&&pkg.scripts['verify:v10.90.0-hf1']));

function b64url(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
const accessToken=b64url({alg:'HS256',typ:'JWT'})+'.'+b64url({sub:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com',role:'authenticated'})+'.signature';
const anonKey=b64url({alg:'HS256',typ:'JWT'})+'.'+b64url({role:'anon'})+'.signature';
const values=new Map([
  ['sb-testproject-auth-token',JSON.stringify({access_token:accessToken,refresh_token:'r',user:{id:'11111111-1111-4111-8111-111111111111',email:'teacher@example.com'}})],
  ['bes-work-hub-public-config-v10890',JSON.stringify({url:'https://testproject.supabase.co',key:anonKey,savedAt:Date.now()})]
]);
const localStorage={
  get length(){return values.size;},
  key(index){return Array.from(values.keys())[index]??null;},
  getItem(key){return values.has(key)?values.get(key):null;},
  setItem(key,value){values.set(key,String(value));},
  removeItem(key){values.delete(key);}
};
let request=null;
const context={
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
  atob:(value)=>Buffer.from(value,'base64').toString('binary'),
  CustomEvent:function(name,options){this.type=name;this.detail=options&&options.detail;},
  location:{href:'https://app.example.com/#/knowledge-hub',origin:'https://app.example.com'},
  fetch:async(url,options={})=>{
    request={url:String(url),options};
    return {ok:true,status:200,statusText:'OK',text:async()=>JSON.stringify([{id:'r1',title:'Test'}])};
  },
  document:{scripts:[],hidden:false,addEventListener(){},dispatchEvent(){}},
  window:null
};
context.window={
  localStorage,
  location:context.location,
  addEventListener(){},
  dispatchEvent(){},
  setTimeout,
  clearTimeout,
  fetch:context.fetch,
  document:context.document
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'bes-supabase-bridge-v10900hf1.js'});
const client=context.window.supabaseClient;
check('runtime installs compatibility client',Boolean(client&&client.__besRuntimeBridge));
const sessionResult=await client.auth.getSession();
check('runtime recovers authenticated session',sessionResult.data.session.user.email==='teacher@example.com');
const queryResult=await client.from('resource_items').select('*').order('updated_at',{ascending:false}).limit(10);
check('REST query returns rows',Array.isArray(queryResult.data)&&queryResult.data[0].id==='r1');
check('REST query uses project URL',request.url.startsWith('https://testproject.supabase.co/rest/v1/resource_items?'));
check('REST query sends bearer token',request.options.headers.Authorization==='Bearer '+accessToken);
check('REST query sends public API key',request.options.headers.apikey===anonKey);
await client.from('resource_user_state').upsert({user_id:'u',resource_id:'r'},{onConflict:'user_id,resource_id'});
check('upsert includes on_conflict',request.url.includes('on_conflict=user_id%2Cresource_id'));
check('upsert includes merge preference',String(request.options.headers.Prefer).includes('resolution=merge-duplicates'));

console.log(`Supabase Runtime Bridge Test: ${checks.length}/${checks.length} đạt.`);
checks.forEach((name,index)=>console.log(`${String(index+1).padStart(2,'0')}. ${name}`));
