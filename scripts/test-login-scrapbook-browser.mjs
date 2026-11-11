import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { build } from 'vite';

// Compile the normal entry point, including the hash router, global layout and
// username bridge. No app components or auth functions are replaced.
const origin = 'https://teacher-login.example.test';
const api = 'https://login-qa.supabase.co';
process.env.VITE_SUPABASE_URL = api;
process.env.VITE_SUPABASE_ANON_KEY = 'test-only-anonymous-key';
const dist = await mkdtemp(join(tmpdir(), 'brian-login-ui-'));
const output = process.env.LOGIN_SCREENSHOTS || 'test-results/login-scrapbook';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.woff2':'font/woff2',
  '.woff':'font/woff', '.json':'application/json', '.webmanifest':'application/manifest+json' };
const calls = { password:[], recover:[], authorize:[] };
let enabled = true;
let browser;
let activePage;

try {
  await mkdir(output,{recursive:true});
  await build({ mode:'test', logLevel:'error', build:{outDir:dist,emptyOutDir:true} });
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({
    locale:'vi-VN', colorScheme:'light', reducedMotion:'reduce', serviceWorkers:'block',
  });
  // Every static file, image, API and websocket is local to this test.
  await context.routeWebSocket(/.*/, () => {});
  await context.route('**/*', async route => {
    const req=route.request();
    const url=new URL(req.url());
    if (url.origin===api) {
      const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers':'*','access-control-expose-headers':'content-range'};
      if (req.method()==='OPTIONS') return route.fulfill({status:204,headers});
      if (url.pathname==='/auth/v1/token' && req.method()==='POST') {
        calls.password.push({grant:url.searchParams.get('grant_type'),email:req.postDataJSON().email});
        return route.fulfill({status:400,headers,json:{code:'invalid_credentials',message:'Invalid login credentials'}});
      }
      if (url.pathname==='/auth/v1/recover' && req.method()==='POST') {
        calls.recover.push({email:req.postDataJSON().email,returnTo:url.searchParams.get('redirect_to')});
        return route.fulfill({headers,json:{}});
      }
      if (url.pathname==='/auth/v1/authorize') {
        calls.authorize.push({provider:url.searchParams.get('provider'),returnTo:url.searchParams.get('redirect_to')});
        return route.fulfill({status:200,contentType:'text/html',body:'<p>Mock OAuth destination</p>'});
      }
      if (url.pathname.startsWith('/rest/v1/')) {
        const single=(req.headers().accept||'').includes('pgrst.object');
        if (url.pathname === '/rest/v1/bes_navigation_theme_settings') {
          const row={login_scrapbook_enabled:enabled,updated_at:'2026-11-04T23:00:00Z'};
          return route.fulfill({headers,json:single?row:[row]});
        }
        return route.fulfill({headers,json:single?null:[]});
      }
      return route.fulfill({status:404,headers,json:{message:'No QA endpoint'}});
    }
    if (url.origin!==origin) return route.abort();
    const file=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if (!file.startsWith(dist+sep)) return route.abort();
    try { return await route.fulfill({body:await readFile(file),contentType:mime[extname(file)]||'application/octet-stream'}); }
    catch { return route.fulfill({status:404,body:''}); }
  });

  const errors=[];
  async function open(width,height,lang='vi'){
    const page=await context.newPage();
    activePage=page;
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(l=>localStorage.setItem('bet-language',l),lang);
    await page.setViewportSize({width,height});
    await page.goto(origin+'/#/login');
    await expect(page.locator('.app-shell[data-route=login]')).toBeVisible();
    const form=page.locator('form.auth-google-form');
    await expect(form.locator('input[autocomplete=username]')).toBeVisible();
    await expect(form.getByRole('button',{name:/Tiếp tục với Google|Continue with Google/})).toBeEnabled();
    if(enabled) await expect(page.locator('.app-shell')).toHaveAttribute('data-login-scrapbook','on');
    await page.locator('.login-paper-masthead').waitFor({state:enabled?'visible':'hidden'});
    await page.evaluate(async()=>{await document.fonts.ready;});
    return {page,form};
  }
  for (const [w,h] of [[1122,1402],[1440,900],[390,844]]) {
    const {page,form}=await open(w,h);
    const id=form.locator('input[autocomplete=username]');
    const pw=form.locator('input[autocomplete=current-password]');
    const submit=form.locator('button[type=submit]');
    for(const item of [id,pw,submit]) {
      await expect(item).toBeVisible();
      await expect(item).toHaveAccessibleName(/\S/);
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+w);
    await page.screenshot({path:join(output,'login-'+w+'.png'),fullPage:true,animations:'disabled'});
    console.log('Geometry',w,JSON.stringify(await page.locator('.app-shell,main,.bqa-content-safe-frame,.auth-google-page,.login-paper-masthead,.auth-google-stage,.auth-google-form,.auth-google-form-header,.auth-google-submit,.auth-google-secondary,.signature-footer-v50,.signature-footer-v50-main,.signature-footer-v50-credentials').evaluateAll(nodes=>nodes.map(n=>({class:n.className,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})))));
    await page.locator('.login-paper-jump').click();
    await expect(id).toBeFocused();
    await pw.fill('qa-dummy-only');
    await form.getByRole('button',{name:/^(Hiện mật khẩu|Show password)$/}).click();
    await expect(pw).toHaveAttribute('type','text');
    await expect(pw).toHaveValue('qa-dummy-only');
    await form.getByRole('button',{name:/^(Ẩn mật khẩu|Hide password)$/}).click();
    await expect(pw).toHaveAttribute('type','password');
    await page.close();
  }

  const {page,form}=await open(1122,1402);
  const id=form.locator('input[autocomplete=username]');
  const pw=form.locator('input[autocomplete=current-password]');
  const forgot=form.getByRole('button',{name:/Quên mật khẩu/});
  await form.locator('button[type=submit]').click();
  // Supports both HTML required validation and the app's inline feedback.
  assert.ok(await form.evaluate(f=>!f.checkValidity()||Boolean(f.querySelector('.auth-message,[role=alert]'))));
  assert.equal(calls.password.length,0);

  await id.fill('gv001');
  await pw.fill('qa-dummy-only');
  await expect(id).toHaveAttribute('type','text');
  assert.equal(await form.evaluate(f=>f.checkValidity()),true,'username must pass native form validation');
  await pw.press('Enter');
  await expect.poll(()=>calls.password.length).toBe(1);
  assert.deepEqual(calls.password[0],{grant:'password',email:'gv001@accounts.brianenglish.studio'});
  await expect(form.getByText(/Sai email hoặc mật khẩu|Invalid login/i)).toBeVisible();
  await expect(id).toHaveValue('gv001');
  await forgot.click();
  await expect(form.getByText(/liên hệ Admin để đặt lại mật khẩu/)).toBeVisible();
  assert.equal(calls.recover.length,0);
  await id.fill('qa-teacher@example.test');
  await forgot.click();
  await expect(form.getByText(/Đã gửi email đặt lại mật khẩu/)).toBeVisible();
  assert.deepEqual(calls.recover,[{email:'qa-teacher@example.test',returnTo:origin+'/#/login?recovery=1'}]);

  await form.getByRole('button',{name:/Chưa có tài khoản.*Tạo tài khoản/}).click();
  await expect(page).toHaveURL(/#\/register$/);
  await expect(page.locator('form input[autocomplete=name]')).toBeVisible();
  await page.locator('form').getByRole('button',{name:/Đã có tài khoản.*Đăng nhập/}).click();
  await expect(page).toHaveURL(/#\/login$/);

  await page.goto(origin+'/#/login?recovery=1');
  const recovery=page.locator('.auth-google-form');
  await expect(recovery.getByRole('heading',{name:/Đặt lại mật khẩu/})).toBeVisible();
  await expect(recovery.locator('input[autocomplete=new-password]')).toHaveCount(2);
  await recovery.getByRole('button',{name:/Quay lại đăng nhập/}).click();
  await expect(page).toHaveURL(/#\/login$/);
  await page.locator('form').getByRole('button',{name:/Tiếp tục với Google/}).click();
  await expect.poll(()=>calls.authorize.length).toBe(1);
  assert.deepEqual(calls.authorize[0],{provider:'google',returnTo:origin+'/'});

  const english=await open(1122,900,'en');
  await expect(english.form.getByRole('heading',{name:'Teacher sign in'})).toBeVisible();
  await expect(english.form.getByRole('button',{name:'Continue with Google'})).toBeVisible();
  await english.page.screenshot({path:join(output,'login-en.png'),fullPage:true,animations:'disabled'});
  enabled=false;
  const original=await open(1122,900);
  await expect(original.page.locator('.app-shell')).not.toHaveAttribute('data-login-scrapbook','on');
  await expect(original.page.locator('.auth-google-visual')).toBeVisible();
  await original.page.screenshot({path:join(output,'login-original.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log('PASS: reference viewport, laptop, phone, bilingual form, username, reset, mocked Google OAuth, registration and recovery.');
} catch(error) {
  if(activePage && !activePage.isClosed()) {
    await activePage.screenshot({path:join(output,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});
    console.error('Last URL:',activePage.url());
  }
  throw error;
} finally {
  await browser?.close();
  await rm(dist,{recursive:true,force:true});
}
