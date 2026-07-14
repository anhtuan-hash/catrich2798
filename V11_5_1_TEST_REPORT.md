# V11.5.1 Test Report

## Result

Release verification passed.

- V11.5.1 structural checks: 26/26 PASS
- Vite production build: PASS
- Performance budget: PASS
- Existing system smoke checks: 179/179 PASS
- Department runtime: admin PASS, TTCM PASS, teacher PASS
- Connected workflow E2E contracts: 5/5 PASS
- Release guard: PASS
- Clean V11.5.0 installer test: PASS
- Rollback to V11.5.0: PASS
- Reinstall after rollback: PASS
- Vercel deployable functions: 12/12
- Grammar Builder production JS: about 75 KB minified
- Grammar Builder production CSS: about 84 KB minified

## UI contracts verified

- Modern SaaS design marker and V2.4 product label.
- Compact product header.
- Five project context metrics.
- Seven-step segmented workflow.
- Two-column setup workbench.
- Blueprint illustration and AI robot illustration.
- Task-specific AI card colours.
- Visible checked state for Build Mode and AI task cards.
- Responsive breakpoints at 1280, 1000 and 720 px.

## Known validation boundary

Automated screenshot capture is blocked by the execution environment's localhost browser policy. Source contracts, compiled chunks, responsive CSS, runtime tests and production build were verified. Visual confirmation should be performed once after deployment with a hard refresh.
