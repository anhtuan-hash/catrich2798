// Real React Home with an intercepted, synthetic TTCM session and 65 lessons.
// This exercises density and controls; it is not a test of production data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium,devices} from '@playwright/test';

const port=5233, base=`http://127.0.0.1:${port}`;
const args=['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'];
if(process.env.BES_PREVIEW_OUT_DIR)args.push('--outDir',process.env.BES_PREVIEW_OUT_DIR);
const server=spawn(process.execPath,args,{stdio:'pipe'}), sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const uid='00000000-0000-4000-8000-000000000001';
const profile={id:uid,email:'fixture@example.invalid',full_name:'Fixture Teacher',school:'Test School',role:'ttcm',approved:true,permissions:{},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};
const lessons=Array.from({length:65},(_,i)=>{
  const grade=i<22?10:i<43?11:12,week=i<22?i+1:i<43?i-21:i-42;
  return {id:`lesson-${i}`,title:`Term 1 | Grade ${grade} | Week ${String(week).padStart(2,'0')}`,grade:String(grade),status:'published',school_year:'2026-2027',week_key:`week-${i}`,opens_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',storage_path:'fixture.html'};
});
const photo='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#563278"/><circle cx="450" cy="270" r="180" fill="#f9b754"/><text x="450" y="340" font-size="58" text-anchor="middle" fill="white">TEST ARTWORK</text></svg>';
async function installFixture(page){
  await page.route('https://brian-fixture.invalid/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname;
    const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'*','content-type':'application/json'};
    if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(path.includes('/storage/v1/object/public/'))return route.fulfill({status:200,headers:{...headers,'content-type':'image/svg+xml'},body:photo});
    let data=[];
    if(path.endsWith('/bes_slideshow_albums'))data=[{id:'album-1',slug:'school-art',title:'School Art Showcase',description:'Published gallery fixture',slide_interval:30,transition:'fade',updated_at:'2026-10-29T00:00:00Z'}];
    else if(path.endsWith('/bes_slideshow_slides'))data=Array.from({length:5},(_,i)=>({id:`slide-${i}`,album_id:'album-1',image_path:`fixture-${i}.svg`,caption:`Artwork ${i+1}`,sort_order:i,created_at:'2026-01-01T00:00:00Z'}));
    else if(path.endsWith('/weekly_practice_items'))data=lessons;
    else if(path.endsWith('/bes_navigation_theme_settings'))data={halloween_home_enabled:true,updated_at:'2026-10-29T00:00:00Z'};
    else if(path.endsWith('/profiles'))data=[profile];
    else if(path.endsWith('/auth/v1/user'))data={id:uid,email:profile.email,app_metadata:{provider:'email'},user_metadata:{full_name:profile.full_name}};
    else if(req.headers().accept?.includes('vnd.pgrst.object'))data=null;
    return route.fulfill({status:200,headers,body:JSON.stringify(data)});
  });
  await page.addInitScript(({uid})=>{
    localStorage.setItem('bes-halloween-home-master-v4',JSON.stringify({enabled:true,updatedAt:'2026-10-29T00:00:00Z'}));
    const enc=value=>btoa(JSON.stringify(value)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    const token=enc({alg:'none',typ:'JWT'})+'.'+enc({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})+'.fixture';
    localStorage.setItem('sb-brian-fixture-auth-token',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,email:'fixture@example.invalid',app_metadata:{provider:'email'},user_metadata:{full_name:'Fixture Teacher'}}}));
  },{uid});
}
async function prepare(page){
  await installFixture(page);
  await page.goto(`${base}/#/home`,{waitUntil:'domcontentloaded'});
  // The synthetic authenticated session first resolves its default route.
  await sleep(3500);
  await page.evaluate(()=>{location.hash='#/home';});
  await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.route==='home'&&document.querySelector('.app-shell')?.dataset.halloweenHomeV4==='on');
}
async function safeScreenshot(page,path){
  await page.evaluate(()=>{
    document.querySelectorAll('.signature-footer-v50-profile h2').forEach(n=>n.textContent='HỒ SƠ GIÁO VIÊN');
    document.querySelectorAll('.signature-footer-v50-detail,.signature-footer-v50-credentials li').forEach(n=>{const s=n.querySelector('span:last-child');if(s)s.textContent='Thông tin giáo viên đã được ẩn';});
    document.querySelectorAll('.bes-portfolio-footer-trigger strong').forEach(n=>n.textContent='Người phát triển');
    const label=document.createElement('span');label.textContent='DỮ LIỆU KIỂM THỬ';label.style.cssText='position:fixed;bottom:6px;left:6px;z-index:999999;padding:5px 9px;background:#fff;color:#222;font:700 12px sans-serif;border:1px solid #222;border-radius:4px';document.body.appendChild(label);
  });
  await page.screenshot({path,fullPage:true,animations:'disabled'});
}
let browser,stderr='';server.stderr.on('data',chunk=>stderr+=String(chunk));
try {
  let ready=false;
  for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error(stderr);try{if((await fetch(base)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,'fixture server starts');
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  mkdirSync('artifacts/halloween-v13',{recursive:true});
  for(const width of [1024,1174,1440,768]){
    const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await prepare(page);
    await page.waitForFunction(()=>document.querySelectorAll('.bha-schedule-row').length===65&&document.querySelectorAll('.bha-practice-header-actions button').length===2);
    await page.locator('.app-shell[data-route="home"] > footer[data-halloween-footer="true"] .signature-footer-v50-main > section').first().waitFor();
    await sleep(1500);
    assert.equal((await page.locator('.bha-practice__published-count strong').innerText()).trim(),'65');
    assert.deepEqual(await page.locator('.bha-grade-schedule-browser').evaluateAll(nodes=>nodes.map(n=>n.querySelectorAll('.bha-schedule-row').length)),[22,21,22]);
    const geometry=await page.evaluate(()=>{
      const box=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const grades=[...document.querySelectorAll('.bha-grades--folio > .bha-folio-grade')].map(box);
      const footer=[...document.querySelectorAll('.app-shell[data-route="home"] > footer[data-halloween-footer="true"] .signature-footer-v50-main > section')].map(box);
      const h=box(document.querySelector('.bha-practice__editorial-header'));
      const actions=[...document.querySelectorAll('.bha-practice-header-actions button')].map(box);
      const lists=[...document.querySelectorAll('.bha-grade-schedule-scroll')].map(n=>({box:box(n),rows:[...n.querySelectorAll('.bha-schedule-row')].map(box),scrollHeight:n.scrollHeight,clientHeight:n.clientHeight}));
      const footerClipped=[...document.querySelectorAll('.app-shell[data-route="home"] > footer[data-halloween-footer="true"] .signature-footer-v50-main > section')].some(section=>{
        const b=box(section);return [...section.querySelectorAll('h2,.signature-footer-v50-detail > span:last-child,.signature-footer-v50-credentials li > span:last-child,img')].some(el=>{const r=box(el);return r.width&&r.height&&(r.left<b.left-1||r.right>b.right+1||r.bottom>b.bottom+1)});
      });
      return {grades,footer,h,actions,lists,footerClipped,overflow:document.documentElement.scrollWidth>innerWidth+2};
    });
    assert.equal(geometry.overflow,false,`${width}: no horizontal overflow`);
    assert.equal(geometry.footerClipped,false,`${width}: real footer text and logos fit their cards`);
    for(let i=0;i<3;i++){
      assert.ok(Math.abs(geometry.grades[i].left-geometry.footer[i].left)<1&&Math.abs(geometry.grades[i].right-geometry.footer[i].right)<1,`${width}: column ${i+1} aligns (${JSON.stringify({grade:geometry.grades[i],footer:geometry.footer[i]})})`);
      const list=geometry.lists[i];assert.ok(list.scrollHeight>list.clientHeight,`${width}: list is scrollable`);
      assert.equal(list.rows.filter(r=>r.top>=list.box.top-1&&r.bottom<=list.box.bottom+1).length,5,`${width}: five complete rows`);
    }
    assert.ok(geometry.actions.every(a=>a.left>=geometry.h.left-1&&a.right<=geometry.h.right+1&&a.top>=geometry.h.top-1&&a.bottom<=geometry.h.bottom+1),`${width}: TTCM actions fit the header`);
    const sort=page.locator('.bha-grade-sort-button').first(),label=await sort.getAttribute('aria-label');
    await sort.click();assert.notEqual(await sort.getAttribute('aria-label'),label,`${width}: sorting switches mode`);
    for(const list of await page.locator('.bha-grade-schedule-scroll').all()){
      await list.evaluate(el=>{el.scrollTop=el.scrollHeight;});
      const last=await list.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.lastElementChild.getBoundingClientRect();return b.top>=a.top-1&&b.bottom<=a.bottom+1;});
      assert.ok(last,`${width}: the last lesson is fully reachable`);
    }
    if(width===1174){
      await page.locator('.bha-grade-sort-button').first().click();
      await page.locator('.bha-grade-schedule-scroll').evaluateAll(nodes=>nodes.forEach(n=>n.scrollTop=0));
      await page.evaluate(()=>window.scrollTo(0,0));await sleep(250);
      await safeScreenshot(page,'artifacts/halloween-v13/ttcm-fixture-1174.png');
      await page.evaluate(()=>window.addEventListener('bes-open-weekly-statistics',()=>{window.__fixtureStatsOpened=true;},{once:true}));
      await page.locator('.bha-statistics-practice').click();
      assert.equal(await page.evaluate(()=>window.__fixtureStatsOpened),true,'statistics action dispatches its real event');
    }
    assert.deepEqual(errors,[],`${width}: no unhandled browser errors`);
    console.log(`PASS ${width}: TTCM controls, 65 lessons, five full rows, sorting, scroll, aligned footer`);
    await page.close();
  }
  const page=await browser.newPage({...devices['iPhone 13'],deviceScaleFactor:1,serviceWorkers:'block'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await prepare(page);
  await page.waitForFunction(()=>document.querySelector('.bes-mobile-home__practice-count')?.getAttribute('aria-label')?.startsWith('65 '));
  assert.deepEqual((await page.locator('.bes-mobile-home__grade-count').allTextContents()).map(x=>parseInt(x,10)),[22,21,22]);
  await page.locator('[data-mobile-grade-card="10"] [data-mobile-grade-toggle]').click();
  assert.equal(await page.locator('[data-mobile-practice-card]').count(),4,'mobile first shows four lessons');
  await page.locator('.bes-mobile-home__practice-expand').click();
  assert.equal(await page.locator('[data-mobile-practice-card]').count(),22,'mobile expands all real grade lessons');
  await page.locator('.bes-mobile-home__practice-expand').click();
  assert.equal(await page.locator('[data-mobile-practice-card]').count(),4,'mobile collapses lessons');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'mobile has no horizontal overflow');
  assert.deepEqual(errors,[],'mobile has no unhandled browser errors');
  await page.evaluate(()=>window.scrollTo(0,0));await sleep(250);
  await safeScreenshot(page,'artifacts/halloween-v13/ttcm-fixture-phone.png');
  console.log('PASS iPhone 13: TTCM fixture, 65 lessons, expand and collapse, no overflow');
  await page.close();
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
