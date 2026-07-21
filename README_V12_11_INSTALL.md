# Install Brian English Studio V12.11.0

## 1. Requirements

- macOS Terminal
- Node.js 22.x
- Existing project: `~/Documents/Brian-English-Studio-MAIN`
- Existing `.env` and personal font must be preserved

## 2. Extract and test independently

```bash
rm -rf ~/Downloads/Brian-V12.11-Install
mkdir -p ~/Downloads/Brian-V12.11-Install

unzip -q \
  ~/Downloads/brian-english-studio-v12.11.0-universal-command-center-full-source.zip \
  -d ~/Downloads/Brian-V12.11-Install

cd ~/Downloads/Brian-V12.11-Install/brian-english-studio-v12.11.0-universal-command-center-full-source

test -f package.json \
  && echo "✅ Đúng source V12.11.0" \
  || echo "❌ Sai thư mục"

node -v
npm ci
npm run verify:v12.11.0
npm run audit:budget
npm run test:e2e:contracts
npm run dev
```

Node should report `v22.x`. Open the localhost URL printed by Vite. Stop the server with `Control + C`.

## 3. Back up the production repository

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V12.11.0" || true
```

## 4. Copy V12.11 while preserving Git, environment files, and fonts

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
  ~/Downloads/Brian-V12.11-Install/brian-english-studio-v12.11.0-universal-command-center-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

## 5. Verify the production repository

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.11.0
npm run audit:budget
```

## 6. Deploy

```bash
git add -A
git commit -m "Add Universal Command Center V12.11.0"
git pull --rebase origin main
git push origin main
```

After Vercel reports **Ready**, close old Brian tabs, reopen the site, and press `Command + Shift + R`.

## 7. Acceptance checklist

- Command/Ctrl+K opens the new Command Center.
- Command/Ctrl+Shift+K opens the Actions scope.
- `/` opens search when focus is outside an input.
- `>`, `@`, `/`, and `#` change the search scope.
- Hidden or unauthorized applications do not appear.
- Pinning and recent queries remain after reload.
- Activity actions open the correct Activity Center tab.
- Workspace results resume the latest page where available.
- Brian Unified, Android Material 3, and Apple modes render correctly.
- Search remains horizontal and usable at mobile widths.
