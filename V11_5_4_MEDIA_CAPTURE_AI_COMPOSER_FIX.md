# Brian English Studio V11.5.4
## System Media Capture & AI Composer Fix

### Mục tiêu

- Chuẩn hóa ghi âm trong Pronunciation Coach và Speaking Studio.
- Không để lỗi Speech Recognition làm mất hoặc vô hiệu hóa bản ghi.
- Hỗ trợ MIME phù hợp với Chrome/Edge/Safari: WebM, MP4/M4A và Ogg.
- Hiển thị lỗi quyền micro, thiếu thiết bị, thiết bị bận và HTTPS bằng thông báo dễ hiểu.
- Mở rộng vùng nhập của Brian AI cho prompt và nội dung dạy học dài.

### Kiến trúc mới

`src/utils/mediaCapture.js` cung cấp một lớp dùng chung:

- `requestMicrophoneStream()`
- `createMediaRecorder()`
- `getSupportedAudioMimeType()`
- `describeMediaError()`
- `createSpeechRecognition()`
- `speechRecognitionMessage()`
- `stopStream()`

### Hành vi ghi âm

1. Audio được ghi và lưu cục bộ bằng MediaRecorder.
2. Transcript tự động chạy độc lập bằng Web Speech API.
3. Nếu Web Speech báo `network`, audio vẫn hoàn tất, nghe lại và tải xuống được.
4. Người dùng có thể nhập transcript thủ công để chạy AI phân tích.
5. Tệp tải xuống tự dùng đúng đuôi `.webm`, `.m4a` hoặc `.ogg` theo trình duyệt.

### Brian AI Composer

- Chiều cao mặc định: 96 px.
- Tự tăng tới tối đa 260 px.
- Có thể kéo thay đổi chiều cao.
- Font và khoảng đệm lớn hơn.
- Cửa sổ chat rộng tối đa 560 px.
- Lỗi nhập giọng nói chuyển thành thông báo không chặn nhập bàn phím.

### Dữ liệu và triển khai

- Không thay đổi Supabase schema.
- Không thêm Vercel Function.
- Tổng Vercel Functions giữ 12/12.
- Không cần chạy SQL mới.
