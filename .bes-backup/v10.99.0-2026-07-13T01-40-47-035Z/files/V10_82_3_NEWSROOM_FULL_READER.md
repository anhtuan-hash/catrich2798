# Brian English Studio V10.82.3

## Newsroom direct navigation, editorial redesign and full-article reader

### Main changes

1. **Direct global navigation item**
   - Adds `Đọc báo / News` to the global navigation bar.
   - Uses the top-level route `#/news`.
   - Keeps the old `#/tool/news-reader` route working for existing bookmarks.
   - Access continues to use the existing `tool:news-reader` permission.

2. **New editorial hero**
   - Centered layout with safe side margins.
   - Dynamic lead story from the current feed.
   - Direct Vietnamese and English channel buttons.
   - Full article, listening and saved-story feature badges.
   - Live story and publisher counts.

3. **New feed layout**
   - Main news stream plus a compact right sidebar.
   - Search, category and publisher filtering.
   - Saved-story mode.
   - Featured story, saved reading desk and active-publisher panels.
   - Progressive loading instead of rendering every story at once.
   - Responsive desktop, tablet and mobile layouts.

4. **Full article reader inside the app**
   - Opens in a focused full-screen reader overlay.
   - Fetches the original publisher page through `/api/news-article`.
   - Extracts JSON-LD `articleBody` when available.
   - Falls back to scored HTML article-body extraction.
   - Tries the publisher AMP page when available.
   - Uses a resilient URL-to-reader fallback when the publisher HTML is difficult to parse.
   - Preserves headings, paragraphs, quotes, lists, images and captions.
   - Includes reading progress, font sizing, text-to-speech, saving and original-link controls.

5. **Security**
   - The full-text API only accepts approved publisher domains.
   - HTTP/HTTPS only; unsupported hosts are rejected.
   - No arbitrary URL proxy is exposed.
   - Reader content is returned as structured blocks rather than unsanitized remote HTML.

### Supported publishers

- Giáo dục & Thời đại
- Tuổi Trẻ
- BBC News
- The Guardian
- VOA / VOA Learning English

### Deployment

No Supabase migration and no new environment variable are required.

```bash
npm ci
npm run build
npm test
npm run test:department
```

Verified results:

- Production build passed.
- 114 smoke checks passed.
- Department runtime passed for Admin, TTCM and Teacher.

### Practical limitation

The app makes several extraction attempts and normally displays the full article for the configured public news sources. A publisher can still temporarily block automated fetching, change its page structure or place an article behind a paywall. In that case, the reader displays the feed-provided content and keeps the original-article button available instead of showing a blank page.
