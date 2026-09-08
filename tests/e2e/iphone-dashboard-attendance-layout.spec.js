import fs from 'node:fs';
import { test, expect } from '@playwright/test';

const navCss = fs.readFileSync(new URL('../../src/components/GlobalIphoneNavigationReadable.css', import.meta.url), 'utf8');
const dashboardCss = fs.readFileSync(new URL('../../src/styles/dashboard-iphone-readable.css', import.meta.url), 'utf8');
const attendanceCss = fs.readFileSync(new URL('../../src/components/attendance/AttendanceIphoneReadable.css', import.meta.url), 'utf8');
const resetCss = '*{box-sizing:border-box}html,body{margin:0;width:100%;max-width:100%;font-family:system-ui,sans-serif}button,input,select{font:inherit}';

async function expectNoDocumentOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 2);
}

test.describe('iPhone 16 Pro Max-class readability', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 956 });
  });

  test('Dashboard and shared navigation keep readable geometry without page overflow', async ({ page }) => {
    await page.setContent(`
      <div id="root">
        <div class="app-shell" data-route="dashboard">
          <div class="bes-top-chrome">
            <nav class="brian-nav">
              <button class="brian-nav__brand"><img alt="brand" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"><span>Brian</span></button>
              <div class="brian-nav__primary">
                <button>Trang chủ</button><button>Ứng dụng</button><button class="brian-nav__dashboard-tab is-active">Dashboard</button><button class="brian-nav__ttcm-tab">TTCM</button><button class="brian-nav__attendance-tab">Điểm danh</button>
              </div>
              <div class="brian-nav__actions"><button class="brian-nav__icon">✦</button><button class="brian-nav__account"><span>G</span><strong>Giám thị</strong><i>⌄</i></button></div>
            </nav>
          </div>
          <main id="bes-main-content">
            <section class="gd-page"><div class="gd-shell">
              <header class="editorial-hero">
                <div class="editorial-hero-copy">
                  <div class="editorial-hero-meta"><span class="editorial-hero-eyebrow">Tổng quan hôm nay</span><span class="editorial-hero-date">Thứ ba, 08 thg 9</span></div>
                  <span class="editorial-hero-hello">Xin chào,</span><h1>Giám thị</h1>
                  <p class="editorial-hero-lead">Theo dõi lịch làm việc và cập nhật thông tin quan trọng.</p>
                  <div class="editorial-hero-actions"><button class="editorial-primary-action">Lịch hôm nay</button><button class="editorial-secondary-action">Làm mới</button></div>
                  <div class="editorial-hero-links"><button>Xem sự kiện gần nhất</button><button>Mở lịch đầy đủ</button></div>
                </div>
                <div class="editorial-hero-stage"><div class="editorial-hero-visual"><svg class="editorial-hero-art" viewBox="0 0 100 50"></svg></div></div>
              </header>
              <article class="gd-calendar"><header class="gd-calendar-header"><div class="gd-calendar-title"><span></span><div><h2>Lịch hôm nay</h2><p>Công việc và sự kiện trong ngày hôm nay</p></div></div><button class="gd-text-button">Mở lịch</button></header>
                <div class="gd-today-layout"><div class="gd-agenda-list"><button class="gd-event"><span class="gd-event-time"><strong>08:00</strong><small>Đến hạn hôm nay</small></span><span></span><span class="gd-event-copy"><strong>Phổ biến lịch kiểm tra định kỳ giữa học kỳ 1.</strong><p>Ghi chú: Gửi đến các TTCM, GVCN.</p><small>Nguồn: PHT CM</small></span><span></span></button></div></div>
              </article>
            </div></section>
          </main>
        </div>
      </div>`);
    await page.addStyleTag({ content: `${resetCss}\n${navCss}\n${dashboardCss}` });

    const navTab = page.locator('.brian-nav__dashboard-tab');
    await expect(navTab).toHaveCSS('font-size', '13px');
    expect((await navTab.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.editorial-hero h1')).toHaveCSS('font-size', '44px');
    expect((await page.locator('.editorial-hero-stage').boundingBox()).height).toBeLessThanOrEqual(180);
    await expect(page.locator('.gd-event-time strong')).toHaveCSS('font-size', '14px');
    await expect(page.locator('.gd-event-copy strong')).toHaveCSS('font-size', '16px');
    await expectNoDocumentOverflow(page);
  });

  test('Attendance uses iOS-safe inputs, touch targets and contained roster overflow', async ({ page }) => {
    await page.setContent(`
      <div class="attendance-layer">
        <section class="attendance-shell">
          <header class="attendance-topbar"><div class="attendance-title"><span></span><div><small>Điểm danh</small><strong>Điểm danh lớp học</strong></div></div><button class="attendance-icon-button">×</button></header>
          <nav class="attendance-tabs"><button class="is-active">Điểm danh nhanh</button><button>Lịch tháng</button><button>Quản lý lớp</button><button>Lịch sử</button></nav>
          <div class="attendance-content">
            <section class="attendance-class-list"><header><h2>Chọn lớp</h2></header><div class="att-m3-class-discovery"><label class="att-m3-class-search"><span>Tìm lớp nhanh</span><input value=""></label><div class="att-m3-subject-hub"><button>Tất cả</button><button>Tiếng Anh</button><button>Toán</button><button>Vật lý</button></div></div></section>
            <section class="attendance-rollcall"><header class="attendance-rollcall-head"><h2>Lớp 12.6</h2></header>
              <div class="attendance-session-controls"><label><span>Ngày dạy</span><input value="08/09/2026"></label><label><span>Buổi học</span><select><option>Sáng</option></select></label></div>
              <div class="attendance-roster"><div class="att-m3-roster-entry"><label><input type="checkbox"><span><strong>Nguyễn Văn A</strong><small>12.6</small></span><span>Có mặt</span><button>•••</button></label></div></div>
              <div class="attendance-confirm-bar"><input placeholder="Ghi chú"><button>Xác nhận điểm danh</button></div>
            </section>
          </div>
        </section>
      </div>`);
    await page.addStyleTag({ content: `${resetCss}\n${attendanceCss}` });

    await expect(page.locator('.attendance-title strong')).toHaveCSS('font-size', '26px');
    const tab = page.locator('.attendance-tabs button').first();
    await expect(tab).toHaveCSS('font-size', '14px');
    expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
    const dateInput = page.locator('.attendance-session-controls input');
    await expect(dateInput).toHaveCSS('font-size', '16px');
    expect((await dateInput.boundingBox()).height).toBeGreaterThanOrEqual(46);
    expect((await page.locator('.att-m3-roster-entry > label').boundingBox()).height).toBeGreaterThanOrEqual(68);
    await expectNoDocumentOverflow(page);
  });
});