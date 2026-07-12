# Cập nhật V10.82.5 vào dự án đang chạy

Dùng gói `brian-english-studio-v10.82.5-smartid-identity-update-only.zip`.

Trong Terminal của VS Code, tại thư mục repository hiện tại:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.5-smartid-identity-update-only/ ./
npm ci
npm run build
npm test
npm run test:department
```

Sau đó:

```bash
git add -A
git commit -m "Integrate SmartID Identity V10.82.5"
git push origin main
```

Sau khi Vercel báo **Ready**, tải lại mạnh bằng `Command + Shift + R` và mở:

```text
Ứng dụng → SmartID Identity
```

Không chạy thêm SQL. SmartID dùng khóa Gemini đã lưu tại **Cài đặt AI**.
