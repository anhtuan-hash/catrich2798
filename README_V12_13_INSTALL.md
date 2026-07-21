# Brian English Studio V12.13.0 — Workspace Layout Manager & Split View

## Tính năng

- Bố cục một cửa sổ hoặc chia đôi.
- Chọn ứng dụng thứ hai từ các workspace tab đang mở.
- Đặt cửa sổ phụ bên trái hoặc bên phải.
- Điều chỉnh độ rộng từ 30% đến 70%.
- Focus Mode ẩn shell, utility rail và footer để tập trung.
- Ghi nhớ bố cục riêng theo tài khoản và đồng bộ giữa các tab.
- Route trong cửa sổ phụ chạy ở chế độ nhúng, không dựng thêm shell điều hướng.
- Không cần SQL mới.

## Cài đặt

```bash
rm -rf ~/Downloads/Brian-V12.13-Install
mkdir -p ~/Downloads/Brian-V12.13-Install
unzip -q ~/Downloads/brian-english-studio-v12.13.0-workspace-layout-manager-full-source.zip -d ~/Downloads/Brian-V12.13-Install
cd ~/Downloads/Brian-V12.13-Install/brian-english-studio-v12.13.0-workspace-layout-manager-full-source
node -v
npm ci
npm run verify:v12.13.0
npm run audit:budget
npm run dev
```

Node.js cần là 22.x.

## Chép vào dự án chính

```bash
cd ~/Documents/Brian-English-Studio-MAIN
git add -A
git commit -m "Backup before V12.13.0" || true

rsync -av --delete \
  --exclude='.git/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  --exclude='public/fonts/*.ttf' \
  --exclude='public/fonts/*.otf' \
  --exclude='public/fonts/*.woff' \
  --exclude='public/fonts/*.woff2' \
  --exclude='public/bes-fonts/*.ttf' \
  --exclude='public/bes-fonts/*.otf' \
  --exclude='public/bes-fonts/*.woff' \
  --exclude='public/bes-fonts/*.woff2' \
  ~/Downloads/Brian-V12.13-Install/brian-english-studio-v12.13.0-workspace-layout-manager-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/

cd ~/Documents/Brian-English-Studio-MAIN
rm -rf node_modules
npm ci
npm run verify:v12.13.0
npm run audit:budget

git add -A
git commit -m "Add Workspace Layout Manager V12.13.0"
git pull --rebase origin main
git push origin main
```

Font cá nhân và `.env` không nằm trong ZIP; các lệnh trên giữ lại chúng từ dự án hiện tại.
