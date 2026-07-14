# V10.90.0-HF3 Technical Notes

The bootstrap script is intentionally inserted before the Vite module entry. It
observes the same valid Supabase request headers already used by the main
application, without hard-coding or exposing the key in diagnostics.

The public key and the authenticated user access token serve different roles:

- `apikey`: Supabase publishable/anon key.
- `Authorization: Bearer ...`: current authenticated session access token.

HF3 validates this separation and repairs invalid legacy cache entries.
