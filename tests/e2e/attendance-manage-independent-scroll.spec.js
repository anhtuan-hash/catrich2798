import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const attendanceCss = fs.readFileSync(new URL('../../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
const managementScrollCss = fs.readFileSync(new URL('../../src/components/attendance/AttendanceManagementIndependentScroll.css', import.meta.url), 'utf8');
const attendanceComponent = fs.readFileSync(new URL('../../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const globalBrandComponent = fs.readFileSync(new URL('../../src/components/GlobalEnglishHubBrand.jsx', import.meta.url), 'utf8');
const resetCss = '*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:system-ui,sans-serif}button,input,select{font:inherit}';

function classButtons(count = 18) {
  return Array.from({ length: count }, (_, index) => `
    <button type="button" class="${index === 0 ? 'is-selected' : ''}">
      <b>Lớp ${index + 1}</b>
      <small>Phụ đạo · Tiếng Anh</small>
      <span>${index + 5} HS</span>
    </button>`).join('');
}

function studentRows(count = 24) {
  return Array.from({ length: count }, (_, index) => `
    <div>
      <span><b>Học sinh ${String(index + 1).padStart(2, '0')}</b><small>Không có mã HS</small></span>
      <span>12.${(index % 9) + 1}</span>
      <span>Đang học</span>
      <span><button type="button">Sửa học sinh</button></span>
    </div>`).join('');
}

function managementGrid(style = '') {
  return `
    <div class="attendance-management-grid" style="${style}">
      <aside class="attendance-manage-classes">
        <header><strong>Danh sách lớp</strong><span>26</span></header>
        ${classButtons()}
      </aside>
      <section class="attendance-member-manager">
        <header>
          <div><h2>Phụ đạo Tiếng Anh 10</h2><p>Phụ đạo · Tiếng Anh</p></div>
          <div class="attendance-teacher-field"><label>Giáo viên theo phân công 2026–2027</label><div>Ngô Thị Mỹ Diệp</div></div>
        </header>
        <div class="attendance-member-tools"><input value=""><button type="button">Thêm học sinh</button></div>
        <section style="padding:16px;border-bottom:1px solid #ddd;min-height:210px;">
          <strong>Thông tin lớp học</strong>
          <p>Dữ liệu hiện tại dùng cho các buổi chưa chốt.</p>
          <p>Phòng học A103 · 16h45 đến 18h15 · Thứ 3, Thứ 5</p>
        </section>
        <div class="attendance-member-table">
          <div class="attendance-member-table-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span><span></span></div>
          ${studentRows()}
        </div>
      </section>
    </div>`;
}

async function addAttendanceStyles(page) {
  await page.addStyleTag({ content: `${resetCss}\n${attendanceCss}\n${managementScrollCss}` });
}

test.describe('Attendance class management independent scrolling', () => {
  test('scroll authority is owned by attendance and loads after its visual CSS', async () => {
    const materialImport = "import './attendance/AttendanceMaterial3.css';";
    const scrollImport = "import './attendance/AttendanceManagementIndependentScroll.css';";

    expect(attendanceComponent).toContain(materialImport);
    expect(attendanceComponent).toContain(scrollImport);
    expect(attendanceComponent.indexOf(scrollImport)).toBeGreaterThan(attendanceComponent.indexOf(materialImport));
    expect(globalBrandComponent).not.toContain(scrollImport);
  });

  test('left class list and right class detail own separate vertical scroll containers when the grid is constrained', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <main style="padding:24px;background:#eef2f6;">
        ${managementGrid('height:430px;width:1120px;')}
      </main>`);
    await addAttendanceStyles(page);

    const grid = page.locator('.attendance-management-grid');
    const left = page.locator('.attendance-manage-classes');
    const leftHeader = page.locator('.attendance-manage-classes > header');
    const right = page.locator('.attendance-member-manager');
    const memberTable = page.locator('.attendance-member-table');

    await expect(grid).toHaveCSS('overflow-y', 'hidden');
    await expect(left).toHaveCSS('overflow-y', 'auto');
    await expect(right).toHaveCSS('overflow-y', 'auto');
    await expect(memberTable).toHaveCSS('overflow-y', 'visible');
    await expect(leftHeader).toHaveCSS('position', 'sticky');

    const before = await page.evaluate(() => ({
      left: document.querySelector('.attendance-manage-classes').scrollTop,
      right: document.querySelector('.attendance-member-manager').scrollTop,
    }));
    expect(before).toEqual({ left: 0, right: 0 });

    await left.evaluate((node) => { node.scrollTop = 180; });
    const afterLeft = await page.evaluate(() => ({
      left: document.querySelector('.attendance-manage-classes').scrollTop,
      right: document.querySelector('.attendance-member-manager').scrollTop,
    }));
    expect(afterLeft.left).toBeGreaterThan(0);
    expect(afterLeft.right).toBe(0);

    await right.evaluate((node) => { node.scrollTop = 220; });
    const afterRight = await page.evaluate(() => ({
      left: document.querySelector('.attendance-manage-classes').scrollTop,
      right: document.querySelector('.attendance-member-manager').scrollTop,
    }));
    expect(afterRight.left).toBe(afterLeft.left);
    expect(afterRight.right).toBeGreaterThan(0);
  });

  test('production manage layout constrains the grid even when the import report is absent', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <main class="attendance-content" style="height:560px;width:1120px;">
        <div class="attendance-manage-layout">
          <section class="attendance-import-card">
            <div><span>↑</span><div><strong>Import lớp phụ đạo / bồi dưỡng</strong><p>Excel: Loại lớp · Tên lớp · Môn · Giáo viên</p></div></div>
            <button type="button">Chọn file Excel</button>
          </section>
          ${managementGrid()}
        </div>
      </main>`);
    await addAttendanceStyles(page);

    const metrics = await page.evaluate(() => {
      const layout = document.querySelector('.attendance-manage-layout');
      const grid = document.querySelector('.attendance-management-grid');
      const left = document.querySelector('.attendance-manage-classes');
      const right = document.querySelector('.attendance-member-manager');
      const layoutRect = layout.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      return {
        layoutBottom: layoutRect.bottom,
        gridBottom: gridRect.bottom,
        gridHeight: gridRect.height,
        leftClientHeight: left.clientHeight,
        leftScrollHeight: left.scrollHeight,
        rightClientHeight: right.clientHeight,
        rightScrollHeight: right.scrollHeight,
      };
    });

    expect(metrics.gridBottom).toBeLessThanOrEqual(metrics.layoutBottom + 1);
    expect(metrics.leftScrollHeight).toBeGreaterThan(metrics.leftClientHeight);
    expect(metrics.rightScrollHeight).toBeGreaterThan(metrics.rightClientHeight);
  });
});
