export const CONDUCT_DOCUMENT = {
  title: 'Quyết định số 95/QĐ-PEK về Nội quy học sinh và chấm điểm thi đua',
  school: 'Trường Trung – Tiểu học Pétrus Ký',
  issuedDate: '2025-07-14',
  effectiveSchoolYear: '2025-2026',
  path: '/documents/Quyet-dinh-95-QD-PEK-Noi-quy-va-cham-diem-thi-dua-2025.pdf',
};

export const DEFAULT_CONDUCT_THRESHOLDS = {
  good: 90,
  fair: 75,
  pass: 60,
};

export const OFFICIAL_CONDUCT_RULES = [
  {
    id: 'attendance-unexcused-period', code: 'CC01', category: 'Chuyên cần',
    title: 'Vắng học không phép một tiết',
    description: 'Học sinh vắng một tiết học không có phép hợp lệ.',
    schoolPoint: -0.5, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, Tiêu chí 2, trang 9',
  },
  {
    id: 'attendance-unexcused-session', code: 'CC02', category: 'Chuyên cần',
    title: 'Vắng học không phép một buổi',
    description: 'Học sinh vắng một buổi học không có phép hợp lệ.',
    schoolPoint: -1, personalDeduction: 10, severity: 'moderate', reference: 'Bảng lượng hóa điểm, Tiêu chí 2, trang 9',
  },
  {
    id: 'attendance-late', code: 'CC03', category: 'Chuyên cần',
    title: 'Đi học trễ',
    description: 'Đến sau giờ vào lớp hoặc đã vào trường nhưng không lên lớp đúng giờ.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, Tiêu chí 2; hướng dẫn trang 11',
  },
  {
    id: 'attendance-transition-late', code: 'CC04', category: 'Chuyên cần',
    title: 'Chuyển tiết vào lớp trễ',
    description: 'Vào lớp trễ khi chuyển tiết mà không có lý do chính đáng.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, Tiêu chí 2, trang 9',
  },
  {
    id: 'attendance-skip-class', code: 'CC05', category: 'Chuyên cần',
    title: 'Tự ý bỏ tiết hoặc rời khỏi trường',
    description: 'Tự ý bỏ giờ, trốn tiết hoặc rời khuôn viên trường khi chưa được phép.',
    schoolPoint: -10, personalDeduction: 15, severity: 'serious', reference: 'Điều 3 và Điều 9, trang 2–7', requiresEvidence: true,
  },
  {
    id: 'uniform-sport', code: 'NN01', category: 'Nề nếp – tác phong',
    title: 'Mặc sai đồng phục thể dục',
    description: 'Không mặc đúng đồng phục thể dục hoặc trang phục theo hoạt động.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, Tiêu chí 3, trang 9',
  },
  {
    id: 'uniform-general', code: 'NN02', category: 'Nề nếp – tác phong',
    title: 'Đồng phục hoặc tác phong không đúng quy định',
    description: 'Thiếu áo, cà vạt, thẻ tên, giày đúng quy định hoặc tác phong không phù hợp.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Điều 4; bảng lượng hóa trang 9–11',
  },
  {
    id: 'learning-materials', code: 'HT01', category: 'Ý thức học tập',
    title: 'Thiếu dụng cụ hoặc học liệu học tập',
    description: 'Không mang đủ sách, vở, học liệu hoặc dụng cụ theo yêu cầu.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, Tiêu chí 3, trang 9',
  },
  {
    id: 'learning-private-work', code: 'HT02', category: 'Ý thức học tập',
    title: 'Làm việc riêng, ngủ, ăn uống hoặc rời chỗ trong giờ học',
    description: 'Không tập trung học tập, làm gián đoạn giờ học hoặc tự ý rời chỗ.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Điều 2; bảng lượng hóa trang 9',
  },
  {
    id: 'unrelated-items', code: 'NN03', category: 'Nề nếp – tác phong',
    title: 'Mang vật dụng không phục vụ học tập',
    description: 'Mang đồ chơi, đồ trang sức, thiết bị hoặc sản phẩm không liên quan đến học tập.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa trang 9; hướng dẫn trang 12',
  },
  {
    id: 'function-room', code: 'NN04', category: 'Nề nếp – tác phong',
    title: 'Vi phạm quy định phòng chức năng',
    description: 'Sử dụng phòng chức năng, thiết bị hoặc tài sản không đúng mục đích, thời gian hay hướng dẫn.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Điều 8; bảng lượng hóa trang 9',
  },
  {
    id: 'shoes-in-class', code: 'NN05', category: 'Nề nếp – tác phong',
    title: 'Mang giày hoặc dép vào lớp trái quy định',
    description: 'Mang dép ngoài thời gian cho phép hoặc không thực hiện quy định sắp xếp giày dép.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa trang 9; hướng dẫn trang 11',
  },
  {
    id: 'excess-cash', code: 'NN06', category: 'Nề nếp – tác phong',
    title: 'Mang tiền tiêu vặt vượt mức quy định',
    description: 'Mang quá 50.000 đồng/ngày hoặc mức riêng áp dụng cho học sinh nội trú, bán trú.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa trang 9; hướng dẫn trang 11–12',
  },
  {
    id: 'property-damage', code: 'TS01', category: 'Tài sản – môi trường',
    title: 'Làm hư hỏng hoặc phá hoại tài sản nhà trường',
    description: 'Làm hư hỏng tài sản do thiếu trách nhiệm hoặc cố ý; phải xử lý và bồi thường theo quy định.',
    schoolPoint: -1, personalDeduction: 10, severity: 'serious', reference: 'Điều 6; bảng lượng hóa trang 9; hướng dẫn trang 11', requiresEvidence: true,
  },
  {
    id: 'elevator', code: 'NN07', category: 'Nề nếp – tác phong',
    title: 'Sử dụng thang máy trái phép',
    description: 'Sử dụng thang máy khi không thuộc trường hợp được phép.',
    schoolPoint: -1, personalDeduction: 5, severity: 'normal', reference: 'Bảng lượng hóa điểm, trang 10',
  },
  {
    id: 'disrespect-staff', code: 'CM01', category: 'Ứng xử – đạo đức',
    title: 'Vô lễ với giáo viên hoặc nhân viên trường',
    description: 'Có lời nói, thái độ hoặc hành vi thiếu tôn trọng giáo viên, cán bộ, nhân viên.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 1, Điều 9; bảng lượng hóa trang 10', requiresEvidence: true, requiresEscalation: true,
  },
  {
    id: 'insult-others', code: 'CM02', category: 'Ứng xử – đạo đức',
    title: 'Nói tục, chửi thề hoặc xúc phạm người khác',
    description: 'Xúc phạm trong hoặc ngoài trường, kể cả đăng tải hay nhắn tin trên mạng xã hội.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 5, Điều 9; bảng lượng hóa trang 10', requiresEvidence: true, requiresEscalation: true,
  },
  {
    id: 'substances', code: 'CM03', category: 'Hành vi nghiêm cấm',
    title: 'Sử dụng rượu bia, thuốc lá, thuốc lá điện tử hoặc chất kích thích',
    description: 'Sử dụng, tàng trữ hoặc lưu hành các chất bị cấm trong hoặc ngoài trường.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.6; bảng lượng hóa trang 10', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'electronic-device-first', code: 'CM04', category: 'Hành vi nghiêm cấm',
    title: 'Sử dụng điện thoại hoặc thiết bị điện tử trái phép – lần đầu',
    description: 'Mang hoặc sử dụng điện thoại, đồng hồ thông minh, máy nghe nhạc hay thiết bị điện tử trái phép.',
    schoolPoint: -10, personalDeduction: 20, severity: 'serious', reference: 'Điều 9.3; bảng lượng hóa trang 10; quy trình trang 11', requiresEvidence: true, isProhibited: true,
  },
  {
    id: 'electronic-device-repeat', code: 'CM05', category: 'Hành vi nghiêm cấm',
    title: 'Sử dụng điện thoại hoặc thiết bị điện tử trái phép – tái phạm',
    description: 'Tái phạm sử dụng thiết bị điện tử; cần áp dụng quy trình thông báo và niêm phong theo nội quy.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.3; quy trình trang 11', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'class-tv-computer', code: 'CM06', category: 'Hành vi nghiêm cấm',
    title: 'Tự ý mở hoặc sử dụng tivi lớp, máy tính giáo viên',
    description: 'Tự ý vận hành thiết bị của lớp hoặc thiết bị của giáo viên khi chưa được phép.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Bảng lượng hóa điểm, trang 10', requiresEvidence: true, requiresEscalation: true,
  },
  {
    id: 'vehicle-damage', code: 'CM07', category: 'Hành vi nghiêm cấm',
    title: 'Phá xe của giáo viên, nhân viên hoặc học sinh khác',
    description: 'Cố ý làm hư hỏng phương tiện của người khác.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Bảng lượng hóa điểm, trang 10', requiresEvidence: true, requiresEscalation: true,
  },
  {
    id: 'unsafe-furniture', code: 'CM08', category: 'An toàn trường học',
    title: 'Ngồi lên bàn, trèo cửa sổ hoặc xô đẩy cửa, bàn ghế',
    description: 'Hành vi gây mất an toàn cho bản thân, người khác hoặc tài sản.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Bảng lượng hóa điểm, trang 10', requiresEvidence: true, requiresEscalation: true,
  },
  {
    id: 'outside-food-fence', code: 'CM09', category: 'Nề nếp – tác phong',
    title: 'Mua thức ăn hoặc nước uống bên ngoài hàng rào trường',
    description: 'Mua hoặc nhận đồ ăn, thức uống từ bên ngoài hàng rào nhà trường trái quy định.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Bảng lượng hóa điểm, trang 10', requiresEvidence: true,
  },
  {
    id: 'traffic-age-license', code: 'CM10', category: 'An toàn giao thông',
    title: 'Tự điều khiển phương tiện không đúng độ tuổi hoặc giấy phép',
    description: 'Điều khiển phương tiện không đúng quy định về độ tuổi, giấy phép hoặc an toàn giao thông.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.8; bảng lượng hóa trang 10', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'academic-fraud', code: 'NC01', category: 'Hành vi nghiêm cấm',
    title: 'Gian lận trong học tập hoặc kiểm tra',
    description: 'Quay cóp, chép bài, nhờ làm hộ, chỉnh sửa điểm hoặc gian lận trong kiểm tra.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.2, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'unhealthy-relationship', code: 'NC02', category: 'Hành vi nghiêm cấm',
    title: 'Quan hệ bạn bè vượt giới hạn theo nội quy',
    description: 'Có biểu hiện thân mật quá mức hoặc hành vi vượt giới hạn tình bạn trong, ngoài trường hay trên mạng xã hội.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 5.3 và Điều 9.4, trang 4 và 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'school-violence', code: 'NC03', category: 'Hành vi nghiêm cấm',
    title: 'Đánh nhau, gây rối hoặc bạo lực học đường',
    description: 'Tham gia, kích động, xúi giục, quay phim hoặc phát tán video đánh nhau.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.5, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'harmful-content', code: 'NC04', category: 'Hành vi nghiêm cấm',
    title: 'Tàng trữ, lưu hành hoặc đồi trụy hóa nội dung độc hại',
    description: 'Xem, chia sẻ ấn phẩm, hình ảnh, video đồi trụy, bạo lực, phản cảm; tham gia trò chơi kích dục, bạo lực, mê tín hoặc tệ nạn.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.6, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'weapon-dangerous-item', code: 'NC05', category: 'Hành vi nghiêm cấm',
    title: 'Mang vũ khí hoặc vật dụng nguy hiểm vào trường',
    description: 'Mang dao, kéo nhọn, roi điện, gậy sắt hoặc vật dụng có khả năng gây sát thương.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.7, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'traffic-dangerous', code: 'NC06', category: 'Hành vi nghiêm cấm',
    title: 'Vi phạm an toàn giao thông nghiêm trọng',
    description: 'Không đội mũ bảo hiểm, phóng nhanh, vượt ẩu, chở quá người, lạng lách hoặc đánh võng.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.8, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'money-gambling', code: 'NC07', category: 'Hành vi nghiêm cấm',
    title: 'Mua bán, cầm cố, vay mượn tiền bạc, đánh bạc hoặc cá độ',
    description: 'Tổ chức mua bán, trao đổi tiền mặt, đánh bạc, cá độ, vay mượn tiền hoặc đồ đạc trong trường.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.9, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
  {
    id: 'law-prohibited', code: 'NC08', category: 'Hành vi nghiêm cấm',
    title: 'Vi phạm hành vi khác bị pháp luật nghiêm cấm',
    description: 'Hành vi bị nghiêm cấm khác theo quy định pháp luật hoặc quyết định xử lý của nhà trường.',
    schoolPoint: -10, personalDeduction: 50, severity: 'critical', reference: 'Điều 9.10, trang 7', requiresEvidence: true, requiresEscalation: true, isProhibited: true,
  },
];

export const CONDUCT_CATEGORIES = [...new Set(OFFICIAL_CONDUCT_RULES.map((rule) => rule.category))];
