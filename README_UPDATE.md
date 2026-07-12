# Update V10.82.1

Chép gói update-only vào repository đang chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.1-wordgraph-dashboard-update-only/ ./
npm ci
npm run build
npm test
git add -A
git commit -m "Redesign WordGraph Studio dashboard V10.82.1"
git push origin main
```

Không chạy thêm SQL Supabase.
