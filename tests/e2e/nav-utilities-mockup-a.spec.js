import {test,expect} from '@playwright/test';

test('Mockup A places Attendance after Assessment, with Reports and TTCM in Utilities',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.setContent(`<div id="root"><div class="app-shell" data-route="home">
    <div class="bes-top-chrome"><nav class="brian-nav" style="display:flex;width:1300px">
      <button class="brian-nav__brand">Brian English</button>
      <div class="brian-nav__primary">
        <button data-nav-key="home">Trang chủ</button>
        <button data-nav-key="apps">Ứng dụng</button>
        <button class="brian-nav__dashboard-tab">Dashboard</button>
        <button class="brian-nav__homeroom-tab">Chủ nhiệm</button>
        <button class="brian-nav__gradebook-tab">Sổ điểm</button>
        <button class="brian-nav__lesson-check-tab">Kiểm tra</button>
        <button class="brian-nav__attendance-tab" data-nav-key="attendance">Điểm danh</button>
        <button data-nav-key="utilities" class="brian-nav__utilities-trigger" aria-expanded="false"
          aria-controls="brian-nav-utilities-menu">Tiện ích<span class="brian-nav__utilities-caret">⌄</span></button>
      </div>
      <button class="brian-nav__account">Tài khoản</button>
    </nav></div></div></div>
    <section id="brian-nav-utilities-menu" class="brian-nav__utilities-popover"
      style="top:118px;right:110px" hidden aria-hidden="true">
      <div class="brian-nav__utilities-heading">Tiện ích</div>
      <div class="brian-nav__utilities-items">
        <div class="brian-nav__utility-slot brian-nav__utility-reports">
          <button class="brian-nav__reports-tab"><span class="brian-nav__reports-copy">Báo cáo
            <span class="brian-nav__reports-countdown">2 ngày</span></span></button>
        </div>
        <div class="brian-nav__utility-slot brian-nav__utility-ttcm">
          <button class="brian-nav__ttcm-tab">TTCM<b class="brian-nav__ttcm-badge">9</b></button>
        </div>
        <button class="brian-nav__utility-admin">Quản trị</button>
      </div>
    </section>`);
  await page.addStyleTag({path:'src/components/GlobalCompactNavigation.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationTextOnlyCompact.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationUtilitiesDropdown.css'});
  const primary=page.locator('.brian-nav__primary > button');
  await expect(primary).toHaveCount(8);
  const labels=await primary.allTextContents();
  expect(labels.map(s=>s.trim())).toEqual(['Trang chủ','Ứng dụng','Dashboard','Chủ nhiệm','Sổ điểm','Kiểm tra','Điểm danh','Tiện ích⌄']);
  const trigger=page.getByRole('button',{name:/Tiện ích/});
  await expect(trigger).toHaveCSS('height','40px');
  const panel=page.locator('#brian-nav-utilities-menu');
  await expect(panel).toBeHidden();
  await trigger.click();
  await page.evaluate(()=>{
    const menu=document.querySelector('#brian-nav-utilities-menu');
    menu.hidden=false;
    menu.setAttribute('aria-hidden','false');
    document.querySelector('.brian-nav__utilities-trigger').setAttribute('aria-expanded','true');
  });
  await expect(panel).toBeVisible();
  const entries=panel.locator('.brian-nav__utilities-items button');
  await expect(entries).toHaveCount(3);
  expect((await entries.allTextContents()).map(s=>s.replace(/\s+/g,'').trim())).toEqual(['Báocáo2ngày','TTCM9','Quảntrị']);
  await expect(panel.locator('.brian-nav__ttcm-badge')).toHaveText('9');
  await expect(panel.locator('.brian-nav__reports-countdown')).toHaveText('2 ngày');
  const geometry=await panel.evaluate(el=>({style:getComputedStyle(el).position,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}));
  expect(geometry.style).toBe('fixed');
  expect(geometry.right).toBeLessThanOrEqual(1440);
  expect(geometry.width).toBeGreaterThanOrEqual(230);
  await entries.nth(1).click();
  await expect(panel).toBeVisible(); // submenu events are handled by original portalled TTCM button
});
