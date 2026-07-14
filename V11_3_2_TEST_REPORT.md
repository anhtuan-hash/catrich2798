# V11.3.2 Test Report

## Completed checks

- Admin Hidden Apps Vault contract: 16/16 passed
- Release guard: passed
- JavaScript syntax: passed
- JSX parsing/transpilation for all changed React modules: passed
- Installer from V11.3.1: passed
- Rollback to V11.3.1: passed
- Public npm registry check: passed
- No personal font files included

## Visibility contract covered

- Admin-only vault route
- Hidden folder on the Apps page
- Apps directory filtering
- Home filtering
- Global navigation filtering
- Command Palette filtering
- Workspace tab filtering
- Content-transfer destination filtering
- Direct-route blocking for non-admin roles
- Supabase RLS markers and Realtime registration

## Production verification required

The packaging environment does not contain the project's installed npm dependencies, so a complete Vite production build was not run here. Run on the deployment repository:

```bash
npm run verify:v11.3.2
```

Then validate with two accounts:

1. Admin hides one application.
2. Teacher reloads and cannot see it in Apps.
3. Teacher cannot find it with Command/Ctrl + K.
4. Teacher cannot see it in navigation, Home, workspace tabs or transfer destinations.
5. Teacher opens its former URL and receives the temporary-hidden screen.
6. Admin restores it and the teacher session receives the Realtime update.
