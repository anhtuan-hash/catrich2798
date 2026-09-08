const fold = (value) => String(value || '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLowerCase();

export const GIFTED_TEACHER_ASSIGNMENTS_2026_2027 = Object.freeze([
  { sourceKey: 'hsg-2026-toan-10', gradeLevel: '10', subject: 'Toán', className: 'Bồi dưỡng Toán 10', teachers: ['Võ Thị Thanh Huyền'] },
  { sourceKey: 'hsg-2026-toan-11', gradeLevel: '11', subject: 'Toán', className: 'Bồi dưỡng Toán 11', teachers: ['Phạm Vũ Xuân Hằng'] },
  { sourceKey: 'hsg-2026-toan-12', gradeLevel: '12', subject: 'Toán', className: 'Bồi dưỡng Toán 12', teachers: ['Trần Nguyên Dự', 'Nguyễn Văn Minh'] },
  { sourceKey: 'hsg-2026-toan-12-casio', gradeLevel: '12', subject: 'Toán/Casio', className: 'Bồi dưỡng Toán 12 - Casio', teachers: ['Trần Trọng Tiên', 'Nguyễn Đình Dương'] },

  { sourceKey: 'hsg-2026-ngu-van-10', gradeLevel: '10', subject: 'Ngữ văn', className: 'Bồi dưỡng Ngữ văn 10', teachers: ['Nguyễn Võ Hữu Được', 'Bùi Thị Thương', 'Văn Thị Bích Liên'] },
  { sourceKey: 'hsg-2026-ngu-van-11', gradeLevel: '11', subject: 'Ngữ văn', className: 'Bồi dưỡng Ngữ văn 11', teachers: ['Văn Thị Bích Liên', 'Lê Thị Hà', 'Cao Thị Hương'] },
  { sourceKey: 'hsg-2026-ngu-van-12', gradeLevel: '12', subject: 'Ngữ văn', className: 'Bồi dưỡng Ngữ văn 12', teachers: ['Lê Thị Hà', 'Bùi Thị Thương', 'Cao Thị Hương'] },

  { sourceKey: 'hsg-2026-vat-li-10', gradeLevel: '10', subject: 'Vật lí', className: 'Bồi dưỡng Vật lí 10', teachers: ['Trương Thị Thanh Tuyền', 'Nguyễn Hoàng Thúy Vy', 'Lê Thị Tú', 'Lê Thị Mỹ Thẩm'] },
  { sourceKey: 'hsg-2026-vat-li-11', gradeLevel: '11', subject: 'Vật lí', className: 'Bồi dưỡng Vật lí 11', teachers: ['Trương Thị Thanh Tuyền', 'Nguyễn Hoàng Thúy Vy', 'Lê Thị Tú', 'Lê Thị Mỹ Thẩm'] },
  { sourceKey: 'hsg-2026-vat-li-12', gradeLevel: '12', subject: 'Vật lí', className: 'Bồi dưỡng Vật lí 12', teachers: ['Trương Thị Thanh Tuyền', 'Nguyễn Hoàng Thúy Vy', 'Lê Thị Tú', 'Lê Thị Mỹ Thẩm'] },

  { sourceKey: 'hsg-2026-hoa-hoc-10', gradeLevel: '10', subject: 'Hóa học', className: 'Bồi dưỡng Hóa học 10', teachers: ['Nguyễn Minh Tiến', 'Trần Thị Bảo Quỳnh', 'Nguyễn Thị Bích Ngọc'] },
  { sourceKey: 'hsg-2026-hoa-hoc-11', gradeLevel: '11', subject: 'Hóa học', className: 'Bồi dưỡng Hóa học 11', teachers: ['Nguyễn Minh Tiến', 'Trần Thị Bảo Quỳnh', 'Nguyễn Thị Bích Ngọc', 'Lê Thị Hồng Mai'] },
  { sourceKey: 'hsg-2026-hoa-hoc-12', gradeLevel: '12', subject: 'Hóa học', className: 'Bồi dưỡng Hóa học 12', teachers: ['Nguyễn Minh Tiến', 'Lê Thị Hồng Mai'] },

  { sourceKey: 'hsg-2026-sinh-hoc-10', gradeLevel: '10', subject: 'Sinh học', className: 'Bồi dưỡng Sinh học 10', teachers: ['Nguyễn Thị Ninh', 'Nguyễn Thị Minh Phượng'] },
  { sourceKey: 'hsg-2026-sinh-hoc-12', gradeLevel: '12', subject: 'Sinh học', className: 'Bồi dưỡng Sinh học 12', teachers: ['Nguyễn Thị Ninh', 'Nguyễn Thị Minh Phượng'] },

  { sourceKey: 'hsg-2026-tieng-anh-10', gradeLevel: '10', subject: 'Tiếng Anh', className: 'Bồi dưỡng Tiếng Anh 10', teachers: ['Ngô Thị Mỹ Diệp', 'Nguyễn Thị Mỹ Duyên'] },
  { sourceKey: 'hsg-2026-tieng-anh-11', gradeLevel: '11', subject: 'Tiếng Anh', className: 'Bồi dưỡng Tiếng Anh 11', teachers: ['Nguyễn Đặng Minh Hoa', 'Đào Ngọc Nhã'] },
  { sourceKey: 'hsg-2026-tieng-anh-12', gradeLevel: '12', subject: 'Tiếng Anh', className: 'Bồi dưỡng Tiếng Anh 12', teachers: ['Phạm Thị Ngọc Châm'] },

  { sourceKey: 'hsg-2026-lich-su-10', gradeLevel: '10', subject: 'Lịch sử', className: 'Bồi dưỡng Lịch sử 10', teachers: ['Nguyễn Thị Hà', 'Đoàn Thị Thành Hằng'] },
  { sourceKey: 'hsg-2026-lich-su-11', gradeLevel: '11', subject: 'Lịch sử', className: 'Bồi dưỡng Lịch sử 11', teachers: ['Nguyễn Thị Hà', 'Đoàn Thị Thanh Hằng'] },
  { sourceKey: 'hsg-2026-lich-su-12', gradeLevel: '12', subject: 'Lịch sử', className: 'Bồi dưỡng Lịch sử 12', teachers: ['Nguyễn Thị Hà'] },

  { sourceKey: 'hsg-2026-dia-li-11', gradeLevel: '11', subject: 'Địa lí', className: 'Bồi dưỡng Địa lí 11', teachers: ['Lê Văn Hôn'] },
  { sourceKey: 'hsg-2026-dia-li-12', gradeLevel: '12', subject: 'Địa lí', className: 'Bồi dưỡng Địa lí 12', teachers: ['Lê Văn Hôn'] },
]);

export function gradeLevelFromExtraClass(input = {}) {
  const explicit = String(input.gradeLevel || input.grade_level || '').trim();
  if (['10', '11', '12'].includes(explicit)) return explicit;
  const match = String(input.className || input.class_name || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/);
  return match?.[1] || '';
}

export function giftedAssignmentForClass(input = {}) {
  const sourceKey = String(input.sourceKey || input.source_key || '').trim();
  if (sourceKey) {
    const exact = GIFTED_TEACHER_ASSIGNMENTS_2026_2027.find((item) => item.sourceKey === sourceKey);
    if (exact) return exact;
  }

  const gradeLevel = gradeLevelFromExtraClass(input);
  const className = fold(input.className || input.class_name);
  const subject = fold(input.subject);
  const wantsCasio = className.includes('casio') || subject.includes('casio');

  return GIFTED_TEACHER_ASSIGNMENTS_2026_2027.find((item) => {
    if (gradeLevel && item.gradeLevel !== gradeLevel) return false;
    if (wantsCasio !== fold(item.subject).includes('casio')) return false;
    return subject ? fold(item.subject) === subject : className === fold(item.className);
  }) || null;
}

export function teachersForGiftedAssignment(input = {}) {
  return [...(giftedAssignmentForClass(input)?.teachers || [])];
}

export function giftedAssignmentOptions() {
  return GIFTED_TEACHER_ASSIGNMENTS_2026_2027.map((item) => ({
    value: item.sourceKey,
    label: `Khối ${item.gradeLevel} · ${item.subject}`,
    ...item,
    teachers: [...item.teachers],
  }));
}
