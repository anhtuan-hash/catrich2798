import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const read = (file) => fs.readFileSync(file, 'utf8');
const styles = [
  'src/components/attendance/AttendanceHistoryV2.css',
  'src/pages/AttendanceWorkspace.css',
  'src/pages/AttendanceWorkspaceRebuilt.css',
  'src/pages/AttendanceMobileAudit.css',
  'public/attendance-history-mobile-bottom-sheet.css',
  'public/attendance-history-mobile-polish.css',
  'src/pages/AttendanceHistoryIphoneViewportFix.css',
];
const html = '<!doctype html><html lang="vi"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">' +
  '<div style="height:500px">A long page above attendance</div>' +
  '<main class="attendance-workspace-page"><section class="attendance-shell is-standalone ah-history-v5">' +
  '<nav class="attendance-tabs"><button>Điểm danh</button><button>Lịch sử</button></nav>' +
  '<div class="attendance-content"><div class="ahv3__shell is-mobile-detail-open" data-attendance-history-v3="true">' +
  '<section class="ahv3__list"><header class="ahv3__list-head">' +
  '<div class="ahv3__list-title"><div>Lịch sử điểm danh</div><div class="ahv3__list-actions"><span>292 buổi</span></div></div>' +
  '<label class="ahv3__search"><span>⌕</span><input placeholder="Tìm theo tên lớp, môn học, giáo viên"></label></header>' +
  '<div class="ahv3__items"><button class="is-selected" type="button">' +
  '<div class="ahv3__card-copy"><div class="ahv3__card-title"><b>Bồi dưỡng Tiếng Anh nâng cao lớp 10</b><span class="ahv3__type">Bồi dưỡng HSG</span></div>' +
  '<small>Ngữ văn · Nguyễn Võ Hữu Được</small><time>21/10/2026 · 16h45 đến 18h15</time></div>' +
  '<span class="ahv3__count"><b>10/10</b><em>0 vắng</em><i>100%</i></span></button>' +
  Array.from({length:10},(_,i)=>'<button type="button">Buổi '+i+'</button>').join('') +
  '</div></section><button class="ahv3__mobile-sheet-backdrop" type="button"></button>' +
  '<section class="ahv3__detail"><button class="ahv3__mobile-sheet-close" type="button">×</button>' +
  '<div class="ahv3__hero"><div class="ahv3__hero-copy"><span>Đã điểm danh</span><h2>Bồi dưỡng Ngữ văn 10</h2><div class="ahv3__hero-chips"><span>2 tiết</span></div></div></div>' +
  '<div class="ahv3__mobile-summary"><article><b>10/10</b><span>Tham gia</span></article><article class="is-absent"><b>0 vắng</b><span>Vắng</span></article><article class="is-rate"><b>100%</b><span>Tỷ lệ</span></article></div>' +
  '<h3 class="ahv3__section-title is-info">Thông tin buổi học</h3>' +
  '<div class="ahv3__info-grid"><article><div><span>Giáo viên</span><b>Nguyễn Võ Hữu Được</b></div></article>' +
  '<article><div><span>Thời gian</span><b>16h45 đến 18h15</b></div></article></div>' +
  '<section class="ahv3__late-section"><h3>Học sinh đi trễ</h3></section>' +
  '<section class="ahv3__absent-section"><h3>Học sinh vắng</h3></section>' +
  '</section></div></div></section></main><div style="height:400px"></div></body></html>';

async function load(page) {
  await page.setViewportSize({width:390,height:844});
  await page.setContent(html);
  for(const file of styles) await page.addStyleTag({content:read(file)});
}

test('iPhone: history detail stays inside viewport after scrolling the standalone page', async ({page}) => {
  await load(page);
  await page.evaluate(() => scrollTo(0, 490));
  const metrics = await page.locator('.ahv3__detail').evaluate(node => {
    const rect = node.getBoundingClientRect();
    const heading = node.querySelector('.ahv3__hero h2').getBoundingClientRect();
    return {position:getComputedStyle(node).position,top:rect.top,bottom:rect.bottom,width:rect.width,
      headingTop:heading.top,headingBottom:heading.bottom,viewportHeight:innerHeight,viewportWidth:innerWidth,
      maxHeight:getComputedStyle(node).maxHeight,scrollWidth:document.documentElement.scrollWidth,
      overflowElements:[...document.querySelectorAll('body *')].map(el=>({tag:el.tagName,cls:String(el.className||'').slice(0,90),right:Math.round(el.getBoundingClientRect().right),left:Math.round(el.getBoundingClientRect().left)})).filter(el=>el.right>innerWidth+1||el.left< -1).slice(0,12)};
  });
  expect(metrics.position).toBe('fixed');
  expect(metrics.top).toBeGreaterThanOrEqual(-1);
  expect(metrics.bottom).toBeCloseTo(metrics.viewportHeight,0);
  expect(metrics.headingTop).toBeGreaterThanOrEqual(metrics.top);
  expect(metrics.headingBottom).toBeLessThanOrEqual(metrics.bottom);
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.scrollWidth, JSON.stringify(metrics.overflowElements)).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  const close = page.locator('.ahv3__mobile-sheet-close');
  await expect(close).toBeInViewport();
  await page.locator('.ahv3__detail').evaluate(node => {node.scrollTop=node.scrollHeight;});
  await expect(close).toBeInViewport();
});

test('iPhone: class name wraps; search and card list never overflow horizontally', async ({page}) => {
  await load(page);
  const m = await page.evaluate(() => {
    const name=document.querySelector('.ahv3__card-title b');
    const items=document.querySelector('.ahv3__items');
    const input=document.querySelector('.ahv3__search input');
    const backdrop=document.querySelector('.ahv3__mobile-sheet-backdrop');
    return {nameWhiteSpace:getComputedStyle(name).whiteSpace,
      itemsOverflow:getComputedStyle(items).overflowY,
      inputBorder:getComputedStyle(input).borderTopWidth,
      backdropPosition:getComputedStyle(backdrop).position,
      nameWidth:name.getBoundingClientRect().width,
      cardWidth:name.closest('button').getBoundingClientRect().width};
  });
  expect(m.nameWhiteSpace).toBe('normal');
  expect(m.itemsOverflow).toBe('auto');
  expect(m.inputBorder).toBe('0px');
  expect(m.backdropPosition).toBe('fixed');
  expect(m.nameWidth).toBeLessThanOrEqual(m.cardWidth);
});

test('legacy modal retains its in-modal bottom sheet', async ({page}) => {
  await load(page);
  await page.locator('.attendance-workspace-page').evaluate(node => node.classList.remove('attendance-workspace-page'));
  const pos=await page.locator('.ahv3__detail').evaluate(node=>getComputedStyle(node).position);
  expect(pos).toBe('absolute');
});
