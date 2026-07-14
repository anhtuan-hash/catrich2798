# V11.4.7 Test Report

## Scope

Grammar Builder V2 production workflow, AI integration, audit, connected transfers, release packaging and compatibility with the existing Brian English Studio shell.

## Automated verification

- V11.4.7 structural checks: 27/27 PASS
- Production Vite build: PASS
- Performance budget: PASS
- Existing smoke tests: 179/179 PASS
- Department runtime: admin PASS
- Department runtime: TTCM PASS
- Department runtime: teacher PASS
- E2E contract checks: 5/5 PASS
- Release guard: PASS
- Vercel function count: 12/12

## Production bundle measurements

- Grammar Builder JS: approximately 73.6 kB minified
- Grammar Builder CSS: approximately 31.0 kB minified
- Lazy-loaded route: PASS
- No additional serverless function: PASS

## Feature checks

- Seven workflow steps: PASS
- Nine functional cards: PASS
- Six build modes: PASS
- Format-specific metadata samples: PASS
- AI Gateway integration: PASS
- Controlled section/batch generation: PASS
- Diagnostic and remediation path: PASS
- Quality Audit: PASS
- Teacher Vault and version restore: PASS
- Item Bank integration: PASS
- DOCX/PDF input parser connection: PASS
- Eight connected-workflow destinations: PASS
- Transfer Inbox listener: PASS
- Student/teacher export paths: PASS

## Security and platform checks

- No API key added to Grammar Builder source: PASS
- Existing Brian AI governance retained: PASS
- No obsolete `/api/lesson-ai` function: PASS
- Public npm registry lockfile: PASS
- Account-scoped local project/vault keys: PASS

## Known validation boundary

Automated browser screenshot comparison was not completed in the build container because the available system Chromium blocks localhost navigation. Production compilation, static contracts and existing system test suites passed. Final visual confirmation should be performed after local preview or Vercel deployment.

## Release-package validation

- Update-only installer on reconstructed clean V11.4.6 baseline: PASS
- Clean `npm ci` after installation: PASS
- Full `npm run verify:v11.4.7` on installed package: PASS
- `npm audit --audit-level=high`: 0 vulnerabilities
- Rollback from V11.4.7 to V11.4.6: PASS
- Reinstallation after rollback: PASS
- Payload checksum verification: PASS
