# Brian English Studio V12.4.0

## Requirements

- Node.js 22.x
- Existing `.env` files from the current project
- Existing personal font files from the current project

## Test in a separate folder

```bash
npm ci
npm run verify:v12.4.0
npm run dev
```

## Copy into the current repository

Use `rsync` while excluding `.git`, `.env`, `node_modules`, `dist`, and personal font files. Then run:

```bash
npm ci
npm run verify:v12.4.0
```

## Release scope

V12.4 standardizes Teacher Library, Resource Library, Knowledge Hub, and Resources Hub through the shared UI Core library contract. Data and business logic remain unchanged.
