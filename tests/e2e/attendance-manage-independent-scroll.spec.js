import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const attendanceCss = fs.readFileSync(new URL('../../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
const editorCss = fs.readFileSync(new URL('../../src/components/attendance/AttendanceClassEditor.css', import.meta.url), 'utf8');
const polishCss = fs.readFileSync(new URL('../../public/attendance-ui-polish.css', import.meta.url), 'utf8');
const launchCss = fs.readFileSync(new URL('../../public/attendance-windows8-launch.css', import.meta.url), 'utf8');
const resetCss = '*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:system-ui,sans-serif}button,input,select{font:inherit}';

function classButtons(count = 18) {
  return Array.from({ length: count }, (_, index) => `
    <button type="button" class="${index === 0 ? 'is-selected' : ''}">
      <b>Lớp ${index + 1}</b><small>Phụ đạo · Tiếng Anh</small><span>${index + 5} HS</span>
    </button>`).join('');
}

function studentRows(count = 30) {
  return Array.from({ length: count }, (_, index) => `
    <div>
      <span><b>Học sinh ${String(index + 1).padStart(2, '0')}</b><small>Không có mã HS</small></span>
      <span>12.${(index % 9) + 1}</span><span>Đang học</span><span><button type="button">Sửa học sinh</button></span>
    </div>`).join('');
}

test.describe('Attendance class management source-owned single right scroll', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`
      <section class="attendance-shell" style="position:relative;width:1220px;height:700px;margin:30px auto;">
        <main class="attendance-content">
          <div class="attendance-manage-layout">
            <section class="attendance-import-card"><div><strong>Import lớp phụ đạo / bồi dưỡng</strong></div><button type="button">Chọn file Excel</button></section>
            <div class="attendance-management-grid">
              <aside class="attendance-manage-classes"><header><strong>Danh sách lớp</strong><span>26</span></header>${classButtons()}</aside>
              <section class="attendance-member-manager">
                <header><div><h2>Bồi dưỡng Hóa học 12</h2><p>Bồi dưỡng HSG · Hóa học</p></div><div class="attendance-teacher-field"><label>Giáo viên theo phân công 2026–2027</label><div class="attendance-teacher-summary"><strong>Nguyễn Minh Tiến</strong><button type="button">Thêm giáo viên</button></div></div></header>
                <div class="attendance-member-tools"><input value="" placeholder="Tìm học sinh"><button type="button">Thêm học sinh</button><button type="button">Xóa lớp</button></div>
                <section class="attendance-class-info-card"><header class="attendance-class-info-head"><div><span>THÔNG TIN LỚP HỌC</span><strong>Dữ liệu hiện tại dùng cho các buổi chưa chốt</strong><p>Các thay đổi bên dưới không sửa lại lịch sử.</p></div><button type="button">Sửa thông tin lớp</button></header><div class="attendance-class-info-grid"><article><span>Tên lớp</span><b>Bồi dưỡng Hóa học 12</b></article><article><span>Môn học</span><b>Hóa học</b></article><article><span>Khối</span><b>Khối 12</b></article><article><span>Phòng học</span><b>A305</b></article><article><span>Thời gian học</span><b>16h45 đến 18h15</b></article><article class="is-wide"><span>Ngày học</span><b>Thứ 2, Thứ 6</b></article></div></section>
                <div class="attendance-member-table"><div class="attendance-member-table-head"><span>Học sinh</span><span>Lớp</span><span>Trạng thái</span><span></span></div>${studentRows()}</div>
              </section>
            </div>
          </div>
        </main>
      </section>`);
    await page.addStyleTag({ content: `${resetCss}\n${attendanceCss}\n${editorCss}\n${polishCss}\n${launchCss}` });
  });

  test('the right pane scrolls header, class information and students as one flow', async ({ page }) => {
    const grid = page.locator('.attendance-management-grid');
    const left = page.locator('.attendance-manage-classes');
    const right = page.locator('.attendance-member-manager');
    const rightHeader = page.locator('.attendance-member-manager > header');
    const memberTable = page.locator('.attendance-member-table');

    await expect(grid).toHaveCSS('overflow-y', 'hidden');
    await expect(left).toHaveCSS('overflow-y', 'auto');
    await expect(right).toHaveCSS('overflow-y', 'auto');
    await expect(memberTable).toHaveCSS('overflow-y', 'visible');

    const headerBefore = await rightHeader.boundingBox();
    await right.evaluate((node) => { node.scrollTop = 260; });
    const state = await page.evaluate(() => ({
      right: document.querySelector('.attendance-member-manager').scrollTop,
      table: document.querySelector('.attendance-member-table').scrollTop,
    }));
    const headerAfter = await rightHeader.boundingBox();

    expect(state.right).toBeGreaterThan(0);
    expect(state.table).toBe(0);
    expect(headerBefore).not.toBeNull();
    expect(headerAfter).not.toBeNull();
    expect(headerAfter.y).toBeLessThan(headerBefore.y - 20);
  });

  test('class information remains visually continuous with the right pane', async ({ page }) => {
    const info = page.locator('.attendance-class-info-card');
    await expect(info).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(info).toHaveCSS('border-left-width', '0px');
    await expect(info).toHaveCSS('border-radius', '0px');
    await expect(info).toHaveCSS('box-shadow', 'none');
  });
});
