BRIAN ENGLISH STUDIO V12.40.5 — RETIRED APPS CLEANUP

This release completely removes these applications from the production website:
- Worksheet Factory
- Exam Studio
- Reading Studio
- SmartID Identity
- Speaking Studio
- Learner Sprint
- Writing Studio
- Pronunciation

The cleanup covers app cards, navigation, launchers, routes, permissions, command center entries, connected-workflow destinations, AI registries, source modules and production CSS/JavaScript bundles.

Learner Sprint reused the /practice route, so that route is retired as well. The Classroom application remains available through its own route.

Verification command:
npm ci && npm run verify:v12.40.5

Production deploy command after verification:
npx vercel --prod
