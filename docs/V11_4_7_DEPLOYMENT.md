# Deploy V11.4.7

## Baseline

Install this update on Brian English Studio V11.4.6.

## Install

```bash
cd ~/Documents/Brian-English-Studio-MAIN

rm -rf /tmp/brian-v1147
mkdir -p /tmp/brian-v1147
unzip -q ~/Downloads/brian-english-studio-v11.4.7-grammar-production-workflow-update-only.zip -d /tmp/brian-v1147

INSTALLER=$(find /tmp/brian-v1147 -name "install-v11.4.7.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

## Verify

```bash
npm ci
npm run verify:v11.4.7
```

## Deploy

```bash
git add -A
git commit -m "Upgrade Grammar Builder workflow V11.4.7"
git pull --rebase origin main
git push origin main
```

## Open

```text
https://YOUR-DOMAIN/#/tool/grammar-builder
```

## Database

No new Supabase SQL is required for V11.4.7.

## AI

Grammar Builder inherits the provider, model, API key and governance settings already configured in Brian English Studio. Configure them in Settings before using the real AI actions.
