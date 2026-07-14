# Brian English Studio V12.7.0

## Native Design Adapters & Appearance Sync

V12.7 replaces the old injected Appearance Engine with a native React/UI Core preference runtime.

### Main changes

- Brian Unified, Android Material 3 and Apple iOS/iPadOS now use separate native adapter tokens.
- Accent color affects shared UI Core controls instead of only the preview swatch.
- Display density changes control height, card padding, gaps and page gutters.
- Appearance preferences are saved locally and, for Supabase accounts, synchronized through `user_metadata` under `brian_ui_preferences_v12`.
- A timestamp resolves conflicts between a browser's local settings and account settings.
- The old V11.6.2/V11.6.3 Appearance Engine and its MutationObserver were removed.
- Font loading now checks installed/local font names and both supported deployed paths.
- No SQL migration or new environment variable is required.
- The personal font file is not included in this package.

## Install from the full-source ZIP

```bash
rm -rf ~/Downloads/Brian-V12.7-Install
mkdir -p ~/Downloads/Brian-V12.7-Install

unzip -q \
  ~/Downloads/brian-english-studio-v12.7.0-native-design-adapters-full-source.zip \
  -d ~/Downloads/Brian-V12.7-Install

cd ~/Downloads/Brian-V12.7-Install/brian-english-studio-v12.7.0-native-design-adapters-full-source

test -f package.json \
  && echo "✅ Correct V12.7.0 source" \
  || echo "❌ Wrong folder"

node -v
npm ci
npm run verify:v12.7.0
npm run dev
```

Node.js should be `22.x`.

## Replace the current project safely

Back up the current repository:

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V12.7.0" || true
```

Copy the new source while preserving Git, environment files and personal fonts:

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
  ~/Downloads/Brian-V12.7-Install/brian-english-studio-v12.7.0-native-design-adapters-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

Verify the main project:

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.7.0
```

Deploy:

```bash
git add -A
git commit -m "Add native design adapters and account appearance sync V12.7.0"
git pull --rebase origin main
git push origin main
```

After Vercel reports **Ready**, close old Brian tabs, reopen the site and press `Command + Shift + R`.

## Personal font

The source references both paths below:

```text
/public/fonts/personal-font.ttf
/public/bes-fonts/brian-personal-font.ttf
```

Keep at least one existing personal-font file in the main project before deploying. The ZIP intentionally contains no font binary.
