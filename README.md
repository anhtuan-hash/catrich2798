# Brian English Studio V12.9.0 — Workspace OS Core

V12.9.0 continues the UI Core migration by grouping the product into eight stable workspaces without changing the existing routes, permissions, data, AI providers or teaching workflows.

## Eight workspaces

1. Teaching
2. Assessment
3. Content & Skills
4. Management
5. Resources
6. AI Studio
7. Games & Classroom
8. System

The shell now includes a native Workspace Hub. It remembers the last useful location in each workspace, supports cross-tab session continuity, appears in the global command palette and can open the app catalog with a workspace filter.

## Development

```bash
npm ci
npm run verify:v12.9.0
npm run dev
```

Node.js 22.x is required.

## Deployment

The project remains compatible with the existing Vercel configuration and Supabase environment. V12.9.0 does not require a new SQL migration or a new environment variable.

## Personal font

Font binaries are not bundled in the release. Preserve the existing files in `public/fonts/` and/or `public/bes-fonts/` when copying this source into the production repository.
