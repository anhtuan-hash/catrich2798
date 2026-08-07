import {
  PETRUS_KY_ACADEMIC_PLAN_2026_2027,
  PETRUS_KY_AVERAGE_WEEKS,
} from '../data/homeroomAcademicPlan.js';

// Conduct policy override requested for 2026-2027:
// Week 0 (13/07-18/07/2026) is a real conduct-assessment week and
// participates in period averages instead of being tracking-only.
const plan = PETRUS_KY_ACADEMIC_PLAN_2026_2027;
const week0 = plan?.rows?.find((row) => row?.id === 'orientation-0' || row?.schoolWeekNumber === 0);

if (week0) {
  week0.includeInAverage = true;

  // Existing conduct aggregation intentionally skips rows whose kind is exactly
  // "orientation". Mark Week 0 as an assessed orientation week so all current
  // period/trend calculations include it without changing the visible school label.
  if (week0.kind === 'orientation') week0.kind = 'orientation-assessed';

  if (Array.isArray(PETRUS_KY_AVERAGE_WEEKS) && !PETRUS_KY_AVERAGE_WEEKS.some((row) => row?.id === week0.id)) {
    PETRUS_KY_AVERAGE_WEEKS.unshift(week0);
  }

  // For non-Grade-12 classes, the conduct HKI range previously began on 20/07,
  // which would still exclude Week 0 even after marking it as assessed. This
  // calendar object is the conduct calendar used by the homeroom conduct module.
  if (plan.calendar && (!plan.calendar.semester1Start || plan.calendar.semester1Start > week0.startDate)) {
    plan.calendar.semester1Start = week0.startDate;
  }
}

const TEXT_REPLACEMENTS = [
  {
    from: 'Mỗi học sinh bắt đầu tuần với 100 điểm. Với lớp 12, bốn tuần hè từ 15/06 đến 11/07/2026 được tính vào trung bình Học kỳ I và cả năm; với các khối khác, các tuần này chỉ dùng để theo dõi riêng. Tuần 0 không tính trung bình.',
    to: 'Mỗi học sinh bắt đầu tuần với 100 điểm. Tuần 0 (13/07–18/07/2026) vẫn được xét và tính vào trung bình rèn luyện. Với lớp 12, bốn tuần hè từ 15/06 đến 11/07/2026 cũng được tính vào trung bình Học kỳ I và cả năm; với các khối khác, các tuần hè chỉ dùng để theo dõi riêng.',
  },
  {
    from: '46 tuần tính trung bình cho lớp 12: 4 tuần hè + 21 tuần HKI + 21 tuần HKII; Tuần 0 theo dõi riêng.',
    to: '47 tuần tính trung bình cho lớp 12: 4 tuần hè + Tuần 0 + 21 tuần HKI + 21 tuần HKII.',
  },
  {
    from: '42 tuần tính trung bình (21 tuần HKI + 21 tuần HKII); 4 tuần hè khối 12 và Tuần 0 chỉ theo dõi riêng.',
    to: '43 tuần tính trung bình: Tuần 0 + 21 tuần HKI + 21 tuần HKII; 4 tuần hè khối 12 chỉ theo dõi riêng.',
  },
];

function updateVisibleConductCopy(root = document) {
  if (typeof document === 'undefined' || !root?.querySelectorAll) return;
  root.querySelectorAll('p, span, small, section, div').forEach((element) => {
    if (element.children?.length) return;
    const current = element.textContent || '';
    const replacement = TEXT_REPLACEMENTS.find((item) => current.trim() === item.from);
    if (replacement) element.textContent = replacement.to;
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const installCopyFix = () => {
    updateVisibleConductCopy(document);
    const observer = new MutationObserver(() => updateVisibleConductCopy(document));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installCopyFix, { once: true });
  else installCopyFix();
}
