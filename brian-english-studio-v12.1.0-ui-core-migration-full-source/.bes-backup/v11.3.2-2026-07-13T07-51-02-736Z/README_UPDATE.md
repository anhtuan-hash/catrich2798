# Brian English Studio V11.3.1 — English Global Success Lesson Architect

This focused update corrects Lesson Architect for Grade 11 English — Global Success.

## Required base
The installer accepts V11.2.x or V11.3.0.

## Main changes
- English-only exported lesson plans.
- Grade 11 Global Success preset.
- Unit/Lesson/Review/Test curriculum extraction.
- Digital competence integration under Circular No. 02/2025/TT-BGDĐT.
- Six domains and 24 component competences available in English.
- Each lesson selects 1–3 relevant components and shows observable evidence.
- One automatic correction pass when Vietnamese headings, missing headings or missing digital competence codes are detected.
- English Word cover, annual teaching sequence, worksheets and answer keys.
- No new Supabase migration.

## Install
```bash
cd ~/Documents/Brian-English-Studio-MAIN

git status
git add -A
git commit -m "Backup before V11.3.1" || true

rm -rf /tmp/brian-v1131
mkdir -p /tmp/brian-v1131
unzip -q ~/Downloads/brian-english-studio-v11.3.1-english-global-success-update-only.zip -d /tmp/brian-v1131
INSTALLER=$(find /tmp/brian-v1131 -type f -name "install-v11.3.1.mjs" | head -n 1)
node "$INSTALLER" "$PWD"

npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run verify:v11.3.1
```

## Deploy
```bash
git add -A
git commit -m "Upgrade Lesson Architect to V11.3.1"
git pull --rebase origin main
git push origin main
```

## No SQL migration
V11.3.1 uses the existing V11.2 database schema.
