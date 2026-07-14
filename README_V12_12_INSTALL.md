# Brian English Studio V12.12.0 — Universal Search Index

## Nội dung mới

V12.12 mở rộng **Trung tâm lệnh Brian** thành công cụ tìm kiếm nội dung đã lưu, vẫn dùng chung UI Core và ba Design Adapter.

Nguồn được lập chỉ mục:

- Lịch sử nội dung và kết quả AI trong Thư viện.
- Bộ prompt đã lưu.
- Ngân hàng câu hỏi.
- Kho học liệu đã đồng bộ, gồm mô tả, AI summary và extracted text.
- Hoạt động gần đây trong Activity Center.

Cách dùng:

- `Command/Ctrl + Shift + F`: mở thẳng phạm vi **Nội dung**.
- `Command/Ctrl + K`: mở Trung tâm lệnh như cũ.
- Gõ `~ từ khóa`: tìm trực tiếp trong nội dung.
- Chọn kết quả để mở đúng tab Thư viện, đúng tài liệu trong Kho học liệu hoặc đúng tab Activity Center.

Hệ thống chỉ lập chỉ mục dữ liệu người dùng có quyền nhìn thấy. Tài liệu đã xóa, tài liệu riêng tư của người khác và mục chưa được duyệt sẽ không xuất hiện với giáo viên thường.

Không cần chạy SQL mới. Font cá nhân không nằm trong gói; khi chép source phải bảo toàn font đang có trong dự án chính.

## 1. Yêu cầu

- macOS Terminal.
- Node.js 22.x.
- Dự án chính: `~/Documents/Brian-English-Studio-MAIN`.
- File ZIP được tải vào `~/Downloads`.

## 2. Giải nén

```bash
rm -rf ~/Downloads/Brian-V12.12-Install
mkdir -p ~/Downloads/Brian-V12.12-Install

unzip -q \
  ~/Downloads/brian-english-studio-v12.12.0-universal-search-index-full-source.zip \
  -d ~/Downloads/Brian-V12.12-Install
```

## 3. Kiểm tra source độc lập

```bash
cd ~/Downloads/Brian-V12.12-Install/brian-english-studio-v12.12.0-universal-search-index-full-source

test -f package.json \
  && echo "✅ Đúng source V12.12.0" \
  || echo "❌ Sai thư mục"

node -v
npm ci
npm run verify:v12.12.0
npm run audit:budget
```

Node phải là `v22.x`.

## 4. Chạy thử

```bash
npm run dev
```

Mở URL Terminal cung cấp. Kiểm tra:

1. Nhấn `Command + Shift + F`.
2. Phạm vi **Nội dung** phải được chọn.
3. Tìm một từ có trong prompt, câu hỏi hoặc tài liệu đã lưu.
4. Chọn kết quả và xác nhận app mở đúng mục.
5. Kiểm tra Brian Unified, Android Material 3 và Apple.
6. Kiểm tra ở màn hình hẹp và chế độ A+.

Dừng máy chủ bằng `Control + C`.

## 5. Sao lưu dự án chính

```bash
cd ~/Documents/Brian-English-Studio-MAIN

git add -A
git commit -m "Backup before V12.12.0" || true
```

## 6. Chép source mới

Lệnh sau bảo toàn `.git`, `.env`, font cá nhân, `node_modules` và `dist` hiện tại:

```bash
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
  ~/Downloads/Brian-V12.12-Install/brian-english-studio-v12.12.0-universal-search-index-full-source/ \
  ~/Documents/Brian-English-Studio-MAIN/
```

## 7. Kiểm tra dự án chính

```bash
cd ~/Documents/Brian-English-Studio-MAIN

rm -rf node_modules
npm ci
npm run verify:v12.12.0
npm run audit:budget
```

## 8. Deploy

```bash
git add -A
git commit -m "Add Universal Search Index V12.12.0"
git pull --rebase origin main
git push origin main
```

Sau khi Vercel báo **Ready**, đóng tab cũ, mở lại website và nhấn `Command + Shift + R`.

## 9. Không thay đổi

- Không đổi Supabase schema.
- Không đổi API provider hoặc API key.
- Không đổi quyền Admin/TTCM/Giáo viên.
- Không đổi dữ liệu Thư viện hoặc Kho học liệu.
- Không thêm AI request chỉ để tìm kiếm.
- Không đóng gói font cá nhân.
