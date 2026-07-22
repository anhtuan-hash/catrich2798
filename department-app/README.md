# Brian Department Workspace

Ứng dụng Tổ chuyên môn độc lập, được thiết kế theo Phương án D và triển khai như một microfrontend riêng.

## Chạy cục bộ

```bash
npm install
npm run dev
```

Mở: `http://localhost:5173/to-chuyen-mon/`

## Build

```bash
npm run build
npm run preview
```

## Vercel

Tạo một Vercel project mới từ cùng GitHub repository và đặt:

- Project name: `brian-department-workspace-anhtuan`
- Root Directory: `department-app`
- Framework: Vite
- Node.js: `22.x`

Ứng dụng được phục vụ tại `/to-chuyen-mon/`. Repo Brian chính sẽ reverse-proxy đường dẫn này đến project độc lập.
