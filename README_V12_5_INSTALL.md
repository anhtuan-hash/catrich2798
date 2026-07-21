# Brian English Studio V12.5.0

## Release
Unified Launch Experience Migration

## Requirements

- Node.js 22.x
- Existing `.env` files from the production project
- Existing personal font files from the production project

## Test in a separate folder

```bash
npm ci
npm run verify:v12.5.0
npm run dev
```

## Copy into the current repository

Use `rsync` while excluding `.git`, `.env`, `node_modules`, `dist`, and personal font files. Then run:

```bash
npm ci
npm run verify:v12.5.0
```

## Release scope

V12.5 migrates Home, Apps, the launcher, Game Hub, and Special Tools to shared Launch UI Core primitives. The extra navigation bar previously rendered inside Apps has been retired because the global Unified Shell now owns system navigation.

No app data, launcher configuration, permissions, Supabase schema, custom games, iframe behavior, AI provider, or business logic was changed.
