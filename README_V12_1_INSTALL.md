# Install V12.1.0

This is a complete source package. It contains `package.json`, `package-lock.json`, `src`, `public`, `api`, scripts, and Vercel configuration.

## Verify independently

```bash
npm ci
npm run verify:v12.1.0
npm run dev
```

Node.js 22.x is required.

## Copy into the current repository while preserving secrets and the personal font

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
  SOURCE_FOLDER/ \
  ~/Documents/Brian-English-Studio-MAIN/
```
