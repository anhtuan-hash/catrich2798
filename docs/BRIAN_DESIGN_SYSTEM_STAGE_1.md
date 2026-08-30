# Brian Design System — Stage 1 Foundation

Status: implementation foundation for the Brian Editorial Material migration.

## Goal

Create one semantic design-token contract that future Brian components can share without forcing an immediate rewrite of the existing application CSS.

Stage 1 is deliberately low-risk: it establishes the contract first, preserves legacy aliases, and leaves route business logic untouched.

## Source of truth

`src/theme/brianDesignTokens.css`

New UI code should consume semantic `--brian-*` tokens from that file instead of introducing new literal colors, radii, spacing values, shadows, or transition timings.

## Token groups

- Typography: family roles, weights, size scale, line-height and tracking.
- Surfaces: cool document canvas, white primary surface, subtle/muted/sunken neutrals and overlay.
- Text: primary, secondary, tertiary, inverse and disabled ink.
- Borders: subtle, default and strong dividers.
- Accent: default, hover, pressed and soft interaction surfaces.
- States: success, warning, danger and info.
- Spacing: 4px base rhythm.
- Radius: 6px through 28px plus pill.
- Elevation: restrained xs/sm/md/lg shadows.
- Motion: 80/140/180/240ms feedback scale with reduced-motion fallback.
- Focus: shared focus color/ring/offset.
- Interaction states: hover, pressed, selected and disabled primitives.
- Layout/accessibility: content max width, safe-area insets, mobile gutter and 44px touch target.
- Layers: shared sticky/dropdown/drawer/modal/toast z-index scale for future components.

## Visual direction

Brian Editorial Material follows these rules:

1. Flat, cool-neutral document canvas. No cream or ivory page backgrounds.
2. White primary surfaces with restrained borders and elevation.
3. Editorial hierarchy comes from spacing, scale, weight and composition rather than decorative effects.
4. One interaction accent per shared component family.
5. Motion is feedback, not presentation: no looping decorative motion in shared UI components.
6. Uiverse-inspired patterns must be rewritten to Brian tokens; raw copied CSS should not become a second design system.
7. Accessibility states (focus, disabled, reduced motion and touch targets) are part of the component contract, not optional polish.

## Compatibility strategy

`src/styles/Foundation.css` imports the token source first and maps historical Brian aliases (`--page`, `--surface`, `--ink`, `--line`, `--app-max`, etc.) onto the new semantic tokens where safe.

The historical accent palette remains intact during Stage 1 because large route styles still depend on names such as `--blue`, `--purple`, `--green`, and tile colors. Those aliases will be retired app-by-app during later migration stages.

The historical dark/intensity selectors in `Foundation.css` are compatibility-only. The active Brian theme runtime remains light-only. Dead theme branches can be removed during the later cleanup stage after route migration confirms no dependency remains.

`GlobalFontSystem.css` remains the authority for the user-selected global font. Design tokens reference `--bes-global-font-family` rather than bypassing the font preference system.

`GlobalMotionSystem.css` remains independent in Stage 1. Its existing timings are not globally rewritten yet; new shared components should use the `--brian-motion-*` scale, and the old motion library can be migrated deliberately after component coverage exists.

## Stage 1 migration policy

For any new or touched shared UI code:

- use `var(--brian-surface-primary)` instead of `#fff` for a semantic primary surface;
- use `var(--brian-border-default)` instead of a new arbitrary grey border;
- use `var(--brian-radius-*)` instead of one-off radius values;
- use `var(--brian-space-*)` for reusable layout rhythm;
- use `var(--brian-motion-fast)` / `var(--brian-motion-standard)` for interaction transitions;
- use `var(--brian-focus-ring)` and keyboard-visible focus treatment;
- do not introduce new global background gradients, ambient glows, or infinite animation loops.

Legacy route CSS is not required to be mass-rewritten during Stage 1. It should be migrated when the corresponding component/app reaches Stages 2–5.

## Stage 1 acceptance criteria

- A single token source exists and is loaded before the legacy Foundation rules.
- The outer document canvas resolves to the same cool neutral already enforced by the global no-cream policy.
- Existing legacy CSS variables continue to resolve.
- Global font selection remains functional and authoritative.
- Existing Global Motion behavior is not silently changed by Stage 1.
- Light-only runtime behavior remains unchanged.
- No business logic, data model, permissions, export logic, or route behavior is changed.

## Next stage

Stage 2 will build the first reusable Brian UI primitives on this contract: Button, IconButton, Input, Select, Checkbox, Radio, Toggle, Badge, Tooltip, Tabs, Modal, Toast, Loader/Skeleton and Progress. Component states will use the token layer rather than route-specific visual values.
