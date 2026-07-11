# Brian English Studio V10.65

## New features

- Quick Google sign-in on the login and registration pages.
- New Account & Password card in Settings.
- Existing email/password users verify the current password before changing it.
- Google-only users can create a password and then use either Google or email/password sign-in.
- New OAuth accounts still follow the existing administrator approval workflow.

## Google OAuth setup

1. In Google Cloud, create OAuth credentials for a Web application.
2. Add the Supabase callback URL shown in Supabase Dashboard > Authentication > Providers > Google.
3. Paste the Google Client ID and Client Secret into the Google provider settings in Supabase.
4. In Supabase Authentication > URL Configuration, set the production Site URL and add local/production redirect URLs.
5. Redeploy the app. No Google client secret is stored in the frontend.
