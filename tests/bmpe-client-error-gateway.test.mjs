import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import handler from '../serverless-handlers/_client-error-report.js';
import gateway from '../api/gateway.js';

function mockRequest({method='POST',origin='https://brian.example',host='brian.example',payload={kind:'unhandledrejection',message:'Sample error',stack:'safe trace'},ip='203.0.113.1'}={}){
 return {method,headers:{origin,host,'x-forwarded-host':host,'x-forwarded-for':ip},body:payload,query:{handler:'client-error-report'}};
}
function response(){
 const headers={};
 const r={statusCode:200,setHeader(name,value){headers[name]=value;return r;},end(text){r.result=JSON.parse(text);return r;},get headers(){return headers;}};
 return r;
}
test('API gateway delegates to unchanged error reporter and rejects invalid methods',async()=>{
 const req=mockRequest({method:'GET'}),res=response();
 await gateway(req,res);
 assert.equal(res.statusCode,405);
 assert.equal(res.result.error,'Method not allowed');
});
test('reporting handler still validates origin and rejects cross-origin requests',async()=>{
 const req=mockRequest({origin:'https://evil.example'}),res=response();
 await handler(req,res);
 assert.equal(res.statusCode,403);
 assert.equal(res.result.error,'Origin not allowed');
});
test('same-origin diagnostic retains POST 202 and response body',async()=>{
 const req=mockRequest({ip:'203.0.113.29'}),res=response();
 const original=console.error;console.error=()=>{};
 try{await gateway(req,res);}finally{console.error=original;}
 assert.equal(res.statusCode,202);
 assert.equal(res.result.ok,true);
 assert.equal(res.headers['Cache-Control'],'no-store');
});
test('serverless function budget stays <=12 while public report route resolves unchanged',()=>{
 const root=new URL('../api/',import.meta.url);
 const apis=fs.readdirSync(root).filter(x=>/\.(js|mjs|cjs|ts)$/.test(x));
 assert.ok(apis.length<=12,apis.join(', '));
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(config.rewrites.find(x=>x.source==='/api/client-error-report')?.destination,'/api/gateway?handler=client-error-report');
 assert.equal(fs.existsSync(new URL('../api/client-error-report.js',import.meta.url)),false);
});
