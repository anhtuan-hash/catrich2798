# Welcome motion debug plan

Goal: make the first-visit welcome motion reproducible without relying on browser seen-state or OS reduced-motion preferences.

1. Add contract checks first for an explicit welcome preview query and explicit full-motion query.
2. Verify RED on Vercel preview.
3. Add a preview mode that bypasses the browser seen key only when `welcome=preview` is present.
4. Add a full-motion diagnostic override only when `motion=full` is present, while keeping normal visits respectful of `prefers-reduced-motion`.
5. Mark the welcome root with a forced-motion class/data attribute so CSS can restore the animations that reduced-motion rules normally disable.
6. Verify all UI contracts and Vite production build on preview.
7. Fast-forward main only after preview is READY, then verify production and provide the exact diagnostic URL for reproduction.
