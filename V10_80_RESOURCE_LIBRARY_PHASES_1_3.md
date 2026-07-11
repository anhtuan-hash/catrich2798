# Brian English Studio V10.80 — Resource Library Phases 1–3

## Included
- Shared English teaching-resource library app in the Apps directory.
- Google Drive OAuth connection owned by TTCM/department leader.
- Automatic Drive folder structure and pending-review upload folders.
- Multi-file upload, SHA-256 duplicate detection and version linkage.
- AI metadata extraction: category, grade, CEFR, skills, tags, summary and classroom uses.
- TTCM approval/revision workflow and Drive file movement.
- Search, filters, preview, favorites, collections-ready schema, comments-ready schema and activity logs.
- AI semantic-style knowledge search across indexed metadata and extracted PDF/DOCX/TXT content.
- “Open with app” routing to Exam Studio, Reading Studio, TextLab, Lesson Architect and Games Hub.
- Supabase schema with RLS and Drive connection protected for server-only access.

## Setup
1. Run `supabase/resource_library_v10_80.sql` in Supabase SQL Editor.
2. Create a Google OAuth Web client.
3. Add the exact callback URL: `https://YOUR_DOMAIN/api/google-drive-callback`.
4. Add all variables listed in `.env.example` to Vercel.
5. Redeploy, log in as TTCM/Admin and open Apps → Kho học liệu Tổ Tiếng Anh → Kết nối Google Drive.

## Security
- Teachers never receive the TTCM refresh token.
- Google secrets and Supabase service role key stay in server environment variables.
- OAuth uses `drive.file`, so the app manages files created through the app rather than the TTCM’s entire Drive.
