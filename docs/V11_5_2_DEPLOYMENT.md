# V11.5.2 Deployment

## Install update-only

```bash
cd ~/Documents/Brian-English-Studio-MAIN
node /path/to/install-v11.5.2.mjs "$PWD"
npm ci
npm run verify:v11.5.2
```

## Deploy

```bash
git add -A
git commit -m "Build Writing Studio Process Workbench V11.5.2"
git pull --rebase origin main
git push origin main
```

No SQL migration is required. After Vercel is Ready, open `#/tool/writing-studio` and hard refresh once.
