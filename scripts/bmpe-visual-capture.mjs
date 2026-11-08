/**
 * Capture matched reduced-motion viewport screenshots for manual visual review.
 * CSS animations pause only during screenshots, NOT in the product source.
 * These screenshots are not evidence of real-time animation correctness.
 */
import {chromium} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2);
const arg=(flag,fallback='')=>{const i=args.indexOf(flag);return i>=0?String(args[i+1]||fallback):fallback;};
const base=arg('--base');
const label=arg('--label');
const out=arg('--out','reports/bmpe-visual');
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base)||!['baseline','candidate'].includes(label)){
 console.error('Usage: --base http://127.0.0.1:PORT --label baseline|candidate [--out ...]');
 process.exit(1);
}
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const captures=[],viewports=[{width:390,height:844},{width:1280,height:800}];
const routes=['home','dashboard','settings','tool/gradebook-studio'];
for(const viewport of viewports){
 for(const route of routes){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce',locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh'});
  await ctx.addInitScript(()=>{
    localStorage.setItem('bes-offline-demo-user-v943',JSON.stringify({
      id:'bmpe-visual-demo-admin',authId:'bmpe-visual-demo-admin',
      role:'admin',name:'BMPE Visual Admin',approved:true,demo:true,
      provider:'offline-demo',permissions:{mode:'all',allowed:[]},
    }));
    localStorage.setItem('bet-language','vi');
  });
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',(error)=>errors.push(String(error?.message||error).slice(0,120)));
  const safe=route.replaceAll('/','-');
  const name=label+'-'+viewport.width+'-'+safe+'.png';
  const record={label,route,viewport,filename:name,status:'NOT_VERIFIED',errors:[]};
  try{
   await page.goto(base+'/#/'+route,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('.app-shell').waitFor({state:'visible',timeout:25000});
   await page.evaluate(()=>document.fonts?.ready).catch(()=>{});
   await page.waitForTimeout(650);
   record.renderedRoute=await page.locator('.app-shell').getAttribute('data-route');
   record.urlRoute=new URL(page.url()).hash.replace(/[?].*$/,'');
   await page.screenshot({path:path.join(out,name),fullPage:false,animations:'disabled'});
   record.status='CAPTURED_FOR_MANUAL_REVIEW';
  }catch(error){
   record.status='CAPTURE_FAILED';
   record.error=String(error?.message||error).slice(0,280);
  }finally{
   record.errors=errors;
   captures.push(record);
   await ctx.close();
  }
 }
}
await browser.close();
const output={schema:'bmpe-visual-pair-capture-v1',label,commit:process.env.BMPE_REPORT_SHA||process.env.GITHUB_SHA||'unverified',captures,
 note:'Offline synthetic admin on Linux Chromium with reduced motion; no authenticated Supabase UAT, no native Safari/Edge, no approved image baseline.'};
fs.writeFileSync(path.join(out,label+'-manifest.json'),JSON.stringify(output,null,2));
const failed=captures.filter(x=>x.status==='CAPTURE_FAILED');
console.log(label+': '+(captures.length-failed.length)+'/'+captures.length+' captured; failed '+failed.map(x=>x.route+'@'+x.viewport.width).join(','));
if(failed.length)process.exitCode=1;
