# V10.80.1 — Vercel npm registry fix

- Replaced 9 internal package mirror URLs in `package-lock.json` with `https://registry.npmjs.org/`.
- Vercel install command changed to deterministic `npm ci` using the public npm registry.
- No application features or database schema changed.
