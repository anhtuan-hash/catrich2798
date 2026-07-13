# Brian English Studio V10.94.0 — Learning Intelligence

## Mục tiêu

V10.94 biến dữ liệu kiểm tra thành thông tin có thể hành động: mức độ thành thạo, lỗi lặp lại, cảnh báo sớm và bài luyện thích ứng.

## Route

`#/learning-intelligence`

## Thành phần chính

- Hồ sơ học sinh theo giáo viên và lớp.
- Nhập lượt làm bài bằng CSV hoặc TSV.
- Mastery theo kỹ năng, chủ điểm và CEFR.
- Error taxonomy gồm 14 nhóm lỗi.
- Cảnh báo học sinh cần can thiệp.
- Lịch ôn lại theo spaced review.
- Kế hoạch can thiệp và bộ bài luyện thích ứng.
- Chuyển kế hoạch sang Teaching Content Factory.
- Xuất báo cáo JSON.
- Lưu cục bộ khi Supabase chưa sẵn sàng.

## Database

- `learning_learners`
- `learning_attempts`
- `learning_mastery`
- `learning_interventions`
- `learning_practice_sets`

RPC: `learning_rebuild_mastery()`.

## Phân quyền

Admin/TTCM xem toàn bộ. Giáo viên chỉ xem học sinh do mình sở hữu hoặc phụ trách. Học sinh có tài khoản chỉ xem hồ sơ gắn với `learner_user_id`.

## Định dạng nhập

```csv
learner,class,skill,topic,cefr,correct,response_ms,error_code
Nguyễn Văn A,12A1,Grammar,Verb tenses,B2,false,42000,tense
```
