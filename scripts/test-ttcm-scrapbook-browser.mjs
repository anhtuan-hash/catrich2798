import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';

const base = 'http://ttcm.test';
const api = base + '/supabase';
const out = await mkdtemp(join(tmpdir(), 'ttcm-scrapbook-'));
const screenshots = 'test-results/ttcm-scrapbook';
const titles = ['Nộp đề kiểm tra giữa kì', 'Kế hoạch sinh hoạt tổ chuyên môn', 'Góp ý ma trận đề', 'Tài liệu ôn tập khối 12'];
const authors = ['Giáo viên mẫu', 'Trần Minh An', 'Nguyễn Hà Anh'];
const people = authors.map((full_name, i) => ({ id: i ? 'gv-' + i : 'teacher', full_name, role: 'teacher', approved: true, department: 'Tiếng Anh' }));
const messages = titles.map((title, i) => ({
  id: 'notice-' + i, title, description: ['Các thầy cô gửi đề và đáp án để tổ rà soát trước khi in.', 'Trao đổi về kế hoạch dự giờ và sinh hoạt chuyên đề.', 'Xin ý kiến về cấu trúc và mức độ các câu hỏi.', 'Tổng hợp tài liệu dùng cho buổi ôn tập.'][i],
  created_by: 'admin', owner_id: 'admin', assignee_ids: ['admin', 'teacher'], source_module: 'ttcm', item_type: 'task',
  metadata: { ttcm_kind: ['task','announcement','feedback','resource'][i] },
  created_at: '2026-11-0' + (4-i) + 'T03:00:00Z', due_at: i ? null : '2026-10-31T01:00:00Z',
}));
const events = ['Thao giảng môn Tiếng Anh', 'Họp tổ chuyên môn', 'Tọa đàm phương pháp dạy học', 'Nộp ma trận kiểm tra'].map((title,i) => ({
  id: 'event-' + i, title, item_type: 'schedule', due_at: '2026-11-03T0' + (2+i) + ':00:00Z',
  metadata: { schedule_event: true, schedule_start_at: '2026-11-03T0' + (2+i) + ':00:00Z', schedule_location: 'Phòng A.204', schedule_responsible: 'Tổ Tiếng Anh' },
}));
const replies = people.slice(1).map((person, i) => ({ id: 'reply-' + i, item_id: 'notice-0', author_id: person.id, body: 'Đã gửi đề và đáp án của khối.', comment_type: 'submission', created_at: '2026-11-03T03:00:00Z', attachments: [] }));
let enabled = false, denySave = false, revision = 0;
const row = () => ({ ttcm_scrapbook_enabled: enabled, updated_at: new Date(Date.UTC(2026,10,3,1,0,revision)).toISOString() });
const errors = [];
let browser;
try {
  // Only the fixture replaces authentication and the Realtime transport. Both theme reads
  // and the admin switch use the production PostgREST client against intercepted test data.
  await build({
    configFile: false, publicDir: false, logLevel: 'error',
    define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(api), 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"qa-placeholder"' },
    plugins: [{ name: 'isolated-channel-session', enforce: 'pre', transform(source, id) {
      if (!id.endsWith('/src/services/runtime/core.js')) return;
      return source.slice(0, source.indexOf('export async function bootRuntimeCore')) + `
        export function getRuntimeState(){return {ready:true, session:{user:{id:'fixture'}}, profile:{role:'admin'}}}
        export async function bootRuntimeCore(){return getRuntimeState()}
        export const ensureRuntimeReady=bootRuntimeCore;
        export function subscribeRuntime(){return ()=>{}}
        export function getRuntimeClient(){return supabase}
        export function subscribeTable({table,onChange}) {
          const update = event => onChange(event.detail);
          window.addEventListener('qa:'+table, update);
          return ()=>window.removeEventListener('qa:'+table, update);
        }
        export async function runtimeRpc(name,args){return supabase.rpc(name,args)}
        export async function runtimeQuery(name,configure){return configure(supabase.from(name))}
        export async function diagnoseRuntime(){return getRuntimeState()}
      `;
    } }],
    build: { outDir: out, minify: false, cssCodeSplit: false, rollupOptions: { input: resolve('tests/fixtures/ttcm-scrapbook.jsx'), output: {entryFileNames:'fixture.js', assetFileNames:'[name][extname]'} } },
  });
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await mkdir(screenshots, { recursive: true });
  const context = await browser.newContext({ timezoneId: 'Asia/Ho_Chi_Minh', reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.href.startsWith(api + '/')) {
      let data = [];
      const table = url.pathname.split('/').at(-1);
      if (table === 'bes_navigation_theme_settings') data = [row()];
      if (table === 'bes_set_ttcm_scrapbook_enabled') {
        if (denySave) return route.fulfill({ status: 403, json: {message:'Only an approved admin may save'} });
        enabled = route.request().postDataJSON().p_enabled; revision++; data = [row()];
      }
      if (table === 'work_hub_items') data = url.searchParams.has('source_module') ? messages : events;
      if (table === 'work_hub_comments') data = replies;
      if (table === 'profiles' || table.includes('teacher_accounts')) data = people;
      return route.fulfill({ json: data });
    }
    if (url.origin !== base) return route.abort();
    if (url.pathname === '/') return route.fulfill({contentType:'text/html', body:'<!doctype html><html lang="vi" data-global-font="system"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body style="margin:0"><div id="root"></div><script type="module" src="/fixture.js"></script>'});
    const path = decodeURIComponent(url.pathname.slice(1));
    let body;
    try { body = await readFile(join(out,path)); }
    catch { try { body = await readFile(join('public',path)); } catch { return route.fulfill({status:404,body:''}); } }
    const type = { js:'text/javascript', css:'text/css', webp:'image/webp', svg:'image/svg+xml' }[path.split('.').at(-1)];
    return route.fulfill({ body, contentType:type || 'application/octet-stream' });
  });
  async function pageAt(query='', width=1440, height=900) {
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewportSize({width,height});
    await page.clock.setFixedTime(new Date('2026-11-03T09:30:00+07:00'));
    await page.goto(base + '/' + query);
    return page;
  }
  const setting = await pageAt('?settings');
  const toggle = setting.getByRole('switch', {name:'Giao diện TTCM Scrapbook'});
  await expect(toggle).toBeEnabled();
  const page = await pageAt();
  const channel = page.getByRole('dialog', {name:'Kênh TTCM', exact:true});
  await page.locator('.brian-nav__ttcm-tab').click();
  await expect(channel).toBeVisible();
  const header = channel.locator('.ttcm-m3-topbar');
  const original = await header.evaluate(e => getComputedStyle(e).backgroundImage);
  async function flip(on) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked',String(on));
    await page.evaluate(newRow => window.dispatchEvent(new CustomEvent('qa:bes_navigation_theme_settings', {detail:{new:newRow}})), row());
    await expect(page.locator('#ttcm-scrapbook')).toHaveCount(on ? 1 : 0);
  }
  await flip(true);
  assert.notEqual(await header.evaluate(e => getComputedStyle(e).backgroundImage),original);
  denySave = true; await toggle.click();
  await expect(setting.getByRole('alert')).toContainText('admin');
  await expect(toggle).toHaveAttribute('aria-checked','true'); denySave = false;
  await page.locator('.ttcm-reader-card').first().click();
  await expect(channel.locator('.ttcm-reader-detail h2')).toHaveText(titles[0]);
  await page.screenshot({path:join(screenshots,'trao-doi.png')});
  await channel.getByRole('button',{name:'Tạo nội dung'}).click();
  const draft = channel.getByPlaceholder('Nhập tiêu đề ngắn gọn');
  await draft.fill('Bản đang soạn');
  await flip(false);
  assert.equal(await header.evaluate(e=>getComputedStyle(e).backgroundImage),original);
  await expect(draft).toHaveValue('Bản đang soạn');
  await flip(true);
  await expect(draft).toHaveValue('Bản đang soạn');
  await channel.getByRole('button',{name:'Hủy',exact:true}).click();
  await expect(channel.locator('.ttcm-reader-detail h2')).toHaveText(titles[0]);
  await channel.getByRole('button',{name:'Lịch làm việc',exact:true}).click();
  await expect(channel.locator('.work-schedule-daily-event')).toHaveCount(events.length);
  await page.screenshot({path:join(screenshots,'lich-lam-viec.png')});
  await channel.getByRole('button',{name:'Ngày sau'}).click();
  await expect(channel.locator('.work-schedule-daily-empty')).toBeVisible();
  await channel.getByRole('button',{name:'Nhân sự',exact:true}).click();
  await expect(channel.locator('.pgt-metric')).toHaveCount(6);
  await expect(channel.locator('.pgt-row').first()).toBeVisible();
  await page.screenshot({path:join(screenshots,'nhan-su.png')});
  await channel.getByRole('button',{name:'Lịch sử & File GV'}).click();
  await expect(channel.locator('.ttcm-history-field select').first()).toBeVisible();
  await channel.locator('.ttcm-history-field select').first().selectOption('gv-1');
  await expect(channel.locator('.ttcm-history-event').first()).toBeVisible();
  await page.screenshot({path:join(screenshots,'lich-su.png')});
  await flip(false);
  await expect(channel.locator('.ttcm-history-field select').first()).toHaveValue('gv-1');
  await flip(true);
  const phone = await pageAt('?role=teacher',390,844);
  await phone.locator('.brian-nav__ttcm-tab').evaluate(button => button.click());
  await expect(phone.locator('#ttcm-scrapbook')).toBeVisible();
  await expect(phone.getByRole('button',{name:'Lịch sử & File GV'})).toHaveCount(0);
  await expect(phone.getByRole('button',{name:'Tạo nội dung'})).toHaveCount(0);
  await phone.getByRole('button',{name:/Tất cả/}).first().click();
  await phone.locator('.ttcm-reader-card').first().click();
  await expect(phone.locator('.ttcm-reader-detail h2')).toBeVisible();
  await phone.screenshot({path:join(screenshots,'dien-thoai.png')});
  await phone.locator('.ttcm-reader-back').click();
  await expect(phone.locator('.ttcm-reader-card').first()).toBeVisible();
  assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('Passed desktop and phone channel navigation, admin switch, failed writes, realtime OFF, draft and selection restoration.');
} finally {
  await browser?.close();
  await rm(out,{force:true,recursive:true});
}
