# Cập nhật V10.86.0

```bash
rsync -av ~/Downloads/brian-english-studio-v10.86.0-ai-action-governance-update-only/ ./
npm ci
npm run build
npm test
npm run test:department

git add -A
git commit -m "Add AI Action and Governance V10.86.0"
git push origin main
```

Không cần chạy SQL Supabase.
