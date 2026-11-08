// BMPE Wave 2: protect the native Smart Bubble Dock and its performance fixes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/SmartBubbleDock.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/SmartBubbleDock.css', import.meta.url), 'utf8');
test('the original seven feature launchers remain managed visually only', () => {
  for (const selector of [
    '.bit-launcher', '.bff-bubble', '.bba-bubble', '.bbd-board-fab',
    '.bfc-bubble', '.bes-approval-fab', '.bes-kira-chat-launcher',
  ]) assert.ok(source.includes(selector), selector);
  assert.doesNotMatch(source, /\.click\(\)/);
  assert.match(source, /createPortal\(/);
  assert.match(source, /--bes-smart-count/);
});
test('DOM observer only schedules expensive slot layout for launcher mutations', () => {
  assert.match(source, /function affectsDockMount\(/);
  assert.match(source, /record\.addedNodes/);
  assert.match(source, /record\.removedNodes/);
  assert.match(source, /some\(affectsDockMount\)/);
  assert.doesNotMatch(source, /new MutationObserver\(schedule\)/);
  assert.match(source, /if \(frame !== null\) return/);
  assert.match(source, /observer\.disconnect\(\)/);
});
test('repeated scroll cannot restart a dock exit that is already running', () => {
  assert.match(source, /const expandedRef = useRef\(expanded\)/);
  assert.match(source, /if \(pinnedRef\.current \|\| !expandedRef\.current\) return/);
  assert.match(source, /expandedRef\.current = false/);
  assert.match(source, /expandedRef\.current = true/);
  assert.match(source, /clearTimeout\(exitTimer\.current\)/);
  assert.match(css, /data-bes-smart-bubble-dock="closing"/);
});
test('background tabs stop badge polling, and subscriptions are cleaned up', () => {
  assert.match(source, /if \(timer !== null \|\| document\.hidden\) return/);
  assert.match(source, /document\.addEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(source, /document\.removeEventListener\('visibilitychange', onVisibilityChange\)/);
  assert.match(source, /window\.clearInterval\(timer\)/);
  assert.match(source, /bes-global-notification/);
  assert.match(source, /bes:notification/);
  assert.match(css, /prefers-reduced-motion/);
});
