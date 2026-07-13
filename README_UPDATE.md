# Cập nhật Brian English Studio lên V11.3.6

## Điều kiện

- Dự án hiện tại: V11.3.5.
- Thư mục chính khuyến nghị: `~/Documents/Brian-English-Studio-MAIN`.
- Không cần chạy SQL Supabase.

## Cài đặt

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V11.3.6" || true

rm -rf /tmp/brian-v1136
mkdir -p /tmp/brian-v1136

unzip -q \
  ~/Downloads/brian-english-studio-v11.3.6-launcher-gallery-update-only.zip \
  -d /tmp/brian-v1136

INSTALLER=$(find /tmp/brian-v1136 -name "install-v11.3.6.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

## Kiểm tra

```bash
VERIFY=$(find /tmp/brian-v1136 -name "verify-v11.3.6.mjs" | head -n 1)
node "$VERIFY" "$PWD"

npm run build
```

## Deploy

```bash
git add -A
git commit -m "Add Launcher Gallery V11.3.6"
git pull --rebase origin main
git push origin main
```

Sau khi Vercel báo Ready, nhấn `Command + Shift + R`, mở trang **Ứng dụng**, chọn **Tùy biến launcher**, thử lần lượt **Launcher tròn** và **Hộp nước**, rồi bấm **Lưu thay đổi**.
