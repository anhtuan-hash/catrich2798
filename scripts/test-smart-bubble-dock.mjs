import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const root = read('src/main.jsx');
const controller = read('src/components/SmartBubbleDock.jsx');
const styles = read('src/components/SmartBubbleDock.css');
const owners = [
 ['src/components/BrianInstantTools/BrianInstantTools.jsx','bit-launcher'],
 ['src/components/BrianFamilyFeud/BrianFamilyFeud.jsx','bff-bubble'],
 ['src/components/BrianBombArena/BrianBombArena.jsx','bba-bubble'],
 ['src/components/BrianBoard/BrianBoard.jsx','bbd-board-fab'],
 ['src/components/BrianFocus/FocusBubble.jsx','bfc-bubble'],
 ['src/components/PermissionApprovalInbox.jsx','bes-approval-fab'],
 ['src/components/SharedChatbotDrawer.jsx','bes-kira-chat-launcher'],
];
function check(name, fn) { fn(); console.log('✓ ' + name); }
check('Smart controller is mounted globally only for authorized routes', () => {
 assert.match(root, /const SmartBubbleDock = lazy/);
 assert.match(root, /scope="smart-bubble-dock"/);
 assert.match(root, /<SmartBubbleDock currentUser=\{currentUser\} language=\{language\}/);
 assert.match(root, /currentUser && canAccessRoute/);
});
check('Seven original classroom launchers and their own click handlers remain intact', () => {
 for(const [path,selector] of owners) {
  const source = read(path);
  assert.ok(source.includes(selector), 'original owner lost: ' + path);
  assert.ok(controller.includes(selector), 'not managed visually: ' + selector);
  assert.ok(styles.includes(selector), 'missing visibility selector: ' + selector);
 }
 assert.match(root, /<BrianFamilyFeud key=\{currentUser.id\}/);
 assert.match(root, /<BrianBombArena currentUser=\{currentUser\}/);
 assert.match(root, /<PermissionApprovalInbox currentUser=\{currentUser\}/);
 assert.match(root, /<SharedChatbotDrawer currentUser=\{currentUser\}/);
});
check('The dock never swaps native business actions for synthetic generic buttons', () => {
 assert.doesNotMatch(controller, /openUnifiedFloatingAction|document\.querySelector\([^)]*\)\.click\(/);
 assert.match(styles, /visibility: hidden !important/);
 assert.match(styles, /visibility: visible !important/);
 assert.match(styles, /pointer-events: none !important/);
 assert.match(styles, /pointer-events: auto !important/);
});
check('Hover, click, touch, keyboard, pin and idle behavior are included', () => {
 for(const signal of ["pointerover","pointerout","pointerdown","focusin","keydown","scroll",
  "onClick", "onPointerEnter", "onPointerLeave", "Escape", "5000", "650", "setExpanded", "aria-expanded", "aria-pressed"])
  assert.ok(controller.includes(signal), 'missing: ' + signal);
 assert.match(controller, /localStorage\.setItem/);
 assert.match(controller, /userId/);
 assert.match(controller, /clearInterval/);
 assert.match(controller, /removeEventListener/);
 assert.match(controller, /return \(\) => \{ delete document\.documentElement\.dataset\.besSmartBubbleDock;/);
});
check('Unread badges are derived from real owner counters, never an invented number', () => {
 assert.match(controller, /bes-approval-count/);
 assert.match(controller, /brian-nav__utility-badge/);
 assert.match(controller, /Number\.parseInt/);
 assert.doesNotMatch(controller, /setBadge\(3\)/);
});
check('Each mounted launcher receives a contiguous role-aware slot', () => {
 assert.match(controller, /const SLOT_ENTRIES =/);
 assert.match(controller, /syncVisibleSlots/);
 assert.match(controller, /MutationObserver/);
 assert.match(controller, /--bes-smart-slot/);
 assert.match(controller, /--bes-smart-count/);
 assert.match(controller, /if \(!button && !reserved\) return/);
 assert.match(styles, /var\(--bes-smart-slot, 1\)/);
 assert.match(styles, /--bes-smart-step/);
 assert.match(styles, /\.bes-kira-chat-root:not\(\.is-open\)/);
 assert.match(styles, /\.bes-kira-chat-launcher\.bes-smart-managed/);
 assert.match(styles, /position: relative !important/);
 assert.match(styles, /@media \(max-width: 680px\)/);
 assert.match(styles, /@media \(max-height: 540px\)/);
 assert.match(styles, /safe-area-inset-bottom/);
});
check('Sequential motion runs in both directions and leaves no overlap', () => {
 assert.match(controller, /setClosing\(true\)/);
 assert.match(controller, /setClosing\(false\)/);
 assert.match(styles, /data-bes-smart-bubble-dock="closing"/);
 assert.match(styles, /data-bes-smart-bubble-dock="expanded"/);
 assert.match(styles, /46ms/);
 assert.match(styles, /40ms/);
 assert.match(styles, /translate3d\(0, 14px, 0\)/);
 assert.match(styles, /translate3d\(0, 12px, 0\)/);
 assert.match(styles, /opacity: 0 !important/);
 assert.match(styles, /opacity: 1 !important/);
 assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
 assert.match(styles, /html\[data-motion-bubble="none"\]/);
 assert.match(styles, /bes-smart-bubble-dock__hint/);
});
console.log('PASS: Smart Bubble Dock layout/state/owner regression contracts.');
