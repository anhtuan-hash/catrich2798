# Brian English Studio V12.9.0 — Installation

## 1. Extract the full source

```bash
rm -rf ~/Downloads/Brian-V12.9-Install
mkdir -p ~/Downloads/Brian-V12.9-Install

unzip -q \
  ~/Downloads/brian-english-studio-v12.9.0-workspace-os-core-full-source.zip \
  -d ~/Downloads/Brian-V12.9-Install
```

## 2. Enter the source directory

```bash
cd ~/Downloads/Brian-V12.9-Install/brian-english-studio-v12.9.0-workspace-os-core-full-source

test -f package.json \
  && echo "✅ Đúng source V12.9.0" \
  || echo "❌ Sai thư mục"
```

## 3. Verify the standalone source

```bash
node -v
npm ci
npm run verify:v12.9.0
npm run audit:budget
npm run dev
```

Node must be 22.x. Stop the development server with `Control + C` after checking the site.

## 4. Back up the production project

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V12.9.0" || true
```

## 5. Copy V12.9.0 while preserving Git, environment files and personal fonts

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
  ~/Downloads/Brian-V12.9-Install/brian-english-studio-v12.9.0-workspace-os-core-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

## 6. Verify and deploy

```bash
cd ~/Documents/Brian-English-Studio-MAIN

rm -rf node_modules
npm ci
npm run verify:v12.9.0
npm run audit:budget

git add -A
git commit -m "Add Workspace OS Core V12.9.0"
git pull --rebase origin main
git push origin main
```

After Vercel reports `Ready`, close old Brian tabs, reopen the site and press `Command + Shift + R`.

## What to check visually

- The Workspace button is visible at the left of open workspace tabs.
- Workspace Hub shows eight areas.
- “Continue” opens the last useful page for that area.
- Teaching and Content can open the Apps page with the correct workspace filter.
- Command Palette finds workspace names in Vietnamese and English.
- Brian Unified, Android Material 3 and Apple adapters all style the Workspace Hub correctly.
