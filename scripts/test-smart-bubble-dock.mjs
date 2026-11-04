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
check('Adaptive geometry leaves an anchor slot and handles missing approval launcher', () => {
 for(let slot=1;slot<=7;slot++) assert.ok(styles.includes(' + ' + slot + ' * ('), 'missing offset slot ' + slot);
 assert.match(styles, /body:not\(:has\(\.bes-approval-root\)\)/);
 assert.match(styles, /@media \(max-width: 680px\)/);
 assert.match(styles, /@media \(max-height: 540px\)/);
 assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
 assert.match(styles, /safe-area-inset-bottom/);
});
console.log('PASS: Smart Bubble Dock layout/state/owner regression contracts.');
