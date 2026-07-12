# Cập nhật Brian English Studio V10.82.6

## Nội dung

- Thêm ứng dụng **Tính thuế TNCN 2026** vào trang Ứng dụng.
- Route: `#/tool/vietnam-tax`.
- Tính Gross → Net, BHXH/BHYT/BHTN, giảm trừ gia cảnh và thuế lũy tiến.
- So sánh biểu thuế 7 bậc với biểu thuế 5 bậc từ 01/07/2026.
- Bảng chi tiết, biểu đồ mức giảm thuế, in báo cáo và xuất CSV.
- Không cần SQL Supabase và không cần Environment Variable mới.

## Cập nhật trong VS Code

Giải nén gói update-only vào Downloads, mở repository đang deploy rồi chạy:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.82.6-vietnam-tax-studio-update-only/ ./
npm ci
npm run build
npm test
npm run test:department
git add -A
git commit -m "Integrate Vietnam Tax Studio V10.82.6"
git push origin main
```

Sau khi Vercel báo Ready, mở trang Ứng dụng và chọn **Tính thuế TNCN 2026**.
