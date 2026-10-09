/**
 * Fixed, published rubrics authored for the teacher-operated beta.
 * Descriptor text is deterministic and never generated from student answers.
 * Educators may adjust descriptors in a future versioned rubric builder.
 */
export const LEVEL_NAMES = [
  '0 — Không có minh chứng',
  '1 — Chưa đạt yêu cầu',
  '2 — Đạt một phần',
  '3 — Đạt yêu cầu',
  '4 — Tốt / Vượt yêu cầu'
];
export const GENERIC_DESCRIPTORS = [
  'Không có sản phẩm hoặc chưa có minh chứng để đánh giá tiêu chí này.',
  'Thể hiện rất hạn chế, chưa thực hiện được phần lớn yêu cầu.',
  'Thực hiện được một phần yêu cầu, còn nhiều điểm cần cải thiện.',
  'Đáp ứng phần lớn yêu cầu, còn một số hạn chế nhỏ.',
  'Thực hiện đầy đủ và ổn định, có chất lượng tốt.'
];
export const SPEAKING_DESCRIPTORS = {
  Pronunciation: [
    'Không có phát ngôn đủ để đánh giá.',
    'Phát âm khiến phần lớn nội dung khó hiểu.',
    'Nhìn chung có thể hiểu nhưng nhiều lỗi âm/trọng âm gây gián đoạn.',
    'Phát âm khá rõ; một số lỗi nhỏ không cản trở hiểu.',
    'Phát âm rõ, trọng âm và ngữ điệu hỗ trợ người nghe hiểu dễ dàng.'
  ],
  Fluency: [
    'Không tạo được phát ngôn liên tục.',
    'Ngập ngừng rất nhiều, thường dừng dài và chưa duy trì ý.',
    'Nói được ý cơ bản nhưng nhiều chỗ ngắt quãng hoặc lặp.',
    'Duy trì bài nói tương đối liên tục, ít ngập ngừng gây cản trở.',
    'Nói trôi chảy, nhịp độ phù hợp, chuyển ý tự nhiên.'
  ],
  Vocabulary: [
    'Không sử dụng được từ vựng liên quan.',
    'Vốn từ rất hạn chế, nhiều lựa chọn từ làm sai nghĩa.',
    'Sử dụng từ cơ bản; một số chỗ thiếu chính xác hoặc lặp từ.',
    'Từ vựng phù hợp chủ đề, có một số diễn đạt đa dạng.',
    'Từ vựng đa dạng, phù hợp và chính xác với tình huống giao tiếp.'
  ],
  Grammar: [
    'Không có cấu trúc có thể đánh giá.',
    'Lỗi ngữ pháp thường xuyên làm người nghe khó hiểu.',
    'Sử dụng cấu trúc đơn giản; lỗi còn lặp lại nhưng nhìn chung hiểu được.',
    'Phần lớn cấu trúc phù hợp và đúng; có lỗi nhỏ không cản trở giao tiếp.',
    'Sử dụng chính xác nhiều cấu trúc phù hợp yêu cầu bài nói.'
  ],
  Content: [
    'Không thực hiện nhiệm vụ hoặc hoàn toàn lạc đề.',
    'Chỉ đề cập rất ít nội dung liên quan đến nhiệm vụ.',
    'Trình bày được một số ý chính nhưng thiếu phát triển hoặc ví dụ.',
    'Đáp ứng yêu cầu nhiệm vụ, các ý tương đối rõ và có hỗ trợ.',
    'Đáp ứng đầy đủ nhiệm vụ, lập luận rõ ràng và ví dụ phù hợp.'
  ]
};

export function rubricDescription(kind, criterion, score) {
  if (!Number.isInteger(score) || score < 0 || score > 4) {
    throw new Error('Mức rubric phải là số nguyên từ 0 đến 4.');
  }
  return (kind==='speaking' && SPEAKING_DESCRIPTORS[criterion]?.[score]) || GENERIC_DESCRIPTORS[score];
}
