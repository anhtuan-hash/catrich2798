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
  const visualAudit=await page.evaluate(()=>{
    const ft=document.querySelector('footer[data-app-shell-footer="true"]');
    const global=document.querySelector('#global-halloween-motif-test');
    const bg=getComputedStyle(ft);
    const brand=getComputedStyle(document.querySelector('.signature-footer-v50-brand'));
    const credentials=getComputedStyle(document.querySelector('.signature-footer-v50-credentials'));
    return {footerZ:Number(bg.zIndex),globalZ:Number(getComputedStyle(global).zIndex),
      background:bg.backgroundImage,brandBackground:brand.backgroundImage,credentialBackground:credentials.backgroundImage,
      cards:[...document.querySelectorAll('.signature-footer-v50-main > section')].map(el=>({
        style:getComputedStyle(el).backgroundImage,opacity:getComputedStyle(el).opacity
      }))};
  });
  assert.ok(visualAudit.footerZ>visualAudit.globalZ,
    'entire footer including all text/cards paints above floating Halloween motifs');
  assert.match(visualAudit.background,/radial-gradient/,'background uses refined low-noise ambient glow');
  assert.ok(visualAudit.cards.every(item=>item.opacity==='1'),
    'student-facing institution and qualification cards remain fully opaque and readable');
  const originalLandscape=await page.locator('.signature-footer-dashboard-landscape').evaluate(el=>{
    const st=getComputedStyle(el);return {visibility:st.visibility,opacity:st.opacity};
  });
  assert.equal(originalLandscape.visibility,'hidden','old pastel landscape does not leak into night background');
  assert.ok(!themed.background.includes('halloween-night-footer.svg'),
    'large spooky illustration no longer covers outer footer');
  assert.match(themed.background,/linear-gradient/,'outer frame uses quiet plum gradients');
  const artCards=await page.locator('.signature-footer-v50-main > section').evaluateAll(nodes=>
    nodes.map(node=>{
      const css=getComputedStyle(node);
      const rect=node.getBoundingClientRect();
      return {className:node.className,image:css.backgroundImage,color:css.color,
        rect:{width:rect.width,height:rect.height}};
    }));
  const expectedArt=['halloween-brand-card.svg','halloween-profile-card.svg','halloween-credentials-card.svg'];
  artCards.forEach((card,i)=>{
    assert.ok(card.image.includes(expectedArt[i]),
      card.className+' has unique artwork INSIDE the card');
    assert.ok(card.image.includes('linear-gradient('),
      card.className+' artwork is layered on themed pastel gradient');
    assert.ok(card.rect.width>140 && card.rect.height>160,
      card.className+' remains usable and full size');
  });
  for(const filename of expectedArt){
    const response=await page.request.get(BASE+'/assets/footer/'+filename);
    assert.equal(response.status(),200,'locally bundled card illustration '+filename);
    const svg=await response.text();
    assert.ok(svg.includes('<svg') && !svg.includes('<script'),
      'safe original SVG response '+filename);
  }
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
  assert.match((await get('.signature-footer-v50-brand')).background,/halloween-brand-card[.]svg/,'toggle ON reapplies embedded card artwork');
  console.log('✓ Elegant background and atmosphere safely behind all three cards');
  console.log('✓ Desktop ON/OFF: unchanged geometry, original logos, portfolio and Hero');
  await page.setViewportSize({width:390,height:844});
  const mobileFooter=await get(footer);
  const mobileCardArtwork=await page.locator('.signature-footer-v50-main > section').evaluateAll(nodes=>
    nodes.map(el=>getComputedStyle(el).backgroundImage));
  assert.ok(mobileCardArtwork.every((background,i)=>background.includes(['halloween-brand-card.svg','halloween-profile-card.svg','halloween-credentials-card.svg'][i])),
    'all three embedded Halloween illustrations remain in their own cards on mobile');
  assert.ok(mobileFooter.rect.width<=390,'mobile footer fits viewport');
  assert.match(mobileFooter.background,/linear-gradient/,'mobile footer uses same restrained frame');
  const first=await page.locator('.signature-footer-v50-main > section').first().boundingBox();
  const second=await page.locator('.signature-footer-v50-main > section').nth(1).boundingBox();
  assert.ok(first && second && second.y>first.y,'mobile footer cards remain vertically stacked');
  await toggle(false);
  assert.equal((await get(footer)).background,neutral.background,
    'mobile OFF restores exact original frame gradient');
  const restoredMobileCards=await page.locator('.signature-footer-v50-main > section').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).backgroundImage));
  assert.ok(restoredMobileCards.every((bg,i)=>!bg.includes(['halloween-brand-card.svg','halloween-profile-card.svg','halloween-credentials-card.svg'][i])),
    'turning OFF removes card illustrations on mobile');
  console.log('✓ Mobile ON/OFF and responsive card stacking');
  console.log('BRIAN Halloween Footer browser QA PASS');
} finally {if(browser)await browser.close();vite.kill('SIGTERM');}
