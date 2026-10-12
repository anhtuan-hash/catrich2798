import { test, expect } from '@playwright/test';
test('three utility icons follow attendance with working notification and deadline badges', async ({page})=>{
  await page.setViewportSize({width:1536,height:960});
  await page.setContent(`<div id="root"><div class="app-shell" data-route="home"><div class="bes-top-chrome">
   <nav class="brian-nav" style="display:flex;width:1460px;gap:10px">
    <button class="brian-nav__brand">Brian English</button>
    <div class="brian-nav__primary" style="display:flex;align-items:center;gap:7px">
     <button data-nav-key="home">Trang chủ</button><button data-nav-key="apps">Ứng dụng</button>
     <button class="brian-nav__dashboard-tab">Dashboard</button>
     <button class="brian-nav__homeroom-tab">Chủ nhiệm</button>
     <button class="brian-nav__gradebook-tab">Sổ điểm</button>
     <button class="brian-nav__lesson-check-tab">Kiểm tra</button>
     <button class="brian-nav__attendance-tab" data-nav-key="attendance">Điểm danh</button>
     <div class="brian-nav__utility-slot brian-nav__utility-reports" data-nav-key="reports">
      <button aria-label="Báo cáo · Còn 2 ngày" class="brian-nav__reports-tab brian-nav__reports-send shows-countdown">
       <span class="brian-nav__reports-copy"><span class="brian-nav__reports-label">Báo cáo</span>
        <span class="brian-nav__reports-countdown">2ng 03:24</span></span></button></div>
     <div class="brian-nav__utility-slot brian-nav__utility-ttcm" data-nav-key="ttcm">
      <button aria-label="TTCM" class="brian-nav__ttcm-tab"><svg viewBox="0 0 24 24"></svg><span>TTCM</span><b class="brian-nav__ttcm-badge">3</b></button></div>
     <button aria-label="Quản trị" class="brian-nav__utility-admin-icon" data-nav-key="admin"><svg viewBox="0 0 24 24"></svg></button>
    </div><button class="brian-nav__account">Tài khoản</button>
   </nav></div></div></div>`);
  await page.addStyleTag({path:'src/components/GlobalNavigationUtilityIcons.css'});
  await expect(page.locator('.brian-nav__utilities-trigger')).toHaveCount(0);
  const icons=page.locator('.brian-nav__primary > :is(.brian-nav__utility-slot,.brian-nav__utility-admin-icon)');
  await expect(icons).toHaveCount(3);
  await expect(page.getByRole('button',{name:/Báo cáo/})).toBeVisible();
  await expect(page.getByRole('button',{name:'TTCM'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Quản trị'})).toBeVisible();
  await expect(page.locator('.brian-nav__ttcm-badge')).toHaveText('3');
  await expect(page.locator('.brian-nav__reports-countdown')).toHaveText('2ng 03:24');
  const result=await page.evaluate(()=>[...document.querySelectorAll('.brian-nav__primary > [data-nav-key]')].map(el=>({key:el.dataset.navKey,left:el.getBoundingClientRect().left})));
  for(const [p,n] of [['attendance','reports'],['reports','ttcm'],['ttcm','admin']])
   expect(result.find(x=>x.key===n).left).toBeGreaterThan(result.find(x=>x.key===p).left);
});
