const nativeAlert = window.alert.bind(window);

function friendlySubmissionMessage(value) {
  const message = String(value ?? '').trim();
  if (/row-level security policy/i.test(message) && /weekly_practice_results/i.test(message)) {
    return 'Hệ thống chưa cập nhật quyền nhận bài nộp sớm. Ảnh xác nhận và tiến độ của em vẫn được giữ. Hãy báo TTCM cập nhật Supabase, sau đó bấm “Gửi cho TTCM” lại.';
  }
  if (/permission denied/i.test(message) && /weekly_practice_results/i.test(message)) {
    return 'Hệ thống chưa mở quyền nhận bài nộp. Ảnh xác nhận và tiến độ vẫn được giữ để em gửi lại sau.';
  }
  return message;
}

window.alert = (value) => nativeAlert(friendlySubmissionMessage(value));
