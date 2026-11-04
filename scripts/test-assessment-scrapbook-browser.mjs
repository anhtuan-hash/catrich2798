import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, expect } from '@playwright/test';

const base = 'http://assessment.test';
const api = 'https://assessment-example.supabase.co';
const out = await mkdtemp(join(tmpdir(), 'assessment-scrapbook-'));
const screenshots = 'test-results/assessment-scrapbook';
const titles = ['The Last Rope', 'Wild Trails', 'Rhythm Rope', 'Earth Guardians', 'Kindness Lift', 'Eco Rescue',
  'Balloon Burst', 'Hall of Legends', 'Inventor’s Crane', 'Cosmic Destiny', 'Eco Sanctuary', 'Neural Nexus',
  'Word Workshop', 'Story Studio', 'Hidden Messages'];
const colors = ['#206459','#00778e','#502b85','#247743','#773753','#975c29','#573daa','#b34e49','#305288','#805292','#347d77','#35579e'];
const activities = titles.map((title, i) => ({
  id: '10000000-0000-4000-8000-' + String(i+1).padStart(12,'0'),
  title, grade: 10 + i%3, unit_no: 1+i%6, activity_type:'game', focus_area:['vocabulary','grammar','reading'][i%3],
  updated_at: new Date(Date.UTC(2026,10,3,10,0,50-i)).toISOString(), thumbnail_url: '/qa-art/'+i+'.svg', has_access:i%4 !== 1
}));
let enabled = false;
let revision = 1;
let deny = false;
let favorites = [activities[0].id, activities[1].id];
let queue = [];
const row = () => ({ assessment_scrapbook_enabled:enabled, updated_at:new Date(Date.UTC(2026,10,3,10,0,revision)).toISOString() });
const published = '/hero/media/assessment-fixture.svg';
const errors = [];
let browser;

try {
  // The component tree, data normalization, permissions, and PostgREST requests are real.
  // Substitute only the user's signed-in session and the realtime boundary in this test build.
  await build({
    configFile:false, publicDir:false, logLevel:'error',
    define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify(api), 'import.meta.env.VITE_SUPABASE_ANON_KEY':'"test-placeholder"'},
    plugins:[react(),{name:'isolated-assessment-session',enforce:'pre',transform(source,id){
      if (!id.endsWith('/src/services/runtime/core.js')) return;
      return source.slice(0,source.indexOf('export async function bootRuntimeCore')) + `
        export function getRuntimeState(){const role=new URLSearchParams(location.search).get('role') || 'admin';return {ready:true,role,session:{user:{id:'11111111-1111-4000-8000-111111111111'}},profile:{role,approved:true}}}
        export async function bootRuntimeCore(){return getRuntimeState()}
        export const ensureRuntimeReady=bootRuntimeCore;
        export function subscribeRuntime(){return ()=>{}}
        export function getRuntimeClient(){return supabase}
        export function subscribeTable({table,onChange}){
          const handle=e=>onChange(e.detail);window.addEventListener('qa:'+table,handle);
          return ()=>window.removeEventListener('qa:'+table,handle);
        }
        export async function runtimeRpc(name,args){return supabase.rpc(name,args)}
        export async function runtimeQuery(name,configure){return configure(supabase.from(name))}
        export async function diagnoseRuntime(){return getRuntimeState()}
      `;
    }}],
    build:{outDir:out,minify:false,cssCodeSplit:false,rollupOptions:{input:resolve('tests/fixtures/assessment-scrapbook.jsx'),
      output:{entryFileNames:'fixture.js',assetFileNames:'[name][extname]'}}}
  });
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  await mkdir(screenshots,{recursive:true});
  const context = await browser.newContext({timezoneId:'Asia/Ho_Chi_Minh',reducedMotion:'reduce'});
  await context.route('**/*', async route => {
    const request=route.request();
    const url=new URL(request.url());
    if (url.origin === api) {
      const table = url.pathname.split('/').at(-1);
      let data = [];
      if (table === 'bes_navigation_theme_settings') data = [row()];
      if (table === 'bes_set_assessment_scrapbook_enabled') {
        if (deny) return route.fulfill({status:403,json:{message:'Approved administrator required'}});
        enabled=request.postDataJSON().p_enabled;revision++;data=[row()];
      }
      if (table === 'lesson_check_list_activities') data=activities;
      if (table === 'lesson_check_workspace_state') data=[{favorites,recent_ids:[activities[2].id]}];
      if (table === 'lesson_check_hero_public') data=[{published_config:{backgroundType:'image',backgroundUrl:published,showMascot:false}}];
      if (table === 'bes_guest_preview_entries') {
        data=activities.map(a=>({section:'assessment',entry_id:a.id,title:a.title,grade:a.grade,unit_no:a.unit_no,tag:a.focus_area,image_url:a.thumbnail_url}));
      }
      if (table === 'bes_guest_preview_feed') data=[{section:'assessment',kind:'metric',entry_key:'all',count_value:activities.length}];
      if (table === 'lesson_check_set_favorite') {
        const body=request.postDataJSON();
        favorites=favorites.filter(id=>id!==body.p_activity);
        if(body.p_favorite)favorites.push(body.p_activity);
        data=favorites;
      }
      if(table === 'lesson_check_teaching_queue') {
        if(request.method()==='POST') queue=request.postDataJSON().activity_ids || [];
        data=[{activity_ids:queue,default_minutes:5}];
      }
      return route.fulfill({json:data});
    }
    if (url.origin!==base) return route.abort();
    if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en" data-global-font="system"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body style="margin:0"><div id="root"></div><script type="module" src="/fixture.js"></script>'});
    if (url.pathname.startsWith('/qa-art/') || url.pathname===published) {
      const i=Number.parseInt(url.pathname.split('/').at(-1),10)||0;
      return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 145"><defs><linearGradient id="c"><stop stop-color="${colors[i%colors.length]}"/><stop offset="1" stop-color="#1c2147"/></linearGradient></defs><rect width="400" height="145" fill="url(#c)"/><g fill="#fff" opacity=".16"><circle cx="344" cy="38" r="42"/><path d="M0 145 80 76l58 38 40-56 89 87z"/></g><text x="200" y="86" font-family="sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white">${titles[i] || 'Published assessment'}</text></svg>`});
    }
    const asset=decodeURIComponent(url.pathname.slice(1));
    let body;
    try{body=await readFile(join(out,asset));}catch{try{body=await readFile(join('public',asset));}catch{return route.fulfill({status:404,body:''});}}
    const types={js:'text/javascript',css:'text/css',svg:'image/svg+xml',webp:'image/webp',png:'image/png',woff2:'font/woff2',jpg:'image/jpeg'};
    return route.fulfill({body,contentType:types[asset.split('.').at(-1)] || 'application/octet-stream'});
  });
  async function open(query='',width=1536) {
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width,height:width===390?844:900});
    await page.goto(base+'/?'+query+'#/tool/lesson-check-studio');
    return page;
  }
  const settings=await open('settings');
  const toggle=settings.locator('#settings-assessment-scrapbook').getByRole('switch');
  await expect(toggle).toBeEnabled();
  const page=await open();
  const shell=page.locator('.app-shell'), hero=page.locator('.lch-hero');
  const cms=hero.locator('.lch-hero-media img');
  const library=page.locator('#lcs5-activity-library');
  const grid=library.locator('.lcs-arcade-grid');
  const cards=grid.locator('.lcs-arcade-card');
  const bg=()=>hero.evaluate(el=>[getComputedStyle(el).backgroundImage,getComputedStyle(el,'::before').backgroundImage,getComputedStyle(el,'::after').backgroundImage]);
  async function flip(wanted) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked',String(wanted));
    await page.evaluate(data=>window.dispatchEvent(new CustomEvent('qa:bes_navigation_theme_settings',{detail:{new:data}})),row());
    if(wanted) await expect(shell).toHaveAttribute('data-assessment-scrapbook','on');
    else await expect(shell).not.toHaveAttribute('data-assessment-scrapbook','on');
  }
  await expect(cards).toHaveCount(12);
  await expect(cms).toBeVisible();
  await expect(cms).toHaveAttribute('src',published);
  const original=await bg();
  const nativeColumns=await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns);
  await page.screenshot({path:join(screenshots,'desktop-original.png'),fullPage:true});
  await flip(true);
  assert.notDeepEqual(await bg(),original);
  assert.match((await bg()).join(' '),/assessment-banner\.webp/);
  await expect(cms).toBeHidden();
  await expect(cards).toHaveCount(12);
  assert.equal(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),6);
  await expect(page.locator('.lcs5-bento-tile.is-favorites .lcs5-bento-count')).toHaveText('2');
  await expect(cards.first().locator('.lcs-card-thumbnail-image')).toHaveAttribute('src','/qa-art/0.svg');
  const desktopLayout = await page.evaluate(() => {
    const style = (selector,pseudo) => getComputedStyle(document.querySelector(selector),pseudo).backgroundImage;
    const ctas = [...document.querySelectorAll('.lcs-assessment-launchers > button')];
    const card = document.querySelector('.lcs-arcade-card');
    const actions = card.querySelector('.lcs-arcade-card-actions').getBoundingClientRect();
    const preview = card.querySelector('.lcs5-card-toolbar').getBoundingClientRect();
    return {
      cork:style('.app-shell'), globe:style('footer.signature-footer-v50','::before'),
      ctaTops:ctas.map(button=>Math.round(button.getBoundingClientRect().top)),
      separateActions:actions.bottom <= preview.top || actions.right <= preview.left || preview.right <= actions.left,
    };
  });
  await page.screenshot({path:join(screenshots,'desktop-scrapbook.png'),fullPage:true});
  assert.match(desktopLayout.cork, /cork\.webp/);
  assert.match(desktopLayout.globe, /footer-globe\.webp/);
  assert.equal(new Set(desktopLayout.ctaTops).size,1,'hero actions fit a single desktop row');
  assert.ok(desktopLayout.separateActions,'card actions leave the preview and queue buttons uncovered');

  const next=library.locator('.lcs-pagination-compact button').filter({hasText:/^2$/});
  await next.click();await expect(cards).toHaveCount(3);
  await library.locator('.lcs-pagination-compact button').filter({hasText:/^1$/}).click();
  await cards.first().locator('.lcs5-card-toolbar > button').first().click();
  await expect(page.locator('.lcs5-preview')).toContainText(titles[0]);
  await page.keyboard.press('Escape'); await expect(page.locator('.lcs5-preview')).toBeHidden();
  await cards.nth(2).locator('.lcs-favorite-heart').click();
  await expect(page.locator('.lcs5-bento-tile.is-favorites .lcs5-bento-count')).toHaveText('3');
  const find=library.getByRole('searchbox',{name:/Quick search by activity name|Tìm nhanh theo tên hoạt động/});
  await library.getByRole('button',{name:'List',exact:true}).click();
  await find.fill('Wild Trails'); await expect(cards).toHaveCount(1);
  await flip(false);
  assert.deepEqual(await bg(),original);
  await expect(cms).toBeVisible(); await expect(cms).toHaveAttribute('src',published);
  await expect(find).toHaveValue('Wild Trails');
  await expect(library.getByRole('button',{name:'List',exact:true})).toHaveAttribute('aria-pressed','true');
  await find.fill('');
  await library.getByRole('button',{name:'Grid',exact:true}).click();
  assert.equal(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns),nativeColumns);

  await page.locator('.lcs-arcade-create').click();
  const draft=page.getByPlaceholder('Activity title');
  await draft.fill('A lesson in progress');
  await flip(true);await expect(draft).toHaveValue('A lesson in progress');
  await flip(false);await expect(draft).toHaveValue('A lesson in progress');
  deny=true;await toggle.click();
  await expect(settings.locator('#settings-assessment-scrapbook [role=alert]')).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked','false');
  deny=false;await flip(true);
  await page.evaluate(()=>window.assessmentFixture.setSlug('gradebook-studio'));
  await expect(shell).not.toHaveAttribute('data-assessment-scrapbook','on');

  const mobile=await open('role=teacher&lang=vi',390);
  const phoneShell=mobile.locator('.app-shell');
  await expect(phoneShell).toHaveAttribute('data-assessment-scrapbook','on');
  const phoneGrid=mobile.locator('.lcs-arcade-grid');
  await expect(phoneGrid.locator('.lcs-arcade-card')).toHaveCount(12);
  await expect(mobile.locator('.lcs-arcade-create')).toHaveCount(0);
  const locked=phoneGrid.locator('.lcs-arcade-card.is-locked').first();
  await expect(locked.locator('.is-request')).toBeVisible();
  await expect(locked.locator('.lcs5-card-toolbar button').last()).toBeDisabled();
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile page fits horizontally');
  await mobile.screenshot({path:join(screenshots,'phone-teacher.png'),fullPage:true});
  await mobile.locator('.lcs5-bento-tile.is-queue').click();
  await expect(mobile.getByRole('dialog',{name:'Hàng đợi giảng dạy'})).toBeVisible();
  await mobile.keyboard.press('Escape');
  const restricted=await open('settings&role=teacher',390);
  await expect(restricted.locator('#settings-assessment-scrapbook button[role=switch]')).toHaveCount(0);
  const guest=await open('role=guest');
  const publicHero=guest.locator('.hero-assessment');
  await expect(guest.locator('[data-guest-read-only=true]')).toBeVisible();
  await expect(guest.locator('.brian-guest-full__activity-card')).toHaveCount(activities.length);
  await expect(guest.locator('.lcs-arcade-create')).toHaveCount(0);
  const publicBackground=()=>publicHero.evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(await publicBackground(),/assessment-banner\.webp/);
  await guest.locator('.brian-guest-full__actionstrip button').first().click();
  await expect(guest.getByRole('dialog')).toHaveCount(0);
  await guest.screenshot({path:join(screenshots,'guest-scrapbook.png'),fullPage:true});
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked','false');
  await guest.evaluate(data=>window.dispatchEvent(new CustomEvent('qa:bes_navigation_theme_settings',{detail:{new:data}})),row());
  await expect(guest.locator('.app-shell')).not.toHaveAttribute('data-assessment-scrapbook','on');
  assert.match(await publicBackground(),/assessment-fixture\.svg/);
  assert.deepEqual(errors,[]);
  console.log('PASS: real Assessment library on desktop/phone, CMS restoration, switching, drafts, permissions, pagination, search and queue.');
} finally {
  await browser?.close();
  await rm(out,{recursive:true,force:true});
}
