function safeMode(value) {
  const mode = String(value || 'shadow').trim().toLowerCase();
  return ['off', 'shadow', 'opt-in', 'on'].includes(mode) ? mode : 'shadow';
}

function clean(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

export default function handler(_req, res) {
  const sha = clean(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA, 64);
  const ref = clean(process.env.VERCEL_GIT_COMMIT_REF || process.env.GITHUB_REF_NAME, 160);
  const environment = clean(process.env.VERCEL_ENV || (process.env.CI ? 'ci' : 'local'), 32);
  const host = clean(process.env.VERCEL_URL, 240);
  const mode = safeMode(process.env.BRIAN_UI_V2_MODE || process.env.VITE_BRIAN_UI_V2_MODE || 'shadow');

  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({
    provider: process.env.VERCEL ? 'vercel' : process.env.CI ? 'ci' : 'local',
    sha,
    shortSha: sha ? sha.slice(0, 10) : '',
    ref,
    environment,
    url: host ? `https://${host}` : '',
    releasePolicy: {
      mode,
      releaseApproved: String(process.env.BRIAN_UI_V2_RELEASE_APPROVED || '').toLowerCase() === 'true',
      approvedCandidate: clean(process.env.BRIAN_UI_V2_APPROVED_CANDIDATE, 120),
      approvedBuildSha: clean(process.env.BRIAN_UI_V2_APPROVED_BUILD_SHA, 64),
    },
  });
}
