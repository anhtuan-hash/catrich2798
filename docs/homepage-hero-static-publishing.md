# Homepage Hero static publishing

The published homepage Hero is delivered from Vercel static assets:

- `public/hero/hero-current.json`
- `public/hero/media/hero-<timestamp>-<hash>.<extension>`

Supabase remains responsible for authentication and draft storage. Normal visitors do not read the published Hero from Supabase after the first static publication.

## Required Vercel environment variable

Create a GitHub fine-grained personal access token with access to only:

- Repository: `anhtuan-hash/catrich2798`
- Repository permission: **Contents — Read and write**

Add it to the Vercel project as:

```text
GITHUB_HERO_TOKEN=<fine-grained-token>
```

Recommended optional variables:

```text
GITHUB_HERO_REPOSITORY=anhtuan-hash/catrich2798
GITHUB_HERO_BRANCH=main
```

Add the variables to Production and Preview when both environments should support publishing. Redeploy once after changing Vercel environment variables.

## Publishing flow

1. TTCM/Admin edits Hero content.
2. A selected image is optimized in the browser. Draft media is temporarily stored in Supabase Storage.
3. TTCM/Admin clicks **Publish**.
4. `/api/homepage-hero-publish` validates the Supabase access token and manager role.
5. The API downloads draft media once, creates versioned files under `public/hero/media`, and updates `public/hero/hero-current.json` in one Git commit.
6. The GitHub integration triggers one Vercel deployment.
7. The browser keeps the previous Hero visible until the matching static revision is available.
8. Visitors then load the manifest and media from Vercel CDN, not Supabase Storage.

## Limits

- Accepted: JPG, PNG, WebP, GIF, APNG, MP4, WebM.
- Maximum media size for static publishing: 25 MB.
- Static JPG, PNG, and WebP files are optimized to WebP when this meaningfully reduces size.
- Use images below 1 MB whenever possible. Avoid large GIF and video files in Git history.

## Cache policy

- `/hero/media/*`: one year, immutable.
- `/hero/hero-current.json`: browser cache 60 seconds, Vercel CDN cache 5 minutes, stale-while-revalidate one day.

Every media filename includes a timestamp and content hash, so long-lived immutable caching is safe.

## Migration behavior

The initial static manifest has revision `bootstrap`. Until the first successful static publication, the client may read the old published Hero from Supabase once as a compatibility fallback. After a real static revision is deployed, normal visitors stop querying Supabase for published Hero data.

## Security

- The GitHub token is server-only and must never use a `VITE_` prefix.
- Publishing requires a valid Supabase session and TTCM/Admin role.
- Media copy is restricted to the configured Supabase host, the current site host, or hosts explicitly listed in `HERO_MEDIA_ALLOWED_HOSTS`.
- The API sanitizes content, colors, links, layout values, file types, and file size before creating a commit.
