# Cài Brian English Studio V12.0.0

## Yêu cầu
- Node.js 22.x
- npm 10.x
- Giữ lại `.env` của dự án đang chạy.
- Giữ lại font cá nhân hiện có trong dự án cũ. Gói chia sẻ không chứa file font.

## Kiểm tra source độc lập
```bash
npm ci
npm run verify:v12.0.0
npm run dev
```

## Thay source vào dự án hiện tại trên macOS
```bash
cd ~/Documents/Brian-English-Studio-MAIN
git add -A
git commit -m "Backup before V12.0.0" || true

rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='public/fonts/*.ttf' \
  --exclude='public/fonts/*.woff*' \
  --exclude='public/bes-fonts/*.ttf' \
  --exclude='public/bes-fonts/*.woff*' \
  /DUONG_DAN_TOI_SOURCE_V12/ \
  ~/Documents/Brian-English-Studio-MAIN/

npm ci
npm run verify:v12.0.0
```

Sau khi kiểm tra thành công:
```bash
git add -A
git commit -m "Brian English Studio V12.0.0 UI Core Foundation"
git push origin main
```
