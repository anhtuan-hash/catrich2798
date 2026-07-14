# Deploy V11.5.4

## Cài đặt

```bash
node install-v11.5.4.mjs /duong-dan/toi/Brian-English-Studio-MAIN
cd /duong-dan/toi/Brian-English-Studio-MAIN
npm ci
npm run verify:v11.5.4
```

## Deploy

```bash
git add -A
git commit -m "Fix system recording and expand Brian AI composer V11.5.4"
git pull --rebase origin main
git push origin main
```

Không cần chạy SQL.

## Kiểm tra sau deploy

1. Mở Pronunciation Coach và cấp quyền micro.
2. Ghi 3–5 giây, dừng, nghe lại và tải file.
3. Nếu transcript báo lỗi network, xác nhận audio vẫn phát được.
4. Mở Speaking Studio và lặp lại thao tác.
5. Mở Brian AI, xác nhận ô nhập cao hơn và tự tăng khi xuống dòng.
6. Kiểm tra Site Settings của trình duyệt: Microphone = Allow.
