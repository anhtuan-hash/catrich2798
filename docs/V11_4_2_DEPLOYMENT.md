# Deploy Brian English Studio V11.4.2

## 1. Preserve private files

Before replacing a repository, back up:

- `.env*`
- `public/fonts/`
- any local uncommitted content

The release ZIP deliberately excludes environment files and font binaries.

## 2. Install dependencies and verify

```bash
npm ci
npm run verify:v11.4.2
```

## 3. Apply Supabase migration

Run in SQL Editor, in order:

```text
supabase/brian_v11_4_2_preflight.sql
supabase/brian_v11_4_2_lesson_integration.sql
supabase/brian_v11_4_2_verify.sql
```

The verify script should return successful checks for the table, RLS and policies.

## 4. Configure Vercel environment

AI uses OpenRouter only. Configure `OPENROUTER_API_KEY` and retain `SUPABASE_SERVICE_ROLE_KEY`. Run `supabase/brian_v11_6_7_openrouter_gateway.sql`. All apps call `/api/ai`; the browser never receives the key.

## 5. Deploy

```bash
git add -A
git commit -m "Integrate AI Lesson Integration Studio V11.4.2"
git push origin main
```

After Vercel reports Ready, hard refresh and open:

```text
/#/tool/english-lesson-integration
```
