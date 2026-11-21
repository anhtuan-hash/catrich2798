// Runs the built, real React app against a fully intercepted Supabase fixture.
// The fixture proves component behavior and geometry, not production data.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium,devices} from '@playwright/test';

const PORT=5222, BASE=`http://127.0.0.1:${PORT}`;
const FIXTURE_ORIGIN='https://brian-fixture.invalid';
const previewArgs=['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(PORT),'--strictPort'];
if(process.env.BES_PREVIEW_OUT_DIR)previewArgs.push('--outDir',process.env.BES_PREVIEW_OUT_DIR);
const server=spawn(process.execPath,previewArgs,{stdio:'pipe'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const albums=[{id:'album-1',slug:'school-art',title:'School Art Showcase',description:'Published gallery fixture',slide_interval:30,transition:'fade',updated_at:'2026-10-29T00:00:00Z'}];
const photos=Array.from({length:5},(_,i)=>({id:`slide-${i}`,album_id:'album-1',image_path:`fixture-${i}.svg`,caption:`Artwork ${i+1} | Fixture caption ${i+1}.`,sort_order:i,created_at:'2026-01-01T00:00:00Z'}));
const lessons=Array.from({length:9},(_,i)=>({id:`lesson-${i}`,title:`Term 1 | Grade ${10+i%3} | Week ${String(i+1).padStart(2,'0')}`,grade:String(10+i%3),status:'published',school_year:'2026-2027',week_key:`week-${i}`,opens_at:'2026-01-01T00:00:00Z',created_at:'2026-01-01T00:00:00Z',storage_path:'fixture.html'}));
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#563278"/><circle cx="450" cy="270" r="180" fill="#f9b754"/><path d="M0 560 Q250 260 480 540 T900 490 V600 H0Z" fill="#253e74"/><text x="450" y="340" font-size="58" text-anchor="middle" fill="white">TEST ARTWORK</text></svg>';
const redactFooter=page=>page.evaluate(()=>{
  document.querySelectorAll('.signature-footer-v50-profile h2').forEach(node=>{node.textContent='HỒ SƠ GIÁO VIÊN';});
  document.querySelectorAll('.signature-footer-v50-detail,.signature-footer-v50-credentials li').forEach(node=>{const value=node.querySelector('span:last-child');if(value)value.textContent='Nội dung đã ẩn';else node.textContent='Nội dung đã ẩn';});
  document.querySelectorAll('.bes-portfolio-footer-trigger strong').forEach(node=>{node.textContent='Người phát triển';});
});
const installFixture=async page=>{
  await page.route(FIXTURE_ORIGIN+'/**',async route=>{
    const request=route.request(),path=new URL(request.url()).pathname;
    const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'*','content-type':'application/json'};
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
    if(path.includes('/storage/v1/object/public/'))return route.fulfill({status:200,headers:{...headers,'content-type':'image/svg+xml'},body:svg});
    let data=[];
    if(path.endsWith('/bes_slideshow_albums'))data=albums;
    else if(path.endsWith('/bes_slideshow_slides'))data=photos;
    else if(path.endsWith('/weekly_practice_items'))data=lessons;
    else if(path.endsWith('/bes_navigation_theme_settings'))data={halloween_home_enabled:true,updated_at:'2026-10-29T00:00:00Z'};
    else if(request.headers().accept?.includes('vnd.pgrst.object'))data=null;
    return route.fulfill({status:200,headers,body:JSON.stringify(data)});
  });
  await page.addInitScript(()=>localStorage.setItem('bes-halloween-home-master-v4',JSON.stringify({enabled:true,updatedAt:'2026-10-29T00:00:00Z'})));
};
const addFixtureLabel=page=>page.evaluate(()=>{const label=document.createElement('span');label.textContent='DỮ LIỆU KIỂM THỬ';label.style.cssText='position:fixed;bottom:6px;left:6px;z-index:999999;padding:5px 9px;background:#fff;color:#222;font:700 12px sans-serif;border:1px solid #222;border-radius:4px';document.body.appendChild(label);});
let browser,stderr='';server.stderr.on('data',chunk=>stderr+=String(chunk));
try {
  let ready=false;
  for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error(stderr);try{if((await fetch(BASE)).ok){ready=true;break;}}catch{}await sleep(200);}
  assert.ok(ready,'built fixture application should start');
  browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  mkdirSync('artifacts/halloween-v12',{recursive:true});
  for(const [width,height] of [[1536,960],[1440,900],[1280,800],[1024,768],[768,1024],[390,844],[360,800]]) {
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await installFixture(page);
    await page.goto(`${BASE}/#/home`,{waitUntil:'domcontentloaded'});
    await page.locator('.bhs-home__filmstrip-item').first().waitFor();
    await page.locator('.bha-grades--folio > .bha-folio-grade').first().waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('.bha-schedule-row').length===9);
    assert.equal(await page.locator('.bhs-home').getAttribute('data-halloween-theme'),'false','non-Halloween album keeps its album-specific skin');
    assert.equal(await page.locator('.bhs-home__filmstrip-item').count(),5,'each published fixture photo has a thumbnail');
    assert.ok(await page.locator('.bhs-home__filmstrip-item img').first().evaluate(image=>image.complete&&image.naturalWidth>0),'thumbnail decodes');
    await page.locator('.bhs-home__filmstrip-item').nth(2).click();
    assert.equal(await page.locator('.bhs-home__filmstrip-item').nth(2).getAttribute('aria-pressed'),'true','thumbnail selects the actual photo');
    assert.match(await page.locator('.bhs-home__story-count').innerText(),/03\s*\/\s*05/);
    assert.match(await page.locator('.bhs-home__story-main').innerText(),/Fixture caption 3/);
    assert.equal((await page.locator('.bha-practice__published-count strong').innerText()).trim(),'9','count comes from published lessons');
    assert.equal(await page.locator('.bha-grades--folio > .bha-folio-grade').count(),3);
    assert.equal(await page.locator('.bha-schedule-row button').count(),9,'every fixture lesson remains accessible');
    assert.ok(await page.locator('.bha-schedule-row button').first().isEnabled());
    if(width===1024){
      await page.locator('.bha-schedule-row button').first().click();
      await page.locator('.brian-guest-lock-dialog').waitFor();
      await page.locator('.brian-guest-lock-dialog button').click();
      assert.equal(await page.locator('.brian-guest-lock-dialog').count(),0,'existing guest access gate is preserved');
    }
    const geometry=await page.evaluate(()=>{
      const boxes=selector=>[...document.querySelectorAll(selector)].map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width};});
      const grade=boxes('.bha-grades--folio > .bha-folio-grade'),footer=boxes('.signature-footer-v50-main > section');
      const scene=document.querySelector('.halloween-home-scene');
      return {grade,footer,sceneDisplay:getComputedStyle(scene).display,sceneImage:getComputedStyle(scene).backgroundImage,overflow:document.documentElement.scrollWidth>innerWidth+2};
    });
    assert.equal(geometry.sceneDisplay,'block');assert.ok(geometry.sceneImage.includes('/assets/home/official/halloween-scene.webp'));
    assert.equal(geometry.overflow,false,'no horizontal overflow');
    for(let i=0;i<3;i++){
      assert.ok(width>900 ? geometry.grade[i].left>=geometry.footer[0].left : Math.abs(geometry.grade[i].left-geometry.footer[i].left)<1,`column ${i+1} left edge aligns at ${width}`);
      assert.ok(width>900 ? geometry.grade[i].right<=geometry.footer.at(-1).right : Math.abs(geometry.grade[i].right-geometry.footer[i].right)<1,`column ${i+1} right edge aligns at ${width}`);
    }
    if(width>900){assert.ok(geometry.grade[0].left<geometry.grade[1].left&&geometry.grade[1].left<geometry.grade[2].left,'desktop shows three columns');}
    else {assert.ok(geometry.grade[0].top<geometry.grade[1].top&&geometry.grade[1].top<geometry.grade[2].top,'narrow view stacks cards');}
    if(width===1440){
      // Simulate the existing Quick Access reserved rail without logging in.
      await page.evaluate(()=>{const shell=document.querySelector('.app-shell');shell.dataset.quickAccessLayout='true';shell.dataset.quickAccessSafeMode='reserve';shell.style.setProperty('--bqa-content-safe-shift','80px');});
      await sleep(450);
      const aligned=await page.evaluate(()=>[...document.querySelectorAll('.bha-grades--folio > .bha-folio-grade')].map((node,i)=>Math.abs(node.getBoundingClientRect().left-document.querySelectorAll('.signature-footer-v50-main > section')[i].getBoundingClientRect().left)));
      assert.ok(aligned.every(diff=>diff<=33),`reserved Quick Access rail retains alignment: ${aligned}`);
      await page.evaluate(()=>{const shell=document.querySelector('.app-shell');shell.dataset.quickAccessLayout='false';delete shell.dataset.quickAccessSafeMode;shell.style.removeProperty('--bqa-content-safe-shift');});
      await sleep(450);
    }
    // Screenshots use test data and do not expose personal footer details.
    await redactFooter(page);
    await addFixtureLabel(page);
    await page.screenshot({path:`artifacts/halloween-v12/fixture-${width}.png`,fullPage:true,animations:'disabled'});
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bes-halloween-home-master-updated',{detail:{enabled:false,verified:false,updatedAt:'2026-10-29T00:01:00Z'}})));
    await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.halloweenHomeV4==='off');
    assert.equal(await page.locator('.halloween-home-scene').evaluate(el=>getComputedStyle(el).display),'none');
    assert.equal(await page.locator('.bhs-home__filmstrip-item').count(),0,'seasonal thumbnails removed when OFF');
    assert.equal(await page.locator('.bha-grades--folio > .bha-folio-grade').count(),3,'published lessons remain when OFF');
    if(width===1024||width===390){
      await page.evaluate(()=>window.scrollTo(0,0));await sleep(200);
      await redactFooter(page);
      await page.screenshot({path:`artifacts/halloween-v12/fixture-${width}-original.png`,fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[],'no unhandled browser errors');
    console.log(`PASS ${width}x${height}: live fixture gallery, 9 published lessons, aligned cards, master OFF, no overflow`);
    await page.close();
  }
  const mobileDevices=[
    ['iPhone 13',devices['iPhone 13']],
    ['Pixel 5',devices['Pixel 5']],
    ['Android 360',{...devices['Pixel 5'],viewport:{width:360,height:800},screen:{width:360,height:800}}],
    ['iPad Mini',devices['iPad Mini']],
    ['iPad Pro 11',devices['iPad Pro 11']],
  ];
  for(const [name,profile] of mobileDevices) {
    // These contexts select the real mobile React Home, not just a narrow
    // desktop viewport. The backend is still an intercepted fixture.
    const page=await browser.newPage({...profile,deviceScaleFactor:1,serviceWorkers:'block'}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await installFixture(page);
    await page.goto(`${BASE}/#/home`,{waitUntil:'domcontentloaded'});
    await page.locator('.bes-mobile-halloween-hero').waitFor();
    await page.locator('.bhs-home__filmstrip-item').first().waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('.bes-mobile-home__grade-card').length===3&&document.querySelector('.bes-mobile-home__practice-count')?.getAttribute('aria-label')?.startsWith('9 '));
    assert.deepEqual(await page.locator('.bes-mobile-halloween-hero h1 span').allTextContents(),['Happy','Halloween!']);
    assert.equal(await page.locator('.bhs-home__filmstrip-item').count(),5);
    const geometry=await page.evaluate(()=>{
      const box=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};};
      const hero=box(document.querySelector('.bes-mobile-home__premium-hero'));
      const nav=box(document.querySelector('.brian-guest-mobile-destinations'));
      const buttons=[...document.querySelectorAll('.bes-mobile-halloween-hero__actions button')].map(box);
      const grade=[...document.querySelectorAll('.bes-mobile-home__grade-card')].map(box);
      const footer=[...document.querySelectorAll('.signature-footer-v50-main > section')].map(box);
      return {hero,nav,buttons,grade,footer,overflow:document.documentElement.scrollWidth>innerWidth+2};
    });
    assert.ok(geometry.hero.top>=geometry.nav.bottom,`${name}: header does not cover the Hero`);
    assert.ok(geometry.buttons.length===2&&geometry.buttons.every(b=>b.height>=44&&b.top>=geometry.hero.top&&b.bottom<=geometry.hero.bottom),`${name}: both Hero actions are visible and usable`);
    assert.equal(geometry.overflow,false,`${name}: no horizontal overflow`);
    for(let i=0;i<3;i++){
      assert.ok(Math.abs(geometry.grade[i].left-geometry.footer[i].left)<1&&Math.abs(geometry.grade[i].right-geometry.footer[i].right)<1,`${name}: grade and footer share the same edge`);
      if(i)assert.ok(geometry.grade[i].top>geometry.grade[i-1].top,`${name}: grade cards stack vertically`);
    }
    await page.locator('.bhs-home__filmstrip-item').nth(2).click();
    assert.equal(await page.locator('.bhs-home__filmstrip-item').nth(2).getAttribute('aria-pressed'),'true');
    if(name==='iPhone 13'){
      await page.evaluate(()=>window.scrollTo(0,0));await sleep(200);await redactFooter(page);await addFixtureLabel(page);
      await page.screenshot({path:'artifacts/halloween-v12/fixture-phone-390.png',fullPage:true,animations:'disabled'});
    }
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('bes-halloween-home-master-updated',{detail:{enabled:false,verified:false,updatedAt:'2026-10-29T00:01:00Z'}})));
    await page.waitForFunction(()=>document.querySelector('.app-shell')?.dataset.halloweenHomeV4==='off');
    assert.equal(await page.locator('.bes-mobile-halloween-hero').count(),0,`${name}: original mobile Hero returns`);
    assert.notEqual(await page.locator('.bes-mobile-home__premium-hero-art').evaluate(el=>getComputedStyle(el).display),'none',`${name}: original mobile artwork returns`);
    assert.equal(await page.locator('.bhs-home__filmstrip-item').count(),0,`${name}: seasonal thumbnails are removed when OFF`);
    if(name==='iPhone 13'){
      await page.evaluate(()=>window.scrollTo(0,0));await sleep(200);await redactFooter(page);
      await page.screenshot({path:'artifacts/halloween-v12/fixture-phone-390-original.png',fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[],`${name}: no unhandled browser errors`);
    console.log(`PASS ${name}: mobile Hero, gallery, three grades, aligned footer, master OFF, no overflow`);
    await page.close();
  }
} finally {if(browser)await browser.close();server.kill('SIGTERM');}
