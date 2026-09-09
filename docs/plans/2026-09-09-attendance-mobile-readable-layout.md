# Attendance mobile readable layout

Goal: make the attendance modal readable and touch-friendly on iPhone at native browser zoom, while remaining stable if Safari page zoom or text scaling reduces the effective CSS viewport.

Approved direction:
- keep the attendance modal full-height within iPhone safe areas;
- use a compact single-line title/header with actions positioned independently so they do not squeeze the title;
- keep Lịch điểm danh / Lịch sử as large touch tabs;
- stack date and room filters safely;
- render metrics as a readable 2×2 grid on phones;
- render each class as a clear card with 16px class name, room/status on the right, and no desktop-width assumptions;
- preserve existing attendance logic and the post-confirm edit flow.