# V11.4.9 Test Report

## Release checks

- V11.4.9 structural checks: 28/28 PASS
- Production Vite build: PASS
- Grammar Builder JS chunk: 75.8 KB
- Grammar Builder CSS chunk: 58.9 KB
- Performance budget: PASS
- Existing smoke tests: 179/179 PASS
- Department runtime: admin PASS, TTCM PASS, teacher PASS
- E2E contracts: 5/5 PASS
- Release guard: PASS
- Vercel deployable functions: 12/12

## UI contract checks

- Two cards per desktop row retained.
- Large headings and controls present.
- Six distinct Build Mode color identities present.
- Full-card selected state and check badge present.
- Grammar quick-domain selected state present.
- Completed form controls are visibly highlighted.
- Exercise-format selected state present.
- Quality-rule selected state present.
- AI-task selected state present.
- Workflow active state present.
- Editor item cards and metadata enlarged.
- Audit and Publish cards enlarged.
- Modal and drawer typography enlarged.
- Mobile and tablet fallbacks retained.

## Notes

No SQL migration is required. The release only changes Grammar Builder UI and version metadata.
