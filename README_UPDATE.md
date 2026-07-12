# Brian English Studio V10.88.0-HF2

## AI Launcher Slot Restore — update-only

Hotfix này:

- Ẩn nút âm nhạc **nổi ở góc phải dưới**.
- Giữ nguyên công tắc **Nhạc nền** trên thanh phía trên.
- Khôi phục bong bóng Brian AI vào đúng vị trí góc phải dưới.
- Ưu tiên dùng launcher gốc; tạo bong bóng chat dự phòng nếu launcher gốc không tồn tại.
- Tự hiện lại bong bóng khi AI Chat đóng.

## Cài đặt

Tại repository đang chạy V10.88.0:

```bash
git status
git add -A
git commit -m "Backup V10.88.0 before AI launcher slot hotfix"
```

Chép gói vào repository:

```bash
rsync -av ~/Downloads/brian-english-studio-v10.88.0-hf2-ai-launcher-slot-restore-update-only/ ./
```

Chạy installer:

```bash
node scripts/install-v10.88.0-hf2.mjs
```

Kiểm tra:

```bash
npm run verify:v10.88.0-hf2
```

Sau khi đạt:

```bash
git add -A
git commit -m "Restore Brian AI launcher slot and hide floating music button"
git push origin main
```

Khi Vercel báo **Ready**, nhấn:

```text
Command + Shift + R
```

## Kiểm tra thủ công

1. Mở một trang bất kỳ khi Brian AI đang đóng.
2. Xác nhận nút nốt nhạc tròn ở góc phải dưới đã biến mất.
3. Xác nhận bong bóng chat xuất hiện đúng vị trí đó.
4. Bấm bong bóng và kiểm tra Brian AI mở bình thường.
5. Thu gọn Brian AI; bong bóng phải hiện lại sau khi panel biến mất.
6. Công tắc **Nhạc nền** trên top bar vẫn phải hoạt động bình thường.

## Rollback

```bash
npm run rollback:v10.88.0-hf2
npm run build
npm test
npm run test:department
```

## Phạm vi

- Giữ nguyên package version `10.88.0`.
- Không đổi `package-lock.json`.
- Không thêm dependency.
- Không cần SQL hoặc Environment Variable.
- Không đụng lịch sử chat, draft, provider, API key hoặc Supabase.
