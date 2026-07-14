# Deploy V11.6.0

## Update

```bash
node /path/to/install-v11.6.0.mjs /path/to/Brian-English-Studio-MAIN
cd /path/to/Brian-English-Studio-MAIN
npm ci
npm run verify:v11.6.0
```

## Deploy

```bash
git add -A
git commit -m "Build Worksheet Factory V2 V11.6.0"
git pull --rebase origin main
git push origin main
```

No Supabase SQL is required.

## Route

`#/tool/worksheet-factory`

## Rollback

Run `rollback-v11.6.0.mjs` from the update package against the repository.
