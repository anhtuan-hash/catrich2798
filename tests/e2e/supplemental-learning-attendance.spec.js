import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const css=fs.readFileSync(path.join(root,'src/styles/SupplementalLearning.css'),'utf8');

async function installCss(page){await page.addStyleTag({content:css});}

test.describe('Supplemental learning attendance UI',()=>{
  test('daily cards are visually distinct from legacy Attendance rows',async({page})=>{
    await page.setViewportSize({width:1280,height:760});
    await page.setContent(`<main data-attendance-daily-status-root><div class="attendance-daily-class-row">Phụ đạo Toán 10</div><section class="bes-supplemental-daily-section"><header><div><span>HỌC BỔ SUNG</span><strong>1 buổi</strong></div><small>Nhóm dài ngày và buổi phát sinh</small></header><div class="bes-supplemental-daily-grid"><button type="button" class="bes-supplemental-daily-card" data-bes-attendance-source="supplemental" data-bes-supplemental-session-id="sample"><span class="bes-supplemental-source-badge">HỌC BỔ SUNG</span><strong>Ôn Toán 12</strong><small>Toán · 16:45–18:00 · A1</small><small>Giáo viên A · 12 học sinh</small><span class="bes-supplemental-kind">Nhóm dài ngày · Chưa điểm danh</span></button></div></section></main>`);
    await installCss(page);
    const card=page.locator('[data-bes-supplemental-session-id="sample"]');
    await expect(card).toBeVisible();
    await expect(card.getByText('HỌC BỔ SUNG')).toBeVisible();
    await expect(card.getByText(/Nhóm dài ngày/)).toBeVisible();
    const cardBox=await card.boundingBox();
    expect(cardBox?.width).toBeGreaterThan(300);
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
