# Cập nhật Brian English Studio lên V10.94.0

## 1. Sao lưu

```bash
git status
git add -A
git commit -m "Backup V10.93 before V10.94" || true
```

## 2. Cài update-only

```bash
node ~/Downloads/brian-english-studio-v10.94.0-learning-intelligence-update-only/install-v10.94.0.mjs "$PWD"
```

## 3. Chạy Supabase

Theo thứ tự:

1. `supabase/brian_v10_94_preflight.sql`
2. `supabase/brian_v10_94_learning_intelligence.sql`
3. `supabase/brian_v10_94_verify.sql`

## 4. Kiểm tra

```bash
npm ci
npm run verify:v10.94
```

## 5. Deploy

```bash
git add -A
git commit -m "Upgrade Brian English Studio to V10.94.0"
git push origin main
```

## Rollback source

```bash
node ~/Downloads/brian-english-studio-v10.94.0-learning-intelligence-update-only/rollback-v10.94.0.mjs "$PWD"
```
