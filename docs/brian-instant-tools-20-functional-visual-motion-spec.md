# BRIAN INSTANT TOOLS — KIỂM TOÁN & SPEC CHỨC NĂNG–GIAO DIỆN–CHUYỂN ĐỘNG CỦA 20 TIỆN ÍCH

**Ngày kiểm tra:** 26/10/2026 (Asia/Ho_Chi_Minh).
**Snapshot nguồn:** main @ 511a37e86870ea6bceba762612c742a166736090; trùng SHA Vercel Production lúc đối chiếu.
**Nguồn kiểm tra:** BrianInstantTools.jsx/.css; BrianInstantToolsWave2/3/4.jsx/.css; instantToolsCore.mjs; instantToolsWave3Core.mjs; instantToolsWave4Core.mjs; 4 bộ Playwright E2E.
**Giới hạn bằng chứng:** Đây là kiểm tra mã nguồn và phạm vi test đã viết; chưa phải nghiệm thu thao tác trên iPhone/iPad thực tế. Những yêu cầu ở phần "Spec đích" chưa được xác nhận là đã lập trình.

## I. Chuẩn chất lượng chung — áp dụng cho 20/20

Một tiện ích đạt yêu cầu khi đồng thời có: (1) logic thật; (2) trạng thái rõ ràng gồm idle/configuring/running/success/error/cancel nếu phù hợp; (3) giao diện Material 3 có khả năng trình chiếu; (4) hiệu ứng phản hồi gắn với kết quả thật; (5) chuyển động phù hợp; (6) âm thanh tùy chọn, không phát tự động khi chưa có user gesture; (7) lưu dữ liệu an toàn; (8) chạy tốt trên desktop, màn chiếu, tablet và điện thoại.

**Quy ước giao diện:** giữ duy nhất bong bóng Toolbox hiện có, một Portal chứa 20 card; không tạo launcher mới. Canvas Desktop rộng khoảng 1120px, TV/Fullscreen 16:9 tùy công cụ, trên tablet chuyển về 1–2 cột, mobile 375px không cuộn ngang. Nút chạm tối thiểu 44px; số liệu trọng tâm trên màn chiếu ≥56px, thông báo thắng/đáp án ≥28px. Theme chính Ivory Studio, cho phép Midnight Slate, không ép theme Focus/Board. Màu sắc phải nhất quán chứ không 20 giao diện độc lập.

**Motion tokens:** hover/tap 120–180ms; chuyển trạng thái 180–280ms; phản hồi kết quả 250–450ms; mô phỏng vật lý tối đa 800ms; ngoại lệ vòng quay 4–6 giây. Ưu tiên CSS transform, opacity và native Web Animations API; hỗ trợ prefers-reduced-motion. Hiệu ứng phải phản ánh thay đổi thực, không trang trí gây nhiễu hoặc che chữ. Tắt hoạt ảnh khi màn hình không hiển thị.

**SFX:** AudioContext tái sử dụng sau thao tác người dùng, tôn trọng nút âm thanh chung, âm click/đúng/sai/thành công khác biệt, tránh phát chồng ồn. Đối với iOS Safari, cần cơ chế unlock trên lần chạm đầu và nghiệm thu thiết bị thật; không tuyên bố tương thích chỉ từ trình giả lập.

**Dữ liệu:** lưu localStorage theo ID người dùng, bảo toàn phiên bản envelope v1 và dữ liệu Đợt 1–4, giới hạn kích thước và tự làm sạch timer/audio/microphone khi unmount, thu nhỏ, đổi tài khoản hoặc ẩn tab. Không thêm AI, dịch vụ tính phí, không chỉnh bảng hay chính sách Supabase, không ảnh hưởng Focus, Board, Approval, AI Chat.

## II. Audit thực tế nhanh

| ID | Tiện ích | Cơ chế hiện có | Phản hồi/chuyển động thực tế trong code | Khoảng trống chính |
|---|---|---|---|---|
| 01 | Dice 3D | Xúc xắc 1–6, random, lịch sử | Có cube 3D và lăn | Phối hợp mặt trúng/sound/iOS |
| 02 | Lucky Wheel | Chọn tên Web Crypto | Có xoay và confetti | Tick đúng vạch, modal kết quả lớn |
| 03 | Scoreboard | Điểm, undo, đội dẫn đầu | Confetti và đổi viền, ít motion số | Digit animation |
| 04 | Multi-Timer | 1–8 timer, deadline | Thanh progress động | Cảnh báo cuối giờ, iOS |
| 05 | QR Maker | QR local, PNG, copy, zoom | Chủ yếu static preview | State feedback khi tạo |
| 06 | Spotlight | Theo chuột/touch, dim/radius | Lỗ sáng di chuyển | Mượt/hiệu năng touch |
| 07 | Big Text | Font, theme, stage toàn màn | Chủ yếu tĩnh | Reveal/theme transition |
| 08 | Teleprompter | Auto-scroll theo RAF | Có cuộn chuyển động thật | Cue line/fullscreen |
| 09 | Reveal Cards | Mở/ẩn 24 thẻ | Chỉ đổi màu/nội dung | Flip 3D thực |
| 10 | Sound FX | 12 cue tổng hợp âm | Hover/selected | Waveform/sound lifecycle |
| 11 | Quick Notes | CRUD, pin, 5 màu, lưu | Tĩnh | Pin animation/save state |
| 12 | Text Tools | Stats Unicode, transform, copy | Tĩnh | Feedback/undo visual |
| 13 | Calculator | Parser an toàn, history | Tĩnh | Phím/numeral animation |
| 14 | Quick Links | CRUD, search, URL allowlist | Tĩnh | Card animation |
| 15 | Checklist | CRUD/filter/progress | Progress transition | Checkmark/completion effect |
| 16 | Group Maker | Fisher–Yates, chia nhóm đều | Thẻ kết quả tĩnh | Animated dealing |
| 17 | Noise Meter | Micro, RMS, 0–100 | Có thanh/giá trị sống | Mức chỉ tương đối, threshold UX |
| 18 | Buzzer | Arm, first lock, +1, history | Đổi màu thắng, hover | Winner burst, atomic lock ID |
| 19 | Reaction Timer | Random delay, false start, ms | Đổi màu giai đoạn | Ready/result motion, keyboard |
| 20 | Class Bell | 4 âm chuông nhấn tay | Hover/active card | Chưa có lịch chuông tự động |

## III. SPEC RIÊNG TỪNG TIỆN ÍCH

### 01. Dice 3D — Xúc xắc
**Hiện trạng:** Có nguồn random và cube 3D thực, tổng, lịch sử 8 lần.
**Cơ chế đích:** cấu hình 1–6 xúc xắc; sinh mặt 1–6 bằng Web Crypto trước khi anim; cấm kích hoạt lần tiếp theo khi đang lăn; tính tổng đúng tuyệt đối; Reset/History.
**Giao diện:** sân khấu với cube được xếp đều, điểm tổng là hero số, có bảng lịch sử ở cạnh. Màn chiếu không nhỏ.
**Hiệu ứng:** lăn xoay X/Y lệch 40ms mỗi viên, nâng cao/bóng động, bounce hạ cánh; sound lắc và kết quả, confetti rất nhẹ nếu ra jackpot tùy chọn.
**QA:** số mặt khớp kết quả, 100 lần không ngoài 1–6, 6 viên không tràn mobile, nút nhấn nhanh không race, Reduce Motion.

### 02. Lucky Wheel — Vòng quay
**Hiện trạng:** 2–16 tên, chọn ngẫu nhiên, wheel spin khoảng 4.6 giây, hiển thị winner.
**Cơ chế đích:** chọn winner trước bằng nguồn ngẫu nhiên thật rồi tính góc kim; disable chỉnh tên khi quay; lưu tên/góc và winner.
**Giao diện:** wheel tối thiểu 330px trên desktop, kim trên rõ, tên không chồng, modal công bố kết quả ở giữa viewport đủ lớn để bàn cuối đọc.
**Hiệu ứng:** 5–7 vòng ease-out, tick đồng bộ với ranh giới ô; kim nảy nhẹ, thắng có confetti/âm thắng/result reveal; Reduce Motion vẫn hiển thị đúng winner.
**QA:** winner trùng ô thực tại điểm kim sau khi dừng 100%, không chọn trùng, không đua nhấn, hoạt động touch.

### 03. Scoreboard — Bảng điểm
**Hiện trạng:** tối đa 8 đội, cộng/trừ, undo, reset và confetti khi đổi người dẫn đầu.
**Cơ chế đích:** số điểm là nguồn sự thật, -1/+1/+5 và undo 30 bước; reset xác nhận; không sửa Gradebook.
**Giao diện:** scoreboard dạng các thẻ đội với số 64–96px TV, đội đầu nhận border/leader crown, màu có contrast.
**Hiệu ứng:** hiệu ứng odometer đổi số 220ms, float +1/-1, glow khi lên dẫn đầu, pháo giấy chỉ khi thay leader; âm cộng/trừ ngắn.
**QA:** undo lịch sử rỗng không crash, đội 2–8, giới hạn điểm, local isolation.

### 04. Multi-Timer — Đồng hồ nhiều nhóm
**Hiện trạng:** timer dùng deadline tuyệt đối, preset, pause/resume, tiến trình động.
**Cơ chế đích:** 1–8 bộ đếm độc lập, preset 1/3/5/10 phút, thao tác tất cả, khôi phục sau ẩn tab bằng Date.now không lệch.
**Giao diện:** grid thời gian lớn, tiến trình vòng/đường, nhãn đội sửa được, thẻ hết giờ nổi rõ.
**Hiệu ứng:** thanh chạy tuyến tính; 10 giây cuối chuyển amber, 3 giây cuối pulse có tiết chế, hết giờ bell+flash một lần/timer; không phát nhiều lần khi tab thức lại.
**QA:** đa timer đồng thời; ẩn tab 60s; âm Safari sau user gesture; reset và timer mới đúng.

### 05. QR Maker — QR tức thì
**Hiện trạng:** tạo QR offline, PNG, phóng lớn, copy.
**Cơ chế đích:** tối đa 900 ký tự, validate text/URL và chặn giao thức nguy hiểm; input đổi phải invalidate QR cũ trước khi render mới.
**Giao diện:** panel nhập trái, QR phải, TV QR trắng ít nhất 350px, quiet-zone và nút Download/Copy.
**Hiệu ứng:** animation ở khung QR 180ms khi sẵn sàng, icon download success; TUYỆT ĐỐI không làm chính ô vuông QR nhấp nháy khi đang quét.
**QA:** quét được bằng 2 điện thoại thực, download PNG hợp lệ, offline, nhập URL xấu có báo lỗi.

### 06. Spotlight — Đèn chiếu
**Hiện trạng:** phủ màn hình với lỗ sáng di chuyển theo pointer, cỡ sáng và opacity.
**Cơ chế đích:** radius 90–260px, dim 45–95%, Escape/Exit, drag touch và cleanup listeners hoàn chỉnh.
**Giao diện:** overlay tối, toolbar nhỏ ở phía trên, không che nội dung mục tiêu, hỗ trợ TV.
**Hiệu ứng:** ánh sáng theo pointer qua requestAnimationFrame, nội suy rất ngắn 50–70ms; vòng viền mềm, không kéo dài gây lag.
**QA:** iPad touch thao tác thật, đóng xong trang cuộn lại được, focus phục hồi, 30 giây kéo liên tục không giật.

### 07. Big Text — Chữ cực lớn
**Hiện trạng:** sửa text 400 ký tự, font 52–220px, 3 theme, chế độ trình chiếu.
**Cơ chế đích:** text gõ được cập nhật trong preview, full-view, auto-fit không mất chữ.
**Giao diện:** 16:9 TV stage, canh giữa, font phản hồi theo khung, lựa chọn Ivory/Midnight/Neon, Exit nổi.
**Hiệu ứng:** fade/scale-in 220ms, chuyển theme crossfade, tùy chọn reveal từng dòng; không áp blink liên tục.
**QA:** câu dài/emoji/tiếng Việt không bị cắt, mobile/TV contrast, Escape.

### 08. Teleprompter — Máy nhắc chữ
**Hiện trạng:** văn bản 12.000 ký tự, scroll requestAnimationFrame, speed/font/theme/mirror.
**Cơ chế đích:** Play–Pause–Resume–Reset, kéo speed không reset vị trí; cắt RAF khi ẩn/đóng.
**Giao diện:** controls trái, stage đọc phải; đường đánh dấu vùng đọc ~1/3 chiều cao, chế độ TV/fullscreen.
**Hiệu ứng:** smooth constant-speed scroll đúng elapsed time; highlight câu đang đọc và % tiến độ, không hiệu ứng nền gây khó tập trung.
**QA:** thử script dài 10 phút; pause/restore chính xác, không drift khi lag, mirror chỉ tác động stage.

### 09. Reveal Cards — Thẻ mở bí mật
**Hiện trạng:** card hiển thị ? khi ẩn và text khi mở, đổi background chứ chưa flip 3D.
**Cơ chế đích:** tối đa 24 thẻ, Apply, Reveal/Hide từng thẻ và toàn bộ, đếm đã mở, không mất dữ liệu.
**Giao diện:** thẻ mặt trước ? và mặt sau đáp án/ý tưởng, thẻ lớn, grid 2–4 cột.
**Hiệu ứng:** perspective 800px, rotateY(180deg) 450ms, backface-visibility hidden, đổ bóng và stagger deal 35ms; mở kèm whoosh nhỏ, Reduce Motion fade.
**QA:** mặt sau không phản chiếu ngược, không reveal trước khi animation hoàn tất, keyboard Enter/Space, văn bản không tràn.

### 10. Sound FX — Bảng âm thanh
**Hiện trạng:** 12 âm synth local và mức âm lượng.
**Cơ chế đích:** master mute, 0–100 volume, tên/icon từng sound, quản lý chung AudioContext và stop playback đúng lúc; không fetch âm ngoài.
**Giao diện:** 12 sound pads, mobile 2 cột, nút đang phát được đánh dấu.
**Hiệu ứng:** pad press scale(.96), waveform bar theo envelope thật, vòng sáng phát khi có âm, tự trở về idle khi âm hoàn tất.
**QA:** mute/volume khác biệt nghe được, iOS Safari unlock sau tap, không leak audio context.

### 11. Quick Notes — Ghi chú
**Hiện trạng:** 35 ghi chú tối đa, 5 màu, pin overlay, tự lưu theo user.
**Cơ chế đích:** tạo/sửa/xóa/ghim/bỏ ghim, rõ autosave/quota error; pin overlay không che Focus/Chat/Approval.
**Giao diện:** danh sách note và editor; note ghim gần cạnh màn hình, responsive.
**Hiệu ứng:** thêm note slide-up 180ms, đổi màu chuyển sắc, pin di chuyển icon 240ms, dấu check Save; không bật popup cản thao tác.
**QA:** switch user không leak, reload giữ nội dung tiếng Việt; xóa ghi chú đang pin đóng overlay.

### 12. Text Tools — Biên tập văn bản
**Hiện trạng:** 5 thống kê Unicode, upper/lower/title/trim, clipboard.
**Cơ chế đích:** max 20k ký tự, chuyển đổi giữ xuống đoạn, có Undo cho transform gần nhất; clipboard failure không làm mất text.
**Giao diện:** 5 thống kê lớn, toolbar dễ nhấn, textarea đủ rộng, VI/EN.
**Hiệu ứng:** số thống kê tăng/giảm mượt 120ms chỉ khi giá trị đổi; highlight nhẹ sau biến đổi; copy check icon trong 1.2s.
**QA:** dấu tiếng Việt, emoji kết hợp, 20k input mượt, Undo, copy blocked có thông báo.

### 13. Calculator — Máy tính
**Hiện trạng:** parser không dùng eval, phép cơ bản %, lịch sử 10 phép.
**Cơ chế đích:** input max 120, số âm/ngoặc/operator đúng ưu tiên, Enter tính, backspace/clear; lỗi 0 divisor/syntax hữu ích.
**Giao diện:** màn hình biểu thức/result lớn, keypad 4 cột nút ≥55px, có lịch sử chạm dùng lại.
**Hiệu ứng:** nút bấm chìm 90ms, result count/slide 150ms, lỗi rung ngang 180ms hoặc viền tĩnh Reduce Motion.
**QA:** phép 200×15%=30, (-3+10), zero division, script payload từ chối, history persisted.

### 14. Quick Links — Liên kết nhanh
**Hiện trạng:** tối đa 30 link, sửa/xóa/tìm và mở tab với noopener noreferrer.
**Cơ chế đích:** chỉ http(s) URLs không nhúng credentials, validate trước lưu; không tự fetch địa chỉ.
**Giao diện:** link card có tên, domain, icon hành động, search; mobile không chữ quá nhỏ.
**Hiệu ứng:** add appear scale 170ms, delete collapse 170ms sau confirm, hover lift nhẹ, feedback link saved.
**QA:** chặn javascript:/data:/ftp:/credential URL; danh sách 30, người dùng A/B tách biệt.

### 15. Checklist — Việc cần làm
**Hiện trạng:** CRUD max 60, filter trạng thái và thanh tiến trình động.
**Cơ chế đích:** add/edit/check/uncheck/delete, clear completed có confirm, undo delete một bước, local save.
**Giao diện:** list đủ khoảng cách, progress bar và segmented filter, status completed.
**Hiệu ứng:** checkbox SVG draw 200ms, row collapse, progress tween 220ms, thành công 100% có particle nhẹ đúng 1 lần.
**QA:** check 60 dòng nhanh không mất trạng thái, clear & undo, reload.

### 16. Group Maker — Chia nhóm
**Hiện trạng:** Fisher–Yates với random Web Crypto, max 120 người, chia vòng đảm bảo cân bằng.
**Cơ chế đích:** 2–8 nhóm, Unicode normalize/dedupe, xác nhận nếu số nhóm > số thành viên, copy nhóm.
**Giao diện:** nhập danh sách trái, bảng nhóm màu phải, số thành viên đủ lớn để chiếu TV.
**Hiệu ứng:** chip tên ngẫu nhiên được chia vào từng ô theo stagger 30–40ms sau khi đã chốt kết quả ngẫu nhiên; giới hạn tổng animation ≤1.5s.
**QA:** 29 người/4 nhóm cho 8–7–7–7, không trùng/mất tên, 120 người không freeze.

### 17. Noise Meter — Độ ồn tương đối
**Hiện trạng:** getUserMedia + Analyser, hiển thị mức 0–100 thực, có ngưỡng người dùng chọn.
**Cơ chế đích:** quyền micro rõ ràng; biểu đồ RMS relative level, ngưỡng âm thanh, không ghi âm hoặc upload; đây KHÔNG phải decibel dB SPL hiệu chuẩn.
**Giao diện:** gauge to, trạng thái Quiet/Medium/Loud, giá trị lớn, ô quyền riêng tư.
**Hiệu ứng:** thanh âm chuyển theo tín hiệu thật 10–15Hz, màu xanh→vàng→đỏ, cảnh báo nếu vượt ngưỡng liên tục ≥2s (hysteresis), không mô phỏng sóng giả lúc mic off.
**QA:** deny/stop/hidden/unmount đều tắt MediaStream tracks; iOS HTTPS, performance khi chạy >5 phút; không báo dB giả.

### 18. Buzzer — Giành quyền
**Hiện trạng:** 2–8 đội, teacher Arm, khóa đội thắng, có +1 điểm và lịch sử 15 lượt.
**Cơ chế đích:** xử lý lock nguyên tử qua ref và ID đội cố định, không dùng tên đội làm định danh; không hỗ trợ “thi từ nhiều điện thoại” khi chưa có realtime backend.
**Giao diện:** nút BUZZ cực lớn, trạng thái Armed, winner spotlight, điểm mỗi đội, Reset.
**Hiệu ứng:** đội đầu bấm phóng lớn 220ms + vòng phát sáng và một âm thắng; đội còn lại fade 150ms, số điểm count-up.
**QA:** hai click cùng tick chỉ có một winner, đổi tên/trùng tên không làm sai lock, mọi nút disabled đúng.

### 19. Reaction Timer — Phản xạ
**Hiện trạng:** chờ ngẫu nhiên 1.5–4 giây, false start, ms theo performance.now, history 10.
**Cơ chế đích:** Start → Wait → Green → Tap → Result, bấm sớm báo false start; bàn phím Space/Enter ngoài input, đóng/ẩn tab hủy lượt.
**Giao diện:** toàn khu vực chính là pad xanh khi Ready, ms ≥72px, kỷ lục rõ, Retry riêng.
**Hiệu ứng:** Wait pulse chậm, Green flash 90ms khi ready, score pop 220ms; false start shake đỏ; kỷ lục mới có confetti một lần.
**QA:** false start không lưu, bấm sau green đo thật, không race sau click nhanh, test iPad touch.

### 20. Class Bell — Chuông lớp
**Hiện trạng:** chỉ có 4 nút phát chuông thủ công (Attention, Lesson Start, Transition, Finish), chọn volume 0–100 và duration 1–4s. Chưa có bộ tự động theo tiết học.
**Cơ chế đích:** Giữ toàn bộ chế độ Manual. Thêm tab **Class Timeline** gồm 1–10 giai đoạn tên + thời lượng 15–3600s, Start/Pause/Resume/Next/Reset và chime mỗi lần chuyển khi trang vẫn hoạt động.
**Giao diện:** manual là 4 pad âm thanh, timeline là đồng hồ sân khấu lớn + tiến trình các chặng + editor tên/thời gian; trên TV 16:9.
**Hiệu ứng:** chuông phát cùng vòng tròn lan tỏa theo âm (chỉ khi âm thực phát); khi chuyển chặng panel slide 350ms, cảnh báo hết giờ 2 giây.
**QA:** chuông sau gesture nghe được trên iPhone thật, không phát khi mute; lịch 3 chặng tự chuyển, tab background thức lại không phát dồn, không tuyên bố browser phát âm khi đã đóng.

## IV. Thứ tự nâng cấp có kiểm soát

**P0: sửa thiếu cơ chế và tính đúng**
- Class Bell: bổ sung lịch chuông tự động nhưng giữ Manual Bells.
- Reveal Cards: flip 3D thật.
- Buzzer: winner lock bằng ID/ref, không lỗi trùng tên; Reaction Timer: keyboard/touch/fx.
- Noise Meter: privacy, mic cleanup/hysteresis; Multi-Timer: cảnh báo âm cuối giờ và sleep; Group Maker: hiệu ứng chia người không fake kết quả.

**P1: nâng toàn bộ 20 tiện ích lên cùng chuẩn microinteraction**
- Dice, Wheel, Scoreboard, QR, Spotlight, Big Text, Teleprompter, Sound FX và năm công cụ Wave3: visual+sound feedback, full-screen teacher mode, responsive.

**P2: nghiệm thu và polish**
- E2E cho từng state machine, Playwright trên Chrome/Android-emulated/WebKit iPhone-emulated; UAT trên iPhone/iPad thật về micro, audio, cảm ứng và hiệu năng.
- Snapshot visual trên 375×812 / 768×1024 / 1920×1080; aria, keyboard, no horizontal clipping.
- Regression toàn bộ Focus, Board, Chat, Approval, Supabase (read-only unaffected), không thư viện mới/phí phát sinh.

## V. Definition of Done — bắt buộc

Mỗi công cụ chỉ được đánh dấu hoàn thành nếu kiểm tra được: 1) logic đúng; 2) thay đổi UI theo state thực; 3) motion phù hợp, có reduced-motion; 4) SFX phù hợp master mute và user gesture; 5) mobile/desktop/TV hiển thị to, rõ; 6) lưu/khôi phục an toàn và không rò dữ liệu; 7) lỗi/quyền từ chối đều có thông báo; 8) test tự động và UAT thiết bị cần thiết đạt.

**Lưu ý:** Tài liệu này là spec/audit, KHÔNG tự đồng nghĩa các nâng cấp còn thiếu đã được triển khai.
