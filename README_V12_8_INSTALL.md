# Brian English Studio V12.8.0 — Installation

## Scope

V12.8 adds a native route-surface layer for platform and operations pages, centralizes the compatibility CSS into one audited entry point, restores AI Provider Hub styling, and removes ten dead legacy stylesheets.

## Requirements

- Node.js 22.x
- npm 10.x
- Keep the current `.env`, `.git`, and personal font files when replacing the production repository.

## Verify the extracted full source

```bash
npm ci
npm run verify:v12.8.0
```

## Run locally

```bash
npm run dev
```

## Replace the current repository safely

```bash
rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='public/fonts/*.ttf' \
  --exclude='public/fonts/*.otf' \
  --exclude='public/fonts/*.woff' \
  --exclude='public/fonts/*.woff2' \
  --exclude='public/bes-fonts/*.ttf' \
  --exclude='public/bes-fonts/*.otf' \
  --exclude='public/bes-fonts/*.woff' \
  --exclude='public/bes-fonts/*.woff2' \
  SOURCE_DIRECTORY/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

Then run `npm ci`, `npm run verify:v12.8.0`, commit and push.
