# V10.82.3 update-only package

Copy this package over the currently deployed Brian English Studio repository without using `--delete`.

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.3-newsroom-full-reader-update-only/ ./
npm ci
npm run build
npm test
npm run test:department
git add -A
git commit -m "Redesign Newsroom and add full article reader V10.82.3"
git push origin main
```

No SQL migration is required.
