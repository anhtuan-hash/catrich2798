# Brian English Studio V10.88.0-HF1

## AI Chat Close Cleanup — update-only

Hotfix này sửa lỗi khi thu gọn hoặc tắt Brian AI nhưng trang vẫn còn một vùng mờ theo kích thước panel cũ.

## Cài đặt

Tại repository đang chạy V10.88.0:

```bash
git status
git add -A
git commit -m "Backup V10.88.0 before AI chat close hotfix"
```

Chép gói vào repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.88.0-hf1-ai-chat-close-cleanup-update-only/ ./
```

Chạy installer:

```bash
node scripts/install-v10.88.0-hf1.mjs
```

Kiểm tra:

```bash
npm run verify:v10.88.0-hf1
```

Sau khi đạt:

```bash
git add -A
git commit -m "Fix Brian AI close ghost overlay"
git push origin main
```

Khi Vercel báo **Ready**, mở website và nhấn:

```text
Command + Shift + R
```

## Kiểm tra thủ công

1. Mở Brian AI.
2. Nhấn nút dấu trừ để thu gọn.
3. Xác nhận panel biến mất hoàn toàn, không còn dải mờ.
4. Mở lại bằng bong bóng chat.
5. Kiểm tra ô nhập vẫn cao và tự giãn bình thường.
6. Thử đóng bằng phím Escape nếu ứng dụng hỗ trợ.

## Rollback

```bash
npm run rollback:v10.88.0-hf1
npm run build
npm test
npm run test:department
```

## Phạm vi

- Giữ nguyên package version `10.88.0` để Platform Control Center không báo lệch Version Registry.
- Chỉ thay runtime AI Chat bằng asset cache-busted `v10881`.
- Không đổi `package-lock.json`.
- Không thêm dependency.
- Không cần SQL hoặc Environment Variable.
