# V10 Flat Metro Teaching OS

## What changed

- Redesigned the visual system around a single flat design language.
- Introduced a unified command bar, compact footer and high-contrast page rhythm.
- Redesigned Home as a teacher command center instead of a long marketing page.
- Redesigned Apps Hub as a Start Screen with grouped workflows: Plan, Create, Assess, Manage.
- Standardized tile sizes, tile hierarchy, typography scale and flat color tokens.
- Added tile launch motion: opening an app now feels like a tile expanding into the workspace.
- Normalized route hero sections and two-column workspace layouts.
- Kept BrianGesco as the system font and preserved Times New Roman in TextCare administrative previews.
- Kept the app flat: no legacy decorative layers, no heavy visual effects.

## Validation

- `npm test`: 22/22 checks passed.
- `npm run audit:performance`: heavy effect declarations = 0.
- `npm run build` was not run successfully in this local container because the unpacked project does not include `node_modules` and `vite` is not installed in the runtime. Vercel/source build should install dependencies from `package-lock.json`.
