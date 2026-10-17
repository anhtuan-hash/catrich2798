import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const DEMO_KEY='bes-offline-demo-user-v943';
const DEMO_ADMIN={
  id:'questatlas-e2e-admin',authId:'questatlas-e2e-admin',
  role:'admin',name:'QuestAtlas E2E Teacher',
  school:'Local QuestAtlas Demo',email:'questatlas-e2e@brianenglish.local',
  approved:true,createdAt:'2026-10-17T00:00:00.000Z',
  updatedAt:'2026-10-17T00:00:00.000Z',
  permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true,
};

async function openTeacherDemo(page) {
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.addInitScript(({key,user})=>{
    localStorage.setItem(key,JSON.stringify(user));
    localStorage.setItem('bet-language','vi');
  },{key:DEMO_KEY,user:DEMO_ADMIN});
  await page.goto('/#/tool/questatlas');
  await expect(page.locator('.qa-app')).toBeVisible({timeout:20_000});
  await expect(page.getByRole('heading',{name:/QuestAtlas/i})).toBeVisible();
  // Test fixtures omit VITE_SUPABASE_URL, so the app intentionally falls back.
  await expect(page.getByRole('button',{name:/Chạy phòng mô phỏng miễn phí/i})).toBeVisible({timeout:15000});
  await page.getByRole('button',{name:/Chạy phòng mô phỏng miễn phí/i}).click();
  await expect(page.locator('.qa-mode-demo')).toBeVisible();
  await expect(page.getByRole('button',{name:/Mở phòng mô phỏng miễn phí/i})).toBeVisible();
  await page.getByRole('button',{name:/Mở phòng mô phỏng miễn phí/i}).click();
  await expect(page.locator('.qa-rehearsal')).toBeVisible();
  expect(errors).toEqual([]);
  return errors;
}

test('QuestAtlas teacher can rehearse eight teams and export local CSV without any server persistence',async({page})=>{
  const errors=await openTeacherDemo(page);
  const simulation=page.locator('.qa-rehearsal');
  await simulation.getByLabel('Số đội').selectOption('8');
  await simulation.getByRole('button',{name:/Tạo phòng mô phỏng/}).click();
  await expect(simulation.locator('.qa-rehearsal-team')).toHaveCount(8);
  const start=simulation.getByRole('button',{name:/Bắt đầu/});
  await expect(start).toBeDisabled();
  await simulation.getByRole('button',{name:/Thêm tất cả đội/}).click();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(simulation.getByText(/Trạm 1\/2/)).toBeVisible();

  const teams=simulation.locator('.qa-rehearsal-team');
  await teams.nth(0).getByRole('button',{name:/Đúng/}).click();
  await teams.nth(1).getByRole('button',{name:/Sai/}).click();
  await expect(teams.nth(0).locator('b')).toContainText('10 điểm');
  await expect(teams.nth(1).locator('b')).toContainText('0 điểm');
  await expect(teams.nth(0).getByRole('button',{name:/Đúng/})).toHaveCount(0);
  await simulation.getByRole('button',{name:/Tạm dừng/}).click();
  await expect(simulation.getByRole('button',{name:/Tiếp tục/})).toBeVisible();
  await simulation.getByRole('button',{name:/Tiếp tục/}).click();
  await simulation.getByRole('button',{name:/Trạm tiếp theo/}).click();
  await expect(simulation.getByText(/Trạm 2\/2/)).toBeVisible();
  await teams.nth(0).getByRole('button',{name:/Đúng/}).click();
  await teams.nth(1).getByRole('button',{name:/Đúng/}).click();

  const downloadPromise=page.waitForEvent('download');
  await simulation.getByRole('button',{name:/Kết thúc/}).first().click();
  await expect(simulation.getByRole('button',{name:/Xuất CSV bảng điểm mô phỏng/})).toBeVisible();
  await simulation.getByRole('button',{name:/Xuất CSV bảng điểm mô phỏng/}).click();
  const download=await downloadPromise;
  expect(download.suggestedFilename()).toBe('questatlas-rehearsal-results.csv');
  const csv=await fs.readFile(await download.path(),'utf8');
  expect(csv).toContain('QuestAtlas Offline Rehearsal — Teacher Simulation');
  expect(csv).toContain('Scale (10)');
  expect(csv).not.toContain('Surprised');
  expect(csv).not.toContain('The teacher _____');
  expect(csv).not.toContain('correct_answer');
  expect(errors).toEqual([]);
});

test('QuestAtlas rehearsal stays navigable on iPad viewport without horizontal clipping',async({page})=>{
  const errors=await openTeacherDemo(page);
  const sim=page.locator('.qa-rehearsal');
  await sim.getByLabel('Số đội').selectOption('8');
  await sim.getByRole('button',{name:/Tạo phòng mô phỏng/}).click();
  await sim.getByRole('button',{name:/Thêm tất cả đội/}).click();
  const metrics=await sim.evaluate(el=>({
    width:el.getBoundingClientRect().width,
    viewport:window.innerWidth,
    scroll:el.scrollWidth,
    client:el.clientWidth,
  }));
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewport+3);
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+3);
  await sim.getByRole('button',{name:/Bắt đầu/}).click();
  await expect(sim.locator('.qa-rehearsal-question')).toBeVisible();
  expect(errors).toEqual([]);
});

test('teacher Escape preview can be closed by keyboard without losing page control',async({page})=>{
  await openTeacherDemo(page);
  await page.getByRole('button',{name:/Escape Studio/}).click();
  await expect(page.getByRole('button',{name:/Xem thử Escape Room/})).toBeVisible();
  await page.getByRole('button',{name:/Xem thử Escape Room/}).click();
  const dialog=page.getByRole('dialog',{name:/Xem trước Quest/});
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.qa-webgl-canvas')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Xem thử Escape Room/})).toBeVisible();
});

test('public QuestAtlas join route does not expose the authenticated BRIAN shell',async({page})=>{
  await page.goto('/#/quest-join?code=ABCDEF123456');
  await expect(page.locator('.qa-join-shell')).toBeVisible();
  await expect(page.locator('.qa-join-card input').first()).toHaveValue('ABCDEF123456');
  const chrome=page.locator('.bes-top-chrome');
  if(await chrome.count())await expect(chrome).toBeHidden();
  await expect(page.getByRole('button',{name:/Vào phòng chơi/})).toBeVisible();
});
