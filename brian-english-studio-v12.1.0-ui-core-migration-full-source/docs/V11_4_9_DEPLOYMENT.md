# Deploy V11.4.9

1. Install the update-only package on Brian V11.4.8.
2. Run `npm ci`.
3. Run `npm run verify:v11.4.9`.
4. Commit and push to the production branch.
5. Wait for Vercel status `Ready`.
6. Open `#/tool/grammar-builder` and hard refresh with `Command + Shift + R`.

No Supabase SQL migration is required. Vercel Functions remain at 12/12.
