# Brian English Studio V12.2.0

## Native Shell & Settings Migration

This is a full-source release based on V12.1.0.

### Install

```bash
npm ci
npm run verify:v12.2.0
npm run build
npm test
npm run test:department
```

### Main changes

- One UI Core shell owns status, primary navigation, and workspace tabs.
- Settings geometry and surfaces are controlled by semantic tokens.
- Brian Unified, Material 3, and Apple adapters style the same components.
- Existing feature logic and data integrations remain unchanged.
