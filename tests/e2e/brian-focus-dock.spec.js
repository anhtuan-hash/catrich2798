import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const focusCss = readFileSync(new URL('../../src/components/BrianFocus/BrianFocus.css', import.meta.url), 'utf8');
const chatCss = readFileSync(new URL('../../src/styles/SharedChatbotDrawer.css', import.meta.url), 'utf8');

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 740 }]) {
  test(`Focus stays with Chat AI dock after scroll and while open at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.setContent(`
      <style>body{margin:0;min-height:3200px}
        #root{position:relative;transform:translate3d(0,0,0);height:3000px}
        #dashboard-news-card{position:relative;transform:translateZ(0);margin:200px 20px;height:420px;background:#edf2ff}
      </style>
      <main id="root"><div id="dashboard-news-card">Real scrollable Dashboard card</div></main>
      <div class="bes-kira-chat-root">
        <button class="bes-kira-chat-launcher" type="button" aria-label="Chat AI">✦</button>
      </div>
      <button type="button" id="bfc-focus-trigger" data-bfc-focus-trigger="true"
        class="bfc-bubble" aria-label="Mở chế độ tập trung" aria-pressed="false">☾</button>
    `);
    await page.addStyleTag({ content: chatCss });
    await page.addStyleTag({ content: focusCss });

    const positions = () => page.evaluate(() => {
      const xy = node => {
        const { x, y, width, height, right, bottom, top } = document.querySelector(node).getBoundingClientRect();
        return { x, y, width, height, right, bottom, top, centerX:x+width/2 };
      };
      return {
        chat: xy('.bes-kira-chat-launcher'),
        focus: xy('.bfc-bubble'),
        count: document.querySelectorAll('.bfc-bubble').length,
        rootContainsFocus: document.querySelector('#root').contains(document.querySelector('.bfc-bubble')),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth+1,
      };
    });

    const idle = await positions();
    expect(idle.count).toBe(1);
    expect(idle.rootContainsFocus).toBe(false);
    expect(idle.horizontalOverflow).toBe(false);
    expect(Math.abs(idle.chat.centerX - idle.focus.centerX)).toBeLessThanOrEqual(1);
    expect(idle.focus.bottom).toBeLessThan(idle.chat.top - 25);
    expect(idle.focus.right).toBeLessThanOrEqual(viewport.width + 1);

    await page.evaluate(() => scrollTo(0, 1100));
    const scrolled = await positions();
    expect(Math.abs(scrolled.focus.x - idle.focus.x)).toBeLessThan(1);
    expect(Math.abs(scrolled.focus.y - idle.focus.y)).toBeLessThan(1);

    await page.evaluate(() => {
      document.querySelector('.bfc-bubble').classList.add('is-active');
      const overlay = document.createElement('div');
      overlay.className = 'bfc-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-owns', 'bfc-focus-trigger');
      overlay.innerHTML = '<div class="bfc-overlay__center"><div class="bfc-clock-card">06:58</div></div>';
      document.body.append(overlay);
    });
    const active = await positions();
    expect(active.count).toBe(1);
    expect(Math.abs(active.focus.x - idle.focus.x)).toBeLessThan(1);
    expect(Math.abs(active.focus.y - idle.focus.y)).toBeLessThan(1);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#bfc-focus-trigger')).toBeVisible();
  });
}
