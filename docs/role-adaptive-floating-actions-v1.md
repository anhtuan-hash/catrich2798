# ESL Brian — Role-Adaptive Floating Actions v1.0

## Scope and observed bug

The dashboard renders four independent floating launchers on the right: Brian Board, Brian Focus, Permission Approval, and Brian AI. The existing CSS reserves a four-item vertical arrangement even when the Permission Approval launcher is absent for teachers. The resulting unused slot leaves an oversized gap between Focus and AI.

This release **only adjusts presentation and layout**. Do not modify React permissions, action handlers, approval counts, chat session, Board canvas, Focus state, navigation or Supabase.

## Layout contract

| Role / rendered UI | Top → bottom | Slots from bottom |
| --- | --- | --- |
| Approved Admin / TTCM with Approval Inbox mounted | Board, Focus, Approval, AI | 3, 2, 1, 0 |
| Teacher (no Approval Inbox rendered) | Board, Focus, AI | 2, 1, 0 |

The layout follows the **actual mounted approval component** and not a guessed role name or stale account setting. It must remain stable while an Admin opens the Approval drawer (the approval root remains mounted although the approval FAB itself is temporarily hidden).

- Diameter on desktop: **62px**; gap: **14px**; vertical center-to-center distance: **76px**.
- Diameter at viewport width ≤640px: **58px**; gap: **12px**; center-to-center distance: **70px**.
- Edge/right/bottom anchors: **24px desktop / 13px mobile** minimum, respecting `env(safe-area-inset-right)` and `env(safe-area-inset-bottom)`.
- Same horizontal center for all visible launchers, round shape and consistent translucent Material 3 shadow language; retain a distinct green Board accent.
- Never display a fake Permission Approval control for teachers. Don't hide or alter their actual accessible modules.
- Responsive behavior: Android/WebKit, reduced-motion and keyboard focus indicators preserved.
- When a popup/drawer is opened, its separate layer and event handlers keep working. The launcher counts and role-gates continue to be owned by the existing React components.
- Do not use scroll-triggered positioning or a second fixed dock.

## Implementation

Modify only `src/styles/ThreeFloatingActions.css`: unify Board's visual sizing and right-edge with the existing common variables; supply adaptive bottom slot overrides on `body:not(:has(.bes-approval-root))` for Focus and Board, using `:has()` (widely supported by current Chrome/Safari). Keep the default four-slot rules for Admin/TTCM intact. Do not use `body:not(:has(.bes-approval-fab))`: that button unmounts when its drawer opens and would cause a layout jump.

## Verification

1. Automated source/layout guard asserts three-slot and four-slot rules and unchanged role gates.
2. Isolated real-browser fixture with exactly the existing CSS: admin (4), teacher (3), admin drawer (approval root remains, button absent), both Desktop and Mobile. Assert circle diameters, same horizontal axis and consecutive slot gaps. No external network or real accounts.
3. Existing Vercel build and unrelated Brian Focus/Board tests must remain green before merge.
4. Production deploy must be READY and match merged SHA.

No added services, costs or academic-data changes.
