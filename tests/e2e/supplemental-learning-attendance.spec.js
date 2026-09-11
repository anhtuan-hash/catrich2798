import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const css=[
  fs.readFileSync(path.join(root,'src/styles/SupplementalLearning.css'),'utf8'),
  fs.readFileSync(path.join(root,'src/styles/SupplementalLearningAdminCompleteness.css'),'utf8'),
].join('\n');
const nativeAttendanceCss=fs.readFileSync(path.join(root,'src/components/GlobalAttendanceNavigationTab.css'),'utf8');
const nativeDailyCss=fs.readFileSync(path.join(root,'src/components/attendance/AttendanceDailyOverview.css'),'utf8');

async function installCss(page){await page.addStyleTag({content:css});}
async function installLayeredCss(page){await page.addStyleTag({content:`${nativeAttendanceCss}\n${nativeDailyCss}\n${css}`});}

test.describe('Supplemental learning attendance UI',()=>{
  test('Học bổ sung uses the same native row layout inside a floor card',async({page})=>{
    await page.setViewportSize({width:1280,height:760});
    await page.setContent(`<main class="attendance-daily-overview"><div class="attendance-daily-overview__list"><section class="attendance-daily-floor-card" data-floor="2"><div class="attendance-daily-floor-group" data-floor="2"><strong class="attendance-daily-floor-card__title">Lầu 2 <span>· 2 lớp/buổi</span></strong><span class="attendance-daily-floor-card__badge">Tầng 2</span></div><div class="attendance-daily-floor-card__rows"><button type="button" class="attendance-daily-class-row is-missing" data-floor="2"><span class="attendance-daily-class-row__class-shell"><span class="attendance-daily-class-row__leading-icon"></span><span class="attendance-daily-class-row__class"><b>Phụ đạo Toán 10</b><small>Phụ đạo · Toán</small></span></span><span class="attendance-daily-class-row__teacher"><b>Giáo viên A</b></span><span class="attendance-daily-class-row__meta is-room"><b>A202</b></span><span class="attendance-daily-class-row__meta is-time"><b>16h45 đến 18h00</b></span><span class="attendance-daily-class-row__status is-missing">Chưa điểm danh</span></button><button type="button" class="attendance-daily-class-row is-completed is-supplemental" data-bes-attendance-source="supplemental" data-bes-supplemental-session-id="sample" data-floor="2"><span class="attendance-daily-class-row__class-shell"><span class="attendance-daily-class-row__leading-icon"></span><span class="attendance-daily-class-row__class"><b>Bù bài toán 12</b><small>Học bổ sung · Toán</small></span></span><span class="attendance-daily-class-row__teacher"><b>Trần Nguyên Dự</b></span><span class="attendance-daily-class-row__meta is-room"><b>A203</b></span><span class="attendance-daily-class-row__meta is-time"><b>16:45–18:00</b><small>Nhóm dài ngày · 2 học sinh</small></span><span class="attendance-daily-class-row__status is-completed">Đã điểm danh</span></button></div></section></div></main>`);
    await installLayeredCss(page);
    const legacy=page.getByRole('button',{name:/Phụ đạo Toán 10/});
    const supplemental=page.locator('[data-bes-supplemental-session-id="sample"]');
    await expect(legacy).toBeVisible();
    await expect(supplemental).toBeVisible();
    await expect(page.getByText('Lầu 2')).toBeVisible();
    await expect(supplemental.getByText('Học bổ sung · Toán')).toBeVisible();
    const [legacyStyle,supplementalStyle]=await Promise.all([
      legacy.evaluate((node)=>({display:getComputedStyle(node).display,columns:getComputedStyle(node).gridTemplateColumns,height:getComputedStyle(node).height})),
      supplemental.evaluate((node)=>({display:getComputedStyle(node).display,columns:getComputedStyle(node).gridTemplateColumns,height:getComputedStyle(node).height})),
    ]);
    expect(supplementalStyle.display).toBe(legacyStyle.display);
    expect(supplementalStyle.columns).toBe(legacyStyle.columns);
    expect(supplementalStyle.height).toBe(legacyStyle.height);
  });

  test('Admin workspace exposes searchable edit and roster controls',async({page})=>{
    await page.setViewportSize({width:1280,height:800});
    await page.setContent(`<div class="bes-supplemental-backdrop"></div><section class="bes-supplemental-dialog"><header class="bes-supplemental-dialog-head"><div><span class="bes-supplemental-kicker">ĐIỂM DANH · ADMIN</span><h2>Học bổ sung</h2></div><button>×</button></header><nav class="bes-supplemental-local-tabs"><button>Học sinh</button><button>Nhóm dài ngày</button><button>Buổi phát sinh</button></nav><div class="bes-supplemental-admin-search"><label>Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái<input type="search" value=""></label></div><main><section class="bes-supplemental-section"><article class="bes-supplemental-group"><header><div><strong>Bổ sung Toán 12</strong><small>Toán · P.12 · 16:45–18:00</small></div><span>Đang hoạt động</span></header><div class="bes-supplemental-group-actions"><button>Dừng nhóm</button></div><details class="bes-supplemental-edit" open><summary>Sửa nhóm</summary><form class="bes-supplemental-edit-form"><div class="bes-supplemental-form-grid"><label>Tên nhóm<input value="Bổ sung Toán 12"></label><label>Phòng<input value="P.12"></label></div><div class="bes-supplemental-edit-actions"><button class="is-primary">Lưu thay đổi nhóm</button></div></form></details></article><form class="bes-supplemental-card"><h4>Tạo buổi phát sinh</h4><label class="bes-supplemental-note-field">Ghi chú buổi học<textarea></textarea></label><div class="bes-supplemental-picker"><label class="bes-supplemental-picker-search">Tìm học sinh<input data-student-search></label><div class="bes-supplemental-checklist"><label class="bes-supplemental-check"><input type="checkbox"><span>Nguyễn Văn A · 12.6</span><small>Học sinh chính thức</small></label></div></div><button class="is-primary">Tạo buổi phát sinh</button></form></section></main></section>`);
    await installCss(page);
    await expect(page.getByRole('heading',{name:'Học bổ sung'})).toBeVisible();
    await expect(page.getByPlaceholder('Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái')).toBeVisible().catch(async()=>{
      await expect(page.getByLabel('Tìm nhóm, học sinh, môn, giáo viên, ngày, trạng thái')).toBeVisible();
    });
    for(const label of ['Dừng nhóm','Lưu thay đổi nhóm','Tạo buổi phát sinh'])await expect(page.getByRole('button',{name:label})).toBeVisible();
    await expect(page.getByText('Ghi chú buổi học')).toBeVisible();
    const dialog=page.locator('.bes-supplemental-dialog');
    const box=await dialog.boundingBox();
    expect(box?.width).toBeGreaterThan(900);
  });

  test('Admin and rollcall overlays sit above the native Attendance modal layer',async({page})=>{
    await page.setViewportSize({width:1280,height:800});
    await page.setContent(`<div class="attendance-layer"><section class="attendance-shell">Native Attendance</section></div><div class="bes-supplemental-backdrop"></div><section class="bes-supplemental-dialog"><button type="button">Thao tác Học bổ sung</button></section><section class="bes-supplemental-rollcall"><button type="button">Chốt điểm danh</button></section>`);
    await installLayeredCss(page);
    const nativeZ=Number(await page.locator('.attendance-layer').evaluate((node)=>getComputedStyle(node).zIndex));
    const backdropZ=Number(await page.locator('.bes-supplemental-backdrop').evaluate((node)=>getComputedStyle(node).zIndex));
    const dialogZ=Number(await page.locator('.bes-supplemental-dialog').evaluate((node)=>getComputedStyle(node).zIndex));
    const rollcallZ=Number(await page.locator('.bes-supplemental-rollcall').evaluate((node)=>getComputedStyle(node).zIndex));
    expect(backdropZ).toBeGreaterThan(nativeZ);
    expect(dialogZ).toBeGreaterThan(backdropZ);
    expect(rollcallZ).toBeGreaterThan(backdropZ);
    await expect(page.getByRole('button',{name:'Thao tác Học bổ sung'})).toBeVisible();
  });

  test('activity filter surface exposes all four approved modes',async({page})=>{
    await page.setContent(`<section class="bes-supplemental-report-filter"><div><span>Loại hoạt động</span><button class="is-active">Tất cả</button><button>Phụ đạo</button><button>Bồi dưỡng</button><button>Học bổ sung</button></div><small>Lịch sử có thể lọc thực sự theo Phụ đạo, Bồi dưỡng hoặc Học bổ sung.</small></section><section class="bes-supplemental-reporting-panel is-exclusive"><header class="bes-supplemental-reporting-head"><div><span class="bes-supplemental-kicker">BÁO CÁO · Bồi dưỡng</span><h2>Báo cáo Bồi dưỡng</h2></div><button>×</button></header><main><section class="bes-supplemental-pdf-report"><header><h1>BÁO CÁO BỒI DƯỠNG HỌC SINH GIỎI</h1></header><div class="bes-supplemental-report-summary"><span>Có mặt <b>10</b></span><span>Đi trễ <b>1</b></span><span>Vắng <b>2</b></span></div></section></main></section>`);
    await installCss(page);
    for(const label of ['Tất cả','Phụ đạo','Bồi dưỡng','Học bổ sung'])await expect(page.getByRole('button',{name:label})).toBeVisible();
    await expect(page.getByRole('heading',{name:'BÁO CÁO BỒI DƯỠNG HỌC SINH GIỎI'})).toBeVisible();
    await expect(page.getByText(/Có mặt/)).toBeVisible();
    await expect(page.getByText(/Đi trễ/)).toBeVisible();
    await expect(page.getByText(/Vắng/)).toBeVisible();
  });

  test('rollcall stays usable on an iPhone-sized viewport',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.setContent(`<div class="bes-supplemental-backdrop"></div><section class="bes-supplemental-rollcall"><header><div><span class="bes-supplemental-source-badge">HỌC BỔ SUNG · Phát sinh</span><h2>Bổ sung kiến thức</h2><p>11/09/2026 · Tiếng Anh · P.12</p></div><button>×</button></header><main><article class="bes-supplemental-participant"><div><strong>Nguyễn Văn A</strong><small>HS001 · 12.6</small></div><div class="bes-supplemental-status-buttons"><button class="is-active">Có mặt</button><button>Đi trễ</button><button>Vắng</button></div><div class="bes-supplemental-absence is-hidden"><select><option>Lý do vắng</option></select><input placeholder="Ghi chú vắng"></div></article></main><footer><label>Ghi chú buổi học<textarea></textarea></label><label>Minh chứng hình ảnh<input type="file"></label><div><button>Thoát</button><button class="is-primary">Chốt điểm danh</button></div></footer></section>`);
    await installCss(page);
    const rollcall=page.locator('.bes-supplemental-rollcall');
    await expect(rollcall).toBeVisible();
    const box=await rollcall.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x||0)+(box?.width||0)).toBeLessThanOrEqual(390);
    for(const label of ['Có mặt','Đi trễ','Vắng','Chốt điểm danh'])await expect(page.getByRole('button',{name:label})).toBeVisible();
  });

  test('supplemental-only report has the approved PDF title and print layout',async({page})=>{
    await page.setViewportSize({width:1280,height:760});
    await page.setContent(`<section id="bes-supplemental-reporting-panel" class="bes-supplemental-reporting-panel is-exclusive"><header class="bes-supplemental-reporting-head"><h2>Báo cáo Học bổ sung</h2></header><div class="bes-supplemental-report-tools"><button>In / Lưu PDF</button></div><main><section class="bes-supplemental-pdf-report"><header><span>SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH</span><strong>TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ</strong><h1>BÁO CÁO HỌC BỔ SUNG KIẾN THỨC</h1><p>Chỉ tính buổi đã chốt</p></header><div class="bes-supplemental-report-table-wrap"><table><tbody><tr><td>Nguyễn Văn A</td><td>12.6</td><td>100%</td></tr></tbody></table></div></section></main></section>`);
    await installCss(page);
    await expect(page.getByRole('heading',{name:'BÁO CÁO HỌC BỔ SUNG KIẾN THỨC'})).toBeVisible();
    await page.emulateMedia({media:'print'});
    await expect(page.locator('.bes-supplemental-reporting-head')).toBeHidden();
    await expect(page.getByRole('heading',{name:'BÁO CÁO HỌC BỔ SUNG KIẾN THỨC'})).toBeVisible();
  });
});
