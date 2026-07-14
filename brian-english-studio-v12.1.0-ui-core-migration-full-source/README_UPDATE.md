# Cập nhật Brian English Studio lên V11.3.7

## Điều kiện

- Dự án hiện tại: V11.3.6.
- Thư mục chính: `~/Documents/Brian-English-Studio-MAIN`.
- Không cần chạy SQL Supabase.

## Cài đặt

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V11.3.7" || true

rm -rf /tmp/brian-v1137
mkdir -p /tmp/brian-v1137

unzip -q \
  ~/Downloads/brian-english-studio-v11.3.7-animated-home-update-only.zip \
  -d /tmp/brian-v1137

INSTALLER=$(find /tmp/brian-v1137 -name "install-v11.3.7.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

## Kiểm tra

```bash
VERIFY=$(find /tmp/brian-v1137 -name "verify-v11.3.7.mjs" | head -n 1)
node "$VERIFY" "$PWD"

npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run verify:v11.3.7
```

## Deploy

```bash
git add -A
git commit -m "Add animated homepage app constellation V11.3.7"
git pull --rebase origin main
git push origin main
```

Khi Vercel báo **Ready**, nhấn `Command + Shift + R` và mở **Trang chủ**.
