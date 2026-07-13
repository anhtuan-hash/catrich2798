# Update to Brian English Studio V11.2.0

This update requires V11.1.x as the source baseline.

## Install

```bash
cd ~/Documents/Brian-English-Studio-MAIN
git add -A
git commit -m "Backup V11.1 before V11.2" || true

INSTALLER=$(find ~/Downloads -type f -name "install-v11.2.0.mjs" | head -n 1)
node "$INSTALLER" "$PWD"

rm -rf node_modules dist
npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run verify:v11.2
```

## Supabase

Run in this order:

1. `supabase/brian_v11_2_preflight.sql`
2. `supabase/brian_v11_2_final_content_ecosystem.sql`
3. `supabase/brian_v11_2_verify.sql`

## Deploy

```bash
git add -A
git commit -m "Upgrade Brian English Studio to V11.2.0 final"
git pull --rebase origin main
git push origin main
```

## Rollback

```bash
ROLLBACK=$(find ~/Downloads -type f -name "rollback-v11.2.0.mjs" | head -n 1)
node "$ROLLBACK" "$PWD"
```
