# Deploy Brian English Studio V11.5.1

## Requirements

- Existing Brian English Studio V11.5.0 repository.
- Node.js 22.x.
- Existing `.env` and personal font remain in the repository and are not replaced by the update package.

## Verify locally

```bash
npm ci
npm run verify:v11.5.1
npm run dev
```

Open:

```text
http://localhost:5173/#/tool/grammar-builder
```

## Deploy

```bash
git add -A
git commit -m "Redesign Grammar Builder Modern SaaS Workbench V11.5.1"
git pull --rebase origin main
git push origin main
```

No Supabase SQL is required for this release.

After Vercel reports **Ready**, open the Grammar Builder route and use `Command + Shift + R` once.
