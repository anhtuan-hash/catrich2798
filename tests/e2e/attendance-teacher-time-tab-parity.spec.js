import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const attendanceCss = read('src/components/GlobalAttendanceNavigationTab.css');
const teacherTimeCss = read('src/styles/AttendanceCompactTimeSettings.css');

async function buttonState(locator) {
  return locator.evaluate((node) => {
    const style = getComputedStyle(node);
    const underline = getComputedStyle(node, '::after');
    return {
      alignItems: style.alignItems,
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      borderTopWidth: style.borderTopWidth,
      color: style.color,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      gap: style.gap,
      paddingBottom: style.paddingBottom,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      paddingTop: style.paddingTop,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      underlineBackground: underline.backgroundColor,
      underlineHeight: underline.height,
      underlineOpacity: underline.opacity,
      underlineTransform: underline.transform,
    };
  });
}

test.describe('Attendance teacher-time navigation parity', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(`
      <nav class="attendance-tabs" aria-label="Phân hệ điểm danh">
        <button type="button" data-testid="report-tab">
          <svg class="attendance-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 1 0 8.5 12h-2.2A7 7 0 1 1 17 7.1V10h2V3h-2v1.7A8.9 8.9 0 0 0 13 3Z"></path></svg>
          <span>Báo cáo</span>
        </button>
        <button type="button" class="bes-attendance-time-trigger" data-testid="teacher-time-tab" aria-expanded="false">
          <svg class="attendance-icon bes-attendance-time-trigger-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"></path></svg>
          <span class="bes-attendance-time-trigger-label">Giờ GV</span>
          <small class="bes-attendance-time-trigger-window">16:45–17:30</small>
          <i class="bes-attendance-time-trigger-dot" aria-hidden="true"></i>
        </button>
      </nav>
    `);
    await page.addStyleTag({ content: attendanceCss });
    await page.addStyleTag({ content: teacherTimeCss });
  });

  test('Giờ GV inherits the same nav geometry and resting visual contract as Báo cáo', async ({ page }) => {
    const report = page.getByTestId('report-tab');
    const teacherTime = page.getByTestId('teacher-time-tab');

    const reportBox = await report.boundingBox();
    const teacherTimeBox = await teacherTime.boundingBox();
    expect(reportBox).not.toBeNull();
    expect(teacherTimeBox).not.toBeNull();
    expect(Math.abs(reportBox.y - teacherTimeBox.y)).toBeLessThan(1);
    expect(Math.abs(reportBox.height - teacherTimeBox.height)).toBeLessThan(1);

    const reportState = await buttonState(report);
    const teacherTimeState = await buttonState(teacherTime);
    for (const key of [
      'alignItems',
      'backgroundColor',
      'borderRadius',
      'borderTopWidth',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'gap',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
      'paddingTop',
      'transitionDuration',
      'transitionProperty',
    ]) {
      expect(teacherTimeState[key], `${key} must match Báo cáo`).toBe(reportState[key]);
    }
  });

  test('hover and active underline use the same attendance-tab states', async ({ page }) => {
    const report = page.getByTestId('report-tab');
    const teacherTime = page.getByTestId('teacher-time-tab');

    await report.hover();
    await page.waitForTimeout(220);
    const reportHover = await buttonState(report);
    await teacherTime.hover();
    await page.waitForTimeout(220);
    const teacherTimeHover = await buttonState(teacherTime);
    expect(teacherTimeHover.backgroundColor).toBe(reportHover.backgroundColor);
    expect(teacherTimeHover.color).toBe(reportHover.color);

    await page.mouse.move(1200, 700);
    await page.evaluate(() => {
      document.querySelector('[data-testid="report-tab"]')?.classList.add('is-active');
      document.querySelector('[data-testid="teacher-time-tab"]')?.classList.add('is-active');
    });
    await page.waitForTimeout(220);

    const reportActive = await buttonState(report);
    const teacherTimeActive = await buttonState(teacherTime);
    expect(teacherTimeActive.color).toBe(reportActive.color);
    expect(teacherTimeActive.backgroundColor).toBe(reportActive.backgroundColor);
    expect(teacherTimeActive.underlineBackground).toBe(reportActive.underlineBackground);
    expect(teacherTimeActive.underlineHeight).toBe('3px');
    expect(teacherTimeActive.underlineHeight).toBe(reportActive.underlineHeight);
    expect(teacherTimeActive.underlineOpacity).toBe('1');
    expect(teacherTimeActive.underlineOpacity).toBe(reportActive.underlineOpacity);
    expect(teacherTimeActive.underlineTransform).toBe(reportActive.underlineTransform);
  });
});
