# Update to Brian English Studio V11.3.2

V11.3.2 adds an Admin-only Hidden Apps Vault and system-wide app visibility enforcement.

## What changes

- Admin sees a new folder on the Apps page: `Thư mục ứng dụng đã ẩn`.
- Admin can hide or restore apps temporarily.
- Hidden apps disappear for department heads, teachers and students from:
  - Apps directory
  - Home featured windows and pinned chips
  - Global navigation and navigation drawer
  - Command Palette / quick search
  - Games and tool lists
- Direct URLs are blocked for non-admin users while an app is hidden.
- Supabase Realtime applies changes to open teacher sessions.
- Personal Launcher hiding remains separate and unchanged.

## Install

The update-only package accepts V11.2.x, V11.3.0 or V11.3.1.

```bash
cd ~/Documents/Brian-English-Studio-MAIN
node /path/to/install-v11.3.2.mjs "$PWD"
npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run verify:v11.3.2
```

## Supabase

Run in order:

1. `supabase/brian_v11_3_2_preflight.sql`
2. `supabase/brian_v11_3_2_app_visibility.sql`
3. `supabase/brian_v11_3_2_verify.sql`

The SQL migration is required for cross-account enforcement. Without it, the interface can only use the current browser's local fallback.

## Use

1. Sign in as Admin.
2. Open Apps.
3. Open `Thư mục ứng dụng đã ẩn`.
4. Switch to `Đang hiển thị`.
5. Choose `Ẩn khỏi giáo viên` on an unused app.
6. Sign in as a teacher and confirm the app is absent from Apps, navigation and quick search.

## Rollback

```bash
node /path/to/rollback-v11.3.2.mjs ~/Documents/Brian-English-Studio-MAIN
```

Source rollback does not delete the Supabase visibility table or settings.
