# V11.5.3 Deployment

1. Install the update package on Brian V11.5.2.
2. Run `npm ci`.
3. Run `npm run verify:v11.5.3`.
4. Test microphone permission on HTTPS or localhost.
5. Commit and push to Vercel.

No new Supabase migration is required. Speech Recognition availability depends on the browser. Media recording requires microphone permission and a secure context.
