# Brian English Studio v11.9.4 — Permission-Driven Access

## Purpose

This maintenance release removes identity-specific privilege exceptions from Attendance and Supplemental Learning authorization.

## Authorization model

Supplemental Learning management is available only to an approved profile that is either:

- an Admin/Administrator; or
- explicitly granted `attendance:manage`.

Attendance-history deletion is available only to an approved profile that is either:

- an Admin/Administrator; or
- explicitly granted `attendance:delete`.

No active authorization function in this release depends on a specific privileged profile UUID or a specific email address.

## Defense in depth

The private Supplemental Learning authorization helpers are internal implementation details and are not directly executable by anonymous or authenticated clients. Public application RPCs continue to call those helpers under their server-side authorization context.

## Regression coverage

The release keeps the existing Supplemental Learning Chromium/WebKit E2E gates and adds a static v11.9.4 contract to ensure:

- frontend and backend permission names remain aligned;
- privileged UUID/email exceptions do not return;
- private authorization helpers do not re-enter the client RPC surface.

## Production validation

Before release, the database authorization matrix was validated with:

- an approved Admin account → allowed;
- an approved non-admin with `attendance:manage` / `attendance:delete` → allowed;
- an approved ordinary teacher without those permissions → denied.
