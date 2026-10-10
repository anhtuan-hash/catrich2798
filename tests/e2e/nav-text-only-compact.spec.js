import { test, expect } from '@playwright/test';

const buttons=[
  ['Trang chủ','home'],['Ứng dụng','apps'],['Dashboard','dashboard'],['Chủ nhiệm','homeroom'],
  ['Sổ điểm','gradebook'],['Kiểm tra','lesson-check'],['Báo cáo','reports'],['TTCM','ttcm'],['Điểm danh','attendance'],
];
test('primary desktop nav is text-only, uniformly compact, and preserves status badges',async({page})=>{
  await page.setViewportSize({width:1520,height:900});
  await page.setContent(`<div id="root"><div class="app-shell" data-route="home">
    <header class="bes-top-chrome"><nav class="brian-nav">
      <button class="brian-nav__brand" aria-label="Brian English">Brian English</button>
      <div class="brian-nav__primary">
        <button data-nav-key="home">Trang chủ</button>
        <button data-nav-key="apps">Ứng dụng</button>
        <button class="brian-nav__dashboard-tab">Dashboard</button>
        <button class="brian-nav__homeroom-tab">Chủ nhiệm</button>
        <button class="brian-nav__gradebook-tab">Sổ điểm</button>
        <button class="brian-nav__lesson-check-tab" data-nav-key="lesson-check">Kiểm tra</button>
        <button class="brian-nav__reports-tab brian-nav__reports-send shows-countdown"><span class="brian-nav__reports-svg-wrapper-1"><span class="brian-nav__reports-svg-wrapper"><svg></svg></span></span><span class="brian-nav__reports-copy"><span class="brian-nav__reports-label">Báo cáo</span><span class="brian-nav__reports-countdown">2 ngày</span></span></button>
        <button class="brian-nav__ttcm-tab"><svg class="ttcm-m3-icon"></svg><span>TTCM</span><b class="brian-nav__ttcm-badge">3</b></button>
        <button class="brian-nav__attendance-tab"><svg class="attendance-icon"></svg><span>Điểm danh</span></button>
      </div>
      <button class="brian-nav__account">Tài khoản</button>
    </nav></header>
  </div></div>`);
  await page.addStyleTag({path:'src/components/GlobalCompactNavigation.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationRaisedPills.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationRaisedPillsFix.css'});
  await page.addStyleTag({path:'src/components/GlobalReportsNavigationTab.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationPastelPalette.css'});
  await page.addStyleTag({path:'src/components/GlobalNavigationTextOnlyCompact.css'});
  const pills=page.locator('.brian-nav__primary > button');
  await expect(pills).toHaveCount(9);
  for(let i=0;i<9;i++){
    const pill=pills.nth(i);
    await expect(pill).toBeVisible();
    const metrics=await pill.evaluate(el=>{
      const st=getComputedStyle(el);
      return {h:el.getBoundingClientRect().height,pad:st.paddingLeft,font:st.fontSize,pseudo:getComputedStyle(el,'::before').content};
    });
    expect(metrics.h).toBe(40);
    expect(metrics.pad).toBe('14px');
    expect(metrics.font).toBe('14px');
    expect(['none','normal','""']).toContain(metrics.pseudo);
  }
  const visualOrder=await pills.evaluateAll(nodes=>nodes
    .map((node,index)=>({label:node.classList.contains('brian-nav__reports-tab') ? 'Báo cáo' : node.textContent.trim(),order:Number(getComputedStyle(node).order)||0,index}))
    .sort((a,b)=>a.order-b.order||a.index-b.index).map(({label})=>label));
  expect(visualOrder.indexOf('Sổ điểm')).toBeLessThan(visualOrder.indexOf('Kiểm tra'));
  expect(visualOrder.indexOf('Kiểm tra')).toBeLessThan(visualOrder.indexOf('Báo cáo'));
  await expect(page.locator('.brian-nav__ttcm-badge')).toHaveText('3');
  await expect(page.locator('.brian-nav__reports-countdown')).toHaveText('2 ngày');
  const icons=await page.locator('.brian-nav__primary svg').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).display));
  expect(icons.every(x=>x==='none')).toBe(true);
  await expect(page.locator('.brian-nav__brand')).toBeVisible();
  await expect(page.locator('.brian-nav__account')).toBeVisible();
  await page.evaluate(()=>document.querySelectorAll('.brian-nav__primary>button').forEach(b=>b.addEventListener('click',()=>b.dataset.clicked='true')));
  await pills.nth(5).click();
  await expect(pills.nth(5)).toHaveAttribute('data-clicked','true');
});
