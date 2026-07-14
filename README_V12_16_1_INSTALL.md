# Brian English Studio V12.16.1 — Installation

## Thay đổi chính

- Xóa khối Launcher ứng dụng (launcher tròn / hộp nước) khỏi trang Ứng dụng.
- Xóa mục Mở gần đây.
- Thanh tìm kiếm nằm ngay sau hero, giúp trang gọn và tập trung hơn.
- Đổi nhãn quản trị từ “Tùy biến launcher” thành “Tùy biến ứng dụng”.
- Giữ nguyên bộ lọc nhóm, mật độ hiển thị, lưới ứng dụng, ghim/ẩn/sắp xếp và thanh điều hướng.

## Cài mới

```bash
unzip -q ~/Downloads/brian-english-studio-v12.16.1-streamlined-app-directory-full-source.zip -d ~/Downloads/Brian-V12.16.1
cd ~/Downloads/Brian-V12.16.1/brian-english-studio-v12.16.1-streamlined-app-directory-full-source
npm ci
npm run verify:v12.16.1
npm run dev
```

## Cập nhật dự án hiện tại

Sao lưu dự án trước, sau đó đồng bộ mã nguồn mới và giữ lại các tệp môi trường riêng của bạn.

```bash
rsync -av --exclude='.env' --exclude='.env.local' --exclude='.git' \
  ~/Downloads/Brian-V12.16.1/brian-english-studio-v12.16.1-streamlined-app-directory-full-source/ \
  /duong-dan-den-du-an-brian/

cd /duong-dan-den-du-an-brian
npm ci
npm run verify:v12.16.1
```
