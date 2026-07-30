# Shared music: Google Drive migration

## Result

- New background-music uploads go directly to the connected Google Drive.
- `shared_music_settings` remains in Supabase and contains only metadata.
- Playback uses a 12-hour server-signed URL and a range-capable Drive gateway.
- Supabase Storage is used only long enough to migrate an existing legacy track.
- When an Admin first opens the music panel, a legacy Storage object is copied to Drive, the metadata row is switched to the Drive file ID, and only then is the old object removed.
- Replaced or deleted Drive tracks are moved to `99_LUU_TRU` instead of being permanently deleted.

## Required production step

After the new code is deployed, run:

```text
supabase/migrations/20260730093000_shared_music_google_drive_v2.sql
```

This removes direct select/upload/update policies from the old `shared-music` bucket. Delete-only access remains temporarily for safe cleanup.

## Limits

- Maximum new track size: 20 MB.
- Accepted formats: MP3, WAV, OGG, M4A, AAC and WebM.
- MP3/M4A at 96–128 kbps is recommended to reduce Drive/Vercel transfer and load time.

## Verification

```bash
node scripts/verify-shared-music-drive.mjs
node --check api/shared-music-access.js
node --check api/shared-music-file.js
node --check api/shared-music-upload.js
node --check api/shared-music-drive-action.js
npm run build
```
