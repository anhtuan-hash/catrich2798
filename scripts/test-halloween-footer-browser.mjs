import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from '@playwright/test';

const PORT=5198,BASE='http://127.0.0.1:'+PORT;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:'pipe'});
let output='',browser;
vite.stderr.on('data',c=>{output+=String(c)});
try {
  let ready=false;
  for(let i=0;i<80;i++){
    if(vite.exitCode!==null)throw new Error('Vite exited: '+output);
    try{if((await fetch(BASE+'/tests/fixtures/halloween-footer-test.html')).ok){ready=true;break;}}
    catch{}
    await wait(250);
  }
  assert.ok(ready,'fixture Vite server ready');
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('console',msg=>{if(msg.type()==='error')pageErrors.push(msg.text());});
  await page.goto(BASE+'/tests/fixtures/halloween-footer-test.html',{waitUntil:'domcontentloaded'});
  await wait(1800);
  const footerCount=await page.locator('footer[data-app-shell-footer="true"]').count();
  const diagnostics=await page.evaluate(()=>({root:document.getElementById('root')?.innerHTML.slice(0,420),
    body:document.body.innerHTML.slice(0,420),
    footer:[...document.querySelectorAll('footer')].map(x=>({display:getComputedStyle(x).display,visibility:getComputedStyle(x).visibility,box:x.getBoundingClientRect().toJSON()}))}));
  console.log('Footer browser fixture diagnostics',JSON.stringify({footerCount,pageErrors,diagnostics}));
  await page.locator('footer[data-app-shell-footer="true"]').waitFor({state:'visible',timeout:5000});
  const get=async(selector)=>page.locator(selector).first().evaluate(el=>{
    const c=getComputedStyle(el),r=el.getBoundingClientRect();
    return {background:c.backgroundImage,backgroundColor:c.backgroundColor,color:c.color,
      rect:{width:r.width,height:r.height,x:r.x,y:r.y}};
  });
  const toggle=async(on)=>page.locator('footer').first().evaluate((el,v)=>{el.dataset.halloweenFooter=v?'true':'false';},on);
  const footer='footer[data-app-shell-footer="true"]';
  const hero0=await get('#hero-unmodified');
  const neutral=await get(footer);
  assert.ok(!neutral.background.includes('halloween-night-footer.svg'),'baseline has no Halloween artwork');
  const beforeCard=await get('.signature-footer-v50-profile');
  await toggle(true);
  const themed=await get(footer);
  const themedCard=await get('.signature-footer-v50-profile');
  assert.match(themed.background,/halloween-night-footer[.]svg/,'Halloween art applied to actual footer');
  assert.ok(themedCard.background!==beforeCard.background,'profile card receives Halloween palette');
  assert.equal(await page.locator('.signature-footer-v50-main > section').count(),3,'all three original footer cards remain');
  for(const url of ['/brian-english-brand-logo.png','/footer-pek-logo.png','/footer-cambridge-logo.png']){
    const r=await page.request.get(BASE+url);
    assert.equal(r.status(),200,'original logo asset remains available: '+url);
  }
  assert.ok(Math.abs(themed.rect.width-neutral.rect.width)<=1 &&
    Math.abs(themed.rect.height-neutral.rect.height)<=1,'no footer geometry drift on Halloween activation');
  assert.deepEqual(await get('#hero-unmodified'),hero0,'home Hero is unaffected');
  await page.locator('.bes-portfolio-footer-trigger').click();
  assert.equal(await page.locator('.bes-portfolio-dialog').count(),1,'portfolio dialog still opens');
  await page.locator('.bes-portfolio-dialog-close').click();
  assert.equal(await page.locator('.bes-portfolio-dialog').count(),0,'portfolio dialog still closes');
  await toggle(false);
  const restored=await get(footer);
  assert.equal(restored.background,neutral.background,'toggle OFF restores exact original footer background');
  assert.equal((await get('.signature-footer-v50-profile')).background,beforeCard.background,
    'toggle OFF restores original card backgrounds');
  await toggle(true);
  assert.match((await get(footer)).background,/halloween-night-footer[.]svg/,'toggle ON reapplies design');
  console.log('✓ Desktop ON/OFF: unchanged geometry, original logos, portfolio and Hero');
  await page.setViewportSize({width:390,height:844});
  const mobileFooter=await get(footer);
  assert.ok(mobileFooter.rect.width<=390,'mobile footer fits viewport');
  assert.match(mobileFooter.background,/halloween-night-footer[.]svg/,'mobile footer uses same theme');
  const first=await page.locator('.signature-footer-v50-main > section').first().boundingBox();
  const second=await page.locator('.signature-footer-v50-main > section').nth(1).boundingBox();
  assert.ok(first && second && second.y>first.y,'mobile footer cards remain vertically stacked');
  await toggle(false);
  assert.ok(!(await get(footer)).background.includes('halloween-night-footer.svg'),
    'mobile OFF restores original appearance');
  console.log('✓ Mobile ON/OFF and responsive card stacking');
  console.log('BRIAN Halloween Footer browser QA PASS');
} finally {if(browser)await browser.close();vite.kill('SIGTERM');}
