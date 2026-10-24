# BRIAN Unified Floating Dock v1.0 — approved implementation

## Goal
Replace three always-visible floating launchers with one compact Material 3 control. Keep
their existing functionality, authorization, data and state; alter UI entry points only.

## Behaviour
- Default state: one purple-blue 64px (desktop) or 58px (phone) primary floating button
  at the bottom-right safe area; display a small unread badge for pending approvals.
- Press: expand up into up to three accessible 52/48px action buttons in this order:
  Brian Focus, Access Approvals (approved leaders/Admin only), Brian AI.
- Press main button again, Escape, or touch/click outside: collapse menu.
- Selecting an action closes the menu and triggers the existing component. For chat
  keep its message history and composer; approvals keep their real-time updates,
  count and permission checks; Focus keeps clock, YouTube session, notes and timer.
- Each component must be mounted as before, with only its redundant FAB suppressed.
- Restricted routes retain the prior visibility rules for each action.
- Focus popup restores keyboard focus to the single visible primary button.
- Respect prefers-reduced-motion; keyboard focus indicators; 44px mobile targets;
  mobile safe area and VI/EN labels. Do not change Supabase schemas.

## Technical wiring
- src/components/UnifiedFloatingDock.jsx and .css own the unified visual controls.
- src/utils/unifiedFloatingDock.js declares UI-only CustomEvent channels.
- src/main.jsx mounts the dock with route flags and shared Focus return-focus ref.
- Three existing owners subscribe to an action request in dockManaged mode.
- PermissionApprovalInbox publishes pending-count updates; role checks remain local.
- No global service, tokens, stored credentials or provider APIs are exposed.

## Acceptance
1. Only one FAB before activation on Dashboard and supported routes.
2. All three actions work and stay independent; the approvals icon is absent for
   teachers without review authority, but Focus/AI remain.
3. Clicking elsewhere and Esc collapse the menu. Expanded controls are keyboard
   accessible; hidden controls cannot receive Tab focus.
4. Unread badge stays on the parent when closed, and on approvals when opened.
5. Desktop/mobile layouts do not obscure the footer or YouTube background toolbar.
6. Vercel production build and current regression suite pass.
