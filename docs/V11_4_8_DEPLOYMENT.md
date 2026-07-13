# Deploy V11.4.8

1. Install the update-only package into a clean Brian V11.4.7 repository.
2. Run:

```bash
npm ci
npm run verify:v11.4.8
```

3. Test locally:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/#/tool/grammar-builder
```

4. Commit and push:

```bash
git add -A
git commit -m "Upgrade Grammar Builder large-card UI V11.4.8"
git pull --rebase origin main
git push origin main
```

5. After Vercel reports Ready, hard refresh the Grammar Builder route.

No SQL migration is required. The deployment remains within the Vercel Hobby limit of 12 functions.
