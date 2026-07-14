# Brian English Studio V12.16.0 — Installation

## 1. Extract

```bash
rm -rf ~/Downloads/Brian-V12.16-Install
mkdir -p ~/Downloads/Brian-V12.16-Install
unzip -q ~/Downloads/brian-english-studio-v12.16.0-app-directory-hero-full-source.zip -d ~/Downloads/Brian-V12.16-Install
cd ~/Downloads/Brian-V12.16-Install/brian-english-studio-v12.16.0-app-directory-hero-full-source
```

## 2. Verify independently

```bash
node -v
npm ci
npm run verify:v12.16.0
npm run dev
```

Node.js should be 22.x.

## 3. Back up the production project

```bash
cd ~/Documents/Brian-English-Studio-MAIN
git add -A
git commit -m "Backup before V12.16.0" || true
```

## 4. Copy while preserving Git, environment files and personal fonts

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
  ~/Downloads/Brian-V12.16-Install/brian-english-studio-v12.16.0-app-directory-hero-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

## 5. Verify and deploy

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.16.0

git add -A
git commit -m "Add App Directory hero V12.16.0"
git pull --rebase origin main
git push origin main
```

After Vercel reports Ready, close old tabs, reopen the site and press Command + Shift + R.
