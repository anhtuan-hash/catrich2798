# V11.5.4 Test Report

## Kết quả

- V11.5.4 structural checks: 17/17 PASS
- Vite production build: PASS
- Performance budget: PASS
- Existing smoke tests: 179/179 PASS
- Department runtime tests: PASS (Admin/TTCM/Teacher)
- Connected Workflow contracts: 5/5 PASS
- Release guard: PASS
- Vercel Functions: 12/12

## Các kiểm tra mới

- Shared media capture utility exists.
- Adaptive WebM/MP4/Ogg MIME selection.
- Microphone permission and busy-device diagnostics.
- Pronunciation Coach uses shared recorder and 250 ms chunks.
- Speaking Studio uses shared recorder and adaptive download extension.
- Speech Recognition network errors are non-fatal.
- Recording remains independent from transcription.
- Brian AI voice input uses graceful fallback.
- Brian AI composer auto-grows from 96 px to 260 px.
- No new serverless function was added.

## Giới hạn kiểm thử

Môi trường build chặn Chromium truy cập localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`), nên kiểm thử micro thật bằng trình duyệt headless không thể hoàn tất trong môi trường này. Mã đã được build và kiểm tra contract; cần xác nhận một lần trên deployment HTTPS bằng micro thật của thiết bị.
