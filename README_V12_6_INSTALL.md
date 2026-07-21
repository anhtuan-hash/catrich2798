# Brian English Studio V12.6.0

## Overlay, Dialog & AI Dock Core Migration

This is a complete source package based on V12.5.0. It is not an update-only installer.

### What changed

- Added one native UI Core overlay system with focus trapping, Escape dismissal, focus restoration, backdrop dismissal, and body scroll locking.
- Migrated the global Command Palette to the shared overlay core.
- Migrated the Notification Center to the shared right drawer.
- Migrated Content Transfer to the shared right drawer.
- Migrated Autosave Version History to the shared dialog.
- Added a global toast center using the `brian:ui-toast` event.
- Retired the injected V11.6.7 Shadow DOM AI Dock script.
- Removed `public/bes-ai-dock-v2/` and the corresponding script tag from `index.html`.
- Made the React `UniversalAIAssist` component the only Brian AI Dock implementation.
- Added an isolated AI Dock composer contract that forces a horizontal, full-width textarea.
- Added Brian Unified, Material 3, Apple, dark-mode, mobile, and reduced-motion overlay styles.

### Important font note

The personal font binary is intentionally not included. Keep the existing files in either:

- `public/fonts/`
- `public/bes-fonts/`

The package keeps `public/bes-fonts/brian-font.css` and the stable font URLs.

## Install safely

```bash
rm -rf ~/Downloads/Brian-V12.6-Install
mkdir -p ~/Downloads/Brian-V12.6-Install

unzip -q \
  ~/Downloads/brian-english-studio-v12.6.0-overlay-ai-dock-core-full-source.zip \
  -d ~/Downloads/Brian-V12.6-Install

cd ~/Downloads/Brian-V12.6-Install/brian-english-studio-v12.6.0-overlay-ai-dock-core-full-source

test -f package.json \
  && echo "✅ Correct V12.6.0 source" \
  || echo "❌ Wrong directory"

node -v
npm ci
npm run verify:v12.6.0
npm run dev
```

Node.js must be version 22.x.

## Replace the main project

First back up the current repository:

```bash
cd ~/Documents/Brian-English-Studio-MAIN
git add -A
git commit -m "Backup before V12.6.0" || true
```

Then copy the new source while preserving Git, environment files, and personal font files:

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
  ~/Downloads/Brian-V12.6-Install/brian-english-studio-v12.6.0-overlay-ai-dock-core-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

Verify and deploy:

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.6.0

git add -A
git commit -m "Migrate overlays and AI Dock to UI Core V12.6.0"
git pull --rebase origin main
git push origin main
```

After Vercel reports Ready, close old Brian tabs, reopen the website, and hard refresh with `Command + Shift + R`.

## Manual checks after deployment

1. Press `Command/Ctrl + K`, then close the Command Palette with Escape.
2. Open the Notification Center and confirm it appears as one right-side drawer.
3. Use “Send to” and confirm the drawer opens and closes correctly.
4. Open Autosave Version History and confirm focus stays inside the dialog.
5. Open Brian AI from the utility rail.
6. Confirm the message box is horizontal and fills the available row.
7. Switch between Brian Unified, Android, and Apple design languages.
8. Test desktop and mobile widths.
