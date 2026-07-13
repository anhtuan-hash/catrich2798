# Cập nhật Brian English Studio V11.3.5

## Tính năng mới

Trong **Trung tâm công việc → Trao đổi và tệp nộp**, Admin/TTCM có thêm nút:

```text
＋ Lưu vào Kho học liệu
```

Tệp được lưu theo luồng:

```text
Tệp giáo viên nộp
→ kiểm tra quyền Admin/TTCM
→ đọc từ Supabase Storage riêng tư
→ kiểm tra trùng SHA-256
→ sao chép vào thư mục Google Drive phù hợp
→ tạo học liệu đã duyệt trong resource_items
→ đánh dấu tệp đã lưu trong phản hồi công việc
```

## Cài đặt

```bash
cd ~/Documents/Brian-English-Studio-MAIN
rm -rf /tmp/brian-v1135 && mkdir -p /tmp/brian-v1135
unzip -q ~/Downloads/brian-english-studio-v11.3.5-work-submission-archive-update-only.zip -d /tmp/brian-v1135
INSTALLER=$(find /tmp/brian-v1135 -name "install-v11.3.5.mjs" | head -n 1)
node "$INSTALLER" "$PWD"
```

## Supabase

Chạy lần lượt:

1. `supabase/brian_v11_3_5_preflight.sql`
2. `supabase/brian_v11_3_5_work_submission_archive.sql`
3. `supabase/brian_v11_3_5_verify.sql`

## Kiểm tra

```bash
npm run test:v11.3.5
npm run build
npm run release:guard:v11.3.5
```

## Deploy

```bash
git add -A
git commit -m "Archive submitted work files to Resource Library V11.3.5"
git pull --rebase origin main
git push origin main
```

Không cần tạo bucket mới. Tính năng sử dụng bucket `work-hub-submissions` và kết nối Google Drive hiện có của Kho học liệu.
