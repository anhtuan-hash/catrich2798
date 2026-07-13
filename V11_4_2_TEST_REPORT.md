# V11.4.2 Test Report

## Full verification

Lệnh đã chạy trên source đã merge:

```bash
npm run verify:v11.4.2
```

Kết quả:

- Native integration checks: 24/24 PASS.
- Vite production build: PASS.
- Performance budget: PASS.
- Legacy smoke suite: 179/179 PASS.
- Department runtime: admin, TTCM, teacher PASS.
- E2E contract checks: 5/5 PASS.
- Release guard: PASS.
- npm audit trong vòng kiểm tra trước: 0 vulnerabilities reported.

## Production preview

- `/`: HTTP 200, `text/html`.
- `/bes-elis-v1142/elis.es.js`: HTTP 200, `text/javascript`.
- `/bes-elis-v1142/bridge-runtime.js`: HTTP 200, `text/javascript`.
- `/bes-elis-v1142/chunks/mount-CCtnxx76.js`: HTTP 200, `text/javascript`.
- `/manifest.webmanifest`: HTTP 200, `application/manifest+json`.

## Known deployment dependency

- Supabase production migration must be applied before cloud sync is enabled.
- OpenAI/Gemini production calls require server environment variables.
- The personal font file is deliberately not included in the release artifact.

## Release artifact validation

- Full-source ZIP extracted into an empty directory: PASS.
- `npm ci` from the extracted ZIP: PASS.
- `npm run verify:v11.4.2` from the extracted ZIP: PASS.
- Font binaries in release ZIP: none.
- `.env` files in release ZIP: none.
- Native update-only installer against the exact uploaded V11.3.7 source: PASS.
- Installer rollback to V11.3.7: PASS.
- Reinstall after rollback: PASS.
