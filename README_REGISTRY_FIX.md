# V10.99.0 Full Source R2 — Public npm Registry Fix

This package corrects package-lock.json entries that accidentally referenced an internal build registry.
All resolved package URLs now use https://registry.npmjs.org/.

Install:

```bash
rm -rf node_modules dist
npm cache verify
npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run build
npm run verify:v10.99
```
