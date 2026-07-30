import fs from 'node:fs';

const music = fs.readFileSync('src/utils/sharedMusic.js', 'utf8');
const access = fs.readFileSync('api/shared-music-access.js', 'utf8');
const delivery = fs.readFileSync('api/shared-music-file.js', 'utf8');
const upload = fs.readFileSync('api/shared-music-upload.js', 'utf8');
const action = fs.readFileSync('api/shared-music-drive-action.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260730093000_shared_music_google_drive_v2.sql', 'utf8');

const checks = [
  ['client no longer uploads shared music to Supabase Storage', !music.includes('.storage.from(BUCKET).upload') && !music.includes("storage.from(LEGACY_BUCKET).upload")],
  ['client no longer creates Supabase Storage signed URLs', !music.includes('createSignedUrl(')],
  ['new uploads use Drive endpoint', music.includes("fetch('/api/shared-music-upload'")],
  ['playback uses server-signed gateway', music.includes("'/api/shared-music-access'") && access.includes('signResourcePreviewToken')],
  ['Drive delivery supports byte ranges', delivery.includes('Range: range') && delivery.includes('Accept-Ranges')],
  ['media range requests do not reread Supabase metadata', !delivery.includes('.from(TABLE)')],
  ['legacy track migrates before Supabase object deletion', action.indexOf('.update({ track_path: uploaded.id') < action.indexOf('.remove([legacyPath])')],
  ['upload limit is capped at 20 MB', upload.includes('20 * 1024 * 1024') && music.includes('20 * 1024 * 1024')],
  ['migration removes direct Storage read and upload policies', migration.includes('drop policy if exists "Approved users can listen to shared music"') && migration.includes('drop policy if exists "Admins can upload shared music"')],
  ['realtime applies payload without a table re-read', music.includes("const row = payload?.eventType === 'DELETE' ? null : payload?.new")],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
if (failed.length) process.exit(1);
