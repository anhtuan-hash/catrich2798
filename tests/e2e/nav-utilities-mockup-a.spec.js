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
     <button aria-label="Quản trị" class="brian-nav__utility-admin-icon" data-nav-key="admin"><svg class="brian-nav__admin-settings-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M9.5 3.5 10 2h4l.5 1.5 1.6.7 1.4-.7 2.8 2.8-.7 1.4.7 1.6L22 10v4l-1.5.5-.7 1.6.7 1.4-2.8 2.8-1.4-.7-1.6.7L14 22h-4l-.5-1.5-1.6-.7-1.4.7-2.8-2.8.7-1.4-.7-1.6L2 14v-4l1.5-.5.7-1.6-.7-1.4 2.8-2.8 1.4.7z" /><circle cx="12" cy="12" r="3.5" /></svg></button>
    </div><button class="brian-nav__account">Tài khoản</button>
   </nav></div></div></div>`);
  await page.addStyleTag({path:'src/components/GlobalNavigationTextOnlyCompact.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationUtilityIcons.css'});
  await expect(page.locator('.brian-nav__utilities-trigger')).toHaveCount(0);
  const icons=page.locator('.brian-nav__primary > :is(.brian-nav__utility-slot,.brian-nav__utility-admin-icon)');
  await expect(icons).toHaveCount(3);
  await expect(page.getByRole('button',{name:/Báo cáo/})).toBeVisible();
  await expect(page.getByRole('button',{name:'TTCM'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Quản trị'})).toBeVisible();
  const adminIcon=page.locator('.brian-nav__admin-settings-icon');
  const adminButton=page.locator('.brian-nav__utility-admin-icon');
  await expect(adminIcon).toBeVisible();
  await expect(adminIcon).toHaveCSS('display','block');
  await expect(adminIcon).toHaveCSS('width','20px');
  await expect(adminIcon).toHaveCSS('height','20px');
  await expect(adminIcon).toHaveCSS('fill','none');
  await expect(adminButton).toHaveCSS('margin-left','0px');
  const checkCenter=async()=>{
    const b=await adminButton.boundingBox();
    const i=await adminIcon.boundingBox();
    expect(b).toBeTruthy();expect(i).toBeTruthy();
    expect(Math.abs(b.x+b.width/2-i.x-i.width/2)).toBeLessThan(1);
    expect(Math.abs(b.y+b.height/2-i.y-i.height/2)).toBeLessThan(1);
  };
  await checkCenter();
  await page.setViewportSize({width:1100,height:900});
  await checkCenter();
  await expect(page.locator('.brian-nav__ttcm-badge')).toHaveText('3');
  await expect(page.locator('.brian-nav__reports-countdown')).toHaveText('2ng 03:24');
  // Unset: production renders an icon without any visual dash. Native
  // title/aria-label preserves the "no deadline" information for users.
  await page.locator('.brian-nav__reports-tab').evaluate(button=>{
    button.classList.add('is-deadline-unset');
    button.classList.remove('shows-countdown','is-deadline-active','is-deadline-expired');
    button.setAttribute('aria-label','Báo cáo · Chưa đặt hạn');
    button.setAttribute('title','Báo cáo · Chưa đặt hạn');
    button.setAttribute('data-deadline-status','unset');
    button.querySelector('.brian-nav__reports-countdown')?.remove();
  });
  await expect(page.locator('.brian-nav__reports-countdown')).toHaveCount(0);
  await expect(page.locator('.brian-nav__reports-tab')).toHaveAttribute('data-deadline-status','unset');
  await expect(page.locator('.brian-nav__reports-tab')).toHaveAttribute('title','Báo cáo · Chưa đặt hạn');
  const unsetBox=await page.locator('.brian-nav__reports-tab').boundingBox();
  expect(unsetBox.width).toBeLessThan(50);
  // When the server provides a future deadline, the actual live timer
  // reappears and stays within the button rather than overlapping TTCM.
  await page.locator('.brian-nav__reports-tab').evaluate(button=>{
    button.classList.remove('is-deadline-unset');
    button.classList.add('is-deadline-active','shows-countdown');
    button.setAttribute('data-deadline-status','active');
    button.querySelector('.brian-nav__reports-copy')
      .insertAdjacentHTML('beforeend','<span class="brian-nav__reports-countdown" aria-hidden="true">2ng 03:24</span>');
  });
  const measure = () => page.locator('.brian-nav__reports-tab').evaluate(button=>{
    const chip=button.querySelector('.brian-nav__reports-countdown');
    const b=button.getBoundingClientRect();
    const c=chip.getBoundingClientRect();
    return {button:{top:b.top,bottom:b.bottom,width:b.width},chip:{top:c.top,bottom:c.bottom,left:c.left,right:c.right}};
  });
  const active=await measure();
  expect(active.button.width).toBeGreaterThanOrEqual(100);
  expect(active.chip.top).toBeGreaterThanOrEqual(active.button.top);
  expect(active.chip.bottom).toBeLessThanOrEqual(active.button.bottom);
  // After the deadline passes, show a compact expired marker in the icon.
  await page.locator('.brian-nav__reports-tab').evaluate(button=>{
    button.classList.remove('is-deadline-active');
    button.classList.add('is-deadline-expired');
    button.setAttribute('data-deadline-status','expired');
    button.querySelector('.brian-nav__reports-countdown').textContent='Hết';
  });
  const expired=await measure();
  expect(expired.button.width).toBeLessThan(50);
  expect(expired.chip.top).toBeGreaterThanOrEqual(expired.button.top);
  expect(expired.chip.bottom).toBeLessThanOrEqual(expired.button.bottom);
  const result=await page.evaluate(()=>[...document.querySelectorAll('.brian-nav__primary > [data-nav-key]')].map(el=>({key:el.dataset.navKey,left:el.getBoundingClientRect().left})));
  for(const [p,n] of [['attendance','reports'],['reports','ttcm'],['ttcm','admin']])
   expect(result.find(x=>x.key===n).left).toBeGreaterThan(result.find(x=>x.key===p).left);
});
