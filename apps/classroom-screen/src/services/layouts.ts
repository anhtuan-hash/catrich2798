import { LayoutPreset } from '../types';

const CUSTOM_LAYOUTS_KEY = 'brian_classroom_custom_layouts_v1';

// Built-in activity templates for common classroom scenarios
export const BUILTIN_LAYOUTS: LayoutPreset[] = [
  {
    id: 'layout_testing_mode',
    name: 'Giờ Kiểm Tra & Thi Lớp',
    description: 'Bố cục giữ yên tĩnh, đồng hồ đếm ngược lớn và biển quy định giờ thi.',
    category: 'builtin',
    icon: '📝',
    background: { type: 'color', value: '#F8FAFC' },
    widgets: [
      {
        type: 'timer',
        x: 60,
        y: 60,
        width: 380,
        height: 280,
        settings: { durationSeconds: 2700, remainingSeconds: 2700, isRunning: false },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'work-symbols',
        x: 470,
        y: 60,
        width: 320,
        height: 280,
        settings: { selectedSymbol: 'silent' },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'text',
        x: 60,
        y: 360,
        width: 730,
        height: 180,
        settings: {
          content: '<h3>📌 Quy định giờ làm bài:</h3><ul><li>Giữ trật tự tuyệt đối trong khi làm bài.</li><li>Được phép sử dụng máy tính pocket.</li><li>Nộp bài đúng giờ khi chuông reo.</li></ul>',
        },
        style: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, borderRadius: 16 },
      },
    ],
  },
  {
    id: 'layout_group_work',
    name: 'Thảo Luận Nhóm & Dự Án',
    description: 'Bố cục phân nhóm tự động, đếm ngược thảo luận và biểu tượng nhóm.',
    category: 'builtin',
    icon: '👥',
    background: { type: 'color', value: '#F0F9FF' },
    widgets: [
      {
        type: 'group-maker',
        x: 60,
        y: 50,
        width: 440,
        height: 380,
        settings: { groupCount: 4 },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'timer',
        x: 520,
        y: 50,
        width: 320,
        height: 240,
        settings: { durationSeconds: 900, remainingSeconds: 900 },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'work-symbols',
        x: 520,
        y: 310,
        width: 320,
        height: 220,
        settings: { selectedSymbol: 'group' },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'checklist',
        x: 60,
        y: 450,
        width: 780,
        height: 180,
        settings: {
          title: 'Nhiệm vụ các nhóm:',
          items: [
            { id: '1', text: 'Bầu nhóm trưởng và thư ký', completed: false },
            { id: '2', text: 'Thảo luận câu hỏi 1 & 2', completed: false },
            { id: '3', text: 'Ghi chép ý kiến vào sơ đồ tư duy', completed: false },
            { id: '4', text: 'Cử đại diện trình bày kết quả', completed: false },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
    ],
  },
  {
    id: 'layout_morning_routine',
    name: 'Chào Buổi Sáng & Bắt Đầu Tiết',
    description: 'Đồng hồ thời gian thực, lịch học, thông báo đầu giờ và đo độ ồn.',
    category: 'builtin',
    icon: '☀️',
    background: { type: 'color', value: '#FFFBEB' },
    widgets: [
      {
        type: 'clock',
        x: 60,
        y: 60,
        width: 340,
        height: 240,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'calendar',
        x: 420,
        y: 60,
        width: 360,
        height: 240,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'sticky-note',
        x: 60,
        y: 320,
        width: 340,
        height: 240,
        settings: {
          text: '🌅 Chào mừng cả lớp!\n\nChuẩn bị sẵn:\n- Sách giáo khoa Tập 2\n- Vở ghi bài & Bút màu\n- Dụng cụ học tập',
          color: '#FEF08A',
        },
        style: { borderRadius: 16 },
      },
      {
        type: 'sound-level',
        x: 420,
        y: 320,
        width: 360,
        height: 240,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
    ],
  },
  {
    id: 'layout_quiz_competition',
    name: 'Thi Đua & Trò Chơi Lớp Học',
    description: 'Bảng điểm 4 đội, đĩa quay/vòng quay ngẫu nhiên và bấm giờ.',
    category: 'builtin',
    icon: '🏆',
    background: { type: 'color', value: '#F3E8FF' },
    widgets: [
      {
        type: 'scoreboard',
        x: 60,
        y: 50,
        width: 780,
        height: 220,
        settings: {
          teams: [
            { id: 't1', name: 'Đội Rồng Xanh', score: 0, color: '#3B82F6' },
            { id: 't2', name: 'Đội Hổ Vàng', score: 0, color: '#EAB308' },
            { id: 't3', name: 'Đội Đại Bàng Red', score: 0, color: '#EF4444' },
            { id: 't4', name: 'Đội Phượng Hoàng', score: 0, color: '#10B981' },
          ],
        },
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'spinner',
        x: 60,
        y: 290,
        width: 380,
        height: 320,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'stopwatch',
        x: 460,
        y: 290,
        width: 380,
        height: 320,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
    ],
  },
  {
    id: 'layout_brainstorming',
    name: 'Ý Tưởng & Vẽ Bảng Tương Tác',
    description: 'Bảng vẽ trực tiếp kết hợp ghi chú dán ý tưởng và bộ câu hỏi ngẫu nhiên.',
    category: 'builtin',
    icon: '🎨',
    background: { type: 'color', value: '#F1F5F9' },
    widgets: [
      {
        type: 'draw',
        x: 60,
        y: 50,
        width: 520,
        height: 520,
        style: { backgroundColor: '#ffffff', borderRadius: 16 },
      },
      {
        type: 'sticky-note',
        x: 600,
        y: 50,
        width: 260,
        height: 250,
        settings: { text: '💡 Ý tưởng 1:\nTập trung vào ví dụ thực tế.', color: '#BAE6FD' },
        style: { borderRadius: 16 },
      },
      {
        type: 'sticky-note',
        x: 600,
        y: 320,
        width: 260,
        height: 250,
        settings: { text: '✨ Ý tưởng 2:\nSử dụng hình ảnh minh họa sinh động.', color: '#BBF7D0' },
        style: { borderRadius: 16 },
      },
    ],
  },
];

export function getCustomLayouts(): LayoutPreset[] {
  try {
    const data = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCustomLayoutToStorage(preset: LayoutPreset): LayoutPreset[] {
  const current = getCustomLayouts();
  const updated = [preset, ...current.filter((p) => p.id !== preset.id)];
  try {
    localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save custom layout to localStorage:', err);
  }
  return updated;
}

export function deleteCustomLayoutFromStorage(id: string): LayoutPreset[] {
  const current = getCustomLayouts();
  const updated = current.filter((p) => p.id !== id);
  try {
    localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to delete custom layout from localStorage:', err);
  }
  return updated;
}
