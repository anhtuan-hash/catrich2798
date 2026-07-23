# PHASE 1.3 — INTERACTION LAYOUT FIX

## Kết quả review Phase 1.2

Modal đã đạt.

Các lỗi còn lại:

1. Drawer quá rộng.
2. Toast nằm quá thấp.
3. Dải nền tím vẫn che nội dung account panel.
4. Menu ba chấm mở sai phía.
5. Menu ba chấm quá hẹp.

## Sửa đổi Phase 1.3

- Account panel không còn dùng:
  - `hr-progress-panel`
  - `hr-progress-row`
- Giữ hình thức GVCN bằng:
  - `hr-panel`
  - account rows có namespace riêng.
- Drawer giảm còn tối đa 340px.
- Toast nâng lên 108px.
- Menu desktop mở sang bên phải:
  - rộng 250px;
  - không đè nội dung bên trái.
- Trên màn hình hẹp, menu mở lên trên.
- Modal không thay đổi.
- Mọi CSS chỉ tác động trong `.professional-hub-page`.

## Giới hạn

- Chưa nối Supabase.
- Chưa có membership hoặc RLS.
- Không có giáo viên mẫu.
- Không merge hoặc deploy Production.
