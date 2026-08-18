# Brian Metro Next — Responsive QA System

Branch: `ui-v2-shadow`

## Goal

Metro Next is being designed for phone, tablet, laptop/desktop and classroom display use rather than as a desktop-only skin. Responsive engineering is isolated in the Shadow UI until manual device regression is complete.

## Shadow-only QA layer

`src/ui/v2/B2ResponsiveQA.css` is imported by `BrianV2Preview.jsx` only. It does not alter production V1.

The current engineering tiers are:

- up to 520 px: compact phone
- up to 720 px: large phone / small tablet
- up to 900 px: tablet
- up to 1180 px: tablet landscape / compact laptop
- 1600 px and above: large desktop
- 2100 px and above: TV / large classroom display

These are layout test bands, not device-detection rules.

## Current responsive protections

- page headers collapse without forcing horizontal scrolling;
- stat grids reduce from four columns to two and then one;
- Data Toolbar search/filter controls wrap and remain usable;
- filter chips become horizontally scrollable when necessary;
- dashboard, homeroom, resource and system workspace side columns collapse safely;
- Command Palette and flyouts stay inside mobile viewport bounds;
- mobile bottom navigation remains usable with constrained labels;
- Tool Shell uses viewport-aware minimum height;
- touch/coarse pointer controls receive at least 44 px interaction targets;
- row-action menus are prevented from exceeding small-screen width;
- large display mode expands workspace and navigation density instead of simply stretching desktop cards.

## Motion and accessibility preference

The Shadow QA layer respects `prefers-reduced-motion: reduce` by removing non-essential animation duration and smooth scrolling.

This engineering rule does not replace the later accessibility pass for focus order, keyboard visibility, semantics and contrast.

## UI Lab diagnostics

UI Lab displays the live viewport size and classifies it as:

- PHONE
- TABLET / PHONE
- TABLET
- DESKTOP
- LARGE DESKTOP
- TV / DISPLAY

This allows screenshots and interaction checks to be tied to an actual viewport rather than a guessed device name.

## Manual QA still required

CSS breakpoint coverage is not equivalent to passed device QA. Before release, Metro Next still requires hands-on regression at minimum on:

1. representative phone width;
2. iPad portrait;
3. iPad landscape;
4. laptop around 1366–1440 px;
5. desktop around 1920 px;
6. 65-inch classroom TV / 4K-class display viewport.

For each tier, the release checklist must verify navigation, overlays, tables/lists, Tool Shell, bridged V1 tools, forms, dialogs/drawers, long Vietnamese labels, keyboard/touch behavior and absence of unintended horizontal scroll.

## Release rule

Responsive engineering may raise implementation progress, but manual responsive QA is not considered complete until the device matrix is actually exercised and regressions are recorded/fixed.
