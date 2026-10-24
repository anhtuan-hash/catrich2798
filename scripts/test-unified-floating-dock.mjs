import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const page = read('src/main.jsx');
const chat = read('src/components/SharedChatbotDrawer.jsx');
const focus = read('src/components/BrianFocus/BrianFocus.jsx');
const approvals = read('src/components/PermissionApprovalInbox.jsx');
const bubble = read('src/components/BrianFocus/FocusBubble.jsx');
const style = read('src/styles/ThreeFloatingActions.css');
function check(name, test) { assert.ok(test,name); console.log('✓ '+name); }
check('One floating launcher per original feature',
  !page.includes('<UnifiedFloatingDock') &&
  page.includes('<SharedChatbotDrawer currentUser={currentUser} language={language} />') &&
  page.includes('<PermissionApprovalInbox currentUser={currentUser} language={language} />') &&
  page.includes('<BrianFocus currentUser={currentUser} language={language} performance={resolvedPerformance} />'));
check('No centralized launcher controls are enabled',
  !page.includes('dockManaged') && !page.includes('unifiedDockTriggerRef'));
check('Brian AI keeps its own visible launcher and message history',
  chat.includes('className="bes-kira-chat-launcher"') &&
  chat.includes('setOpen((value) => !value)') &&
  chat.includes('storageKey'));
check('Approvals keep privileged-only launcher, pending count and review workflow',
  approvals.includes('if (!canReview) return null') &&
  approvals.includes("panel !== 'drawer'") &&
  approvals.includes('bes-approval-count') &&
  approvals.includes("bes_review_permission_request"));
check('Focus keeps its own button and overlay including persistent YouTube controls',
  focus.includes('<FocusBubble buttonRef={triggerRef}') &&
  bubble.includes('id="bfc-focus-trigger"') &&
  focus.includes('persistentYoutubePlayer') &&
  focus.includes('<FocusOverlay'));
check('Visual tokens and aligned positions for all three buttons',
  style.includes('--bes-floating-diameter: 62px') &&
  style.includes('--bes-floating-gap: 14px') &&
  style.includes('.bes-approval-root .bes-approval-fab') &&
  style.includes('.bes-kira-chat-root .bes-kira-chat-launcher') &&
  style.includes('.bfc-bubble') &&
  style.includes('calc(var(--bes-floating-bottom) + 2 *'));
check('Mobile safe area, reduced motion and keyboard accessibility',
  style.includes('@media(max-width:640px)') &&
  style.includes('safe-area-inset-bottom') &&
  style.includes('@media(prefers-reduced-motion:reduce)') &&
  style.includes(':focus-visible'));
console.log('PASS: Three unified-style independent floating buttons, route security and accessibility.');
