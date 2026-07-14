# V11.3.2 — Admin Hidden Apps Vault

## Purpose

Allow the Admin to temporarily remove applications that are not currently in use without deleting source code, permissions, saved projects or application data.

## Visibility model

Each application has a stable visibility ID:

- `tool:<slug>` for application modules
- `route:<route>` for standalone route shortcuts

The Admin is never restricted by an app-visibility record. By default, a hidden record applies to:

- `department_head`
- `teacher`
- `student`

## Enforcement layers

V11.3.2 checks visibility in five places:

1. Application directory
2. Home screen
3. Global navigation
4. Command Palette
5. Main route gate

The main route gate prevents a teacher from bypassing the hidden state by typing a URL manually.

## Storage

`public.app_visibility_settings` stores the shared visibility state. RLS allows all authenticated accounts to read the list before rendering, while only canonical Admin accounts may insert, update or delete records.

A local browser cache is retained only as a resilience fallback. Supabase remains the source of truth after migration.

## Realtime

The table is added to `supabase_realtime`. Open teacher sessions refresh automatically after Admin hides or restores an app.

## Separation from Launcher preferences

The existing Launcher `Ẩn` control remains a personal preference. It only changes one user's layout. The Hidden Apps Vault is an Admin policy and affects all non-admin roles.

## Protected items

The Admin control room and Hidden Apps Vault cannot be hidden through the vault.
