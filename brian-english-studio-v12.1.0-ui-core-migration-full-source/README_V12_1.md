# Brian English Studio V12.1.0 — UI Core Migration

This full-source release applies the V12.0 foundation and begins native UI Core migration.

## What changed
- Historical visual styles are now quarantined behind `src/styles/legacy/index.css`.
- `src/main.jsx` no longer imports individual V10/V11 style layers directly.
- UI Core now includes native Input, Textarea, Select, Metric, Tabs, Dialog and Stack primitives.
- The shared textarea primitive enforces full-width horizontal composition.
- Brian Unified, Material 3 and Apple adapters remain based on the same semantic token layer.
- Existing application logic is preserved through the compatibility bridge.

## Important status
This is the architecture/quarantine milestone, not a false claim that every page has already been manually rewritten. Existing pages remain operational while page groups are migrated incrementally to native UI Core components.

## Install
```bash
npm ci
npm run verify:v12.1.0
npm run build
npm test
npm run test:department
```
