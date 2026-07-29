import fs from 'node:fs';

const music = fs.readFileSync('src/utils/sharedMusic.js', 'utf8');
const player = fs.readFileSync('src/components/GlobalMusicPlayer.jsx', 'utf8');

const checks = [
  ['private signed URL TTL stays 12 hours', music.includes('const SIGNED_URL_TTL_SECONDS = 60 * 60 * 12;')],
  ['cached signed URLs are reused', music.includes('reusableTrackUrl(cachedSnapshot, path)')],
  ['duplicate signing requests are coalesced', music.includes('const signedUrlRequests = new Map();') && music.includes('if (pending) return pending;')],
  ['polling is reduced to six hours', player.includes('6 * 60 * 60 * 1000') && !player.includes('25 * 60 * 1000')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${label}`);
if (failed.length) process.exit(1);
