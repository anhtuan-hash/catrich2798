# V12.14.0 Test Report — V11 Navigation Restoration

## Scope

- Restores the V11 status bar and flat menu/navigation anatomy.
- Restores the workspace tab strip as an independent row below the menu.
- Keeps V12 UI Core, design adapters, Activity Center, Command Center, workspace memory, search and split view.
- Does not revert application data, routes, permissions, AI, Supabase or workspaces.

## Structural checks

Run:

```bash
npm run verify:v12.14.0
```

The verifier confirms the restored V11 shell and then runs production build, smoke tests and Department role tests.
