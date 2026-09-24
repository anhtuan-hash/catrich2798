import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AppWindow,
  Bell,
  Bookmark,
  BookOpenCheck,
  Boxes,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  ClipboardCheck,
  FileText,
  Gauge,
  GripVertical,
  EyeOff,
  LayoutGrid,
  MoreHorizontal,
  Search,
  Pin,
  PinOff,
  Plus,
  Presentation,
  Settings,
  ShieldCheck,
  Star,
  UsersRound,
  Zap,
  X,
} from 'lucide-react';
import { APPS } from '../data/apps.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { isAdminRole, isDepartmentLeaderRole } from '../utils/roles.js';
import { launchRoute } from '../utils/navigation.js';
import {
  QUICK_ACCESS_MAX_ITEMS,
  QUICK_ACCESS_RECENT_MAX,
  QUICK_ACCESS_WORKSPACES,
  QUICK_ACCESS_SIZES,
  QUICK_ACCESS_MOTIONS,
  QUICK_ACCESS_DENSITIES,
  QUICK_ACCESS_THEMES,
  QUICK_ACCESS_WORKFLOW_MAX,
  QUICK_ACCESS_WORKFLOW_STEPS_MAX,
  createDefaultQuickAccessConfig,
  loadQuickAccessConfig,
  loadQuickAccessConfigFromCloud,
  saveQuickAccessConfigToCloud,
  subscribeQuickAccessConfig,
} from '../utils/quickAccessPreferences.js';
import './GlobalQuickAccessRail.css';

const STATIC_ITEMS = [
  {
    id: 'route:dashboard',
    label: 'Dashboard',
    labelVi: 'Dashboard',
    target: '#/dashboard',
    route: 'dashboard',
    icon: Gauge,
    accent: '#1a73e8',
  },
  {
    id: 'route:apps',
    label: 'Applications',
    labelVi: 'Ứng dụng',
    target: '#/apps',
    route: 'apps',
    icon: LayoutGrid,
    accent: '#16a765',
  },
  {
    id: 'route:homeroom',
    label: 'Homeroom',
    labelVi: 'Chủ nhiệm',
    target: '#/homeroom',
    route: 'homeroom',
    icon: UsersRound,
    accent: '#d14f92',
  },
  {
    id: 'tool:gradebook-studio',
    label: 'Gradebook',
    labelVi: 'Sổ điểm',
    target: '#/tool/gradebook-studio',
    tool: 'gradebook-studio',
    icon: BookOpenCheck,
    accent: '#d06d4e',
  },
  {
    id: 'action:reports',
    label: 'Reports',
    labelVi: 'Báo cáo',
    target: '#/tool/brian-team',
    tool: 'brian-team',
    icon: FileText,
    accent: '#d99611',
    access: 'reports',
  },
  {
    id: 'action:ttcm',
    label: 'Department workspace',
    labelVi: 'TTCM',
    action: 'ttcm',
    icon: ShieldCheck,
    accent: '#6f50d9',
    access: 'department',
  },
  {
    id: 'action:attendance',
    label: 'Attendance',
    labelVi: 'Điểm danh',
    action: 'attendance',
    icon: ClipboardCheck,
    accent: '#168db1',
    access: 'authenticated',
  },
  {
    id: 'action:schedule',
    label: 'Work schedule',
    labelVi: 'Kế hoạch',
    action: 'schedule',
    icon: CalendarDays,
    accent: '#e68a00',
    access: 'department',
  },
  {
    id: 'route:assessment-core',
    label: 'Question Bank',
    labelVi: 'Ngân hàng câu hỏi',
    target: '#/assessment-core',
    route: 'assessment-core',
    icon: Star,
    accent: '#6647df',
  },
  {
    id: 'route:resource-library',
    label: 'Documents',
    labelVi: 'Tài liệu',
    target: '#/resource-library',
    route: 'resource-library',
    icon: AppWindow,
    accent: '#e67a42',
  },

  // Action Dock: task-first shortcuts. These deliberately do not duplicate
  // header navigation semantics; they answer "what do I want to do now?".
  {
    id: 'action:today',
    label: 'Today',
    labelVi: 'Hôm nay',
    action: 'today',
    icon: CalendarDays,
    accent: '#2575d9',
    requiresRoute: 'dashboard',
    description: 'Open today’s schedule, tasks and upcoming work.',
    descriptionVi: 'Mở lịch hôm nay, việc cần làm và các mốc sắp tới.',
  },
  {
    id: 'action:attendance-quick',
    label: 'Quick attendance',
    labelVi: 'Điểm danh nhanh',
    action: 'attendance',
    icon: ClipboardCheck,
    accent: '#168db1',
    access: 'authenticated',
    description: 'Open attendance immediately with the current teaching context.',
    descriptionVi: 'Vào ngay công cụ điểm danh theo ngữ cảnh dạy học hiện tại.',
  },
  {
    id: 'action:create-exam',
    label: 'Create exam',
    labelVi: 'Soạn đề nhanh',
    action: 'create-exam',
    icon: Plus,
    accent: '#6c55d9',
    requiresRoute: 'assessment-core',
    description: 'Start a new exam directly from Brian Question Bank.',
    descriptionVi: 'Bắt đầu tạo đề mới trực tiếp từ Brian Question Bank.',
  },
  {
    id: 'action:question-bank',
    label: 'Question Bank',
    labelVi: 'Ngân hàng câu hỏi',
    action: 'question-bank',
    icon: Star,
    accent: '#6647df',
    requiresRoute: 'assessment-core',
    description: 'Search questions, bundles and saved exams.',
    descriptionVi: 'Tìm câu hỏi, chùm bài và các đề đã lưu.',
  },
  {
    id: 'action:student-attention',
    label: 'Students needing attention',
    labelVi: 'Học sinh cần chú ý',
    action: 'student-attention',
    icon: UsersRound,
    accent: '#cf4e87',
    requiresRoute: 'student-support',
    description: 'Review factual student-support signals and follow-up cases.',
    descriptionVi: 'Xem tín hiệu cần theo dõi và các trường hợp học sinh cần hỗ trợ.',
  },
  {
    id: 'action:gradebook-quick',
    label: 'Quick gradebook',
    labelVi: 'Sổ điểm nhanh',
    action: 'gradebook-quick',
    icon: BookOpenCheck,
    accent: '#d06d4e',
    requiresTool: 'gradebook-studio',
    description: 'Return directly to the teacher gradebook.',
    descriptionVi: 'Mở nhanh sổ điểm giáo viên để tiếp tục nhập và theo dõi điểm.',
  },
  {
    id: 'action:ttcm-today',
    label: 'Department today',
    labelVi: 'TTCM hôm nay',
    action: 'ttcm-today',
    icon: ShieldCheck,
    accent: '#6f50d9',
    access: 'department',
    description: 'Open today’s department schedule and pending work.',
    descriptionVi: 'Mở kế hoạch hôm nay và các việc tổ chuyên môn cần xử lý.',
  },
  {
    id: 'action:resource-library',
    label: 'Teaching resources',
    labelVi: 'Kho học liệu',
    action: 'resource-library',
    icon: AppWindow,
    accent: '#e67a42',
    requiresRoute: 'resource-library',
    description: 'Open shared teaching resources and recently used materials.',
    descriptionVi: 'Mở kho học liệu dùng chung và tài liệu đang sử dụng.',
  },
  {
    id: 'action:teacher-tools',
    label: 'Teacher tools',
    labelVi: 'TextLab / Công cụ',
    action: 'teacher-tools',
    icon: Zap,
    accent: '#315fc4',
    requiresTool: 'textlab-activities',
    description: 'Open Brian TextLab and teacher content utilities.',
    descriptionVi: 'Mở Brian TextLab và nhóm công cụ xử lý nội dung cho giáo viên.',
  },
];

function labelFor(item, language) {
  return language === 'vi' ? (item.labelVi || item.label) : (item.label || item.labelVi);
}

function descriptionFor(item, language) {
  if (!item) return '';
  if (language === 'vi') {
    return item.descriptionVi
      || item.app?.descriptionVi
      || item.app?.description
      || 'Mở nhanh ứng dụng hoặc tính năng này.';
  }
  return item.description
    || item.app?.description
    || item.app?.descriptionVi
    || 'Open this app or feature quickly.';
}

function contextIdsFor(currentRoute, selectedTool) {
  if (currentRoute === 'homeroom') return ['action:attendance-quick', 'action:student-attention', 'action:gradebook-quick'];
  if (currentRoute === 'assessment-core') return ['action:create-exam', 'action:resource-library', 'action:teacher-tools'];
  if (currentRoute === 'resource-library') return ['action:create-exam', 'action:question-bank', 'action:teacher-tools'];
  if (currentRoute === 'tool' && selectedTool?.slug === 'brian-team') return ['action:ttcm-today', 'action:resource-library', 'action:today'];
  if (currentRoute === 'tool' && selectedTool?.slug === 'gradebook-studio') return ['action:student-attention', 'action:attendance-quick', 'action:today'];
  if (currentRoute === 'apps') return ['action:today', 'action:create-exam', 'action:teacher-tools'];
  return ['action:today', 'action:attendance-quick', 'action:create-exam'];
}

function timeAwareContextFor(hour, language) {
  const vi = language === 'vi';
  const safeHour = Math.max(0, Math.min(23, Number(hour) || 0));
  if (safeHour >= 5 && safeHour < 10) {
    return {
      id: 'morning',
      kicker: vi ? 'BUỔI SÁNG' : 'MORNING',
      title: vi ? 'Khởi động ngày làm việc' : 'Start the workday',
      description: vi ? 'Ưu tiên lịch, điểm danh và các việc cần mở đầu ngày.' : 'Prioritize schedule, attendance and start-of-day tasks.',
      ids: ['action:today', 'action:attendance-quick', 'action:gradebook-quick', 'action:student-attention'],
    };
  }
  if (safeHour >= 10 && safeHour < 17) {
    return {
      id: 'teaching',
      kicker: vi ? 'GIỜ DẠY' : 'TEACHING HOURS',
      title: vi ? 'Ưu tiên công cụ giảng dạy' : 'Teaching tools first',
      description: vi ? 'Sổ điểm, học liệu và ngân hàng câu hỏi được đưa lên trước.' : 'Gradebook, resources and question bank move to the front.',
      ids: ['action:gradebook-quick', 'action:create-exam', 'action:question-bank', 'action:resource-library'],
    };
  }
  if (safeHour >= 17 && safeHour < 22) {
    return {
      id: 'wrapup',
      kicker: vi ? 'CUỐI NGÀY' : 'WRAP-UP',
      title: vi ? 'Khép lại công việc trong ngày' : 'Wrap up the day',
      description: vi ? 'Ưu tiên báo cáo, TTCM và kế hoạch cho ngày tiếp theo.' : 'Prioritize reports, department work and tomorrow planning.',
      ids: ['action:ttcm-today', 'action:today', 'action:resource-library', 'action:teacher-tools'],
    };
  }
  return {
    id: 'quiet',
    kicker: vi ? 'CHUẨN BỊ' : 'PREP',
    title: vi ? 'Không gian chuẩn bị' : 'Preparation workspace',
    description: vi ? 'Giữ Dashboard, học liệu và kế hoạch ở vị trí dễ truy cập.' : 'Keep Dashboard, resources and planning within easy reach.',
    ids: ['action:today', 'action:resource-library', 'action:teacher-tools', 'action:question-bank'],
  };
}

function contextCopyFor(currentRoute, selectedTool, language) {
  const vi = language === 'vi';
  if (currentRoute === 'homeroom') {
    return {
      kicker: vi ? 'CHỦ NHIỆM' : 'HOMEROOM',
      title: vi ? 'Không gian lớp chủ nhiệm' : 'Homeroom workspace',
      description: vi ? 'Điểm danh, sổ điểm và tài liệu lớp luôn ở ngay bên cạnh.' : 'Attendance, gradebook and class resources stay one step away.',
    };
  }
  if (currentRoute === 'assessment-core') {
    return {
      kicker: vi ? 'NGÂN HÀNG CÂU HỎI' : 'QUESTION BANK',
      title: vi ? 'Không gian ra đề' : 'Assessment workspace',
      description: vi ? 'Tập trung tài liệu, ứng dụng và lối tắt phục vụ tạo đề.' : 'Keep authoring resources and related apps close at hand.',
    };
  }
  if (currentRoute === 'resource-library') {
    return {
      kicker: vi ? 'TÀI LIỆU' : 'RESOURCES',
      title: vi ? 'Không gian học liệu' : 'Resource workspace',
      description: vi ? 'Đi nhanh giữa học liệu, ngân hàng câu hỏi và ứng dụng.' : 'Move quickly between resources, question bank and apps.',
    };
  }
  if (currentRoute === 'tool' && selectedTool?.slug === 'brian-team') {
    return {
      kicker: vi ? 'BÁO CÁO · TTCM' : 'REPORTS · DEPARTMENT',
      title: vi ? 'Không gian điều hành tổ' : 'Department workspace',
      description: vi ? 'Kế hoạch, kênh TTCM và tài liệu quản lí theo đúng ngữ cảnh.' : 'Schedule, department feed and management resources in context.',
    };
  }
  if (currentRoute === 'tool' && selectedTool?.slug === 'gradebook-studio') {
    return {
      kicker: vi ? 'SỔ ĐIỂM' : 'GRADEBOOK',
      title: vi ? 'Không gian theo dõi học tập' : 'Learning progress workspace',
      description: vi ? 'Chuyển nhanh tới chủ nhiệm, điểm danh và dashboard.' : 'Jump to homeroom, attendance and dashboard without losing flow.',
    };
  }
  if (currentRoute === 'apps') {
    return {
      kicker: vi ? 'ỨNG DỤNG' : 'APPS',
      title: vi ? 'Trung tâm ứng dụng Brian' : 'Brian app center',
      description: vi ? 'Các lối tắt được ưu tiên theo ứng dụng bạn đang cần.' : 'Shortcuts are prioritized around the apps you need now.',
    };
  }
  return {
    kicker: vi ? 'BỐI CẢNH HIỆN TẠI' : 'CURRENT CONTEXT',
    title: vi ? 'Không gian làm việc Brian' : 'Brian workspace',
    description: vi ? 'Thanh bên tự thay đổi theo trang đang mở mà không làm dịch nội dung.' : 'The sidebar adapts to the current page without shifting content.',
  };
}

const CLASSROOM_MODE_BLOCKED_IDS = new Set([
  'action:reports',
  'action:ttcm',
  'action:schedule',
  'action:ttcm-today',
  'tool:brian-team',
  'route:settings',
]);

function classroomModeAllowsItem(item) {
  if (!item) return false;
  if (item.access === 'department' || item.access === 'reports') return false;
  if (CLASSROOM_MODE_BLOCKED_IDS.has(String(item.id || ''))) return false;
  const signature = `${item.id || ''} ${item.route || ''} ${item.tool || ''}`.toLowerCase();
  return !/(^|[:\s-])(admin|settings|report|ttcm|personnel|audit|governance)([:\s-]|$)/i.test(signature);
}

function workspaceAllowsItem(workspace, item) {
  if (!item || workspace === 'all') return Boolean(item);
  const id = String(item.id || '');
  if (workspace === 'teaching') {
    return [
      'action:today', 'action:create-exam', 'action:question-bank', 'action:gradebook-quick',
      'action:resource-library', 'action:teacher-tools',
      'route:assessment-core', 'route:resource-library', 'tool:gradebook-studio', 'route:apps', 'route:dashboard',
    ].includes(id) || id.startsWith('tool:');
  }
  if (workspace === 'homeroom') {
    return [
      'action:today', 'action:attendance-quick', 'action:student-attention', 'action:gradebook-quick',
      'action:resource-library',
      'route:homeroom', 'action:attendance', 'tool:gradebook-studio', 'route:resource-library', 'route:dashboard',
    ].includes(id);
  }
  if (workspace === 'department') {
    return [
      'action:today', 'action:ttcm-today', 'action:resource-library',
      'action:ttcm', 'action:schedule', 'action:reports', 'route:resource-library', 'route:dashboard',
    ].includes(id);
  }
  return true;
}

function quickCreateDescriptors(language) {
  const vi = language === 'vi';
  return [
    {
      id: 'create-exam',
      label: vi ? 'Tạo đề mới' : 'Create exam',
      description: vi ? 'Mở ngân hàng câu hỏi và bắt đầu đề mới.' : 'Open Question Bank and start a new exam.',
      itemId: 'route:assessment-core',
      event: 'bes-assessment-quick-create',
      detail: { type: 'exam' },
      keywords: 'tạo đề new exam assessment đề thi',
    },
    {
      id: 'add-question',
      label: vi ? 'Thêm câu hỏi' : 'Add question',
      description: vi ? 'Đi thẳng tới quy trình thêm câu hỏi.' : 'Jump into the question-authoring flow.',
      itemId: 'route:assessment-core',
      event: 'bes-assessment-quick-create',
      detail: { type: 'question' },
      keywords: 'thêm câu hỏi question bank add question',
    },
    {
      id: 'create-report',
      label: vi ? 'Tạo báo cáo' : 'Create report',
      description: vi ? 'Mở khu vực báo cáo Brian Team.' : 'Open the Brian Team reporting area.',
      itemId: 'action:reports',
      keywords: 'báo cáo report thống kê',
    },
    {
      id: 'attendance-now',
      label: vi ? 'Điểm danh ngay' : 'Take attendance',
      description: vi ? 'Mở nhanh công cụ điểm danh.' : 'Open attendance immediately.',
      itemId: 'action:attendance',
      keywords: 'điểm danh attendance lớp class',
    },
    {
      id: 'work-schedule',
      label: vi ? 'Mở lịch làm việc' : 'Open work schedule',
      description: vi ? 'Mở kế hoạch làm việc TTCM.' : 'Open the department work schedule.',
      itemId: 'action:schedule',
      keywords: 'lịch kế hoạch schedule work plan ttcm',
    },
  ];
}

function quickActionDescriptors(item, language) {
  const vi = language === 'vi';
  if (!item) return [];
  if (item.id === 'action:ttcm') {
    return [
      { id: 'ttcm-feed', label: vi ? 'Mở kênh TTCM' : 'Open TTCM feed', action: 'ttcm-feed' },
      { id: 'ttcm-schedule', label: vi ? 'Mở kế hoạch' : 'Open schedule', action: 'ttcm-schedule' },
      { id: 'ttcm-personnel', label: vi ? 'Nhân sự tổ' : 'Department people', action: 'ttcm-personnel' },
    ];
  }
  if (item.id === 'action:schedule') {
    return [
      { id: 'ttcm-schedule', label: vi ? 'Mở lịch làm việc' : 'Open work schedule', action: 'ttcm-schedule' },
      { id: 'ttcm-feed', label: vi ? 'Kênh TTCM' : 'TTCM feed', action: 'ttcm-feed' },
    ];
  }
  if (item.id === 'action:attendance' || item.id === 'action:attendance-quick') {
    return [{ id: 'attendance', label: vi ? 'Điểm danh ngay' : 'Open attendance', action: 'attendance' }];
  }
  if (item.id === 'action:today') {
    return [
      { id: 'today-open', label: vi ? 'Mở Hôm nay' : 'Open Today' },
      { id: 'today-gradebook', label: vi ? 'Sổ điểm nhanh' : 'Quick gradebook', targetItemId: 'action:gradebook-quick' },
    ];
  }
  if (item.id === 'action:create-exam') {
    return [
      { id: 'exam-create', label: vi ? 'Tạo đề mới' : 'Create new exam' },
      { id: 'exam-bank', label: vi ? 'Mở ngân hàng câu hỏi' : 'Open Question Bank', targetItemId: 'action:question-bank' },
    ];
  }
  if (item.id === 'action:question-bank') {
    return [
      { id: 'question-bank-open', label: vi ? 'Mở ngân hàng' : 'Open Question Bank' },
      { id: 'question-bank-create', label: vi ? 'Soạn đề nhanh' : 'Create exam', targetItemId: 'action:create-exam' },
    ];
  }
  if (item.id === 'action:student-attention') {
    return [
      { id: 'student-attention-open', label: vi ? 'Xem học sinh cần chú ý' : 'Review student signals' },
      { id: 'student-attendance', label: vi ? 'Điểm danh nhanh' : 'Quick attendance', targetItemId: 'action:attendance-quick' },
    ];
  }
  if (item.id === 'action:gradebook-quick') {
    return [
      { id: 'gradebook-quick-open', label: vi ? 'Mở sổ điểm' : 'Open gradebook' },
      { id: 'gradebook-students', label: vi ? 'Học sinh cần chú ý' : 'Students needing attention', targetItemId: 'action:student-attention' },
    ];
  }
  if (item.id === 'action:ttcm-today') {
    return [
      { id: 'ttcm-schedule', label: vi ? 'Kế hoạch hôm nay' : 'Today’s schedule', action: 'ttcm-schedule' },
      { id: 'ttcm-feed', label: vi ? 'Kênh TTCM' : 'TTCM feed', action: 'ttcm-feed' },
      { id: 'ttcm-personnel', label: vi ? 'Nhân sự tổ' : 'Department people', action: 'ttcm-personnel' },
    ];
  }
  if (item.id === 'action:resource-library') {
    return [
      { id: 'resource-open', label: vi ? 'Mở kho học liệu' : 'Open resources' },
      { id: 'resource-question-bank', label: vi ? 'Ngân hàng câu hỏi' : 'Question Bank', targetItemId: 'action:question-bank' },
    ];
  }
  if (item.id === 'action:teacher-tools') {
    return [
      { id: 'teacher-tools-textlab', label: 'Brian TextLab' },
      { id: 'teacher-tools-textcare', label: 'TextCare Fixer', targetItemId: 'tool:textcare' },
      { id: 'teacher-tools-lesson', label: 'Lesson Architect', targetItemId: 'tool:lesson-plan-ai' },
    ];
  }
  if (item.id === 'route:dashboard') {
    return [
      { id: 'dashboard-apps', label: vi ? 'Mở ứng dụng' : 'Open apps', targetItemId: 'route:apps' },
      { id: 'dashboard-schedule', label: vi ? 'Lịch làm việc' : 'Work schedule', action: 'ttcm-schedule' },
    ];
  }
  if (item.id === 'route:homeroom') {
    return [
      { id: 'homeroom-attendance', label: vi ? 'Điểm danh' : 'Attendance', action: 'attendance' },
      { id: 'homeroom-gradebook', label: vi ? 'Sổ điểm' : 'Gradebook', targetItemId: 'tool:gradebook-studio' },
    ];
  }
  if (item.id === 'tool:gradebook-studio') {
    return [
      { id: 'gradebook-homeroom', label: vi ? 'Chủ nhiệm' : 'Homeroom', targetItemId: 'route:homeroom' },
      { id: 'gradebook-dashboard', label: 'Dashboard', targetItemId: 'route:dashboard' },
    ];
  }
  if (item.id === 'action:reports' || item.tool === 'brian-team') {
    return [
      { id: 'reports-open', label: vi ? 'Mở báo cáo' : 'Open reports', action: 'open' },
      { id: 'reports-schedule', label: vi ? 'Kế hoạch TTCM' : 'TTCM schedule', action: 'ttcm-schedule' },
    ];
  }
  return [{ id: 'open', label: vi ? 'Mở ứng dụng' : 'Open app', action: 'open' }];
}

function readBadgeSnapshot() {
  if (typeof document === 'undefined') return {};
  const next = {};
  const ttcmBadge = document.querySelector('.brian-nav__ttcm-badge');
  if (ttcmBadge) {
    const value = String(ttcmBadge.textContent || '').trim();
    next['action:ttcm'] = value;
    next['action:ttcm-today'] = value;
  }
  const reportCountdown = document.querySelector('.brian-nav__reports-countdown');
  if (reportCountdown) next['action:reports'] = 'dot';
  return next;
}

function dynamicAppItem(app) {
  const route = String(app?.route || '').trim();
  const slug = String(app?.slug || '').trim();
  if (!route && !slug) return null;
  return {
    id: route ? `route:${route}` : `tool:${slug}`,
    label: app.title || app.titleVi || slug || route,
    labelVi: app.titleVi || app.title || slug || route,
    target: route ? `#/${route}` : `#/tool/${slug}`,
    route: route || '',
    tool: route ? '' : slug,
    app,
    icon: Boxes,
    accent: app.tone === 'mint' ? '#188b68' : app.tone === 'orange' ? '#d97706' : app.tone === 'red' ? '#cf4563' : '#315fc4',
  };
}

function itemAllowed(item, currentUser, appVisibility) {
  if (!currentUser || !item) return false;

  if (item.requiresRoute && !hasRouteAccess(currentUser, item.requiresRoute, null)) return false;
  if (item.requiresTool && !hasToolAccess(currentUser, item.requiresTool)) return false;

  if (item.access === 'authenticated') return true;
  if (item.access === 'department') return isAdminRole(currentUser.role) || isDepartmentLeaderRole(currentUser.role);
  if (item.access === 'reports') {
    return isAdminRole(currentUser.role)
      || isDepartmentLeaderRole(currentUser.role)
      || hasToolAccess(currentUser, 'brian-team');
  }

  if (item.route && !hasRouteAccess(currentUser, item.route, item.app || null)) return false;
  if (item.tool && !hasToolAccess(currentUser, item.tool)) return false;

  if (!isAdminRole(currentUser.role)) {
    if (!appVisibility?.ready) return false;
    const visibilityId = item.route
      ? visibilityIdForRoute(item.route, null)
      : item.tool
        ? visibilityIdForRoute('tool', item.app || { slug: item.tool })
        : item.requiresRoute
          ? visibilityIdForRoute(item.requiresRoute, null)
          : item.requiresTool
            ? visibilityIdForRoute('tool', { slug: item.requiresTool })
            : '';
    if (visibilityId && isAppHiddenForUser(appVisibility.snapshot, currentUser, visibilityId)) return false;
  }

  return true;
}

function activeItem(item, currentRoute, selectedTool) {
  const id = String(item?.id || '');
  if (id === 'action:today') return currentRoute === 'dashboard';
  if (id === 'action:question-bank') return currentRoute === 'assessment-core';
  if (id === 'action:student-attention') return currentRoute === 'student-support';
  if (id === 'action:gradebook-quick') return currentRoute === 'tool' && selectedTool?.slug === 'gradebook-studio';
  if (id === 'action:resource-library') return currentRoute === 'resource-library';
  if (id === 'action:teacher-tools') {
    return currentRoute === 'tool' && ['textlab-activities', 'textcare', 'lesson-plan-ai'].includes(String(selectedTool?.slug || ''));
  }
  if (id.startsWith('action:')) return false;
  if (item.route) return currentRoute === item.route;
  if (item.tool) return currentRoute === 'tool' && selectedTool?.slug === item.tool;
  return false;
}

function statusIdsForItem(item) {
  const id = String(item?.id || '');
  const aliases = {
    'action:today': 'route:dashboard',
    'action:attendance-quick': 'action:attendance',
    'action:create-exam': 'route:assessment-core',
    'action:question-bank': 'route:assessment-core',
    'action:student-attention': 'route:student-support',
    'action:gradebook-quick': 'tool:gradebook-studio',
    'action:ttcm-today': 'action:ttcm',
    'action:resource-library': 'route:resource-library',
    'action:teacher-tools': 'tool:textlab-activities',
  };
  return [id, aliases[id]].filter(Boolean);
}

function openTtcm(view = 'feed') {
  try { window.sessionStorage.setItem('bes-ttcm-open-on-load', view); } catch { /* optional */ }
  const button = document.querySelector('.brian-nav__ttcm-tab');
  if (button) {
    button.click();
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
    }, 80);
    return;
  }

  if (window.location.hash !== '#/dashboard') {
    window.location.hash = '#/dashboard';
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
    }, 360);
  } else {
    window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view } }));
  }
}

function launchQuickAccessTarget(target, label, color, sourceEl, source = 'quick-access-action-dock') {
  if (!target) return;
  launchRoute({
    target,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color,
    sourceEl,
    meta: { source },
  });
}

function runAction(item, sourceEl) {
  if (item.action === 'today') {
    try { window.sessionStorage.setItem('bes-dashboard-focus-on-load', 'today'); } catch { /* optional */ }
    launchQuickAccessTarget('#/dashboard', item.labelVi || item.label, item.accent, sourceEl);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-dashboard-focus', { detail: { section: 'today', source: 'action-dock' } })), 360);
    return;
  }
  if (item.action === 'create-exam') {
    launchQuickAccessTarget('#/assessment-core', item.labelVi || item.label, item.accent, sourceEl);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bes-assessment-quick-create', { detail: { type: 'exam', source: 'action-dock' } })), 360);
    return;
  }
  if (item.action === 'question-bank') {
    launchQuickAccessTarget('#/assessment-core', item.labelVi || item.label, item.accent, sourceEl);
    return;
  }
  if (item.action === 'student-attention') {
    launchQuickAccessTarget('#/student-support', item.labelVi || item.label, item.accent, sourceEl);
    return;
  }
  if (item.action === 'gradebook-quick') {
    launchQuickAccessTarget('#/tool/gradebook-studio', item.labelVi || item.label, item.accent, sourceEl);
    return;
  }
  if (item.action === 'ttcm-today') {
    openTtcm('schedule');
    return;
  }
  if (item.action === 'resource-library') {
    launchQuickAccessTarget('#/resource-library', item.labelVi || item.label, item.accent, sourceEl);
    return;
  }
  if (item.action === 'teacher-tools') {
    launchQuickAccessTarget('#/tool/textlab-activities', item.labelVi || item.label, item.accent, sourceEl);
    return;
  }
  if (item.action === 'ttcm') {
    openTtcm('feed');
    return;
  }
  if (item.action === 'schedule') {
    openTtcm('schedule');
    return;
  }
  if (item.action === 'attendance') {
    const attendanceButton = document.querySelector('.brian-nav__attendance-tab');
    if (attendanceButton) attendanceButton.click();
    return;
  }
  if (item.target) {
    launchRoute({
      target: item.target,
      label: String(item.labelVi || item.label || 'GO').slice(0, 2).toUpperCase(),
      color: item.accent,
      sourceEl,
      meta: { source: 'quick-access-rail' },
    });
  }
}

const QUICK_ACCESS_HISTORY_MAX = 6;
const QUICK_ACCESS_RESUME_MAX = 4;

function quickAccessWorkflowRunStorageKey(user) {
  return `bes-quick-access-workflow-run:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessWorkflowRun(user) {
  if (typeof window === 'undefined') return null;
  try {
    const value = JSON.parse(window.sessionStorage?.getItem(quickAccessWorkflowRunStorageKey(user)) || 'null');
    if (!value || typeof value !== 'object') return null;
    const workflowId = String(value.workflowId || '').trim();
    const nextIndex = Math.max(0, Number(value.nextIndex) || 0);
    return workflowId ? { workflowId, nextIndex } : null;
  } catch {
    return null;
  }
}

function saveQuickAccessWorkflowRun(user, value) {
  if (typeof window === 'undefined') return;
  try {
    if (!value?.workflowId) {
      window.sessionStorage?.removeItem(quickAccessWorkflowRunStorageKey(user));
      return;
    }
    window.sessionStorage?.setItem(
      quickAccessWorkflowRunStorageKey(user),
      JSON.stringify({ workflowId: String(value.workflowId), nextIndex: Math.max(0, Number(value.nextIndex) || 0) }),
    );
  } catch {
    // Workflow run state is best effort.
  }
}

const QUICK_ACCESS_SPATIAL_SCROLL_MAX = 24;

function quickAccessSpatialStorageKey(user) {
  return `bes-quick-access-spatial-v1:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessSpatialMemory(user) {
  const fallback = { workspace: '', side: '', lastItemId: '', scroll: {}, updatedAt: 0 };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessSpatialStorageKey(user)) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    const scrollEntries = Object.entries(raw.scroll && typeof raw.scroll === 'object' ? raw.scroll : {})
      .filter(([key, value]) => key && Number.isFinite(Number(value)))
      .slice(-QUICK_ACCESS_SPATIAL_SCROLL_MAX);
    return {
      workspace: QUICK_ACCESS_WORKSPACES.includes(String(raw.workspace || '')) ? String(raw.workspace) : '',
      side: 'left',
      lastItemId: String(raw.lastItemId || '').trim(),
      scroll: Object.fromEntries(scrollEntries.map(([key, value]) => [key, Math.max(0, Number(value) || 0)])),
      updatedAt: Number(raw.updatedAt) || 0,
    };
  } catch {
    return fallback;
  }
}

function saveQuickAccessSpatialMemory(user, memory) {
  if (typeof window === 'undefined') return;
  try {
    const scrollEntries = Object.entries(memory?.scroll && typeof memory.scroll === 'object' ? memory.scroll : {})
      .filter(([key, value]) => key && Number.isFinite(Number(value)))
      .slice(-QUICK_ACCESS_SPATIAL_SCROLL_MAX);
    const safe = {
      workspace: QUICK_ACCESS_WORKSPACES.includes(String(memory?.workspace || '')) ? String(memory.workspace) : '',
      side: 'left',
      lastItemId: String(memory?.lastItemId || '').trim(),
      scroll: Object.fromEntries(scrollEntries.map(([key, value]) => [key, Math.max(0, Number(value) || 0)])),
      updatedAt: Number(memory?.updatedAt) || Date.now(),
    };
    window.localStorage?.setItem(quickAccessSpatialStorageKey(user), JSON.stringify(safe));
  } catch {
    // Device-local spatial memory is best effort.
  }
}

function spatialContextKey(currentRoute, selectedTool, workspace) {
  const route = String(currentRoute || 'unknown').trim() || 'unknown';
  const tool = String(selectedTool?.slug || '').trim();
  return `${workspace || 'all'}:${route}${tool ? `:${tool}` : ''}`;
}

const QUICK_ACCESS_CONTEXT_MEMORY_MAX = 32;

function quickAccessContextMemoryStorageKey(user) {
  return `bes-quick-access-context-v1:${quickAccessHistoryUserKey(user)}`;
}

function routeWorkspaceContextKey(currentRoute, selectedTool) {
  const route = String(currentRoute || 'unknown').trim() || 'unknown';
  const tool = String(selectedTool?.slug || '').trim();
  return `${route}${tool ? `:${tool}` : ''}`;
}

function loadQuickAccessContextMemory(user) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessContextMemoryStorageKey(user)) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const entries = Object.entries(raw)
      .filter(([key, value]) => key && QUICK_ACCESS_WORKSPACES.includes(String(value || '')))
      .slice(-QUICK_ACCESS_CONTEXT_MEMORY_MAX);
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function saveQuickAccessContextMemory(user, memory) {
  if (typeof window === 'undefined') return;
  try {
    const entries = Object.entries(memory && typeof memory === 'object' ? memory : {})
      .filter(([key, value]) => key && QUICK_ACCESS_WORKSPACES.includes(String(value || '')))
      .slice(-QUICK_ACCESS_CONTEXT_MEMORY_MAX);
    window.localStorage?.setItem(quickAccessContextMemoryStorageKey(user), JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Route workspace memory is device-local and best effort.
  }
}

const QUICK_ACCESS_PARKING_MAX = 5;
const QUICK_ACCESS_SNAPSHOT_MAX = 6;
const QUICK_ACCESS_UNDO_MAX = 5;

function quickAccessSectionFoldStorageKey(user) {
  return `bes-quick-access-folds-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessSectionFolds(user) {
  const fallback = { recent: false, pinned: false, apps: false };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessSectionFoldStorageKey(user)) || '{}');
    return {
      recent: raw?.recent === true,
      pinned: raw?.pinned === true,
      apps: raw?.apps === true,
    };
  } catch {
    return fallback;
  }
}

function saveQuickAccessSectionFolds(user, folds) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(quickAccessSectionFoldStorageKey(user), JSON.stringify({
      recent: folds?.recent === true,
      pinned: folds?.pinned === true,
      apps: folds?.apps === true,
    }));
  } catch {
    // Section folding is account-scoped device state.
  }
}

function quickAccessContextLockStorageKey(user) {
  return `bes-quick-access-context-lock-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessContextLock(user) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = JSON.parse(window.sessionStorage?.getItem(quickAccessContextLockStorageKey(user)) || 'null');
    if (!raw?.locked || !QUICK_ACCESS_WORKSPACES.includes(String(raw.workspace || ''))) return null;
    return {
      locked: true,
      workspace: String(raw.workspace),
      route: String(raw.route || ''),
      tool: String(raw.tool || ''),
      at: Number(raw.at) || Date.now(),
    };
  } catch {
    return null;
  }
}

function saveQuickAccessContextLock(user, lock) {
  if (typeof window === 'undefined') return;
  try {
    if (!lock?.locked) window.sessionStorage?.removeItem(quickAccessContextLockStorageKey(user));
    else window.sessionStorage?.setItem(quickAccessContextLockStorageKey(user), JSON.stringify(lock));
  } catch {
    // Context lock intentionally lasts only for the browser session.
  }
}

function quickAccessParkingStorageKey(user) {
  return `bes-quick-access-parking-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessParking(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.sessionStorage?.getItem(quickAccessParkingStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.itemId === 'string')
      .slice(0, QUICK_ACCESS_PARKING_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessParking(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(
      quickAccessParkingStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_PARKING_MAX)),
    );
  } catch {
    // Parking is session-scoped by design.
  }
}

function quickAccessSnapshotStorageKey(user) {
  return `bes-quick-access-snapshots-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessSnapshots(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessSnapshotStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.id === 'string' && entry.config && typeof entry.config === 'object')
      .slice(0, QUICK_ACCESS_SNAPSHOT_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessSnapshots(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(
      quickAccessSnapshotStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_SNAPSHOT_MAX)),
    );
  } catch {
    // Snapshots are account-scoped local backups.
  }
}

function cloneQuickAccessState(value, fallback = null) {
  try { return JSON.parse(JSON.stringify(value)); } catch { return fallback; }
}

const QUICK_ACCESS_SHELF_MAX = 5;

function quickAccessShelfStorageKey(user) {
  return `bes-quick-access-shelf-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessShelf(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.sessionStorage?.getItem(quickAccessShelfStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.id === 'string' && ['item', 'text', 'url'].includes(entry.type))
      .slice(0, QUICK_ACCESS_SHELF_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessShelf(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    const persistable = (Array.isArray(entries) ? entries : [])
      .filter((entry) => entry && entry.type !== 'file')
      .slice(0, QUICK_ACCESS_SHELF_MAX);
    window.sessionStorage?.setItem(quickAccessShelfStorageKey(user), JSON.stringify(persistable));
  } catch {
    // Shelf is intentionally session-scoped.
  }
}

function quickAccessAliasesStorageKey(user) {
  return `bes-quick-access-aliases-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessAliases(user) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessAliasesStorageKey(user)) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw)
        .filter(([key, value]) => key && typeof value === 'string' && value.trim())
        .slice(0, 40),
    );
  } catch {
    return {};
  }
}

function saveQuickAccessAliases(user, aliases) {
  if (typeof window === 'undefined') return;
  try {
    const safe = Object.fromEntries(
      Object.entries(aliases && typeof aliases === 'object' ? aliases : {})
        .filter(([key, value]) => key && typeof value === 'string' && value.trim())
        .slice(0, 40),
    );
    window.localStorage?.setItem(quickAccessAliasesStorageKey(user), JSON.stringify(safe));
  } catch {
    // Search aliases are account-scoped device preferences.
  }
}

function quickAccessPrivateItemsStorageKey(user) {
  return `bes-quick-access-private-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessPrivateItems(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessPrivateItemsStorageKey(user)) || '[]');
    return [...new Set((Array.isArray(raw) ? raw : []).map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 40);
  } catch {
    return [];
  }
}

function saveQuickAccessPrivateItems(user, ids) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(
      quickAccessPrivateItemsStorageKey(user),
      JSON.stringify([...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 40)),
    );
  } catch {
    // Private-item choices are account-scoped device preferences.
  }
}

function quickAccessScreenGuardStorageKey(user) {
  return `bes-quick-access-screen-guard-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessScreenGuard(user) {
  if (typeof window === 'undefined') return false;
  try { return window.sessionStorage?.getItem(quickAccessScreenGuardStorageKey(user)) === 'true'; }
  catch { return false; }
}

function saveQuickAccessScreenGuard(user, enabled) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.sessionStorage?.setItem(quickAccessScreenGuardStorageKey(user), 'true');
    else window.sessionStorage?.removeItem(quickAccessScreenGuardStorageKey(user));
  } catch {
    // Screen Guard intentionally lasts only for the browser session.
  }
}

function quickAccessReadingModeStorageKey(user) {
  return `bes-quick-access-reading-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessReadingMode(user) {
  if (typeof window === 'undefined') return false;
  try { return window.localStorage?.getItem(quickAccessReadingModeStorageKey(user)) === 'compact'; }
  catch { return false; }
}

function saveQuickAccessReadingMode(user, enabled) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(quickAccessReadingModeStorageKey(user), enabled ? 'compact' : 'normal');
  } catch {
    // Compact Reading Mode is account-scoped device state.
  }
}

function quickAccessUsageStorageKey(user) {
  return `bes-quick-access-usage-v5:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessUsage(user) {
  const fallback = { apps: {}, commandSearches: 0, workflowRuns: 0 };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessUsageStorageKey(user)) || 'null');
    if (!raw || typeof raw !== 'object') return fallback;
    return {
      apps: raw.apps && typeof raw.apps === 'object' && !Array.isArray(raw.apps) ? raw.apps : {},
      commandSearches: Math.max(0, Number(raw.commandSearches) || 0),
      workflowRuns: Math.max(0, Number(raw.workflowRuns) || 0),
    };
  } catch {
    return fallback;
  }
}

function saveQuickAccessUsage(user, usage) {
  if (typeof window === 'undefined') return;
  try {
    const appEntries = Object.entries(usage?.apps && typeof usage.apps === 'object' ? usage.apps : {})
      .filter(([id, entry]) => id && entry && Number(entry.opens) >= 0)
      .sort((a, b) => Number(b[1]?.lastUsed || 0) - Number(a[1]?.lastUsed || 0))
      .slice(0, 60);
    window.localStorage?.setItem(quickAccessUsageStorageKey(user), JSON.stringify({
      apps: Object.fromEntries(appEntries),
      commandSearches: Math.max(0, Number(usage?.commandSearches) || 0),
      workflowRuns: Math.max(0, Number(usage?.workflowRuns) || 0),
    }));
  } catch {
    // Usage Insights are local-only and never reorder shortcuts automatically.
  }
}

function keyboardLetterForItem(item, index = 0) {
  const preferred = {
    'route:dashboard': 'D',
    'route:apps': 'A',
    'route:homeroom': 'H',
    'tool:gradebook-studio': 'S',
    'action:reports': 'B',
    'action:ttcm': 'T',
  };
  if (preferred[item?.id]) return preferred[item.id];
  const pool = 'FGJKLMNPRUVWXYZ';
  return pool[index % pool.length];
}

const QUICK_ACCESS_BOOKMARK_MAX = 12;

function quickAccessBookmarkStorageKey(user) {
  return `bes-quick-access-bookmarks-v6:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessBookmarks(user) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessBookmarkStorageKey(user)) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw)
        .filter(([itemId, entry]) => itemId && entry && typeof entry.target === 'string' && entry.target.startsWith('#/'))
        .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
        .slice(0, QUICK_ACCESS_BOOKMARK_MAX),
    );
  } catch {
    return {};
  }
}

function saveQuickAccessBookmarks(user, bookmarks) {
  if (typeof window === 'undefined') return;
  try {
    const safe = Object.fromEntries(
      Object.entries(bookmarks && typeof bookmarks === 'object' ? bookmarks : {})
        .filter(([itemId, entry]) => itemId && entry && typeof entry.target === 'string' && entry.target.startsWith('#/'))
        .sort((a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0))
        .slice(0, QUICK_ACCESS_BOOKMARK_MAX),
    );
    window.localStorage?.setItem(quickAccessBookmarkStorageKey(user), JSON.stringify(safe));
  } catch {
    // App State Bookmarks are account-scoped device state.
  }
}

function quickAccessDoubleClickStorageKey(user) {
  return `bes-quick-access-double-click-v6:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessDoubleClickActions(user) {
  if (typeof window === 'undefined') return {};
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessDoubleClickStorageKey(user)) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw)
        .filter(([itemId, descriptorId]) => itemId && typeof descriptorId === 'string' && descriptorId.trim())
        .slice(0, 40),
    );
  } catch {
    return {};
  }
}

function saveQuickAccessDoubleClickActions(user, actions) {
  if (typeof window === 'undefined') return;
  try {
    const safe = Object.fromEntries(
      Object.entries(actions && typeof actions === 'object' ? actions : {})
        .filter(([itemId, descriptorId]) => itemId && typeof descriptorId === 'string' && descriptorId.trim())
        .slice(0, 40),
    );
    window.localStorage?.setItem(quickAccessDoubleClickStorageKey(user), JSON.stringify(safe));
  } catch {
    // Double-click actions are account-scoped device preferences.
  }
}

function quickAccessClassroomModeStorageKey(user) {
  return `bes-quick-access-classroom-mode:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessClassroomMode(user) {
  if (typeof window === 'undefined') return false;
  try { return window.sessionStorage?.getItem(quickAccessClassroomModeStorageKey(user)) === 'true'; }
  catch { return false; }
}

function saveQuickAccessClassroomMode(user, enabled) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) window.sessionStorage?.setItem(quickAccessClassroomModeStorageKey(user), 'true');
    else window.sessionStorage?.removeItem(quickAccessClassroomModeStorageKey(user));
  } catch {
    // Presentation privacy state is session-only by design.
  }
}

function quickAccessHistoryUserKey(user) {
  return String(user?.id || user?.authId || user?.email || 'guest').trim().toLowerCase();
}

function quickAccessHistoryStorageKey(user) {
  return `bes-quick-access-history:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessHistory(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.sessionStorage?.getItem(quickAccessHistoryStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.target === 'string' && entry.target.startsWith('#/'))
      .slice(0, QUICK_ACCESS_HISTORY_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessHistory(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(
      quickAccessHistoryStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_HISTORY_MAX)),
    );
  } catch {
    // Session history is best effort.
  }
}

function quickAccessResumeStorageKey(user) {
  return `bes-quick-access-resume:${quickAccessHistoryUserKey(user)}`;
}

function loadQuickAccessResume(user) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(window.localStorage?.getItem(quickAccessResumeStorageKey(user)) || '[]');
    return (Array.isArray(raw) ? raw : [])
      .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.itemId === 'string')
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, QUICK_ACCESS_RESUME_MAX);
  } catch {
    return [];
  }
}

function saveQuickAccessResume(user, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(
      quickAccessResumeStorageKey(user),
      JSON.stringify((Array.isArray(entries) ? entries : []).slice(0, QUICK_ACCESS_RESUME_MAX)),
    );
  } catch {
    // Resume persistence is best effort.
  }
}

function navigationLabelForTarget(target, catalog, language) {
  const normalized = String(target || '').split('?')[0];
  const item = (Array.isArray(catalog) ? catalog : []).find((candidate) => candidate?.target === normalized);
  if (item) return labelFor(item, language);

  const segments = normalized.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (segments[0] === 'tool' && segments[1]) {
    return segments[1]
      .split('-')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const route = segments[0] || (language === 'vi' ? 'Trang trước' : 'Previous page');
  return route
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const QUICK_ACCESS_SAFE_AREA_MIN_WIDTH = 1024;
const QUICK_ACCESS_SAFE_GAP = 12;
const QUICK_ACCESS_SAFE_MAX_COLLAPSED = 320;
const QUICK_ACCESS_SAFE_MAX_PINNED = 720;
const QUICK_ACCESS_COLLISION_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="tab"]',
  '[role="gridcell"]',
  '[role="columnheader"]',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'label',
  'th',
  'td',
].join(',');

function parseCssPixels(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isQuickAccessCollisionCandidate(element) {
  if (!element || typeof window === 'undefined') return false;
  if (element.closest?.('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(element);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) <= 0.01) return false;
  if (style.position === 'fixed') return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  return true;
}

function measureQuickAccessContentBaseline(container) {
  if (!container) return Number.POSITIVE_INFINITY;
  const candidates = [...container.querySelectorAll(QUICK_ACCESS_COLLISION_SELECTOR)];
  let minLeft = Number.POSITIVE_INFINITY;

  candidates.forEach((element) => {
    if (!isQuickAccessCollisionCandidate(element)) return;
    const rect = element.getBoundingClientRect();
    if (Number.isFinite(rect.left)) minLeft = Math.min(minLeft, rect.left);
  });

  return minLeft;
}

export default function GlobalQuickAccessRail({
  currentUser,
  currentRoute = 'home',
  selectedTool = null,
  language = 'vi',
  appVisibility,
}) {
  const [hovered, setHovered] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [customizerQuery, setCustomizerQuery] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [commandActiveIndex, setCommandActiveIndex] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [workflowCenterOpen, setWorkflowCenterOpen] = useState(false);
  const [workflowDraftName, setWorkflowDraftName] = useState('');
  const [workflowDraftIds, setWorkflowDraftIds] = useState([]);
  const [activeWorkflowRun, setActiveWorkflowRun] = useState(() => loadQuickAccessWorkflowRun(currentUser));
  const [classroomMode, setClassroomMode] = useState(() => loadQuickAccessClassroomMode(currentUser));
  const [deviceSpatial, setDeviceSpatial] = useState(() => loadQuickAccessSpatialMemory(currentUser));
  const [routeWorkspaceMemory, setRouteWorkspaceMemory] = useState(() => loadQuickAccessContextMemory(currentUser));
  const [sectionFolds, setSectionFolds] = useState(() => loadQuickAccessSectionFolds(currentUser));
  const [contextLock, setContextLock] = useState(() => loadQuickAccessContextLock(currentUser));
  const [parkedItems, setParkedItems] = useState(() => loadQuickAccessParking(currentUser));
  const [sidebarSnapshots, setSidebarSnapshots] = useState(() => loadQuickAccessSnapshots(currentUser));
  const [undoStack, setUndoStack] = useState([]);
  const [undoOpen, setUndoOpen] = useState(false);
  const [activeScrollSection, setActiveScrollSection] = useState('apps');
  const [shelfItems, setShelfItems] = useState(() => loadQuickAccessShelf(currentUser));
  const [searchAliases, setSearchAliases] = useState(() => loadQuickAccessAliases(currentUser));
  const [privateItemIds, setPrivateItemIds] = useState(() => loadQuickAccessPrivateItems(currentUser));
  const [screenGuard, setScreenGuard] = useState(() => loadQuickAccessScreenGuard(currentUser));
  const [compactReadingMode, setCompactReadingMode] = useState(() => loadQuickAccessReadingMode(currentUser));
  const [usageInsights, setUsageInsights] = useState(() => loadQuickAccessUsage(currentUser));
  const [appHealth, setAppHealth] = useState({});
  const [precisionDrag, setPrecisionDrag] = useState(false);
  const [keyboardLayer, setKeyboardLayer] = useState(false);
  const [railCapacity, setRailCapacity] = useState(QUICK_ACCESS_MAX_ITEMS);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [activeActionsItemId, setActiveActionsItemId] = useState('');
  const [activeActionsTop, setActiveActionsTop] = useState(118);
  const [handoffTargetId, setHandoffTargetId] = useState('');
  const [appBookmarks, setAppBookmarks] = useState(() => loadQuickAccessBookmarks(currentUser));
  const [doubleClickActions, setDoubleClickActions] = useState(() => loadQuickAccessDoubleClickActions(currentUser));
  const [sessionTrailOpen, setSessionTrailOpen] = useState(false);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [bookmarkToast, setBookmarkToast] = useState('');
  const [timeTick, setTimeTick] = useState(() => Date.now());
  const [backStack, setBackStack] = useState(() => loadQuickAccessHistory(currentUser));
  const [backStackOpen, setBackStackOpen] = useState(false);
  const [resumeItems, setResumeItems] = useState(() => loadQuickAccessResume(currentUser));
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [appSwitcherIndex, setAppSwitcherIndex] = useState(0);
  const [magneticStrength, setMagneticStrength] = useState(0);
  const [dockHoverIndex, setDockHoverIndex] = useState(-1);
  const [peekItemId, setPeekItemId] = useState('');
  const [peekTop, setPeekTop] = useState(92);
  const [actionItemId, setActionItemId] = useState('');
  const [actionTop, setActionTop] = useState(118);
  const [badges, setBadges] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  const [capsules, setCapsules] = useState({});
  const [capsuleItemId, setCapsuleItemId] = useState('');
  const [capsuleTop, setCapsuleTop] = useState(120);
  const [liveActivities, setLiveActivities] = useState([]);
  const [dragId, setDragId] = useState('');
  const [collapsing, setCollapsing] = useState(false);
  const closeTimerRef = useRef(0);
  const collapseMotionTimerRef = useRef(0);
  const peekTimerRef = useRef(0);
  const capsuleTimerRef = useRef(0);
  const magneticTimerRef = useRef(0);
  const badgeFrameRef = useRef(0);
  const spatialScrollTimerRef = useRef(0);
  const commandInputRef = useRef(null);
  const commandPaletteInputRef = useRef(null);
  const layoutFrameRef = useRef(0);
  const layoutSettleTimerRef = useRef(0);
  const layoutVerifyTimerRef = useRef(0);
  const rootRef = useRef(null);
  const railRef = useRef(null);
  const panelRef = useRef(null);
  const panelScrollRef = useRef(null);
  const selectedItemsRef = useRef([]);
  const switcherItemsRef = useRef([]);
  const suppressHistoryRef = useRef(false);
  const activateItemRef = useRef(null);
  const shelfFilesRef = useRef(new Map());
  const activeActionsTimerRef = useRef(0);
  const handoffPacketRef = useRef(null);
  const railClickTimersRef = useRef(new Map());
  const bookmarkToastTimerRef = useRef(0);

  const catalog = useMemo(() => {
    const byId = new Map();
    STATIC_ITEMS.forEach((item) => byId.set(item.id, item));
    APPS.map(dynamicAppItem).filter(Boolean).forEach((item) => {
      if (!byId.has(item.id)) byId.set(item.id, item);
    });
    return [...byId.values()].filter((item) => itemAllowed(item, currentUser, appVisibility));
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    currentUser?.role,
    JSON.stringify(currentUser?.permissions || null),
    appVisibility?.ready,
    appVisibility?.snapshot,
  ]);

  const allowedIds = useMemo(() => catalog.map((item) => item.id), [catalog]);
  const allowedKey = allowedIds.join('|');
  const [config, setConfig] = useState(() => loadQuickAccessConfig(currentUser, allowedIds));

  const sidebarMode = config.mode || (config.pinned ? 'pin' : 'auto');
  const spatialMemoryEnabled = config.spatialMemory !== false;
  const contextMemoryEnabled = config.contextMemory !== false;
  const configWorkspace = QUICK_ACCESS_WORKSPACES.includes(config.workspace) ? config.workspace : 'all';
  const baseWorkspace = spatialMemoryEnabled && QUICK_ACCESS_WORKSPACES.includes(deviceSpatial.workspace)
    ? deviceSpatial.workspace
    : configWorkspace;
  const routeContextKey = routeWorkspaceContextKey(currentRoute, selectedTool);
  const rememberedWorkspace = contextMemoryEnabled && QUICK_ACCESS_WORKSPACES.includes(routeWorkspaceMemory[routeContextKey])
    ? routeWorkspaceMemory[routeContextKey]
    : '';
  const workspace = rememberedWorkspace || baseWorkspace;
  const railSize = QUICK_ACCESS_SIZES.includes(config.size) ? config.size : 'm';
  const motionMode = QUICK_ACCESS_MOTIONS.includes(config.motion) ? config.motion : 'fluid';
  const density = QUICK_ACCESS_DENSITIES.includes(config.density) ? config.density : 'comfortable';
  const railSide = 'left';
  const visualTheme = QUICK_ACCESS_THEMES.includes(config.theme) ? config.theme : 'glass';
  const hoverDelay = Math.max(80, Math.min(700, Number(config.hoverDelay) || 220));
  const showLabels = config.labels !== false;
  const timeAwareEnabled = config.timeAware !== false;
  const pinned = sidebarMode === 'pin';
  const focusMode = sidebarMode === 'focus';
  const expanded = hovered || pinned || customizing || notificationCenterOpen || workflowCenterOpen;

  const openRail = useCallback(() => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, []);

  const focusCommandInput = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      const input = commandInputRef.current;
      const inertAncestor = input?.closest?.('[inert]');
      if (input && !inertAncestor) {
        try { input.focus({ preventScroll: true }); } catch { input.focus?.(); }
      }
      if (attempts < 12) window.setTimeout(tryFocus, 80);
    };
    window.requestAnimationFrame(tryFocus);
  }, []);

  const focusCommandPaletteInput = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let attempts = 0;
    const tryFocus = () => {
      attempts += 1;
      const input = commandPaletteInputRef.current;
      const inertAncestor = input?.closest?.('[inert]');
      if (input && !inertAncestor) {
        input.tabIndex = 0;
        try { input.focus({ preventScroll: true }); } catch { input.focus?.(); }
      }
      if (attempts < 14) window.setTimeout(tryFocus, 70);
    };
    window.requestAnimationFrame(tryFocus);
  }, []);

  const collapseRail = useCallback((force = false) => {
    if (!force && (pinned || customizing || notificationCenterOpen || workflowCenterOpen)) return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);

    if (hovered || pinned || customizing || notificationCenterOpen || workflowCenterOpen) {
      setCollapsing(true);
      setHovered(false);
      collapseMotionTimerRef.current = window.setTimeout(() => {
        setCollapsing(false);
      }, 290);
      return;
    }

    setHovered(false);
    setBackStackOpen(false);
  }, [pinned, customizing, notificationCenterOpen, workflowCenterOpen, hovered]);

  useEffect(() => {
    if ((!notificationCenterOpen && !workflowCenterOpen) || typeof window === 'undefined') return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    setCollapsing(false);
    setHovered(true);
  }, [notificationCenterOpen, workflowCenterOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateCapacity = () => {
      const height = Math.max(560, Number(window.innerHeight) || 900);
      const reserved = 390;
      const itemPitch = railSize === 'l' ? 52 : railSize === 's' ? 40 : 46;
      const next = Math.max(4, Math.min(QUICK_ACCESS_MAX_ITEMS, Math.floor((height - reserved) / itemPitch)));
      setRailCapacity(next);
    };
    updateCapacity();
    window.addEventListener('resize', updateCapacity, { passive: true });
    return () => window.removeEventListener('resize', updateCapacity);
  }, [railSize]);

  useEffect(() => {
    if (!currentUser || !allowedIds.length) return undefined;
    let alive = true;

    const local = loadQuickAccessConfig(currentUser, allowedIds);
    setConfig(local);

    loadQuickAccessConfigFromCloud(currentUser, allowedIds).then((result) => {
      if (alive && result?.config) setConfig(result.config);
    });

    const unsubscribe = subscribeQuickAccessConfig(currentUser, allowedIds, (next) => {
      if (alive) setConfig(next);
    });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [currentUser?.id, currentUser?.authId, currentUser?.email, allowedKey]);

  useEffect(() => {
    setActiveWorkflowRun(loadQuickAccessWorkflowRun(currentUser));
    setClassroomMode(loadQuickAccessClassroomMode(currentUser));
    setDeviceSpatial(loadQuickAccessSpatialMemory(currentUser));
    setRouteWorkspaceMemory(loadQuickAccessContextMemory(currentUser));
    setWorkflowCenterOpen(false);
    setWorkflowDraftName('');
    setWorkflowDraftIds([]);
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    document.documentElement.dataset.brianClassroomMode = classroomMode ? 'true' : 'false';
    saveQuickAccessClassroomMode(currentUser, classroomMode);
    window.dispatchEvent(new CustomEvent('bes-classroom-presentation-mode', {
      detail: { enabled: classroomMode, source: 'quick-access' },
    }));
  }, [classroomMode, currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => () => {
    if (typeof document !== 'undefined') delete document.documentElement.dataset.brianClassroomMode;
  }, []);

  useEffect(() => () => {
    railClickTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    railClickTimersRef.current.clear();
    window.clearTimeout(bookmarkToastTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setInterval(() => setTimeTick(Date.now()), 60000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setTimeTick(Date.now());
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!spatialMemoryEnabled || !expanded || typeof window === 'undefined') return undefined;
    const memoryWorkspace = contextLock?.locked && QUICK_ACCESS_WORKSPACES.includes(contextLock.workspace)
      ? contextLock.workspace
      : workspace;
    const key = spatialContextKey(currentRoute, selectedTool, memoryWorkspace);
    const top = Math.max(0, Number(deviceSpatial.scroll?.[key]) || 0);
    const frame = window.requestAnimationFrame(() => {
      const panel = panelScrollRef.current;
      if (panel && Math.abs(panel.scrollTop - top) > 1) panel.scrollTop = top;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [spatialMemoryEnabled, expanded, currentRoute, selectedTool?.slug, workspace, contextLock?.locked, contextLock?.workspace]);

  useEffect(() => () => {
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(collapseMotionTimerRef.current);
    window.clearTimeout(peekTimerRef.current);
    window.clearTimeout(capsuleTimerRef.current);
    window.clearTimeout(magneticTimerRef.current);
    window.clearTimeout(spatialScrollTimerRef.current);
    window.cancelAnimationFrame(badgeFrameRef.current);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const syncBadges = () => {
      window.cancelAnimationFrame(badgeFrameRef.current);
      badgeFrameRef.current = window.requestAnimationFrame(() => {
        const dom = readBadgeSnapshot();
        setBadges((current) => {
          const next = { ...current };
          delete next['action:ttcm'];
          delete next['action:reports'];
          Object.assign(next, dom);
          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(next);
          if (currentKeys.length === nextKeys.length && nextKeys.every((key) => current[key] === next[key])) return current;
          return next;
        });
      });
    };
    const onBadgeEvent = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      setBadges((current) => ({ ...current, ...detail }));
    };
    syncBadges();
    const observer = new MutationObserver(syncBadges);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('bes-quick-access-badges', onBadgeEvent);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(badgeFrameRef.current);
      window.removeEventListener('bes-quick-access-badges', onBadgeEvent);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const allowedStates = new Set(['ready', 'syncing', 'error', 'unconfigured']);
    const applyHealth = (detail = {}) => {
      const itemId = String(detail.itemId || detail.id || '').trim();
      if (!itemId) return;
      if (detail.clear === true || detail.state === 'clear') {
        setAppHealth((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        return;
      }
      const state = String(detail.state || 'ready').toLowerCase();
      const nextHealth = {
        state: allowedStates.has(state) ? state : 'ready',
        message: String(detail.message || detail.text || '').trim(),
        updatedAt: Date.now(),
      };
      setAppHealth((current) => ({ ...current, [itemId]: nextHealth }));
    };
    const onHealth = (event) => applyHealth(event?.detail || {});
    const previousApi = window.BrianQuickAccessHealth;
    window.BrianQuickAccessHealth = {
      set: (itemId, state = 'ready', message = '') => window.dispatchEvent(new CustomEvent('bes-quick-access-health', { detail: { itemId, state, message } })),
      clear: (itemId) => window.dispatchEvent(new CustomEvent('bes-quick-access-health', { detail: { itemId, clear: true } })),
      clearAll: () => setAppHealth({}),
    };
    window.addEventListener('bes-quick-access-health', onHealth);
    return () => {
      window.removeEventListener('bes-quick-access-health', onHealth);
      if (previousApi) window.BrianQuickAccessHealth = previousApi;
      else delete window.BrianQuickAccessHealth;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const previousApi = window.BrianQuickAccessHandoff;
    window.BrianQuickAccessHandoff = {
      peek: () => handoffPacketRef.current || window.__BRIAN_QUICK_ACCESS_HANDOFF__ || null,
      consume: (targetItemId = '') => {
        const packet = handoffPacketRef.current || window.__BRIAN_QUICK_ACCESS_HANDOFF__ || null;
        if (!packet) return null;
        if (targetItemId && packet.targetItemId !== targetItemId) return null;
        handoffPacketRef.current = null;
        delete window.__BRIAN_QUICK_ACCESS_HANDOFF__;
        try { window.sessionStorage?.removeItem('bes-quick-access-handoff-v6'); } catch { /* optional */ }
        return packet;
      },
      clear: () => {
        handoffPacketRef.current = null;
        delete window.__BRIAN_QUICK_ACCESS_HANDOFF__;
        try { window.sessionStorage?.removeItem('bes-quick-access-handoff-v6'); } catch { /* optional */ }
      },
    };
    return () => {
      if (previousApi) window.BrianQuickAccessHandoff = previousApi;
      else delete window.BrianQuickAccessHandoff;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeNotification = (detail = {}) => {
      const id = String(detail.notificationId || detail.id || '').trim();
      if (!id) return null;
      const itemId = String(detail.itemId || '').trim();
      return {
        id,
        itemId,
        title: String(detail.title || (language === 'vi' ? 'Cập nhật mới' : 'New update')).trim(),
        text: String(detail.text || detail.message || detail.status || '').trim(),
        tone: ['info', 'success', 'warning', 'danger'].includes(String(detail.tone || '').toLowerCase())
          ? String(detail.tone).toLowerCase()
          : 'info',
        updatedAt: Number(detail.updatedAt) || Date.now(),
        source: 'custom',
      };
    };

    const applyNotification = (detail = {}) => {
      const id = String(detail.notificationId || detail.id || '').trim();
      if (!id) return;
      if (detail.clear === true || detail.state === 'clear') {
        setNotifications((current) => current.filter((entry) => entry.id !== id));
        return;
      }
      const next = normalizeNotification(detail);
      if (!next) return;
      setNotifications((current) => [
        next,
        ...current.filter((entry) => entry.id !== next.id),
      ].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)).slice(0, 20));
    };

    const onNotification = (event) => applyNotification(event?.detail || {});
    const previousApi = window.BrianQuickAccessNotifications;
    window.BrianQuickAccessNotifications = {
      push: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-notification', { detail })),
      clear: (id) => window.dispatchEvent(new CustomEvent('bes-quick-access-notification', { detail: { id, clear: true } })),
      clearAll: () => setNotifications([]),
    };

    window.addEventListener('bes-quick-access-notification', onNotification);
    return () => {
      window.removeEventListener('bes-quick-access-notification', onNotification);
      if (window.BrianQuickAccessNotifications === previousApi) return;
      if (previousApi) window.BrianQuickAccessNotifications = previousApi;
      else delete window.BrianQuickAccessNotifications;
    };
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeCapsule = (detail = {}) => {
      const itemId = String(detail.itemId || detail.id || '').trim();
      if (!itemId) return null;
      return {
        itemId,
        label: String(detail.label || detail.title || '').trim(),
        text: String(detail.text || detail.status || '').trim(),
        tone: ['info', 'success', 'warning', 'danger'].includes(String(detail.tone || '').toLowerCase())
          ? String(detail.tone).toLowerCase()
          : 'info',
        progress: Number.isFinite(Number(detail.progress))
          ? Math.max(0, Math.min(100, Number(detail.progress)))
          : null,
        updatedAt: Date.now(),
      };
    };

    const applyCapsule = (detail = {}) => {
      const itemId = String(detail.itemId || detail.id || '').trim();
      if (!itemId) return;
      if (detail.clear === true || detail.state === 'clear') {
        setCapsules((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
        return;
      }
      const next = normalizeCapsule(detail);
      if (!next) return;
      setCapsules((current) => ({ ...current, [itemId]: next }));
    };

    const onCapsule = (event) => applyCapsule(event?.detail || {});
    const previousApi = window.BrianQuickAccessCapsules;
    window.BrianQuickAccessCapsules = {
      set: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-capsule', { detail })),
      clear: (itemId) => window.dispatchEvent(new CustomEvent('bes-quick-access-capsule', { detail: { itemId, clear: true } })),
    };

    window.addEventListener('bes-quick-access-capsule', onCapsule);
    return () => {
      window.removeEventListener('bes-quick-access-capsule', onCapsule);
      if (window.BrianQuickAccessCapsules === previousApi) return;
      if (previousApi) window.BrianQuickAccessCapsules = previousApi;
      else delete window.BrianQuickAccessCapsules;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeActivity = (detail = {}) => {
      const id = String(detail.id || 'primary').trim();
      if (!id) return null;
      const numericProgress = Number(detail.progress);
      return {
        id,
        itemId: String(detail.itemId || '').trim(),
        title: String(detail.title || (language === 'vi' ? 'Đang xử lí' : 'Working')).trim(),
        status: String(detail.status || '').trim(),
        state: ['running', 'complete', 'error'].includes(String(detail.state || '').toLowerCase())
          ? String(detail.state).toLowerCase()
          : 'running',
        progress: Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : null,
        updatedAt: Date.now(),
      };
    };

    const applyActivity = (detail = {}) => {
      const id = String(detail.id || 'primary').trim();
      if (detail.clear === true || detail.state === 'clear') {
        setLiveActivities((current) => current.filter((activity) => activity.id !== id));
        return;
      }
      const next = normalizeActivity(detail);
      if (!next) return;
      setLiveActivities((current) => [
        next,
        ...current.filter((activity) => activity.id !== next.id),
      ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3));
    };

    const onActivity = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      applyActivity(detail);
    };

    const emitActivity = (detail) => {
      window.dispatchEvent(new CustomEvent('bes-quick-access-activity', { detail }));
    };
    const previousApi = window.BrianQuickAccessActivity;
    window.BrianQuickAccessActivity = {
      start: (detail = {}) => emitActivity({ ...detail, state: 'running' }),
      update: (detail = {}) => emitActivity({ ...detail, state: detail.state || 'running' }),
      complete: (detail = {}) => emitActivity({ ...detail, progress: detail.progress ?? 100, state: 'complete' }),
      error: (detail = {}) => emitActivity({ ...detail, state: 'error' }),
      clear: (id = 'primary') => emitActivity({ id, state: 'clear', clear: true }),
    };

    window.addEventListener('bes-quick-access-activity', onActivity);
    return () => {
      window.removeEventListener('bes-quick-access-activity', onActivity);
      if (window.BrianQuickAccessActivity && window.BrianQuickAccessActivity !== previousApi) {
        if (previousApi) window.BrianQuickAccessActivity = previousApi;
        else delete window.BrianQuickAccessActivity;
      }
    };
  }, [language]);

  useEffect(() => {
    setBackStack(loadQuickAccessHistory(currentUser));
    setBackStackOpen(false);
    setResumeItems(loadQuickAccessResume(currentUser));
    setSectionFolds(loadQuickAccessSectionFolds(currentUser));
    setContextLock(loadQuickAccessContextLock(currentUser));
    setParkedItems(loadQuickAccessParking(currentUser));
    setSidebarSnapshots(loadQuickAccessSnapshots(currentUser));
    setShelfItems(loadQuickAccessShelf(currentUser));
    setSearchAliases(loadQuickAccessAliases(currentUser));
    setPrivateItemIds(loadQuickAccessPrivateItems(currentUser));
    setScreenGuard(loadQuickAccessScreenGuard(currentUser));
    setCompactReadingMode(loadQuickAccessReadingMode(currentUser));
    setUsageInsights(loadQuickAccessUsage(currentUser));
    setAppBookmarks(loadQuickAccessBookmarks(currentUser));
    setDoubleClickActions(loadQuickAccessDoubleClickActions(currentUser));
    setSessionTrailOpen(false);
    setDropZoneActive(false);
    setUndoStack([]);
    shelfFilesRef.current.clear();
  }, [currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const normalizeResume = (detail = {}) => {
      const id = String(detail.resumeId || detail.id || detail.itemId || '').trim();
      const itemId = String(detail.itemId || '').trim();
      if (!id || !itemId) return null;
      const numericProgress = Number(detail.progress);
      const rawEvent = String(detail.event || detail.resumeEvent || '').trim();
      const rawDetail = detail.resumeDetail && typeof detail.resumeDetail === 'object'
        ? detail.resumeDetail
        : (detail.detail && typeof detail.detail === 'object' ? detail.detail : {});
      return {
        id,
        itemId,
        title: String(detail.title || (language === 'vi' ? 'Tiếp tục công việc' : 'Resume work')).trim(),
        subtitle: String(detail.subtitle || detail.status || '').trim(),
        progress: Number.isFinite(numericProgress) ? Math.max(0, Math.min(100, numericProgress)) : null,
        event: rawEvent,
        detail: rawDetail,
        updatedAt: Number(detail.updatedAt) || Date.now(),
      };
    };

    const commitResume = (updater) => {
      setResumeItems((current) => {
        const next = typeof updater === 'function' ? updater(current) : updater;
        const normalized = (Array.isArray(next) ? next : [])
          .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
          .slice(0, QUICK_ACCESS_RESUME_MAX);
        saveQuickAccessResume(currentUser, normalized);
        return normalized;
      });
    };

    const applyResume = (detail = {}) => {
      const id = String(detail.resumeId || detail.id || detail.itemId || '').trim();
      if (!id) return;
      if (detail.clear === true || detail.state === 'clear') {
        commitResume((current) => current.filter((entry) => entry.id !== id));
        return;
      }
      const next = normalizeResume(detail);
      if (!next) return;
      commitResume((current) => [
        next,
        ...current.filter((entry) => entry.id !== next.id),
      ]);
    };

    const onResume = (event) => applyResume(event?.detail || {});
    const onActivityResume = (event) => {
      const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
      const itemId = String(detail.itemId || '').trim();
      if (!itemId) return;
      const activityId = `activity:${String(detail.id || itemId)}`;
      const state = String(detail.state || 'running').toLowerCase();
      if (detail.clear === true || ['clear', 'complete'].includes(state)) {
        applyResume({ id: activityId, clear: true });
        return;
      }
      if (state !== 'running') return;
      applyResume({
        id: activityId,
        itemId,
        title: detail.title,
        subtitle: detail.status,
        progress: detail.progress,
      });
    };

    const previousApi = window.BrianQuickAccessResume;
    window.BrianQuickAccessResume = {
      set: (detail = {}) => window.dispatchEvent(new CustomEvent('bes-quick-access-resume', { detail })),
      clear: (id) => window.dispatchEvent(new CustomEvent('bes-quick-access-resume', { detail: { id, clear: true } })),
      list: () => loadQuickAccessResume(currentUser),
    };

    window.addEventListener('bes-quick-access-resume', onResume);
    window.addEventListener('bes-quick-access-activity', onActivityResume);
    return () => {
      window.removeEventListener('bes-quick-access-resume', onResume);
      window.removeEventListener('bes-quick-access-activity', onActivityResume);
      if (window.BrianQuickAccessResume === previousApi) return;
      if (previousApi) window.BrianQuickAccessResume = previousApi;
      else delete window.BrianQuickAccessResume;
    };
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    language,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onHashChange = (event) => {
      let previousTarget = '';
      let nextTarget = '';
      try {
        previousTarget = new URL(event.oldURL).hash || '#/home';
        nextTarget = new URL(event.newURL).hash || '#/home';
      } catch {
        previousTarget = '';
        nextTarget = window.location.hash || '#/home';
      }

      if (suppressHistoryRef.current) {
        suppressHistoryRef.current = false;
        return;
      }
      if (!previousTarget || previousTarget === nextTarget || previousTarget === '#/home') return;

      const entry = {
        target: previousTarget,
        label: navigationLabelForTarget(previousTarget, catalog, language),
        at: Date.now(),
      };
      setBackStack((current) => {
        const next = [
          entry,
          ...current.filter((candidate) => candidate.target !== entry.target),
        ].slice(0, QUICK_ACCESS_HISTORY_MAX);
        saveQuickAccessHistory(currentUser, next);
        return next;
      });
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [
    currentUser?.id,
    currentUser?.authId,
    currentUser?.email,
    catalog,
    language,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onBookmarkShortcut = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      if (editable) return;
      if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || String(event.key || '').toLowerCase() !== 's') return;
      const item = (selectedItemsRef.current || []).find((candidate) => activeItem(candidate, currentRoute, selectedTool))
        || catalog.find((candidate) => activeItem(candidate, currentRoute, selectedTool));
      if (!item) return;
      event.preventDefault();
      const target = String(window.location.hash || item.target || '');
      if (!target.startsWith('#/')) return;
      const bookmark = {
        itemId: item.id,
        target,
        label: labelFor(item, language),
        workspace,
        scrollY: Math.max(0, Number(window.scrollY) || 0),
        updatedAt: Date.now(),
      };
      setAppBookmarks((current) => {
        const next = { ...current, [item.id]: bookmark };
        saveQuickAccessBookmarks(currentUser, next);
        return next;
      });
      setBookmarkToast(language === 'vi' ? `Đã lưu: ${labelFor(item, language)}` : `Saved: ${labelFor(item, language)}`);
      window.clearTimeout(bookmarkToastTimerRef.current);
      bookmarkToastTimerRef.current = window.setTimeout(() => setBookmarkToast(''), 1600);
    };
    window.addEventListener('keydown', onBookmarkShortcut);
    return () => window.removeEventListener('keydown', onBookmarkShortcut);
  }, [catalog, currentRoute, selectedTool?.slug, workspace, language, currentUser?.id, currentUser?.authId, currentUser?.email]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const maxDistance = 34;
    const openDistance = 9;
    const onPointerMove = (event) => {
      if (customizing || pinned) return;
      const distance = Math.max(0, Number(event.clientX || 0));
      if (distance > maxDistance) {
        setMagneticStrength((current) => current === 0 ? current : 0);
        window.clearTimeout(magneticTimerRef.current);
        return;
      }
      const strength = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
      setMagneticStrength(strength);
      if (distance <= openDistance) {
        window.clearTimeout(magneticTimerRef.current);
        magneticTimerRef.current = window.setTimeout(() => openRail(), Math.min(hoverDelay, 180));
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.clearTimeout(magneticTimerRef.current);
    };
  }, [hoverDelay, customizing, pinned, openRail]);

  useEffect(() => {
    if (!customizing) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setCustomizerQuery('');
        setCustomizing(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [customizing]);

  useEffect(() => {
    if (!hovered || pinned || customizing || typeof document === 'undefined') return undefined;

    const onOutsidePointerDown = (event) => {
      if (event.target?.closest?.('.bqa-root')) return;
      collapseRail(false);
    };
    const onEscape = (event) => {
      if (event.key === 'Escape') collapseRail(false);
    };

    document.addEventListener('pointerdown', onOutsidePointerDown, true);
    window.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointerDown, true);
      window.removeEventListener('keydown', onEscape);
    };
  }, [hovered, pinned, customizing, collapseRail]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      setPrecisionDrag(Boolean(event.altKey));
      if (editable) return;

      if (event.altKey && !event.ctrlKey && !event.metaKey && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setKeyboardLayer((current) => !current);
        openRail();
        return;
      }

      if (keyboardLayer && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (event.key === 'Escape') {
          event.preventDefault();
          setKeyboardLayer(false);
          return;
        }
        const key = String(event.key || '').toUpperCase();
        const match = (selectedItemsRef.current || []).find((item, index) => keyboardLetterForItem(item, index) === key);
        if (match) {
          event.preventDefault();
          setKeyboardLayer(false);
          activateItemRef.current?.(match, null);
        }
      }
    };
    const onKeyUp = (event) => {
      if (event.key === 'Alt') setPrecisionDrag(false);
    };
    const onBlur = () => setPrecisionDrag(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [keyboardLayer, openRail]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onNavigationStart = () => {
      if (!pinned && !customizing) collapseRail(false);
    };
    const onShortcut = (event) => {
      const tag = String(event.target?.tagName || '').toLowerCase();
      const editable = event.target?.isContentEditable || ['input', 'textarea', 'select'].includes(tag);
      if (event.repeat && !(event.altKey && event.code === 'Backquote')) return;

      if ((event.metaKey || event.ctrlKey) && !event.altKey && String(event.key || '').toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteQuery('');
        setCommandPaletteIndex(0);
        setCommandPaletteOpen(true);
        focusCommandPaletteInput();
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'Backquote') {
        const items = switcherItemsRef.current || [];
        if (!items.length) return;
        event.preventDefault();
        setAppSwitcherOpen(true);
        setAppSwitcherIndex((index) => (index + 1) % items.length);
        return;
      }

      if (!editable && event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(String(event.key || ''))) {
        const item = selectedItemsRef.current?.[Number(event.key) - 1];
        if (item) {
          event.preventDefault();
          activateItemRef.current?.(item, null);
        }
        return;
      }

      if (editable) return;
      if (event.altKey && !event.ctrlKey && !event.metaKey && String(event.key || '').toLowerCase() === 'q') {
        event.preventDefault();
        if (expanded && !pinned && !customizing) collapseRail(false);
        else openRail();
      }
    };

    const onShortcutUp = (event) => {
      if (event.key !== 'Alt') return;
      setAppSwitcherOpen((open) => {
        if (open) {
          const items = switcherItemsRef.current || [];
          const target = items[appSwitcherIndex % Math.max(items.length, 1)];
          if (target) window.setTimeout(() => activateItemRef.current?.(target, null), 0);
        }
        return false;
      });
    };

    window.addEventListener('bes-navigation-start', onNavigationStart);
    window.addEventListener('keydown', onShortcut);
    window.addEventListener('keyup', onShortcutUp);
    return () => {
      window.removeEventListener('bes-navigation-start', onNavigationStart);
      window.removeEventListener('keydown', onShortcut);
      window.removeEventListener('keyup', onShortcutUp);
    };
  }, [pinned, customizing, expanded, collapseRail, openRail, focusCommandPaletteInput, appSwitcherIndex]);

  useEffect(() => {
    if (!commandPaletteOpen || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setCommandPaletteOpen(false);
      setCommandPaletteQuery('');
      setCommandPaletteIndex(0);
    };
    window.addEventListener('keydown', onKeyDown);
    focusCommandPaletteInput();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [commandPaletteOpen, focusCommandPaletteInput]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const root = rootRef.current;
    const shell = document.querySelector('.app-shell');
    const main = shell?.querySelector?.(':scope > #bes-main-content');
    const safeFrame = main?.querySelector?.(':scope > .bqa-content-safe-frame');
    const footer = shell?.querySelector?.(':scope > footer[data-app-shell-footer="true"]');
    if (!root || !shell || !main || !safeFrame) return undefined;

    shell.dataset.quickAccessState = pinned ? 'pinned' : 'rest';

    const clearSafeArea = () => {
      shell.style.removeProperty('--bqa-content-safe-shift');
      shell.style.removeProperty('--bqa-footer-safe-offset');
      shell.dataset.quickAccessSafeShift = '0';
    };

    const measureAndApply = () => {
      window.cancelAnimationFrame(layoutFrameRef.current);
      layoutFrameRef.current = window.requestAnimationFrame(() => {
        const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches === true;
        const reserveMode = window.innerWidth >= QUICK_ACCESS_SAFE_AREA_MIN_WIDTH && !coarsePointer;
        shell.dataset.quickAccessSafeMode = reserveMode ? 'reserve' : 'overlay';

        // Quick Access is fixed to the left edge, so the existing shell safe-frame
        // contract can consistently reserve space from the left on desktop.
        if (!reserveMode) {
          clearSafeArea();
          return;
        }

        const currentShift = parseCssPixels(shell.dataset.quickAccessSafeShift, 0);
        const mainMinLeft = measureQuickAccessContentBaseline(safeFrame);
        const footerRect = footer?.getBoundingClientRect?.();
        const footerMinLeft = Number.isFinite(footerRect?.left)
          ? footerRect.left
          : Number.POSITIVE_INFINITY;
        const actualMinLeft = Math.min(mainMinLeft, footerMinLeft);
        if (!Number.isFinite(actualMinLeft)) {
          clearSafeArea();
          return;
        }

        const shellStyle = window.getComputedStyle(shell);
        if (shellStyle?.fontFamily) root.style.fontFamily = shellStyle.fontFamily;

        const rail = railRef.current;
        const panel = panelRef.current;
        const railRect = rail?.getBoundingClientRect?.();
        const rootRect = root.getBoundingClientRect();
        const rootStyle = window.getComputedStyle(root);
        const railWidth = parseCssPixels(rootStyle.getPropertyValue('--bqa-rail-width'), 56);
        const panelWidth = parseCssPixels(rootStyle.getPropertyValue('--bqa-panel-width'), 318);

        const collapsedBoundary = Number.isFinite(railRect?.right)
          ? railRect.right
          : rootRect.left + railWidth;

        const pinnedBoundary = pinned
          ? rootRect.left + railWidth + 8 + panelWidth
          : collapsedBoundary;

        const safeBoundary = (pinned ? pinnedBoundary : collapsedBoundary) + QUICK_ACCESS_SAFE_GAP;
        const maxShift = pinned ? QUICK_ACCESS_SAFE_MAX_PINNED : QUICK_ACCESS_SAFE_MAX_COLLAPSED;
        const delta = safeBoundary - actualMinLeft;
        const nextShift = Math.max(0, Math.min(maxShift, Math.ceil(currentShift + delta)));

        shell.style.setProperty('--bqa-content-safe-shift', `${nextShift}px`);
        shell.style.setProperty('--bqa-footer-safe-offset', `${nextShift / 2}px`);
        shell.dataset.quickAccessSafeShift = String(nextShift);

        if (Math.abs(nextShift - currentShift) >= 1) {
          window.clearTimeout(layoutSettleTimerRef.current);
          layoutSettleTimerRef.current = window.setTimeout(measureAndApply, 290);
        }

        window.clearTimeout(layoutVerifyTimerRef.current);
        layoutVerifyTimerRef.current = window.setTimeout(() => {
          const verifiedMainMinLeft = measureQuickAccessContentBaseline(safeFrame);
          const verifiedFooterRect = footer?.getBoundingClientRect?.();
          const verifiedFooterMinLeft = Number.isFinite(verifiedFooterRect?.left)
            ? verifiedFooterRect.left
            : Number.POSITIVE_INFINITY;
          const verifiedMinLeft = Math.min(verifiedMainMinLeft, verifiedFooterMinLeft);
          const stillOccluded = Number.isFinite(verifiedMinLeft) && verifiedMinLeft < safeBoundary - 0.5;

          if (stillOccluded && !pinned) {
            shell.dataset.quickAccessSafeMode = 'overlay';
            clearSafeArea();
          } else {
            shell.dataset.quickAccessSafeMode = 'reserve';
          }
        }, 330);

        shell.dataset.quickAccessState = pinned ? 'pinned' : 'rest';

        if (footer) footer.dataset.quickAccessOcclusionGuard = 'true';
        if (panel) panel.dataset.safeBoundary = String(Math.round(safeBoundary));
      });
    };

    const onResize = () => measureAndApply();
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(measureAndApply)
      : null;
    const mutationObserver = typeof MutationObserver === 'function'
      ? new MutationObserver(measureAndApply)
      : null;

    resizeObserver?.observe(safeFrame);
    if (footer) resizeObserver?.observe(footer);
    mutationObserver?.observe(safeFrame, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('bes-font-settings-updated', measureAndApply);
    window.addEventListener('bes-regional-font-updated', measureAndApply);

    measureAndApply();
    const settleA = window.setTimeout(measureAndApply, 120);
    const settleB = window.setTimeout(measureAndApply, 420);

    return () => {
      window.clearTimeout(settleA);
      window.clearTimeout(settleB);
      window.clearTimeout(layoutSettleTimerRef.current);
      window.clearTimeout(layoutVerifyTimerRef.current);
      window.cancelAnimationFrame(layoutFrameRef.current);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('bes-font-settings-updated', measureAndApply);
      window.removeEventListener('bes-regional-font-updated', measureAndApply);
      shell.style.removeProperty('--bqa-content-safe-shift');
      shell.style.removeProperty('--bqa-footer-safe-offset');
      delete shell.dataset.quickAccessSafeShift;
      delete shell.dataset.quickAccessState;
      delete shell.dataset.quickAccessSafeMode;
      if (footer) delete footer.dataset.quickAccessOcclusionGuard;
      root.style.removeProperty('font-family');
    };
  }, [
    currentRoute,
    selectedTool?.slug,
    pinned,
    railSide,
    allowedKey,
    appVisibility?.ready,
  ]);

  if (!currentUser || currentRoute === 'home' || !catalog.length) return null;

  const presentationCatalog = classroomMode
    ? catalog.filter((item) => classroomModeAllowsItem(item))
    : catalog;
  const lockedWorkspace = contextLock?.locked && QUICK_ACCESS_WORKSPACES.includes(contextLock.workspace)
    ? contextLock.workspace
    : '';
  const workspaceSource = lockedWorkspace || workspace;
  const effectiveWorkspace = classroomMode && workspaceSource === 'department' ? 'teaching' : workspaceSource;

  const selectedItems = config.items
    .map((id) => presentationCatalog.find((item) => item.id === id))
    .filter(Boolean)
    .slice(0, QUICK_ACCESS_MAX_ITEMS);

  const workspaceItems = selectedItems.filter((item) => workspaceAllowsItem(effectiveWorkspace, item));
  const activeWorkspaceItem = workspaceItems.find((item) => activeItem(item, currentRoute, selectedTool)) || null;
  const initialRailVisibleItems = workspaceItems.slice(0, railCapacity);
  const railVisibleItems = activeWorkspaceItem && !initialRailVisibleItems.some((item) => item.id === activeWorkspaceItem.id) && initialRailVisibleItems.length
    ? [...initialRailVisibleItems.slice(0, -1), activeWorkspaceItem]
    : initialRailVisibleItems;
  const railVisibleIds = new Set(railVisibleItems.map((item) => item.id));
  const railOverflowItems = workspaceItems.filter((item) => !railVisibleIds.has(item.id));

  const recentItems = (config.recent || [])
    .map((id) => presentationCatalog.find((item) => item.id === id))
    .filter(Boolean)
    .filter((item) => workspaceAllowsItem(effectiveWorkspace, item))
    .slice(0, QUICK_ACCESS_RECENT_MAX);

  const contextItems = contextIdsFor(currentRoute, selectedTool)
    .map((id) => presentationCatalog.find((item) => item.id === id))
    .filter(Boolean)
    .filter((item) => workspaceAllowsItem(effectiveWorkspace, item))
    .filter((item) => !recentItems.some((recent) => recent.id === item.id))
    .slice(0, 3);

  const contextCopy = classroomMode
    ? {
      kicker: language === 'vi' ? 'TRÌNH CHIẾU' : 'PRESENTATION',
      title: language === 'vi' ? 'Không gian lớp học' : 'Classroom workspace',
      description: language === 'vi'
        ? 'Đã ẩn thông báo, badge và công cụ quản trị để trình chiếu an toàn hơn.'
        : 'Notifications, badges and administrative tools are hidden for safer presenting.',
    }
    : contextCopyFor(currentRoute, selectedTool, language);
  const lastSpatialItem = spatialMemoryEnabled
    ? presentationCatalog.find((item) => item.id === deviceSpatial.lastItemId && workspaceAllowsItem(effectiveWorkspace, item)) || null
    : null;
  const workingItem = workspaceItems.find((item) => activeItem(item, currentRoute, selectedTool))
    || lastSpatialItem
    || contextItems[0]
    || recentItems[0]
    || workspaceItems[0]
    || null;
  const pinnedSmartItems = workspaceItems
    .filter((item) => item.id !== workingItem?.id)
    .filter((item) => !recentItems.some((recent) => recent.id === item.id))
    .slice(0, 3);
  const primaryActivity = classroomMode ? null : (liveActivities[0] || null);
  const timeContext = timeAwareContextFor(new Date(timeTick).getHours(), language);
  const timeAwareItems = timeAwareEnabled
    ? timeContext.ids
      .map((id) => presentationCatalog.find((item) => item.id === id))
      .filter(Boolean)
      .filter((item) => workspaceAllowsItem(effectiveWorkspace, item))
      .slice(0, 3)
    : [];
  const resumableItems = (classroomMode ? [] : resumeItems)
    .map((resume) => ({ resume, item: presentationCatalog.find((item) => item.id === resume.itemId) }))
    .filter((entry) => Boolean(entry.item))
    .slice(0, QUICK_ACCESS_RESUME_MAX);
  const primaryResume = resumableItems[0] || null;
  const scrollSections = [
    workflowCenterOpen ? { id: 'workflow', label: language === 'vi' ? 'Quy trình' : 'Workflow' } : null,
    timeAwareItems.length ? { id: 'time', label: language === 'vi' ? 'Theo giờ' : 'Time aware' } : null,
    primaryResume ? { id: 'resume', label: language === 'vi' ? 'Tiếp tục' : 'Resume' } : null,
    recentItems.length ? { id: 'recent', label: language === 'vi' ? 'Vừa dùng' : 'Recent' } : null,
    pinnedSmartItems.length ? { id: 'pinned', label: language === 'vi' ? 'Đã ghim' : 'Pinned' } : null,
    primaryActivity ? { id: 'activity', label: language === 'vi' ? 'Hoạt động' : 'Activity' } : null,
    parkedItems.length ? { id: 'parking', label: language === 'vi' ? 'Đang đỗ' : 'Parked' } : null,
    shelfItems.length ? { id: 'shelf', label: language === 'vi' ? 'Khay tạm' : 'Shelf' } : null,
    { id: 'apps', label: language === 'vi' ? 'Ứng dụng' : 'Apps' },
  ].filter(Boolean);
  const workflowBundles = (Array.isArray(config.workflows) ? config.workflows : [])
    .map((workflow) => ({
      ...workflow,
      items: workflow.itemIds
        .map((id) => catalog.find((item) => item.id === id))
        .filter(Boolean),
    }))
    .filter((workflow) => workflow.items.length)
    .slice(0, QUICK_ACCESS_WORKFLOW_MAX);
  const activeWorkflow = activeWorkflowRun
    ? workflowBundles.find((workflow) => workflow.id === activeWorkflowRun.workflowId) || null
    : null;
  const activeWorkflowNextIndex = activeWorkflow
    ? Math.min(activeWorkflow.items.length, Math.max(0, Number(activeWorkflowRun?.nextIndex) || 0))
    : 0;
  const activeWorkflowNextItem = activeWorkflow?.items?.[activeWorkflowNextIndex] || null;
  const workflowCandidateItems = [
    ...selectedItems,
    ...catalog.filter((item) => !selectedItems.some((selected) => selected.id === item.id)),
  ].slice(0, 18);

  const notificationItems = (() => {
    const byId = new Map();
    notifications.forEach((entry) => byId.set(`custom:${entry.id}`, entry));

    liveActivities.forEach((activity) => {
      if (!['complete', 'error'].includes(activity.state)) return;
      const item = catalog.find((candidate) => candidate.id === activity.itemId);
      byId.set(`activity:${activity.id}`, {
        id: `activity:${activity.id}`,
        itemId: activity.itemId,
        title: activity.title || labelFor(item, language),
        text: activity.status || (activity.state === 'complete'
          ? (language === 'vi' ? 'Đã hoàn tất' : 'Completed')
          : (language === 'vi' ? 'Có lỗi cần kiểm tra' : 'Needs attention')),
        tone: activity.state === 'error' ? 'danger' : 'success',
        updatedAt: activity.updatedAt,
        source: 'activity',
      });
    });

    Object.values(capsules).forEach((capsule) => {
      byId.set(`capsule:${capsule.itemId}`, {
        id: `capsule:${capsule.itemId}`,
        itemId: capsule.itemId,
        title: capsule.label || labelFor(catalog.find((item) => item.id === capsule.itemId), language),
        text: capsule.text,
        tone: capsule.tone || 'info',
        updatedAt: capsule.updatedAt,
        source: 'capsule',
      });
    });

    Object.entries(badges).forEach(([itemId, value]) => {
      const item = catalog.find((candidate) => candidate.id === itemId);
      if (!item) return;
      byId.set(`badge:${itemId}`, {
        id: `badge:${itemId}`,
        itemId,
        title: labelFor(item, language),
        text: value === 'dot'
          ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
          : (language === 'vi' ? `${value} mục cần chú ý` : `${value} items need attention`),
        tone: 'warning',
        updatedAt: 0,
        source: 'badge',
      });
    });

    return [...byId.values()]
      .filter((entry) => !entry.itemId || catalog.some((item) => item.id === entry.itemId))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, 8);
  })();
  const notificationCount = classroomMode ? 0 : notificationItems.length;

  const capsuleSnapshotFor = (item) => {
    if (!item) return null;
    const statusIds = statusIdsForItem(item);
    const activity = liveActivities.find((entry) => statusIds.includes(entry.itemId));
    if (activity) {
      return {
        itemId: item.id,
        label: activity.title || labelFor(item, language),
        text: activity.status || (activity.progress == null ? (language === 'vi' ? 'Đang xử lí…' : 'Working…') : `${Math.round(activity.progress)}%`),
        tone: activity.state === 'error' ? 'danger' : activity.state === 'complete' ? 'success' : 'info',
        progress: activity.progress,
      };
    }
    const capsuleId = statusIds.find((id) => capsules[id]);
    if (capsuleId) return { ...capsules[capsuleId], itemId: item.id, label: capsules[capsuleId]?.label || labelFor(item, language) };
    const badgeId = statusIds.find((id) => badges[id]);
    if (badgeId) {
      return {
        itemId: item.id,
        label: labelFor(item, language),
        text: badges[badgeId] === 'dot'
          ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
          : (language === 'vi' ? `${badges[badgeId]} mục cần chú ý` : `${badges[badgeId]} items need attention`),
        tone: 'warning',
        progress: null,
      };
    }
    return null;
  };
  const activeCapsuleItem = classroomMode ? null : (presentationCatalog.find((item) => item.id === capsuleItemId) || null);
  const activeCapsule = capsuleSnapshotFor(activeCapsuleItem);
  const progressForItem = (item) => {
    const snapshot = capsuleSnapshotFor(item);
    const value = Number(snapshot?.progress);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
  };
  const healthForItem = (item) => statusIdsForItem(item).map((id) => appHealth[id]).find(Boolean) || null;
  const badgeForItem = (item) => {
    const statusId = statusIdsForItem(item).find((id) => badges[id]);
    return statusId ? badges[statusId] : '';
  };

  const attentionLevelForItem = (item) => {
    if (!item || classroomMode) return 0;
    const statusIds = statusIdsForItem(item);
    const health = statusIds.map((id) => appHealth[id]).find(Boolean);
    if (health?.state === 'error') return 3;
    if (health?.state === 'unconfigured' || health?.state === 'syncing') return 2;
    const activity = liveActivities.find((entry) => statusIds.includes(entry.itemId));
    if (activity?.state === 'error') return 3;
    if (activity?.state === 'running') return 1;
    const tones = notificationItems
      .filter((entry) => statusIds.includes(entry.itemId))
      .map((entry) => entry.tone);
    if (tones.includes('danger')) return 3;
    if (tones.includes('warning')) return 2;
    if (tones.length || statusIds.some((id) => badges[id])) return 1;
    return 0;
  };

  const itemForTrailTarget = (target) => {
    const normalized = String(target || '').split('?')[0];
    return presentationCatalog.find((candidate) => candidate.target === normalized) || null;
  };
  const currentTrailItem = workspaceItems.find((item) => activeItem(item, currentRoute, selectedTool))
    || presentationCatalog.find((item) => activeItem(item, currentRoute, selectedTool))
    || null;
  const sessionTrailEntries = [
    currentTrailItem ? { item: currentTrailItem, target: String((typeof window !== 'undefined' ? window.location.hash : '') || currentTrailItem.target || ''), current: true } : null,
    ...backStack.map((entry) => ({ item: itemForTrailTarget(entry.target), target: entry.target, entry })),
  ]
    .filter((entry) => entry?.item && entry.target)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.item.id === entry.item.id) === index)
    .slice(0, 5);

  const switcherItems = [
    ...recentItems,
    ...workspaceItems.filter((item) => !recentItems.some((recent) => recent.id === item.id)),
  ].slice(0, 6);

  const workspaceOptions = [
    { id: 'all', label: language === 'vi' ? 'Tất cả' : 'All' },
    { id: 'teaching', label: language === 'vi' ? 'Giảng dạy' : 'Teaching' },
    { id: 'homeroom', label: language === 'vi' ? 'Chủ nhiệm' : 'Homeroom' },
    { id: 'department', label: 'TTCM' },
  ].filter((option) => {
    if (option.id === 'department' && classroomMode) return false;
    return option.id !== 'department' || presentationCatalog.some((item) => workspaceAllowsItem('department', item));
  });

  const itemIsGuarded = (item) => Boolean(screenGuard && item?.id && privateItemIds.includes(item.id));
  const displayLabelFor = (item) => itemIsGuarded(item)
    ? (language === 'vi' ? 'Mục riêng tư' : 'Private item')
    : labelFor(item, language);
  const usageRows = Object.entries(usageInsights.apps || {})
    .map(([itemId, entry]) => ({
      itemId,
      item: catalog.find((candidate) => candidate.id === itemId),
      opens: Math.max(0, Number(entry?.opens) || 0),
      lastUsed: Number(entry?.lastUsed) || 0,
    }))
    .filter((entry) => Boolean(entry.item))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 5);
  const staleUsageCount = Object.values(usageInsights.apps || {}).filter((entry) => {
    const lastUsed = Number(entry?.lastUsed) || 0;
    return lastUsed > 0 && Date.now() - lastUsed > 30 * 24 * 60 * 60 * 1000;
  }).length;

  const quickCreateItems = quickCreateDescriptors(language)
    .map((descriptor) => ({ descriptor, item: presentationCatalog.find((item) => item.id === descriptor.itemId) }))
    .filter((entry) => Boolean(entry.item));

  const commandNeedle = commandQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const commandEntries = [
    ...quickCreateItems.map((entry) => ({
      id: `action:${entry.descriptor.id}`,
      kind: 'action',
      label: entry.descriptor.label,
      description: entry.descriptor.description,
      keywords: entry.descriptor.keywords,
      item: entry.item,
      payload: entry,
    })),
    ...presentationCatalog.map((item) => ({
      id: `app:${item.id}`,
      kind: 'app',
      label: labelFor(item, language),
      description: descriptionFor(item, language),
      keywords: `${item.label || ''} ${item.labelVi || ''} ${searchAliases[item.id] || ''}`,
      item,
    })),
  ];
  const commandResults = commandNeedle
    ? commandEntries.filter((entry) => {
      const haystack = `${entry.label} ${entry.description} ${entry.keywords || ''}`
        .toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(commandNeedle);
    }).slice(0, 10)
    : [];

  const commandPaletteNeedle = commandPaletteQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const defaultPaletteEntries = [];
  const paletteSeen = new Set();
  [
    ...commandEntries.filter((entry) => entry.kind === 'action'),
    ...recentItems.map((item) => commandEntries.find((entry) => entry.id === `app:${item.id}`)).filter(Boolean),
    ...workspaceItems.map((item) => commandEntries.find((entry) => entry.id === `app:${item.id}`)).filter(Boolean),
  ].forEach((entry) => {
    if (!entry || paletteSeen.has(entry.id)) return;
    paletteSeen.add(entry.id);
    defaultPaletteEntries.push(entry);
  });
  const commandPaletteResults = (commandPaletteNeedle
    ? commandEntries.filter((entry) => {
      const haystack = `${entry.label} ${entry.description} ${entry.keywords || ''}`
        .toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(commandPaletteNeedle);
    })
    : defaultPaletteEntries
  ).slice(0, 12);

  const peekItem = presentationCatalog.find((item) => item.id === peekItemId) || null;
  const peekActions = peekItem
    ? quickActionDescriptors(peekItem, language).filter((descriptor) => descriptor.id !== 'open').slice(0, 3)
    : [];
  const actionItem = presentationCatalog.find((item) => item.id === actionItemId) || null;
  const activeActionsItem = presentationCatalog.find((item) => item.id === activeActionsItemId) || null;
  const activeActions = activeActionsItem
    ? quickActionDescriptors(activeActionsItem, language).slice(0, 3)
    : [];
  const actionBookmark = actionItem ? appBookmarks[actionItem.id] || null : null;
  const actionDoubleClickOptions = actionItem
    ? quickActionDescriptors(actionItem, language)
    : [];

  const availableItems = (classroomMode ? presentationCatalog : catalog).filter((item) => !config.items.includes(item.id));
  const customizerNeedle = customizerQuery.trim().toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
  const filteredAvailableItems = customizerNeedle
    ? availableItems.filter((item) => {
      const haystack = `${item.label || ''} ${item.labelVi || ''}`.toLocaleLowerCase(language === 'vi' ? 'vi-VN' : 'en-US');
      return haystack.includes(customizerNeedle);
    })
    : availableItems;
  const persist = (next) => {
    setConfig(next);
    saveQuickAccessConfigToCloud(currentUser, next, allowedIds).then((result) => {
      if (result?.config) setConfig(result.config);
    });
  };

  const captureUndoState = () => ({
    config: cloneQuickAccessState(config, config),
    sectionFolds: cloneQuickAccessState(sectionFolds, sectionFolds),
    deviceSpatial: cloneQuickAccessState(deviceSpatial, deviceSpatial),
    routeWorkspaceMemory: cloneQuickAccessState(routeWorkspaceMemory, routeWorkspaceMemory),
    parkedItems: cloneQuickAccessState(parkedItems, parkedItems),
  });

  const pushUndo = (label) => {
    const entry = {
      id: `undo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      at: Date.now(),
      state: captureUndoState(),
    };
    setUndoStack((current) => [entry, ...current].slice(0, QUICK_ACCESS_UNDO_MAX));
  };

  const persistWithUndo = (next, label) => {
    pushUndo(label);
    persist(next);
  };

  const restoreUndoEntry = (entry) => {
    if (!entry?.state) return;
    const state = entry.state;
    if (state.config) persist(state.config);
    if (state.sectionFolds) {
      setSectionFolds(state.sectionFolds);
      saveQuickAccessSectionFolds(currentUser, state.sectionFolds);
    }
    if (state.deviceSpatial) {
      setDeviceSpatial(state.deviceSpatial);
      saveQuickAccessSpatialMemory(currentUser, state.deviceSpatial);
    }
    if (state.routeWorkspaceMemory) {
      setRouteWorkspaceMemory(state.routeWorkspaceMemory);
      saveQuickAccessContextMemory(currentUser, state.routeWorkspaceMemory);
    }
    if (state.parkedItems) {
      setParkedItems(state.parkedItems);
      saveQuickAccessParking(currentUser, state.parkedItems);
    }
    setUndoStack((current) => current.filter((candidate) => candidate.id !== entry.id));
    setUndoOpen(false);
  };

  const toggleSectionFold = (sectionId) => {
    if (!['recent', 'pinned', 'apps'].includes(sectionId)) return;
    setSectionFolds((current) => {
      const next = { ...current, [sectionId]: !current?.[sectionId] };
      saveQuickAccessSectionFolds(currentUser, next);
      return next;
    });
  };

  const toggleContextLock = () => {
    if (contextLock?.locked) {
      setContextLock(null);
      saveQuickAccessContextLock(currentUser, null);
      return;
    }
    const next = {
      locked: true,
      workspace: effectiveWorkspace,
      route: String(currentRoute || ''),
      tool: String(selectedTool?.slug || ''),
      at: Date.now(),
    };
    setContextLock(next);
    saveQuickAccessContextLock(currentUser, next);
  };

  const updateParking = (next) => {
    const safe = (Array.isArray(next) ? next : []).slice(0, QUICK_ACCESS_PARKING_MAX);
    setParkedItems(safe);
    saveQuickAccessParking(currentUser, safe);
  };

  const parkItem = (item) => {
    if (!item) return;
    const currentTarget = typeof window !== 'undefined' && activeItem(item, currentRoute, selectedTool)
      ? String(window.location.hash || item.target || '')
      : String(item.target || '');
    const entry = {
      itemId: item.id,
      target: currentTarget,
      at: Date.now(),
    };
    const next = [entry, ...parkedItems.filter((candidate) => candidate.itemId !== item.id)].slice(0, QUICK_ACCESS_PARKING_MAX);
    updateParking(next);
    setActionItemId('');
  };

  const removeParkedItem = (itemId) => {
    pushUndo(language === 'vi' ? 'Bỏ tác vụ đang đỗ' : 'Remove parked task');
    updateParking(parkedItems.filter((entry) => entry.itemId !== itemId));
  };

  const jumpToSection = (sectionId) => {
    const scroller = panelScrollRef.current;
    const section = scroller?.querySelector?.(`[data-bqa-section="${sectionId}"]`);
    if (!scroller || !section) return;
    const top = Math.max(0, section.offsetTop - 6);
    scroller.scrollTo({ top, behavior: motionMode === 'reduced' ? 'auto' : 'smooth' });
    setActiveScrollSection(sectionId);
  };

  const handlePanelScroll = (event) => {
    const scroller = event.currentTarget;
    const top = Math.max(0, Number(scroller.scrollTop) || 0);
    let currentSection = scrollSections[0]?.id || 'apps';
    scrollSections.forEach((section) => {
      const node = scroller.querySelector?.(`[data-bqa-section="${section.id}"]`);
      if (node && node.offsetTop <= top + 42) currentSection = section.id;
    });
    setActiveScrollSection(currentSection);

    if (!spatialMemoryEnabled || typeof window === 'undefined') return;
    const key = spatialContextKey(currentRoute, selectedTool, effectiveWorkspace);
    window.clearTimeout(spatialScrollTimerRef.current);
    spatialScrollTimerRef.current = window.setTimeout(() => {
      updateSpatialMemory((current) => ({
        scroll: { ...(current.scroll || {}), [key]: top },
      }));
    }, 120);
  };

  const createSidebarSnapshot = () => {
    const now = new Date();
    const snapshot = {
      id: `snapshot-${Date.now().toString(36)}`,
      name: language === 'vi'
        ? `Bố cục ${now.toLocaleDateString('vi-VN')} · ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
        : `Layout ${now.toLocaleDateString()} · ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      at: Date.now(),
      workspace: effectiveWorkspace,
      config: cloneQuickAccessState(config, config),
      sectionFolds: cloneQuickAccessState(sectionFolds, sectionFolds),
    };
    const next = [snapshot, ...sidebarSnapshots].slice(0, QUICK_ACCESS_SNAPSHOT_MAX);
    setSidebarSnapshots(next);
    saveQuickAccessSnapshots(currentUser, next);
  };

  const restoreSidebarSnapshot = (snapshot) => {
    if (!snapshot?.config) return;
    pushUndo(language === 'vi' ? 'Khôi phục snapshot' : 'Restore snapshot');
    persist(snapshot.config);
    if (snapshot.sectionFolds) {
      setSectionFolds(snapshot.sectionFolds);
      saveQuickAccessSectionFolds(currentUser, snapshot.sectionFolds);
    }
    if (QUICK_ACCESS_WORKSPACES.includes(snapshot.workspace)) {
      if (spatialMemoryEnabled) updateSpatialMemory({ workspace: snapshot.workspace });
      if (contextMemoryEnabled) updateRouteWorkspaceMemory(routeContextKey, snapshot.workspace);
    }
    setCustomizing(false);
  };

  const deleteSidebarSnapshot = (snapshotId) => {
    const next = sidebarSnapshots.filter((snapshot) => snapshot.id !== snapshotId);
    setSidebarSnapshots(next);
    saveQuickAccessSnapshots(currentUser, next);
  };

  const updateShelf = (next) => {
    const safe = (Array.isArray(next) ? next : []).slice(0, QUICK_ACCESS_SHELF_MAX);
    setShelfItems(safe);
    saveQuickAccessShelf(currentUser, safe);
  };

  const addItemToShelf = (item) => {
    if (!item) return;
    const entry = {
      id: `shelf-item-${item.id}`,
      type: 'item',
      itemId: item.id,
      label: labelFor(item, language),
      at: Date.now(),
    };
    updateShelf([entry, ...shelfItems.filter((candidate) => candidate.id !== entry.id)].slice(0, QUICK_ACCESS_SHELF_MAX));
    setActionItemId('');
  };

  const handleShelfDrop = (event) => {
    event.preventDefault();
    const incoming = [];
    const files = [...(event.dataTransfer?.files || [])].slice(0, QUICK_ACCESS_SHELF_MAX);
    files.forEach((file) => {
      const id = `shelf-file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      shelfFilesRef.current.set(id, file);
      incoming.push({ id, type: 'file', label: file.name, size: file.size, at: Date.now() });
    });

    if (!incoming.length) {
      const raw = String(event.dataTransfer?.getData('text/plain') || '').trim();
      const item = catalog.find((candidate) => candidate.id === raw);
      if (item) {
        incoming.push({ id: `shelf-item-${item.id}`, type: 'item', itemId: item.id, label: labelFor(item, language), at: Date.now() });
      } else if (raw) {
        const type = /^https?:\/\//i.test(raw) ? 'url' : 'text';
        incoming.push({
          id: `shelf-${type}-${Date.now().toString(36)}`,
          type,
          value: raw.slice(0, 4000),
          label: type === 'url' ? raw.replace(/^https?:\/\//i, '').slice(0, 52) : raw.slice(0, 72),
          at: Date.now(),
        });
      }
    }

    if (!incoming.length) return;
    const incomingIds = new Set(incoming.map((entry) => entry.id));
    updateShelf([...incoming, ...shelfItems.filter((entry) => !incomingIds.has(entry.id))].slice(0, QUICK_ACCESS_SHELF_MAX));
  };

  const removeShelfItem = (id) => {
    shelfFilesRef.current.delete(id);
    updateShelf(shelfItems.filter((entry) => entry.id !== id));
  };

  const activateShelfItem = async (entry, sourceEl = null) => {
    if (!entry) return;
    if (entry.type === 'item') {
      const item = presentationCatalog.find((candidate) => candidate.id === entry.itemId);
      if (item) activateItem(item, sourceEl);
      return;
    }
    if (entry.type === 'url' && entry.value) {
      window.open(entry.value, '_blank', 'noopener,noreferrer');
      return;
    }
    if (entry.type === 'text' && entry.value) {
      try { await navigator.clipboard?.writeText(entry.value); } catch { /* clipboard is best effort */ }
    }
  };

  const dragShelfItem = (entry, event) => {
    if (!entry || !event?.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'copy';
    if (entry.type === 'item') {
      event.dataTransfer.setData('text/plain', entry.itemId);
      event.dataTransfer.setData('application/x-brian-quick-access-item', entry.itemId);
    } else if (entry.type === 'file') {
      const file = shelfFilesRef.current.get(entry.id);
      if (file) {
        try { event.dataTransfer.items?.add(file); } catch { /* browser may disallow adding file items */ }
        event.dataTransfer.setData('text/plain', file.name);
      } else {
        event.dataTransfer.setData('text/plain', entry.label || '');
      }
    } else {
      event.dataTransfer.setData('text/plain', entry.value || '');
      if (entry.type === 'url') event.dataTransfer.setData('text/uri-list', entry.value || '');
    }
  };

  const setAliasForItem = (itemId, value) => {
    const trimmed = String(value || '').slice(0, 80);
    setSearchAliases((current) => {
      const next = { ...current };
      if (trimmed.trim()) next[itemId] = trimmed;
      else delete next[itemId];
      saveQuickAccessAliases(currentUser, next);
      return next;
    });
  };

  const togglePrivateItem = (itemId) => {
    setPrivateItemIds((current) => {
      const next = current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId];
      saveQuickAccessPrivateItems(currentUser, next);
      return next;
    });
  };

  const setScreenGuardEnabled = (enabled) => {
    const next = Boolean(enabled);
    setScreenGuard(next);
    saveQuickAccessScreenGuard(currentUser, next);
    if (next) {
      setPeekItemId('');
      setCapsuleItemId('');
    }
  };

  const setReadingMode = (enabled) => {
    const next = Boolean(enabled);
    setCompactReadingMode(next);
    saveQuickAccessReadingMode(currentUser, next);
  };

  const recordUsage = (kind, itemId = '') => {
    setUsageInsights((current) => {
      const next = cloneQuickAccessState(current, { apps: {}, commandSearches: 0, workflowRuns: 0 })
        || { apps: {}, commandSearches: 0, workflowRuns: 0 };
      if (kind === 'open' && itemId) {
        const previous = next.apps?.[itemId] || {};
        next.apps = {
          ...(next.apps || {}),
          [itemId]: {
            opens: Math.max(0, Number(previous.opens) || 0) + 1,
            lastUsed: Date.now(),
          },
        };
      } else if (kind === 'command') {
        next.commandSearches = Math.max(0, Number(next.commandSearches) || 0) + 1;
      } else if (kind === 'workflow') {
        next.workflowRuns = Math.max(0, Number(next.workflowRuns) || 0) + 1;
      }
      saveQuickAccessUsage(currentUser, next);
      return next;
    });
  };

  const copyTextToClipboard = async (text) => {
    if (!text || typeof window === 'undefined') return false;
    try {
      await navigator.clipboard?.writeText(text);
      return true;
    } catch {
      try {
        const node = document.createElement('textarea');
        node.value = text;
        node.setAttribute('readonly', '');
        node.style.position = 'fixed';
        node.style.opacity = '0';
        document.body.appendChild(node);
        node.select();
        const ok = document.execCommand('copy');
        node.remove();
        return ok;
      } catch {
        return false;
      }
    }
  };

  const copyDeepLink = async (item) => {
    if (!item || typeof window === 'undefined') return;
    const exactHash = activeItem(item, currentRoute, selectedTool) ? String(window.location.hash || item.target || '') : String(item.target || '');
    const base = window.location.href.split('#')[0];
    const href = exactHash.startsWith('#') ? `${base}${exactHash}` : `${base}#/`;
    await copyTextToClipboard(href);
    setActionItemId('');
  };

  const updateSpatialMemory = (patchOrUpdater) => {
    setDeviceSpatial((current) => {
      const patch = typeof patchOrUpdater === 'function'
        ? patchOrUpdater(current)
        : patchOrUpdater;
      const next = {
        ...current,
        ...(patch && typeof patch === 'object' ? patch : {}),
        updatedAt: Date.now(),
      };
      saveQuickAccessSpatialMemory(currentUser, next);
      return next;
    });
  };

  const clearDeviceSpatialMemory = () => {
    const next = { workspace: '', side: '', lastItemId: '', scroll: {}, updatedAt: Date.now() };
    setDeviceSpatial(next);
    saveQuickAccessSpatialMemory(currentUser, next);
    if (panelScrollRef.current) panelScrollRef.current.scrollTop = 0;
  };

  const updateRouteWorkspaceMemory = (contextKey, nextWorkspace) => {
    const safeWorkspace = QUICK_ACCESS_WORKSPACES.includes(nextWorkspace) ? nextWorkspace : 'all';
    setRouteWorkspaceMemory((current) => {
      const next = { ...current, [contextKey]: safeWorkspace };
      saveQuickAccessContextMemory(currentUser, next);
      return next;
    });
  };

  const clearRouteWorkspaceMemory = () => {
    setRouteWorkspaceMemory({});
    saveQuickAccessContextMemory(currentUser, {});
  };

  const setContextMemoryEnabled = (enabled) => {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled) {
      updateRouteWorkspaceMemory(routeContextKey, workspace);
      persist({ ...config, contextMemory: true });
      return;
    }
    persist({ ...config, contextMemory: false, workspace });
  };

  const setWorkspace = (nextWorkspace) => {
    const safeWorkspace = QUICK_ACCESS_WORKSPACES.includes(nextWorkspace) ? nextWorkspace : 'all';
    if (safeWorkspace !== effectiveWorkspace) pushUndo(language === 'vi' ? 'Đổi không gian làm việc' : 'Change workspace');
    if (contextMemoryEnabled) updateRouteWorkspaceMemory(routeContextKey, safeWorkspace);
    if (spatialMemoryEnabled) updateSpatialMemory({ workspace: safeWorkspace });
    else persist({ ...config, workspace: safeWorkspace });
    if (contextLock?.locked) {
      const nextLock = { ...contextLock, workspace: safeWorkspace, at: Date.now() };
      setContextLock(nextLock);
      saveQuickAccessContextLock(currentUser, nextLock);
    }
    setQuickCreateOpen(false);
    setWorkflowCenterOpen(false);
    setCommandQuery('');
    setCommandActiveIndex(0);
  };

  const setSpatialMemoryEnabled = (enabled) => {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled) {
      updateSpatialMemory({ workspace, side: 'left' });
      persist({ ...config, spatialMemory: true, side: 'left' });
      return;
    }
    persist({
      ...config,
      spatialMemory: false,
      workspace,
      side: 'left',
    });
  };

  const setClassroomPresentationMode = (enabled) => {
    const next = Boolean(enabled);
    setClassroomMode(next);
    setNotificationCenterOpen(false);
    setWorkflowCenterOpen(false);
    setBackStackOpen(false);
    setQuickCreateOpen(false);
    setCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    setCommandQuery('');
    setPeekItemId('');
    setActionItemId('');
    setCapsuleItemId('');
    if (next) {
      window.clearTimeout(closeTimerRef.current);
      setHovered(true);
      const routeSignature = `${currentRoute || ''} ${selectedTool?.slug || ''}`.toLowerCase();
      if (/(brian-team|settings|admin|report|ttcm|audit|governance)/i.test(routeSignature)) {
        launchRoute({
          target: '#/dashboard',
          label: 'CL',
          color: '#2f7d69',
          sourceEl: null,
          meta: { source: 'quick-access-classroom-mode' },
        });
      }
    }
  };

  const enter = () => {
    openRail();
  };

  const leave = () => {
    window.clearTimeout(closeTimerRef.current);
    if (pinned || customizing || notificationCenterOpen || workflowCenterOpen) return;
    closeTimerRef.current = window.setTimeout(() => collapseRail(false), 340);
  };

  const saveBookmarkForItem = (item) => {
    if (!item || typeof window === 'undefined') return;
    const target = activeItem(item, currentRoute, selectedTool)
      ? String(window.location.hash || item.target || '')
      : String(item.target || '');
    if (!target.startsWith('#/')) return;
    const bookmark = {
      itemId: item.id,
      target,
      label: labelFor(item, language),
      workspace: effectiveWorkspace,
      scrollY: activeItem(item, currentRoute, selectedTool) ? Math.max(0, Number(window.scrollY) || 0) : 0,
      updatedAt: Date.now(),
    };
    setAppBookmarks((current) => {
      const next = { ...current, [item.id]: bookmark };
      saveQuickAccessBookmarks(currentUser, next);
      return next;
    });
    setBookmarkToast(language === 'vi' ? `Đã lưu: ${labelFor(item, language)}` : `Saved: ${labelFor(item, language)}`);
    window.clearTimeout(bookmarkToastTimerRef.current);
    bookmarkToastTimerRef.current = window.setTimeout(() => setBookmarkToast(''), 1600);
    setActionItemId('');
  };

  const restoreBookmark = (bookmark, sourceEl = null) => {
    if (!bookmark?.target) return;
    if (QUICK_ACCESS_WORKSPACES.includes(bookmark.workspace)) setWorkspace(bookmark.workspace);
    setActionItemId('');
    setSessionTrailOpen(false);
    suppressHistoryRef.current = true;
    launchRoute({
      target: bookmark.target,
      label: '🔖',
      color: '#6b65c7',
      sourceEl,
      meta: { source: 'quick-access-app-bookmark' },
    });
    if (typeof window !== 'undefined' && Number(bookmark.scrollY) > 0) {
      window.setTimeout(() => window.scrollTo({ top: Number(bookmark.scrollY), behavior: motionMode === 'reduced' ? 'auto' : 'smooth' }), 420);
    }
  };

  const removeBookmark = (itemId) => {
    setAppBookmarks((current) => {
      const next = { ...current };
      delete next[itemId];
      saveQuickAccessBookmarks(currentUser, next);
      return next;
    });
    setActionItemId('');
  };

  const setDoubleClickAction = (itemId, descriptorId) => {
    setDoubleClickActions((current) => {
      const next = { ...current };
      if (descriptorId) next[itemId] = descriptorId;
      else delete next[itemId];
      saveQuickAccessDoubleClickActions(currentUser, next);
      return next;
    });
  };

  const handleRailClick = (item, sourceEl) => {
    const descriptorId = doubleClickActions[item?.id];
    if (!descriptorId) {
      activateItem(item, sourceEl);
      return;
    }
    const previous = railClickTimersRef.current.get(item.id);
    if (previous) window.clearTimeout(previous);
    const timer = window.setTimeout(() => {
      railClickTimersRef.current.delete(item.id);
      activateItem(item, sourceEl);
    }, 210);
    railClickTimersRef.current.set(item.id, timer);
  };

  const handleRailDoubleClick = (item, sourceEl) => {
    const descriptorId = doubleClickActions[item?.id];
    if (!descriptorId) return;
    const pending = railClickTimersRef.current.get(item.id);
    if (pending) window.clearTimeout(pending);
    railClickTimersRef.current.delete(item.id);
    const descriptor = quickActionDescriptors(item, language).find((candidate) => candidate.id === descriptorId);
    if (descriptor) runQuickAction(item, descriptor, sourceEl);
  };

  const handleCommandDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDropZoneActive(false);
    const raw = String(
      event.dataTransfer?.getData('application/x-brian-quick-access-item')
      || event.dataTransfer?.getData('text/plain')
      || ''
    ).trim();
    if (!raw) return;
    let itemId = raw;
    if (raw.startsWith('#/')) {
      const normalized = raw.split('?')[0];
      const match = catalog.find((candidate) => candidate.target === normalized);
      itemId = match?.id || '';
    } else if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        const hash = String(url.hash || '');
        const normalized = hash.split('?')[0];
        const match = catalog.find((candidate) => candidate.target === normalized);
        itemId = match?.id || '';
      } catch {
        itemId = '';
      }
    }
    if (!itemId || !allowedIds.includes(itemId) || config.items.includes(itemId) || config.items.length >= QUICK_ACCESS_MAX_ITEMS) return;
    persistWithUndo(
      { ...config, items: [...config.items, itemId] },
      language === 'vi' ? 'Thêm lối tắt từ Drop Zone' : 'Add shortcut from Drop Zone',
    );
  };

  const navigateTrailEntry = (trail, sourceEl = null) => {
    if (!trail?.target || trail.current) return;
    setSessionTrailOpen(false);
    suppressHistoryRef.current = true;
    launchRoute({
      target: trail.target,
      label: '•',
      color: trail.item?.accent || '#2b76c7',
      sourceEl,
      meta: { source: 'quick-access-session-trail' },
    });
  };

  const activateItem = (item, sourceEl) => {
    if (!item) return;
    recordUsage('open', item.id);
    if (spatialMemoryEnabled) updateSpatialMemory({ lastItemId: item.id });
    const recent = [item.id, ...(config.recent || []).filter((id) => id !== item.id)].slice(0, QUICK_ACCESS_RECENT_MAX);
    const nextConfig = { ...config, recent };
    setConfig(nextConfig);
    saveQuickAccessConfigToCloud(currentUser, nextConfig, allowedIds).then((result) => {
      if (result?.config) setConfig(result.config);
    });
    setCommandQuery('');
    setPeekItemId('');
    setActionItemId('');
    setOverflowOpen(false);
    setWorkspaceSwitcherOpen(false);
    setActiveActionsItemId('');
    runAction(item, sourceEl);
    if (!pinned) collapseRail(false);
  };

  const openParkedItem = (entry, sourceEl = null) => {
    if (!entry) return;
    const item = presentationCatalog.find((candidate) => candidate.id === entry.itemId);
    if (!item) {
      updateParking(parkedItems.filter((candidate) => candidate.itemId !== entry.itemId));
      return;
    }
    const target = String(entry.target || '');
    if (target.startsWith('#/') && target !== item.target) {
      if (spatialMemoryEnabled) updateSpatialMemory({ lastItemId: item.id });
      const recent = [item.id, ...(config.recent || []).filter((id) => id !== item.id)].slice(0, QUICK_ACCESS_RECENT_MAX);
      const nextConfig = { ...config, recent };
      setConfig(nextConfig);
      saveQuickAccessConfigToCloud(currentUser, nextConfig, allowedIds).then((result) => {
        if (result?.config) setConfig(result.config);
      });
      launchRoute({
        target,
        label: labelFor(item, language),
        color: item.accent || '#2b76c7',
        sourceEl,
        meta: { source: 'quick-access-parking' },
      });
      if (!pinned) collapseRail(false);
      return;
    }
    activateItem(item, sourceEl);
  };

  const showActiveQuickActions = (item, sourceEl) => {
    window.clearTimeout(activeActionsTimerRef.current);
    if (!item || !activeItem(item, currentRoute, selectedTool)) {
      setActiveActionsItemId('');
      return;
    }
    const actions = quickActionDescriptors(item, language);
    if (!actions.length) return;
    const rect = sourceEl?.getBoundingClientRect?.();
    if (rect) setActiveActionsTop(Math.max(86, Math.min(window.innerHeight - 170, rect.top - 4)));
    setActiveActionsItemId(item.id);
  };

  const hideActiveQuickActions = () => {
    window.clearTimeout(activeActionsTimerRef.current);
    activeActionsTimerRef.current = window.setTimeout(() => setActiveActionsItemId(''), 180);
  };

  const parseHandoffPacket = (item, event) => {
    if (!item || !event?.dataTransfer) return null;
    const transfer = event.dataTransfer;
    const files = [...(transfer.files || [])].slice(0, 5);
    const sourceItemId = String(transfer.getData('application/x-brian-quick-access-item') || '').trim();
    const uri = String(transfer.getData('text/uri-list') || '').trim();
    const textValue = String(transfer.getData('text/plain') || '').trim();
    const packet = {
      id: `handoff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      targetItemId: item.id,
      sourceItemId,
      kind: files.length ? 'files' : uri ? 'url' : sourceItemId ? 'app' : 'text',
      text: uri || textValue,
      url: uri || (/^https?:\/\//i.test(textValue) ? textValue : ''),
      files,
      fileMeta: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      createdAt: Date.now(),
      source: 'quick-access-v6-handoff',
    };
    if (!files.length && !packet.text && !sourceItemId) return null;
    return packet;
  };

  const dispatchHandoff = (packet) => {
    if (!packet || typeof window === 'undefined') return;
    handoffPacketRef.current = packet;
    window.__BRIAN_QUICK_ACCESS_HANDOFF__ = packet;
    try {
      const persistable = { ...packet, files: [] };
      window.sessionStorage?.setItem('bes-quick-access-handoff-v6', JSON.stringify(persistable));
    } catch {
      // Handoff persistence is best effort.
    }
    window.dispatchEvent(new CustomEvent('bes-quick-access-handoff', { detail: packet }));
    window.setTimeout(() => {
      if (handoffPacketRef.current?.id === packet.id) {
        window.dispatchEvent(new CustomEvent('bes-quick-access-handoff', { detail: packet }));
      }
    }, 420);
  };

  const handleRailHandoffDrop = (item, event) => {
    event.preventDefault();
    event.stopPropagation();
    setHandoffTargetId('');
    const packet = parseHandoffPacket(item, event);
    if (!packet) return;
    dispatchHandoff(packet);
    activateItem(item, event.currentTarget);
  };

  selectedItemsRef.current = workspaceItems;
  switcherItemsRef.current = switcherItems;
  activateItemRef.current = activateItem;

  const setSidebarMode = (mode) => {
    const nextMode = ['auto', 'pin', 'focus'].includes(mode) ? mode : 'auto';
    persist({ ...config, mode: nextMode, pinned: nextMode === 'pin' });
    if (nextMode === 'pin') openRail();
    else if (nextMode === 'focus') collapseRail(true);
  };

  const updatePersonalization = (patch) => persist({ ...config, ...patch });

  const togglePinned = () => setSidebarMode(pinned ? 'auto' : 'pin');

  const showCapsule = (item, sourceEl) => {
    window.clearTimeout(capsuleTimerRef.current);
    if (classroomMode) {
      setCapsuleItemId('');
      return;
    }
    const snapshot = capsuleSnapshotFor(item);
    if (!snapshot) {
      setCapsuleItemId('');
      return;
    }
    capsuleTimerRef.current = window.setTimeout(() => {
      const rect = sourceEl?.getBoundingClientRect?.();
      if (rect) setCapsuleTop(Math.max(86, Math.min(window.innerHeight - 96, rect.top - 4)));
      setCapsuleItemId(item.id);
    }, 110);
  };

  const hideCapsule = () => {
    window.clearTimeout(capsuleTimerRef.current);
    capsuleTimerRef.current = window.setTimeout(() => setCapsuleItemId(''), 90);
  };

  const showPeek = (item, sourceEl) => {
    window.clearTimeout(peekTimerRef.current);
    if (!item || actionItemId || capsuleSnapshotFor(item) || itemIsGuarded(item)) return;
    peekTimerRef.current = window.setTimeout(() => {
      const rect = sourceEl?.getBoundingClientRect?.();
      if (rect) setPeekTop(Math.max(86, Math.min(window.innerHeight - 210, rect.top - 8)));
      setPeekItemId(item.id);
    }, 360);
  };

  const hidePeek = () => {
    window.clearTimeout(peekTimerRef.current);
    peekTimerRef.current = window.setTimeout(() => setPeekItemId(''), 110);
  };

  const runQuickAction = (item, descriptor, sourceEl = null) => {
    if (!item || !descriptor) return;
    if (descriptor.action === 'ttcm-feed') openTtcm('feed');
    else if (descriptor.action === 'ttcm-schedule') openTtcm('schedule');
    else if (descriptor.action === 'ttcm-personnel') openTtcm('personnel');
    else if (descriptor.action === 'attendance') runAction({ action: 'attendance' }, sourceEl);
    else if (descriptor.targetItemId) {
      const targetItem = presentationCatalog.find((candidate) => candidate.id === descriptor.targetItemId);
      if (targetItem) activateItem(targetItem, sourceEl);
    } else activateItem(item, sourceEl);
    setActionItemId('');
    setPeekItemId('');
  };

  const runQuickCreate = (entry, sourceEl = null) => {
    if (!entry?.descriptor || !entry?.item) return;
    setQuickCreateOpen(false);
    setCommandQuery('');
    setCommandActiveIndex(0);
    activateItem(entry.item, sourceEl);
    if (entry.descriptor.event && typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(entry.descriptor.event, { detail: entry.descriptor.detail || {} }));
      }, 320);
    }
  };

  const executeCommand = (entry, sourceEl = null) => {
    if (!entry) return;
    if (entry.kind === 'action') runQuickCreate(entry.payload, sourceEl);
    else activateItem(entry.item, sourceEl);
  };

  const executePaletteCommand = (entry, sourceEl = null) => {
    if (!entry) return;
    recordUsage('command');
    setCommandPaletteOpen(false);
    setCommandPaletteQuery('');
    setCommandPaletteIndex(0);
    executeCommand(entry, sourceEl);
  };

  const openNotification = (entry, sourceEl = null) => {
    if (!entry) return;
    const item = catalog.find((candidate) => candidate.id === entry.itemId);
    if (item) activateItem(item, sourceEl);
    setNotificationCenterOpen(false);
  };

  const navigateBackEntry = (entry, index = 0, sourceEl = null) => {
    if (!entry?.target) return;
    const remaining = backStack.slice(Math.max(0, Number(index) + 1));
    setBackStack(remaining);
    saveQuickAccessHistory(currentUser, remaining);
    setBackStackOpen(false);
    suppressHistoryRef.current = true;
    launchRoute({
      target: entry.target,
      label: '←',
      color: '#2b76c7',
      sourceEl,
      meta: { source: 'quick-access-back-stack' },
    });
  };

  const dismissResume = (id) => {
    const next = resumeItems.filter((entry) => entry.id !== id);
    setResumeItems(next);
    saveQuickAccessResume(currentUser, next);
  };

  const resumeTask = (entry, sourceEl = null) => {
    if (!entry?.resume || !entry?.item) return;
    const { resume, item } = entry;
    activateItem(item, sourceEl);
    if (resume.event && typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(resume.event, { detail: resume.detail || {} }));
      }, 360);
    }
  };

  const toggleWorkflowDraftItem = (itemId) => {
    setWorkflowDraftIds((current) => {
      if (current.includes(itemId)) return current.filter((id) => id !== itemId);
      if (current.length >= QUICK_ACCESS_WORKFLOW_STEPS_MAX) return current;
      return [...current, itemId];
    });
  };

  const saveWorkflowBundle = () => {
    if (!workflowDraftIds.length || workflowBundles.length >= QUICK_ACCESS_WORKFLOW_MAX) return;
    const workflow = {
      id: `workflow-${Date.now().toString(36)}`,
      name: workflowDraftName.trim() || (language === 'vi' ? `Quy trình ${workflowBundles.length + 1}` : `Workflow ${workflowBundles.length + 1}`),
      itemIds: workflowDraftIds.slice(0, QUICK_ACCESS_WORKFLOW_STEPS_MAX),
    };
    persistWithUndo(
      { ...config, workflows: [...workflowBundles.map(({ id, name, itemIds }) => ({ id, name, itemIds })), workflow] },
      language === 'vi' ? 'Tạo quy trình' : 'Create workflow',
    );
    setWorkflowDraftName('');
    setWorkflowDraftIds([]);
  };

  const deleteWorkflowBundle = (workflowId) => {
    const next = workflowBundles
      .filter((workflow) => workflow.id !== workflowId)
      .map(({ id, name, itemIds }) => ({ id, name, itemIds }));
    persistWithUndo({ ...config, workflows: next }, language === 'vi' ? 'Xóa quy trình' : 'Delete workflow');
    if (activeWorkflowRun?.workflowId === workflowId) {
      setActiveWorkflowRun(null);
      saveQuickAccessWorkflowRun(currentUser, null);
    }
  };

  const runWorkflowStep = (workflow, index, sourceEl = null) => {
    const item = workflow?.items?.[index];
    if (!item) return;
    const nextRun = { workflowId: workflow.id, nextIndex: index + 1 };
    setActiveWorkflowRun(nextRun);
    saveQuickAccessWorkflowRun(currentUser, nextRun);
    setWorkflowCenterOpen(false);
    collapseRail(true);
    activateItem(item, sourceEl);
  };

  const startWorkflowBundle = (workflow, sourceEl = null) => {
    if (!workflow?.items?.length) return;
    recordUsage('workflow');
    runWorkflowStep(workflow, 0, sourceEl);
  };

  const continueWorkflowBundle = (sourceEl = null) => {
    if (!activeWorkflow) return;
    if (activeWorkflowNextIndex >= activeWorkflow.items.length) {
      setActiveWorkflowRun(null);
      saveQuickAccessWorkflowRun(currentUser, null);
      return;
    }
    runWorkflowStep(activeWorkflow, activeWorkflowNextIndex, sourceEl);
  };

  const finishWorkflowBundle = () => {
    setActiveWorkflowRun(null);
    saveQuickAccessWorkflowRun(currentUser, null);
  };

  const removeItem = (id) => {
    const next = config.items.filter((itemId) => itemId !== id);
    persistWithUndo({ ...config, items: next }, language === 'vi' ? 'Bỏ lối tắt' : 'Remove shortcut');
  };

  const addItem = (id) => {
    if (config.items.length >= QUICK_ACCESS_MAX_ITEMS || config.items.includes(id)) return;
    persistWithUndo({ ...config, items: [...config.items, id] }, language === 'vi' ? 'Thêm lối tắt' : 'Add shortcut');
  };

  const reset = () => {
    pushUndo(language === 'vi' ? 'Khôi phục mặc định' : 'Reset defaults');
    clearDeviceSpatialMemory();
    persist(createDefaultQuickAccessConfig(allowedIds));
  };

  const moveDraggedBefore = (targetId) => {
    if (!dragId || dragId === targetId) return;
    const next = config.items.filter((id) => id !== dragId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex < 0 ? next.length : targetIndex, 0, dragId);
    persistWithUndo({ ...config, items: next }, language === 'vi' ? 'Đổi thứ tự lối tắt' : 'Reorder shortcuts');
    setDragId('');
  };

  const dropToFavorites = () => {
    if (!dragId) return;
    if (!config.items.includes(dragId)) {
      if (config.items.length >= QUICK_ACCESS_MAX_ITEMS) {
        setDragId('');
        return;
      }
      persistWithUndo({ ...config, items: [...config.items, dragId] }, language === 'vi' ? 'Ghim lối tắt' : 'Pin shortcut');
    }
    setDragId('');
  };

  const quickAccessUi = (
    <>
      {commandPaletteOpen ? (
        <div
          className="bqa-command-palette-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            setCommandPaletteOpen(false);
            setCommandPaletteQuery('');
            setCommandPaletteIndex(0);
          }}
        >
          <section className="bqa-command-palette" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Bảng lệnh Brian' : 'Brian Command Palette'}>
            <header className="bqa-command-palette-search" data-bes-keep-search="true">
              <span className="bqa-command-palette-logo" aria-hidden="true"><Command size={19} /></span>
              <input
                ref={commandPaletteInputRef}
                type="search"
                autoFocus
                tabIndex={0}
                data-bes-keep-search="true"
                value={commandPaletteQuery}
                onChange={(event) => {
                  setCommandPaletteQuery(event.target.value);
                  setCommandPaletteIndex(0);
                }}
                onKeyDown={(event) => {
                  if (!commandPaletteResults.length) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setCommandPaletteIndex((index) => (index + 1) % commandPaletteResults.length);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setCommandPaletteIndex((index) => (index - 1 + commandPaletteResults.length) % commandPaletteResults.length);
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    executePaletteCommand(
                      commandPaletteResults[Math.min(commandPaletteIndex, commandPaletteResults.length - 1)],
                      event.currentTarget,
                    );
                  }
                }}
                placeholder={language === 'vi' ? 'Tìm ứng dụng hoặc hành động…' : 'Search apps or actions…'}
                aria-label={language === 'vi' ? 'Tìm ứng dụng hoặc hành động' : 'Search apps or actions'}
              />
              <span className="bqa-command-palette-esc">Esc</span>
            </header>

            <div className="bqa-command-palette-meta">
              <span>{commandPaletteNeedle ? (language === 'vi' ? 'Kết quả tìm kiếm' : 'Search results') : (language === 'vi' ? 'Gợi ý nhanh' : 'Quick suggestions')}</span>
              <b>{commandPaletteResults.length}</b>
            </div>

            <div className="bqa-command-palette-results" role="listbox">
              {commandPaletteResults.map((entry, index) => {
                const item = entry.item;
                const Icon = entry.kind === 'action' ? Zap : (item?.icon || Boxes);
                const active = index === commandPaletteIndex;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    role="option"
                    aria-selected={active}
                    className={`bqa-command-palette-result ${active ? 'is-active' : ''}`}
                    onMouseEnter={() => setCommandPaletteIndex(index)}
                    onClick={(event) => executePaletteCommand(entry, event.currentTarget)}
                  >
                    <span className="bqa-command-palette-icon" style={{ '--bqa-accent': item?.accent || '#2e6fae' }}><Icon size={19} aria-hidden="true" /></span>
                    <span className="bqa-command-palette-copy">
                      <strong>{entry.label}</strong>
                      <small>{entry.description}</small>
                    </span>
                    <span className={`bqa-command-palette-kind is-${entry.kind}`}>
                      {entry.kind === 'action' ? (language === 'vi' ? 'Lệnh' : 'Action') : 'App'}
                    </span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                );
              })}
              {!commandPaletteResults.length ? (
                <div className="bqa-command-palette-empty">
                  <Search size={22} aria-hidden="true" />
                  <strong>{language === 'vi' ? 'Không tìm thấy kết quả' : 'No results found'}</strong>
                  <span>{language === 'vi' ? 'Thử từ khóa khác hoặc tên ứng dụng.' : 'Try another keyword or app name.'}</span>
                </div>
              ) : null}
            </div>

            <footer className="bqa-command-palette-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd>{language === 'vi' ? 'Di chuyển' : 'Navigate'}</span>
              <span><kbd>Enter</kbd>{language === 'vi' ? 'Mở' : 'Open'}</span>
              <span><kbd>Esc</kbd>{language === 'vi' ? 'Đóng' : 'Close'}</span>
            </footer>
          </section>
        </div>
      ) : null}

      <div
        ref={rootRef}
        className={`bqa-root ${expanded ? 'is-open' : 'is-collapsed'} ${collapsing ? 'is-collapsing' : ''} ${pinned ? 'is-pinned' : ''} ${focusMode ? 'is-focus' : ''} ${customizing ? 'is-customizing' : ''} ${notificationCenterOpen ? 'is-alerts-open' : ''} ${workflowCenterOpen ? 'is-workflow-open' : ''} ${classroomMode ? 'is-classroom-mode' : ''} ${overflowOpen ? 'is-overflow-open' : ''} ${workspaceSwitcherOpen ? 'is-workspace-switcher-open' : ''}`}
        data-quick-access="true"
        data-sidebar-mode={sidebarMode}
        data-workspace={effectiveWorkspace}
        data-saved-workspace={workspace}
        data-classroom-mode={classroomMode ? 'true' : 'false'}
        data-size={railSize}
        data-motion-mode={motionMode}
        data-density={density}
        data-side={railSide}
        data-theme-style={visualTheme}
        data-labels={showLabels ? 'show' : 'hide'}
        data-spatial-memory={spatialMemoryEnabled ? 'true' : 'false'}
        data-context-memory={contextMemoryEnabled ? 'true' : 'false'}
        data-context-lock={contextLock?.locked ? 'true' : 'false'}
        data-screen-guard={screenGuard ? 'true' : 'false'}
        data-reading-mode={compactReadingMode ? 'compact' : 'normal'}
        data-rail-capacity={railCapacity}
        data-overflow-count={railOverflowItems.length}
        data-bookmark-count={Object.keys(appBookmarks).length}
        data-session-trail-count={sessionTrailEntries.length}
        data-command-drop={precisionDrag ? 'true' : 'false'}
        data-precision-drag={precisionDrag ? 'true' : 'false'}
        data-keyboard-layer={keyboardLayer ? 'true' : 'false'}
        data-context-key={routeContextKey}
        data-time-aware={timeAwareEnabled ? 'true' : 'false'}
        data-time-band={timeContext.id}
        style={{ '--bqa-magnet': magneticStrength }}
        data-motion={collapsing ? 'collapsing' : (expanded ? 'open' : 'rest')}
        data-route={currentRoute}
        onPointerEnter={enter}
        onPointerLeave={leave}
        onFocusCapture={enter}
      >
        <div
          className="bqa-edge-trigger"
          aria-hidden="true"
          onPointerEnter={() => {
            window.clearTimeout(magneticTimerRef.current);
            magneticTimerRef.current = window.setTimeout(openRail, hoverDelay);
          }}
          onMouseEnter={() => {
            window.clearTimeout(magneticTimerRef.current);
            magneticTimerRef.current = window.setTimeout(openRail, hoverDelay);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen') openRail();
          }}
        />
        <div className="bqa-hover-bridge" aria-hidden="true" onPointerEnter={enter} />

        <aside
          ref={railRef}
          className="bqa-rail"
          aria-label={language === 'vi' ? 'Thanh truy cập nhanh' : 'Quick access'}
          onPointerEnter={openRail}
          onMouseEnter={openRail}
          onFocusCapture={openRail}
        >
          <button
            type="button"
            className="bqa-brand"
            aria-label={expanded ? (language === 'vi' ? 'Thu gọn thanh truy cập nhanh' : 'Collapse quick access') : (language === 'vi' ? 'Mở thanh truy cập nhanh' : 'Open quick access')}
            aria-expanded={expanded}
            onClick={() => {
              if (expanded && !pinned && !customizing) collapseRail(false);
              else openRail();
            }}
          >
            <span aria-hidden="true">B</span>
          </button>

          <button
            type="button"
            className={`bqa-rail-workspace ${workspaceSwitcherOpen ? 'is-active' : ''}`}
            title={language === 'vi' ? 'Đổi không gian làm việc' : 'Switch workspace'}
            aria-label={language === 'vi' ? 'Đổi không gian làm việc' : 'Switch workspace'}
            aria-expanded={workspaceSwitcherOpen}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setOverflowOpen(false);
              setWorkspaceSwitcherOpen((value) => !value);
            }}
          >
            <LayoutGrid size={14} aria-hidden="true" />
            <span>{effectiveWorkspace === 'teaching' ? 'G' : effectiveWorkspace === 'homeroom' ? 'C' : effectiveWorkspace === 'department' ? 'T' : 'A'}</span>
          </button>

          {!classroomMode && backStack.length ? (
            <button
              type="button"
              className={`bqa-rail-back ${backStackOpen ? 'is-active' : ''}`}
              title={language === 'vi' ? 'Quay lại' : 'Go back'}
              aria-label={language === 'vi' ? 'Quay lại trang trước' : 'Go back to previous page'}
              aria-expanded={backStackOpen}
              onPointerEnter={() => {
                openRail();
                setBackStackOpen(true);
              }}
              onFocus={() => {
                openRail();
                setBackStackOpen(true);
              }}
              onClick={(event) => navigateBackEntry(backStack[0], 0, event.currentTarget)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
          ) : null}

          {sessionTrailEntries.length > 1 ? (
            <div
              className={`bqa-session-trail ${sessionTrailOpen ? 'is-open' : ''}`}
              aria-label={language === 'vi' ? 'Dấu vết phiên làm việc' : 'Session trail'}
              onPointerEnter={() => setSessionTrailOpen(true)}
              onPointerLeave={() => setSessionTrailOpen(false)}
            >
              <span className="bqa-session-trail-line" />
              {sessionTrailEntries.map((trail, index) => (
                <button
                  type="button"
                  key={`${trail.item.id}-${index}`}
                  className={trail.current ? 'is-current' : ''}
                  style={{ '--bqa-accent': trail.item.accent }}
                  title={trail.current
                    ? (language === 'vi' ? `Đang ở: ${labelFor(trail.item, language)}` : `Current: ${labelFor(trail.item, language)}`)
                    : labelFor(trail.item, language)}
                  aria-label={labelFor(trail.item, language)}
                  onClick={(event) => navigateTrailEntry(trail, event.currentTarget)}
                >
                  <span />
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="bqa-rail-items"
            data-adaptive-dock="true"
            onPointerLeave={() => setDockHoverIndex(-1)}
          >
            {railVisibleItems.map((item, index) => {
              const Icon = item.icon || Boxes;
              const active = activeItem(item, currentRoute, selectedTool);
              const progress = progressForItem(item);
              const health = healthForItem(item);
              const badge = badgeForItem(item);
              const attentionLevel = attentionLevelForItem(item);
              const bookmark = appBookmarks[item.id] || null;
              const dockDistance = dockHoverIndex < 0
                ? (active ? 'active' : 'rest')
                : String(Math.min(3, Math.abs(index - dockHoverIndex)));
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`bqa-rail-button ${active ? 'is-active' : ''} ${progress != null ? 'has-progress' : ''} ${attentionLevel ? `has-attention attention-${attentionLevel}` : ''} ${bookmark ? 'has-bookmark' : ''} ${doubleClickActions[item.id] ? 'has-double-action' : ''} ${handoffTargetId === item.id ? 'is-handoff-target' : ''}`}
                  style={{ '--bqa-accent': item.accent, '--bqa-app-progress': progress ?? 0 }}
                  data-attention-level={attentionLevel || 0}
                  data-bookmarked={bookmark ? 'true' : 'false'}
                  title={displayLabelFor(item)}
                  aria-label={displayLabelFor(item)}
                  aria-current={active ? 'page' : undefined}
                  data-dock-distance={dockDistance}
                  onPointerEnter={(event) => {
                    setDockHoverIndex(index);
                    showCapsule(item, event.currentTarget);
                    showPeek(item, event.currentTarget);
                    showActiveQuickActions(item, event.currentTarget);
                  }}
                  onPointerLeave={() => {
                    hideCapsule();
                    hidePeek();
                    hideActiveQuickActions();
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                    setHandoffTargetId(item.id);
                  }}
                  onDragLeave={() => setHandoffTargetId((current) => current === item.id ? '' : current)}
                  onDrop={(event) => handleRailHandoffDrop(item, event)}
                  onFocus={(event) => {
                    setDockHoverIndex(index);
                    showCapsule(item, event.currentTarget);
                    showPeek(item, event.currentTarget);
                    showActiveQuickActions(item, event.currentTarget);
                  }}
                  onBlur={() => {
                    setDockHoverIndex(-1);
                    hideCapsule();
                    hidePeek();
                    hideActiveQuickActions();
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setPeekItemId('');
                    setActionItemId(item.id);
                  }}
                  onClick={(event) => handleRailClick(item, event.currentTarget)}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    handleRailDoubleClick(item, event.currentTarget);
                  }}
                >
                  {progress != null ? <span className="bqa-progress-ring" aria-label={`${Math.round(progress)}%`} /> : null}
                  {attentionLevel ? <span className={`bqa-attention-halo level-${attentionLevel}`} aria-hidden="true" /> : null}
                  {bookmark ? (
                    <span
                      className="bqa-bookmark-mark"
                      role="button"
                      tabIndex={-1}
                      title={language === 'vi' ? 'Mở bookmark đã lưu' : 'Open saved bookmark'}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        restoreBookmark(bookmark, event.currentTarget);
                      }}
                    >
                      <Bookmark size={8} fill="currentColor" aria-hidden="true" />
                    </span>
                  ) : null}
                  <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  {health ? (
                    <span className={`bqa-health-dot is-${health.state}`} title={health.message || health.state} aria-label={health.message || health.state} />
                  ) : null}
                  {keyboardLayer ? <kbd className="bqa-key-hint">{keyboardLetterForItem(item, index)}</kbd> : null}
                  {!classroomMode && !itemIsGuarded(item) && badge ? (
                    <span className={`bqa-rail-badge ${badge === 'dot' ? 'is-dot' : ''}`}>
                      {badge === 'dot' ? '' : badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {railOverflowItems.length ? (
            <button
              type="button"
              className={`bqa-rail-overflow ${overflowOpen ? 'is-active' : ''}`}
              title={language === 'vi' ? `${railOverflowItems.length} ứng dụng khác` : `${railOverflowItems.length} more apps`}
              aria-label={language === 'vi' ? 'Mở ứng dụng còn lại' : 'Open remaining apps'}
              aria-expanded={overflowOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setWorkspaceSwitcherOpen(false);
                setOverflowOpen((value) => !value);
              }}
            >
              <MoreHorizontal size={18} aria-hidden="true" />
              <span>{railOverflowItems.length}</span>
            </button>
          ) : null}

          {precisionDrag ? (
            <div
              className={`bqa-command-drop-zone ${dropZoneActive ? 'is-active' : ''}`}
              role="button"
              tabIndex={-1}
              aria-label={language === 'vi' ? 'Thả lối tắt vào đây' : 'Drop shortcut here'}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setDropZoneActive(true);
              }}
              onDragLeave={() => setDropZoneActive(false)}
              onDrop={handleCommandDrop}
            >
              <Plus size={14} aria-hidden="true" />
              <span>{language === 'vi' ? 'THẢ' : 'DROP'}</span>
            </div>
          ) : null}

          {!classroomMode ? (
            <button
              type="button"
              className={`bqa-rail-workflows ${workflowCenterOpen ? 'is-active' : ''} ${activeWorkflow ? 'has-active' : ''}`}
              title={language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}
              aria-label={language === 'vi' ? 'Mở quy trình nhanh' : 'Open workflow bundles'}
              aria-expanded={workflowCenterOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.clearTimeout(closeTimerRef.current);
                setHovered(true);
                setQuickCreateOpen(false);
                setNotificationCenterOpen(false);
                setBackStackOpen(false);
                setWorkflowCenterOpen((value) => !value);
              }}
            >
              <Boxes size={17} aria-hidden="true" />
              {workflowBundles.length ? <span>{workflowBundles.length}</span> : null}
            </button>

          ) : null}

          <button
            type="button"
            className={`bqa-rail-create ${quickCreateOpen ? 'is-active' : ''}`}
            title={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-label={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}
            aria-expanded={quickCreateOpen}
            onClick={() => {
              openRail();
              setCommandQuery('');
              setWorkflowCenterOpen(false);
              setNotificationCenterOpen(false);
              setQuickCreateOpen((value) => !value);
            }}
          >
            <Plus size={18} aria-hidden="true" />
          </button>

          {primaryActivity ? (
            <button
              type="button"
              className={`bqa-rail-activity is-${primaryActivity.state}`}
              style={{ '--bqa-progress': `${primaryActivity.progress ?? 0}` }}
              title={primaryActivity.title}
              aria-label={primaryActivity.title}
              onClick={openRail}
            >
              <span aria-hidden="true"><Zap size={15} /></span>
            </button>
          ) : null}

          {notificationCount ? (
            <button
              type="button"
              className={`bqa-rail-notifications ${notificationCenterOpen ? 'is-active' : ''}`}
              title={language === 'vi' ? 'Thông báo' : 'Notifications'}
              aria-label={language === 'vi' ? `Thông báo: ${notificationCount}` : `Notifications: ${notificationCount}`}
              aria-expanded={notificationCenterOpen}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.clearTimeout(closeTimerRef.current);
                window.clearTimeout(collapseMotionTimerRef.current);
                setCollapsing(false);
                setHovered(true);
                setQuickCreateOpen(false);
                setWorkflowCenterOpen(false);
                setBackStackOpen(false);
                setNotificationCenterOpen(true);
              }}
            >
              <Bell size={17} aria-hidden="true" />
              <span>{notificationCount > 9 ? '9+' : notificationCount}</span>
            </button>
          ) : null}

          <button
            type="button"
            className={`bqa-rail-classroom ${classroomMode ? 'is-active' : ''}`}
            title={classroomMode
              ? (language === 'vi' ? 'Thoát chế độ trình chiếu' : 'Exit presentation mode')
              : (language === 'vi' ? 'Chế độ trình chiếu lớp học' : 'Classroom presentation mode')}
            aria-label={classroomMode
              ? (language === 'vi' ? 'Thoát chế độ trình chiếu lớp học' : 'Exit classroom presentation mode')
              : (language === 'vi' ? 'Bật chế độ trình chiếu lớp học' : 'Enable classroom presentation mode')}
            aria-pressed={classroomMode}
            onClick={() => setClassroomPresentationMode(!classroomMode)}
          >
            <Presentation size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="bqa-rail-settings"
            title={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            aria-label={language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}
            onClick={() => {
              setHovered(true);
              setWorkflowCenterOpen(false);
              setNotificationCenterOpen(false);
              setCustomizerQuery('');
              setCustomizing(true);
            }}
          >
            <Settings size={19} aria-hidden="true" />
          </button>
        </aside>

        {workspaceSwitcherOpen ? (
          <section className="bqa-workspace-popover" aria-label={language === 'vi' ? 'Không gian làm việc' : 'Workspaces'}>
            <header>{language === 'vi' ? 'Không gian' : 'Workspace'}</header>
            {workspaceOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={effectiveWorkspace === option.id ? 'is-active' : ''}
                onClick={() => {
                  setWorkspace(option.id);
                  setWorkspaceSwitcherOpen(false);
                }}
              >
                <span>{option.id === 'teaching' ? 'G' : option.id === 'homeroom' ? 'C' : option.id === 'department' ? 'T' : 'A'}</span>
                <b>{option.label}</b>
                {effectiveWorkspace === option.id ? <Check size={13} aria-hidden="true" /> : null}
              </button>
            ))}
          </section>
        ) : null}

        {overflowOpen && railOverflowItems.length ? (
          <section className="bqa-overflow-popover" aria-label={language === 'vi' ? 'Ứng dụng còn lại' : 'More apps'}>
            <header>
              <span>{language === 'vi' ? 'Ứng dụng khác' : 'More apps'}</span>
              <b>{railOverflowItems.length}</b>
            </header>
            <div>
              {railOverflowItems.map((item) => {
                const Icon = item.icon || Boxes;
                const progress = progressForItem(item);
                return (
                  <button type="button" key={item.id} onClick={(event) => activateItem(item, event.currentTarget)}>
                    <span className="bqa-overflow-icon" style={{ '--bqa-accent': item.accent }}>
                      <Icon size={16} aria-hidden="true" />
                      {progress != null ? <i style={{ '--bqa-app-progress': progress }} /> : null}
                    </span>
                    <b>{displayLabelFor(item)}</b>
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeActionsItem && activeActions.length ? (
          <section
            className="bqa-active-actions"
            style={{ top: `${activeActionsTop}px` }}
            aria-label={language === 'vi' ? 'Thao tác nhanh ứng dụng hiện tại' : 'Active app quick actions'}
            onPointerEnter={() => window.clearTimeout(activeActionsTimerRef.current)}
            onPointerLeave={hideActiveQuickActions}
          >
            <header>
              <span><Zap size={13} aria-hidden="true" />{displayLabelFor(activeActionsItem)}</span>
            </header>
            <div>
              {activeActions.map((descriptor) => (
                <button
                  type="button"
                  key={descriptor.id}
                  onClick={(event) => {
                    runQuickAction(activeActionsItem, descriptor, event.currentTarget);
                    setActiveActionsItemId('');
                  }}
                >
                  <span>{descriptor.label}</span>
                  <ChevronRight size={12} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {notificationCenterOpen ? (
          <section
          className="bqa-notification-center bqa-notification-surface"
          data-global-motion-isolate="true"
          aria-label={language === 'vi' ? 'Trung tâm thông báo' : 'Notification center'}
        >
            <header>
              <span><Bell size={14} aria-hidden="true" />{language === 'vi' ? 'Thông báo' : 'Notifications'}</span>
              <div>
                <b>{notificationCount}</b>
                <button type="button" onClick={() => setNotificationCenterOpen(false)} aria-label={language === 'vi' ? 'Đóng thông báo' : 'Close notifications'}><X size={14} aria-hidden="true" /></button>
              </div>
            </header>
            <div className="bqa-notification-list">
              {notificationItems.map((entry) => {
                const item = catalog.find((candidate) => candidate.id === entry.itemId);
                const Icon = item?.icon || Bell;
                return (
                  <button
                    type="button"
                    key={entry.id}
                    className={`bqa-notification-row is-${entry.tone || 'info'}`}
                    onClick={(event) => openNotification(entry, event.currentTarget)}
                  >
                    <span className="bqa-notification-icon" style={{ '--bqa-accent': item?.accent || '#2e6fae' }}><Icon size={16} aria-hidden="true" /></span>
                    <span className="bqa-notification-copy">
                      <strong>{entry.title}</strong>
                      <small>{entry.text || (language === 'vi' ? 'Mở để xem chi tiết' : 'Open for details')}</small>
                    </span>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <footer>{language === 'vi' ? 'Chỉ hiển thị các cập nhật bạn có quyền truy cập.' : 'Only updates you are allowed to access are shown.'}</footer>
          </section>
        ) : null}


        {activeCapsule ? (
          <aside
            className={`bqa-status-capsule is-${activeCapsule.tone || 'info'}`}
            style={{ top: capsuleTop }}
            aria-live="polite"
            onPointerEnter={() => window.clearTimeout(capsuleTimerRef.current)}
            onPointerLeave={hideCapsule}
          >
            <span className="bqa-status-capsule-dot" aria-hidden="true" />
            <span className="bqa-status-capsule-copy">
              <strong>{activeCapsule.label || labelFor(activeCapsuleItem, language)}</strong>
              <small>{activeCapsule.text}</small>
            </span>
            {activeCapsule.progress != null ? (
              <span className="bqa-status-capsule-progress" aria-label={`${Math.round(activeCapsule.progress)}%`}>
                <i style={{ width: `${activeCapsule.progress}%` }} />
              </span>
            ) : null}
          </aside>
        ) : null}

        <section
          ref={panelRef}
          className="bqa-panel"
          onPointerEnter={openRail}
          onMouseEnter={openRail}
          onScroll={(event) => {
            // V4.12 compatibility: older callers/tests dispatch scroll on the
            // panel shell itself. V5 owns real scrolling in .bqa-panel-scroll,
            // but we still persist a spatial-memory entry from this legacy
            // event so upgrades do not silently discard the old contract.
            if (event.target !== event.currentTarget || !spatialMemoryEnabled || typeof window === 'undefined') return;
            const memoryWorkspace = contextLock?.locked && QUICK_ACCESS_WORKSPACES.includes(contextLock.workspace)
              ? contextLock.workspace
              : workspace;
            const key = spatialContextKey(currentRoute, selectedTool, memoryWorkspace);
            const top = Math.max(0, Number(panelScrollRef.current?.scrollTop ?? event.currentTarget.scrollTop) || 0);
            window.clearTimeout(spatialScrollTimerRef.current);
            spatialScrollTimerRef.current = window.setTimeout(() => {
              updateSpatialMemory((current) => ({
                scroll: { ...(current.scroll || {}), [key]: top },
              }));
            }, 120);
          }}
          aria-hidden={!expanded}
          inert={expanded ? undefined : true}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget && collapsing) setCollapsing(false);
          }}
        >
          <header className="bqa-panel-header">
            <div>
              <strong>{language === 'vi' ? 'Brian Action Dock' : 'Brian Action Dock'}</strong>
              <span>{language === 'vi' ? 'Việc cần làm · thao tác nhanh · đúng ngữ cảnh' : 'Tasks · quick actions · right context'}</span>
            </div>
            <div className="bqa-panel-header-actions">
              <button
                type="button"
                className={`bqa-screen-guard ${screenGuard ? 'is-active' : ''}`}
                aria-pressed={screenGuard}
                title={screenGuard
                  ? (language === 'vi' ? 'Tắt Screen Guard' : 'Disable Screen Guard')
                  : (language === 'vi' ? 'Che các mục nhạy cảm' : 'Mask private items')}
                onClick={() => setScreenGuardEnabled(!screenGuard)}
              >
                <EyeOff size={15} aria-hidden="true" />
                <span>{language === 'vi' ? 'Che' : 'Guard'}</span>
              </button>
              <button
                type="button"
                className={`bqa-context-lock ${contextLock?.locked ? 'is-active' : ''}`}
                aria-pressed={Boolean(contextLock?.locked)}
                title={contextLock?.locked
                  ? (language === 'vi' ? 'Mở khóa ngữ cảnh' : 'Unlock context')
                  : (language === 'vi' ? 'Khóa ngữ cảnh hiện tại' : 'Lock current context')}
                onClick={toggleContextLock}
              >
                <ShieldCheck size={15} aria-hidden="true" />
                <span>{contextLock?.locked ? (language === 'vi' ? 'Đã khóa' : 'Locked') : (language === 'vi' ? 'Khóa' : 'Lock')}</span>
              </button>
              <div className="bqa-mode-switch" role="group" aria-label={language === 'vi' ? 'Chế độ thanh bên' : 'Sidebar mode'}>
              <button
                type="button"
                className={sidebarMode === 'auto' ? 'is-active' : ''}
                onClick={() => setSidebarMode('auto')}
                title={language === 'vi' ? 'Tự động thu gọn' : 'Auto hide'}
                aria-label={language === 'vi' ? 'Tự động thu gọn' : 'Auto hide'}
              >
                <Zap size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={sidebarMode === 'pin' ? 'is-active' : ''}
                onClick={() => setSidebarMode(sidebarMode === 'pin' ? 'auto' : 'pin')}
                title={language === 'vi' ? 'Ghim luôn mở' : 'Keep pinned'}
                aria-label={language === 'vi' ? 'Ghim luôn mở' : 'Keep pinned'}
              >
                {pinned ? <PinOff size={16} aria-hidden="true" /> : <Pin size={16} aria-hidden="true" />}
              </button>
              <button
                type="button"
                className={sidebarMode === 'focus' ? 'is-active' : ''}
                onClick={() => setSidebarMode('focus')}
                title={language === 'vi' ? 'Focus: ẩn tối đa' : 'Focus: hide rail'}
                aria-label={language === 'vi' ? 'Focus: ẩn tối đa' : 'Focus: hide rail'}
              >
                <EyeOff size={16} aria-hidden="true" />
              </button>
              </div>
            </div>
          </header>

          <div
            ref={panelScrollRef}
            className="bqa-panel-scroll"
            onScroll={handlePanelScroll}
          >

          {classroomMode ? (
            <section className="bqa-classroom-banner" data-classroom-presentation="true">
              <span className="bqa-classroom-banner-icon"><Presentation size={16} aria-hidden="true" /></span>
              <span>
                <small>{language === 'vi' ? 'ĐANG TRÌNH CHIẾU' : 'PRESENTATION MODE'}</small>
                <strong>{language === 'vi' ? 'Chỉ hiển thị công cụ phù hợp trong lớp' : 'Only classroom-safe tools are visible'}</strong>
              </span>
              <button type="button" onClick={() => setClassroomPresentationMode(false)}>
                {language === 'vi' ? 'Thoát' : 'Exit'}
              </button>
            </section>
          ) : null}

          {workflowCenterOpen ? (
            <section className="bqa-workflow-center" data-workflow-center="true" data-bqa-section="workflow" aria-label={language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}>
              <header className="bqa-workflow-header">
                <span><Boxes size={14} aria-hidden="true" />{language === 'vi' ? 'Quy trình nhanh' : 'Workflow bundles'}</span>
                <div>
                  <b>{workflowBundles.length}/{QUICK_ACCESS_WORKFLOW_MAX}</b>
                  <button type="button" onClick={() => setWorkflowCenterOpen(false)} aria-label={language === 'vi' ? 'Đóng quy trình' : 'Close workflows'}>
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
              </header>

              {activeWorkflow ? (
                <div className="bqa-workflow-active" data-workflow-active="true">
                  <div className="bqa-workflow-active-top">
                    <span>
                      <small>{language === 'vi' ? 'ĐANG CHẠY' : 'IN PROGRESS'}</small>
                      <strong>{activeWorkflow.name}</strong>
                    </span>
                    <b>{activeWorkflowNextIndex}/{activeWorkflow.items.length}</b>
                  </div>
                  <div className="bqa-workflow-progress" aria-label={`${activeWorkflowNextIndex}/${activeWorkflow.items.length}`}>
                    <i style={{ width: `${Math.round((activeWorkflowNextIndex / Math.max(activeWorkflow.items.length, 1)) * 100)}%` }} />
                  </div>
                  <div className="bqa-workflow-next">
                    {activeWorkflowNextItem ? (
                      <>
                        <span style={{ '--bqa-accent': activeWorkflowNextItem.accent }}>
                          {React.createElement(activeWorkflowNextItem.icon || Boxes, { size: 16, 'aria-hidden': true })}
                        </span>
                        <div>
                          <small>{language === 'vi' ? 'BƯỚC TIẾP THEO' : 'NEXT STEP'}</small>
                          <strong>{labelFor(activeWorkflowNextItem, language)}</strong>
                        </div>
                        <button type="button" onClick={(event) => continueWorkflowBundle(event.currentTarget)}>
                          {language === 'vi' ? 'Mở' : 'Open'} <ChevronRight size={13} aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="is-done"><Check size={16} aria-hidden="true" /></span>
                        <div>
                          <small>{language === 'vi' ? 'HOÀN TẤT' : 'COMPLETE'}</small>
                          <strong>{language === 'vi' ? 'Đã đi hết quy trình' : 'Workflow completed'}</strong>
                        </div>
                        <button type="button" onClick={finishWorkflowBundle}>{language === 'vi' ? 'Xong' : 'Done'}</button>
                      </>
                    )}
                  </div>
                </div>
              ) : null}

              {workflowBundles.length ? (
                <div className="bqa-workflow-list">
                  {workflowBundles.map((workflow) => (
                    <article className="bqa-workflow-card" key={workflow.id}>
                      <div className="bqa-workflow-card-copy">
                        <strong>{workflow.name}</strong>
                        <small>{language === 'vi' ? `${workflow.items.length} bước` : `${workflow.items.length} steps`}</small>
                      </div>
                      <div className="bqa-workflow-sequence" aria-label={workflow.name}>
                        {workflow.items.map((item, index) => (
                          <span key={item.id} style={{ '--bqa-accent': item.accent }} title={labelFor(item, language)}>
                            {React.createElement(item.icon || Boxes, { size: 14, 'aria-hidden': true })}
                            <i>{index + 1}</i>
                          </span>
                        ))}
                      </div>
                      <div className="bqa-workflow-actions">
                        <button type="button" className="is-start" onClick={(event) => startWorkflowBundle(workflow, event.currentTarget)}>
                          <Zap size={13} aria-hidden="true" />{language === 'vi' ? 'Bắt đầu' : 'Start'}
                        </button>
                        <button type="button" onClick={() => deleteWorkflowBundle(workflow.id)} aria-label={language === 'vi' ? `Xóa ${workflow.name}` : `Delete ${workflow.name}`}>
                          <X size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="bqa-workflow-empty">
                  <Boxes size={22} aria-hidden="true" />
                  <strong>{language === 'vi' ? 'Chưa có quy trình nào' : 'No workflow bundles yet'}</strong>
                  <span>{language === 'vi' ? 'Chọn nhiều công cụ bên dưới để tạo một luồng làm việc dùng lại.' : 'Select multiple tools below to create a reusable flow.'}</span>
                </div>
              )}

              {workflowBundles.length < QUICK_ACCESS_WORKFLOW_MAX ? (
                <div className="bqa-workflow-builder">
                  <label>
                    <span>{language === 'vi' ? 'Tên quy trình' : 'Workflow name'}</span>
                    <input
                      type="text"
                      value={workflowDraftName}
                      maxLength={42}
                      onChange={(event) => setWorkflowDraftName(event.target.value)}
                      placeholder={language === 'vi' ? 'Ví dụ: Buổi sáng' : 'Example: Morning routine'}
                    />
                  </label>
                  <div className="bqa-workflow-builder-head">
                    <span>{language === 'vi' ? 'Chọn các bước' : 'Choose steps'}</span>
                    <b>{workflowDraftIds.length}/{QUICK_ACCESS_WORKFLOW_STEPS_MAX}</b>
                  </div>
                  <div className="bqa-workflow-picker">
                    {workflowCandidateItems.map((item) => {
                      const selected = workflowDraftIds.includes(item.id);
                      const Icon = item.icon || Boxes;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={selected ? 'is-selected' : ''}
                          aria-pressed={selected}
                          onClick={() => toggleWorkflowDraftItem(item.id)}
                        >
                          <span style={{ '--bqa-accent': item.accent }}><Icon size={15} aria-hidden="true" /></span>
                          <strong>{labelFor(item, language)}</strong>
                          {selected ? <Check size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="bqa-workflow-save"
                    disabled={!workflowDraftIds.length}
                    onClick={saveWorkflowBundle}
                  >
                    <Plus size={14} aria-hidden="true" />
                    {language === 'vi' ? 'Lưu quy trình' : 'Save workflow'}
                  </button>
                </div>
              ) : (
                <div className="bqa-workflow-limit">
                  {language === 'vi' ? `Đã đạt giới hạn ${QUICK_ACCESS_WORKFLOW_MAX} quy trình.` : `You reached the ${QUICK_ACCESS_WORKFLOW_MAX}-workflow limit.`}
                </div>
              )}
            </section>
          ) : null}

          {backStackOpen && backStack.length ? (
            <section className="bqa-back-stack" aria-label={language === 'vi' ? 'Lịch sử điều hướng' : 'Navigation history'}>
              <header>
                <span><ChevronLeft size={14} aria-hidden="true" />{language === 'vi' ? 'Vừa đi qua' : 'Recent places'}</span>
                <button type="button" onClick={() => setBackStackOpen(false)} aria-label={language === 'vi' ? 'Đóng lịch sử' : 'Close history'}>
                  <X size={13} aria-hidden="true" />
                </button>
              </header>
              <div>
                {backStack.slice(0, 5).map((entry, index) => (
                  <button
                    type="button"
                    key={`${entry.target}-${entry.at || index}`}
                    onClick={(event) => navigateBackEntry(entry, index, event.currentTarget)}
                  >
                    <span>{index + 1}</span>
                    <strong>{entry.label || navigationLabelForTarget(entry.target, catalog, language)}</strong>
                    <small>{entry.target.replace(/^#\//, '')}</small>
                    <ChevronRight size={14} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {/* Compact-panel contract: no inline search, context banner, or Working Now card.
              Cmd/Ctrl+K remains available through the full-screen Command Palette. */}
          <nav className="bqa-workspace-tabs" aria-label={language === 'vi' ? 'Không gian làm việc' : 'Workspace'}>
            {workspaceOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                className={effectiveWorkspace === option.id ? 'is-active' : ''}
                aria-current={effectiveWorkspace === option.id ? 'true' : undefined}
                onClick={() => setWorkspace(option.id)}
              >
                {option.label}
              </button>
            ))}
          </nav>


          {quickCreateOpen ? (
            <section className="bqa-quick-create-sheet" aria-label={language === 'vi' ? 'Tạo nhanh' : 'Quick create'}>
              <header>
                <span><Plus size={14} aria-hidden="true" />{language === 'vi' ? 'Tạo nhanh' : 'Quick create'}</span>
                <button type="button" onClick={() => setQuickCreateOpen(false)} aria-label={language === 'vi' ? 'Đóng tạo nhanh' : 'Close quick create'}><X size={14} aria-hidden="true" /></button>
              </header>
              <div>
                {quickCreateItems.map((entry) => {
                  const Icon = entry.item.icon || Boxes;
                  return (
                    <button type="button" key={entry.descriptor.id} onClick={(event) => runQuickCreate(entry, event.currentTarget)}>
                      <span style={{ '--bqa-accent': entry.item.accent }}><Icon size={17} aria-hidden="true" /></span>
                      <span><strong>{entry.descriptor.label}</strong><small>{entry.descriptor.description}</small></span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}


              {timeAwareItems.length ? (
                <section className="bqa-time-aware" data-time-aware="true" data-time-band={timeContext.id} data-bqa-section="time">
                  <header>
                    <span><Clock3 size={14} aria-hidden="true" />{timeContext.kicker}</span>
                    <small>{language === 'vi' ? 'Theo giờ trên thiết bị' : 'Based on device time'}</small>
                  </header>
                  <div className="bqa-time-aware-copy">
                    <strong>{timeContext.title}</strong>
                    <span>{timeContext.description}</span>
                  </div>
                  <div className="bqa-time-aware-items">
                    {timeAwareItems.map((item) => {
                      const Icon = item.icon || Boxes;
                      return (
                        <button type="button" key={item.id} onClick={(event) => activateItem(item, event.currentTarget)}>
                          <span style={{ '--bqa-accent': item.accent }}><Icon size={15} aria-hidden="true" /></span>
                          <b>{labelFor(item, language)}</b>
                          <ChevronRight size={13} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {primaryResume ? (
                <section className="bqa-resume-card" data-session-resume="true" data-bqa-section="resume">
                  <span className="bqa-resume-icon" style={{ '--bqa-accent': primaryResume.item.accent }}>
                    {React.createElement(primaryResume.item.icon || Boxes, { size: 18, 'aria-hidden': true })}
                  </span>
                  <span className="bqa-resume-copy">
                    <small>{language === 'vi' ? 'TIẾP TỤC' : 'RESUME'}</small>
                    <strong>{primaryResume.resume.title}</strong>
                    <span>{primaryResume.resume.subtitle || labelFor(primaryResume.item, language)}</span>
                  </span>
                  {primaryResume.resume.progress != null ? (
                    <span className="bqa-resume-progress">
                      <i style={{ width: `${primaryResume.resume.progress}%` }} />
                      <b>{Math.round(primaryResume.resume.progress)}%</b>
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="bqa-resume-go"
                    onClick={(event) => resumeTask(primaryResume, event.currentTarget)}
                  >
                    {language === 'vi' ? 'Tiếp tục' : 'Resume'} <ChevronRight size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="bqa-resume-dismiss"
                    onClick={() => dismissResume(primaryResume.resume.id)}
                    aria-label={language === 'vi' ? 'Ẩn công việc này' : 'Dismiss this task'}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </section>
              ) : null}

              <div className="bqa-smart-stack" data-smart-stack="true">
                {recentItems.length ? (
                  <section className={`bqa-smart-section is-recent ${sectionFolds.recent ? 'is-folded' : ''}`} data-bqa-section="recent">
                    <header className="bqa-sticky-section-header">
                      <button type="button" className="bqa-section-toggle" onClick={() => toggleSectionFold('recent')} aria-expanded={!sectionFolds.recent}>
                        <Clock3 size={14} aria-hidden="true" />
                        <span>{language === 'vi' ? 'Vừa dùng' : 'Recent'}</span>
                        <b>{recentItems.length}</b>
                        <ChevronRight className="bqa-section-chevron" size={14} aria-hidden="true" />
                      </button>
                    </header>
                    {!sectionFolds.recent ? <div>
                      {recentItems.map((item) => {
                        const Icon = item.icon || Boxes;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            draggable
                            onDragStart={(event) => {
                              setDragId(item.id);
                              event.dataTransfer.effectAllowed = 'copyMove';
                              event.dataTransfer.setData('text/plain', item.id);
                            }}
                            onDragEnd={() => setDragId('')}
                            onClick={(event) => activateItem(item, event.currentTarget)}
                          >
                            <span className="bqa-mini-icon" style={{ '--bqa-accent': item.accent }}><Icon size={16} aria-hidden="true" />{healthForItem(item) ? <i className={`bqa-health-dot is-${healthForItem(item).state}`} /> : null}</span>
                            <b>{displayLabelFor(item)}</b>
                          </button>
                        );
                      })}
                    </div> : null}
                  </section>
                ) : null}

                {pinnedSmartItems.length ? (
                  <section className={`bqa-smart-section is-pinned-smart ${sectionFolds.pinned ? 'is-folded' : ''}`} data-bqa-section="pinned">
                    <header className="bqa-sticky-section-header">
                      <button type="button" className="bqa-section-toggle" onClick={() => toggleSectionFold('pinned')} aria-expanded={!sectionFolds.pinned}>
                        <Star size={14} aria-hidden="true" />
                        <span>{language === 'vi' ? 'Đã ghim' : 'Pinned'}</span>
                        <b>{pinnedSmartItems.length}</b>
                        <ChevronRight className="bqa-section-chevron" size={14} aria-hidden="true" />
                      </button>
                    </header>
                    {!sectionFolds.pinned ? <div>
                      {pinnedSmartItems.map((item) => {
                        const Icon = item.icon || Boxes;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            draggable
                            onDragStart={(event) => {
                              setDragId(item.id);
                              event.dataTransfer.effectAllowed = 'move';
                              event.dataTransfer.setData('text/plain', item.id);
                            }}
                            onDragEnd={() => setDragId('')}
                            onClick={(event) => activateItem(item, event.currentTarget)}
                          >
                            <span className="bqa-mini-icon" style={{ '--bqa-accent': item.accent }}><Icon size={16} aria-hidden="true" />{healthForItem(item) ? <i className={`bqa-health-dot is-${healthForItem(item).state}`} /> : null}</span>
                            <b>{displayLabelFor(item)}</b>
                          </button>
                        );
                      })}
                    </div> : null}
                  </section>
                ) : null}
              </div>

              {primaryActivity ? (
                <section className={`bqa-live-activity is-${primaryActivity.state}`} data-bqa-section="activity" aria-live="polite">
                  <div className="bqa-live-activity-ring" style={{ '--bqa-progress': `${primaryActivity.progress ?? 0}` }}>
                    <Zap size={15} aria-hidden="true" />
                  </div>
                  <div>
                    <small>{language === 'vi' ? 'HOẠT ĐỘNG ĐANG CHẠY' : 'LIVE ACTIVITY'}</small>
                    <strong>{primaryActivity.title}</strong>
                    <span>{primaryActivity.status || (primaryActivity.progress == null ? (language === 'vi' ? 'Đang xử lí…' : 'Working…') : `${Math.round(primaryActivity.progress)}%`)}</span>
                  </div>
                  {primaryActivity.progress != null ? <b>{Math.round(primaryActivity.progress)}%</b> : null}
                </section>
              ) : null}

              {parkedItems.length ? (
                <section className="bqa-parking-shelf" data-bqa-section="parking">
                  <header>
                    <span><Boxes size={14} aria-hidden="true" />{language === 'vi' ? 'Đang đỗ' : 'Parked'}</span>
                    <small>{parkedItems.length}/{QUICK_ACCESS_PARKING_MAX}</small>
                  </header>
                  <div>
                    {parkedItems.map((entry) => {
                      const item = presentationCatalog.find((candidate) => candidate.id === entry.itemId);
                      if (!item) return null;
                      const Icon = item.icon || Boxes;
                      return (
                        <span className="bqa-parked-chip" key={entry.itemId}>
                          <button type="button" onClick={(event) => openParkedItem(entry, event.currentTarget)}>
                            <Icon size={14} aria-hidden="true" />
                            <b>{labelFor(item, language)}</b>
                          </button>
                          <button type="button" className="bqa-parked-remove" onClick={() => removeParkedItem(entry.itemId)} aria-label={language === 'vi' ? 'Bỏ khỏi khay đỗ' : 'Remove parked app'}>
                            <X size={11} aria-hidden="true" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section
                className={`bqa-temporary-shelf ${shelfItems.length ? 'has-items' : 'is-empty'}`}
                data-bqa-section="shelf"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'copy';
                }}
                onDrop={handleShelfDrop}
              >
                <header>
                  <span><ClipboardCheck size={14} aria-hidden="true" />{language === 'vi' ? 'Khay tạm' : 'Temporary Shelf'}</span>
                  <small>{shelfItems.length}/{QUICK_ACCESS_SHELF_MAX}</small>
                </header>
                {shelfItems.length ? (
                  <div className="bqa-shelf-items">
                    {shelfItems.map((entry) => {
                      const item = entry.type === 'item' ? presentationCatalog.find((candidate) => candidate.id === entry.itemId) : null;
                      const Icon = item?.icon || (entry.type === 'file' ? FileText : entry.type === 'url' ? AppWindow : ClipboardCheck);
                      const label = item ? displayLabelFor(item) : entry.label;
                      return (
                        <span className={`bqa-shelf-chip is-${entry.type}`} key={entry.id} draggable onDragStart={(event) => dragShelfItem(entry, event)}>
                          <button type="button" onClick={(event) => activateShelfItem(entry, event.currentTarget)} title={label}>
                            <Icon size={13} aria-hidden="true" />
                            <b>{label}</b>
                          </button>
                          <button type="button" className="bqa-shelf-remove" onClick={() => removeShelfItem(entry.id)} aria-label={language === 'vi' ? 'Bỏ khỏi khay tạm' : 'Remove from shelf'}><X size={10} aria-hidden="true" /></button>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="bqa-shelf-empty">{language === 'vi' ? 'Thả app, URL, đoạn text hoặc file vào đây' : 'Drop an app, URL, text or file here'}</span>
                )}
              </section>

              <section className={`bqa-apps-section ${sectionFolds.apps ? 'is-folded' : ''}`} data-bqa-section="apps">
                <header className="bqa-sticky-section-header bqa-apps-section-header">
                  <button type="button" className="bqa-section-toggle" onClick={() => toggleSectionFold('apps')} aria-expanded={!sectionFolds.apps}>
                    <LayoutGrid size={14} aria-hidden="true" />
                    <span>{language === 'vi' ? 'Ứng dụng' : 'Apps'}</span>
                    <b>{workspaceItems.length}</b>
                    <ChevronRight className="bqa-section-chevron" size={14} aria-hidden="true" />
                  </button>
                </header>
                {!sectionFolds.apps ? (
                <div
                className={`bqa-panel-list ${dragId ? 'is-drop-ready' : ''}`}
                role="list"
                data-favorites-dropzone="true"
                onDragOver={(event) => {
                  if (!dragId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = config.items.includes(dragId) ? 'move' : 'copy';
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  dropToFavorites();
                }}
              >
                {workspaceItems.map((item, index) => {
                  const Icon = item.icon || Boxes;
                  const active = activeItem(item, currentRoute, selectedTool);
                  return (
                    <div
                      role="listitem"
                      key={item.id}
                      draggable
                      className={`bqa-panel-item ${active ? 'is-active' : ''}`}
                      style={{ '--bqa-accent': item.accent }}
                      onDragStart={(event) => {
                        setDragId(item.id);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', item.id);
                      }}
                      onDragEnd={() => setDragId('')}
                      onDragOver={(event) => {
                        if (!dragId) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        moveDraggedBefore(item.id);
                      }}
                    >
                      <button type="button" className="bqa-panel-item-main" onClick={(event) => {
                        if (precisionDrag) return;
                        activateItem(item, event.currentTarget);
                      }}>
                        <span className="bqa-item-icon"><Icon size={20} strokeWidth={2} aria-hidden="true" />{healthForItem(item) ? <i className={`bqa-health-dot is-${healthForItem(item).state}`} title={healthForItem(item).message || healthForItem(item).state} /> : null}</span>
                        <span className="bqa-item-copy">
                          <span className="bqa-item-label">{displayLabelFor(item)}</span>
                          <small>{language === 'vi' ? `Alt+${index + 1}` : `Alt+${index + 1}`}</small>
                        </span>
                        {!classroomMode && !itemIsGuarded(item) && badgeForItem(item) ? (
                          <span className={`bqa-panel-badge ${badgeForItem(item) === 'dot' ? 'is-dot' : ''}`}>
                            {badgeForItem(item) === 'dot' ? '' : badgeForItem(item)}
                          </span>
                        ) : null}
                        {active ? <Check className="bqa-item-check" size={17} aria-hidden="true" /> : null}
                      </button>
                      <button
                        type="button"
                        className="bqa-item-more"
                        aria-label={language === 'vi' ? `Thao tác nhanh cho ${labelFor(item, language)}` : `Quick actions for ${labelFor(item, language)}`}
                        aria-haspopup="menu"
                        aria-expanded={actionItemId === item.id}
                        onClick={(event) => {
                          setPeekItemId('');
                          const rect = event.currentTarget.getBoundingClientRect();
                          const rootRect = rootRef.current?.getBoundingClientRect?.();
                          if (rootRect) setActionTop(Math.max(76, Math.min(rootRect.height - 170, rect.top - rootRect.top - 8)));
                          setActionItemId((value) => value === item.id ? '' : item.id);
                        }}
                      >
                        <MoreHorizontal size={17} aria-hidden="true" />
                      </button>
                      <GripVertical className="bqa-item-grip" size={16} aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
              ) : null}
              </section>

              {undoStack.length ? (
                <section className="bqa-undo-center" data-bqa-section="undo">
                  <button type="button" className="bqa-undo-toggle" onClick={() => setUndoOpen((value) => !value)} aria-expanded={undoOpen}>
                    <ChevronLeft size={14} aria-hidden="true" />
                    <span><strong>{language === 'vi' ? 'Hoàn tác' : 'Undo'}</strong><small>{undoStack[0]?.label}</small></span>
                    <b>{undoStack.length}</b>
                  </button>
                  {undoOpen ? (
                    <div className="bqa-undo-list">
                      {undoStack.map((entry) => (
                        <button type="button" key={entry.id} onClick={() => restoreUndoEntry(entry)}>
                          <span>{entry.label}</span>
                          <small>{language === 'vi' ? 'Khôi phục trạng thái trước' : 'Restore previous state'}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}

          </div>

          <nav className="bqa-scroll-navigator" aria-label={language === 'vi' ? 'Điều hướng nhanh trong thanh bên' : 'Sidebar scroll navigator'}>
            {scrollSections.map((section) => (
              <button
                type="button"
                key={section.id}
                className={activeScrollSection === section.id ? 'is-active' : ''}
                onClick={() => jumpToSection(section.id)}
                title={section.label}
                aria-label={section.label}
                aria-current={activeScrollSection === section.id ? 'true' : undefined}
              >
                <span />
              </button>
            ))}
          </nav>

          <footer className="bqa-panel-footer">
            <button type="button" onClick={() => { setCustomizerQuery(''); setCustomizing(true); }}>
              <Settings size={18} aria-hidden="true" />
              <span><strong>{language === 'vi' ? 'Tùy chỉnh lối tắt' : 'Customize shortcuts'}</strong><small>{language === 'vi' ? 'Sắp xếp, ẩn/hiện ứng dụng' : 'Reorder and choose apps'}</small></span>
            </button>
            <div className="bqa-account-note">
              <span className="bqa-sync-note"><Check size={15} aria-hidden="true" />{language === 'vi' ? 'Lưu theo tài khoản' : 'Saved to your account'}</span>
              <span className="bqa-shortcut-hint"><kbd>Alt</kbd><b>Q</b></span>
            </div>
          </footer>
        </section>

        {peekItem ? (
          <aside
            className="bqa-peek-card"
            style={{ top: peekTop }}
            onPointerEnter={() => window.clearTimeout(peekTimerRef.current)}
            onPointerLeave={hidePeek}
            aria-label={language === 'vi' ? `Xem nhanh ${labelFor(peekItem, language)}` : `Quick peek ${labelFor(peekItem, language)}`}
          >
            <div className="bqa-peek-top">
              <span className="bqa-peek-icon" style={{ '--bqa-accent': peekItem.accent }}>
                {React.createElement(peekItem.icon || Boxes, { size: 20, 'aria-hidden': true })}
              </span>
              <div><strong>{labelFor(peekItem, language)}</strong><small>{descriptionFor(peekItem, language)}</small></div>
            </div>
            {badges[peekItem.id] ? (
              <div className="bqa-peek-status">
                <span className="bqa-peek-status-dot" />
                {badges[peekItem.id] === 'dot'
                  ? (language === 'vi' ? 'Có cập nhật mới' : 'New update available')
                  : (language === 'vi' ? `${badges[peekItem.id]} mục cần chú ý` : `${badges[peekItem.id]} items need attention`)}
              </div>
            ) : null}
            {peekActions.length ? (
              <div className="bqa-peek-actions" role="group" aria-label={language === 'vi' ? 'Thao tác ngay' : 'Quick actions'}>
                {peekActions.map((descriptor) => (
                  <button
                    type="button"
                    key={descriptor.id}
                    onClick={(event) => runQuickAction(peekItem, descriptor, event.currentTarget)}
                  >
                    <Zap size={13} aria-hidden="true" />
                    <span>{descriptor.label}</span>
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" className="bqa-peek-open" onClick={(event) => activateItem(peekItem, event.currentTarget)}>
              {language === 'vi' ? 'Mở' : 'Open'} <ChevronRight size={15} aria-hidden="true" />
            </button>
          </aside>
        ) : null}

        {actionItem ? (
          <div className="bqa-action-sheet" style={{ top: actionTop }} role="menu" aria-label={language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}>
            <header>
              <strong>{displayLabelFor(actionItem)}</strong>
              <button type="button" onClick={() => setActionItemId('')} aria-label={language === 'vi' ? 'Đóng' : 'Close'}><X size={14} aria-hidden="true" /></button>
            </header>
            {quickActionDescriptors(actionItem, language).map((descriptor) => (
              <button
                type="button"
                role="menuitem"
                key={descriptor.id}
                onClick={(event) => runQuickAction(actionItem, descriptor, event.currentTarget)}
              >
                <Zap size={14} aria-hidden="true" />
                <span>{descriptor.label}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ))}
            {actionBookmark ? (
              <button type="button" role="menuitem" onClick={(event) => restoreBookmark(actionBookmark, event.currentTarget)}>
                <Bookmark size={14} fill="currentColor" aria-hidden="true" />
                <span>{language === 'vi' ? 'Mở bookmark ứng dụng' : 'Open app bookmark'}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" role="menuitem" onClick={() => saveBookmarkForItem(actionItem)}>
                <Bookmark size={14} aria-hidden="true" />
                <span>{language === 'vi' ? 'Lưu trạng thái ứng dụng' : 'Save app state'}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            )}
            {actionBookmark ? (
              <button type="button" role="menuitem" onClick={() => removeBookmark(actionItem.id)}>
                <X size={14} aria-hidden="true" />
                <span>{language === 'vi' ? 'Xóa bookmark' : 'Remove bookmark'}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ) : null}
            <label className="bqa-double-click-config" role="menuitem">
              <span>
                <Zap size={14} aria-hidden="true" />
                <b>{language === 'vi' ? 'Double-click' : 'Double-click'}</b>
              </span>
              <select
                value={doubleClickActions[actionItem.id] || ''}
                onChange={(event) => setDoubleClickAction(actionItem.id, event.target.value)}
              >
                <option value="">{language === 'vi' ? 'Mở bình thường' : 'Normal open'}</option>
                {actionDoubleClickOptions.map((descriptor) => (
                  <option value={descriptor.id} key={descriptor.id}>{descriptor.label}</option>
                ))}
              </select>
            </label>
            <button type="button" role="menuitem" onClick={() => copyDeepLink(actionItem)}>
              <AppWindow size={14} aria-hidden="true" />
              <span>{language === 'vi' ? 'Sao chép liên kết đến đây' : 'Copy deep link'}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <button type="button" role="menuitem" onClick={() => addItemToShelf(actionItem)}>
              <ClipboardCheck size={14} aria-hidden="true" />
              <span>{language === 'vi' ? 'Đưa vào khay tạm' : 'Add to Temporary Shelf'}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
            <button type="button" role="menuitem" onClick={() => parkItem(actionItem)}>
              <Boxes size={14} aria-hidden="true" />
              <span>{language === 'vi' ? 'Đỗ tác vụ tại đây' : 'Park this app'}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {appSwitcherOpen && switcherItems.length ? (
        <div className="bqa-app-switcher" role="dialog" aria-label={language === 'vi' ? 'Chuyển ứng dụng nhanh' : 'Quick app switcher'}>
          <div className="bqa-app-switcher-track">
            {switcherItems.map((item, index) => {
              const Icon = item.icon || Boxes;
              const selected = index === (appSwitcherIndex % switcherItems.length);
              return (
                <div className={`bqa-app-switcher-item ${selected ? 'is-selected' : ''}`} key={item.id}>
                  <span style={{ '--bqa-accent': item.accent }}><Icon size={23} aria-hidden="true" /></span>
                  <strong>{labelFor(item, language)}</strong>
                </div>
              );
            })}
          </div>
          <small>{language === 'vi' ? 'Giữ Alt + phím huyền để chuyển · thả Alt để mở' : 'Hold Alt + grave key to cycle · release Alt to open'}</small>
        </div>
      ) : null}

      {bookmarkToast ? (
        <div className="bqa-bookmark-toast" role="status" aria-live="polite">
          <Bookmark size={13} fill="currentColor" aria-hidden="true" />
          <span>{bookmarkToast}</span>
        </div>
      ) : null}

      {keyboardLayer ? (
        <div className="bqa-keyboard-overlay" role="status" aria-live="polite">
          <Command size={14} aria-hidden="true" />
          <span>{language === 'vi' ? 'Keyboard Navigation · nhấn chữ trên icon · Esc để thoát' : 'Keyboard Navigation · press an icon letter · Esc to exit'}</span>
        </div>
      ) : null}

      {customizing ? (
        <div className="bqa-customizer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) { setCustomizerQuery(''); setCustomizing(false); }
        }}>
          <section className="bqa-customizer" role="dialog" aria-modal="true" aria-labelledby="bqa-customizer-title">
            <header>
              <div>
                <span className="bqa-customizer-kicker">{language === 'vi' ? 'BRIAN QUICK ACCESS' : 'BRIAN QUICK ACCESS'}</span>
                <h2 id="bqa-customizer-title">{language === 'vi' ? 'Tùy chỉnh thanh truy cập nhanh' : 'Customize quick access'}</h2>
                <p>{language === 'vi' ? 'Chọn tối đa 10 ứng dụng hoặc tính năng. Thứ tự được đồng bộ theo tài khoản.' : 'Choose up to 10 apps or features. Order syncs with your account.'}</p>
              </div>
              <button type="button" className="bqa-customizer-close" onClick={() => { setCustomizerQuery(''); setCustomizing(false); }} aria-label={language === 'vi' ? 'Đóng' : 'Close'}>
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <div className="bqa-customizer-count">
              <strong>{language === 'vi' ? 'Đã chọn' : 'Selected'}</strong>
              <span>{config.items.length}/{QUICK_ACCESS_MAX_ITEMS}</span>
            </div>

            <section className="bqa-customizer-mode" aria-label={language === 'vi' ? 'Chế độ thanh bên' : 'Sidebar mode'}>
              <button type="button" className={sidebarMode === 'auto' ? 'is-active' : ''} onClick={() => setSidebarMode('auto')}>
                <Zap size={17} aria-hidden="true" /><span><strong>Auto</strong><small>{language === 'vi' ? 'Tự thu gọn' : 'Auto hide'}</small></span>
              </button>
              <button type="button" className={sidebarMode === 'pin' ? 'is-active' : ''} onClick={() => setSidebarMode('pin')}>
                <Pin size={17} aria-hidden="true" /><span><strong>Pin</strong><small>{language === 'vi' ? 'Luôn mở' : 'Always open'}</small></span>
              </button>
              <button type="button" className={sidebarMode === 'focus' ? 'is-active' : ''} onClick={() => setSidebarMode('focus')}>
                <EyeOff size={17} aria-hidden="true" /><span><strong>Focus</strong><small>{language === 'vi' ? 'Chỉ hiện ở mép' : 'Edge only'}</small></span>
              </button>
            </section>

            <section className="bqa-personalize-panel" aria-label={language === 'vi' ? 'Cá nhân hóa thanh bên' : 'Personalize sidebar'}>
              <header>
                <strong>{language === 'vi' ? 'Cá nhân hóa' : 'Personalize'}</strong>
                <span>{language === 'vi' ? 'Giao diện · kích thước · chuyển động · mật độ' : 'Theme · size · motion · density'}</span>
              </header>

              <div className="bqa-theme-picker" role="group" aria-label={language === 'vi' ? 'Giao diện thanh bên' : 'Sidebar theme'}>
                {QUICK_ACCESS_THEMES.map((theme) => {
                  const labels = {
                    glass: language === 'vi' ? ['Glass', 'Trong suốt'] : ['Glass', 'Translucent'],
                    paper: language === 'vi' ? ['Paper', 'Sạch & sáng'] : ['Paper', 'Clean & bright'],
                    color: language === 'vi' ? ['Color', 'Theo không gian'] : ['Color', 'Workspace accent'],
                    minimal: language === 'vi' ? ['Minimal', 'Tối giản'] : ['Minimal', 'Low chrome'],
                  };
                  const [title, subtitle] = labels[theme] || [theme, ''];
                  return (
                    <button
                      type="button"
                      key={theme}
                      className={visualTheme === theme ? 'is-active' : ''}
                      aria-pressed={visualTheme === theme}
                      onClick={() => updatePersonalization({ theme })}
                    >
                      <span className={`bqa-theme-preview is-${theme}`} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span><strong>{title}</strong><small>{subtitle}</small></span>
                      {visualTheme === theme ? <Check size={14} aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Kích thước' : 'Size'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_SIZES.map((size) => (
                    <button type="button" key={size} className={railSize === size ? 'is-active' : ''} onClick={() => updatePersonalization({ size })}>{size.toUpperCase()}</button>
                  ))}
                </div>
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Chuyển động' : 'Motion'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_MOTIONS.map((motion) => (
                    <button type="button" key={motion} className={motionMode === motion ? 'is-active' : ''} onClick={() => updatePersonalization({ motion })}>
                      {motion === 'reduced' ? (language === 'vi' ? 'Giảm' : 'Reduced') : motion === 'normal' ? (language === 'vi' ? 'Chuẩn' : 'Normal') : (language === 'vi' ? 'Mượt' : 'Fluid')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bqa-personalize-row">
                <span>{language === 'vi' ? 'Mật độ' : 'Density'}</span>
                <div className="bqa-segmented">
                  {QUICK_ACCESS_DENSITIES.map((value) => (
                    <button type="button" key={value} className={density === value ? 'is-active' : ''} onClick={() => updatePersonalization({ density: value })}>
                      {value === 'compact' ? (language === 'vi' ? 'Gọn' : 'Compact') : (language === 'vi' ? 'Thoáng' : 'Comfort')}
                    </button>
                  ))}
                </div>
              </div>

              <label className="bqa-personalize-slider">
                <span>{language === 'vi' ? 'Độ trễ mở mép' : 'Edge hover delay'} <b>{hoverDelay} ms</b></span>
                <input type="range" min="80" max="700" step="20" value={hoverDelay} onChange={(event) => updatePersonalization({ hoverDelay: Number(event.target.value) })} />
              </label>

              <label className="bqa-personalize-toggle">
                <span>{language === 'vi' ? 'Hiện nhãn hỗ trợ' : 'Show helper labels'}</span>
                <input type="checkbox" checked={showLabels} onChange={(event) => updatePersonalization({ labels: event.target.checked })} />
              </label>

              <label className="bqa-personalize-toggle">
                <span>{language === 'vi' ? 'Ưu tiên theo thời gian' : 'Time-aware priorities'}</span>
                <input type="checkbox" checked={timeAwareEnabled} onChange={(event) => updatePersonalization({ timeAware: event.target.checked })} />
              </label>

              <label className="bqa-personalize-toggle">
                <span>
                  {language === 'vi' ? 'Compact Reading Mode' : 'Compact Reading Mode'}
                  <small>{language === 'vi' ? 'Giảm trang trí, ưu tiên icon + tên + badge.' : 'Reduce decoration and prioritize icon + name + badge.'}</small>
                </span>
                <input type="checkbox" checked={compactReadingMode} onChange={(event) => setReadingMode(event.target.checked)} />
              </label>

              <label className="bqa-personalize-toggle">
                <span>
                  {language === 'vi' ? 'Private Screen Guard' : 'Private Screen Guard'}
                  <small>{language === 'vi' ? 'Che badge, preview và tên của mục nhạy cảm khi bật.' : 'Mask badges, previews and names for private items.'}</small>
                </span>
                <input type="checkbox" checked={screenGuard} onChange={(event) => setScreenGuardEnabled(event.target.checked)} />
              </label>

              <div className="bqa-spatial-control">
                <label className="bqa-personalize-toggle">
                  <span>
                    {language === 'vi' ? 'Ghi nhớ bố cục trên thiết bị' : 'Remember layout on this device'}
                    <small>{language === 'vi' ? 'Không gian · ứng dụng cuối · độ cuộn' : 'Workspace · last app · scroll position'}</small>
                  </span>
                  <input type="checkbox" checked={spatialMemoryEnabled} onChange={(event) => setSpatialMemoryEnabled(event.target.checked)} />
                </label>
                {spatialMemoryEnabled ? (
                  <button type="button" onClick={clearDeviceSpatialMemory}>
                    {language === 'vi' ? 'Quên bố cục thiết bị' : 'Forget device layout'}
                  </button>
                ) : null}
              </div>

              <div className="bqa-context-memory-control">
                <label className="bqa-personalize-toggle">
                  <span>
                    {language === 'vi' ? 'Nhớ không gian theo từng trang' : 'Remember workspace per page'}
                    <small>{language === 'vi' ? 'Mỗi trang sẽ mở lại đúng tab không gian bạn dùng lần cuối.' : 'Each page reopens the workspace tab you last used there.'}</small>
                  </span>
                  <input type="checkbox" checked={contextMemoryEnabled} onChange={(event) => setContextMemoryEnabled(event.target.checked)} />
                </label>
                {contextMemoryEnabled && Object.keys(routeWorkspaceMemory).length ? (
                  <button type="button" onClick={clearRouteWorkspaceMemory}>
                    {language === 'vi' ? 'Quên ngữ cảnh đã nhớ' : 'Forget page contexts'}
                  </button>
                ) : null}
              </div>

              <div className="bqa-double-click-control">
                <header>
                  <strong>{language === 'vi' ? 'Double-click Quick Actions' : 'Double-click Quick Actions'}</strong>
                  <small>{language === 'vi' ? 'Click đơn vẫn mở app; double-click có thể chạy hành động riêng.' : 'Single click still opens the app; double-click can run a separate action.'}</small>
                </header>
                <div>
                  {selectedItems.map((item) => {
                    const options = quickActionDescriptors(item, language);
                    return (
                      <label key={item.id}>
                        <span>{labelFor(item, language)}</span>
                        <select value={doubleClickActions[item.id] || ''} onChange={(event) => setDoubleClickAction(item.id, event.target.value)}>
                          <option value="">{language === 'vi' ? 'Không đặt' : 'Not set'}</option>
                          {options.map((descriptor) => <option value={descriptor.id} key={descriptor.id}>{descriptor.label}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="bqa-alias-control">
                <header>
                  <strong>{language === 'vi' ? 'Search Aliases' : 'Search Aliases'}</strong>
                  <small>{language === 'vi' ? 'Tự đặt từ khóa ngắn cho Command Search.' : 'Set personal keywords for Command Search.'}</small>
                </header>
                <div>
                  {selectedItems.map((item) => (
                    <label key={item.id}>
                      <span>{labelFor(item, language)}</span>
                      <input
                        type="text"
                        value={searchAliases[item.id] || ''}
                        maxLength={80}
                        onChange={(event) => setAliasForItem(item.id, event.target.value)}
                        placeholder={language === 'vi' ? 'vd: dd, cn, đề' : 'e.g. att, hm, quiz'}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="bqa-private-items-control">
                <header>
                  <strong>{language === 'vi' ? 'Mục nhạy cảm' : 'Private items'}</strong>
                  <small>{language === 'vi' ? 'Screen Guard chỉ che các mục bạn đánh dấu ở đây.' : 'Screen Guard masks only the items selected here.'}</small>
                </header>
                <div>
                  {selectedItems.map((item) => (
                    <label key={item.id}>
                      <input type="checkbox" checked={privateItemIds.includes(item.id)} onChange={() => togglePrivateItem(item.id)} />
                      <span>{labelFor(item, language)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bqa-usage-insights">
                <header>
                  <span>
                    <strong>{language === 'vi' ? 'Usage Insights' : 'Usage Insights'}</strong>
                    <small>{language === 'vi' ? 'Chỉ thống kê; Brian không tự sắp xếp icon.' : 'Information only; Brian never reorders icons automatically.'}</small>
                  </span>
                  <b>{language === 'vi' ? `${staleUsageCount} ít dùng` : `${staleUsageCount} stale`}</b>
                </header>
                <div className="bqa-usage-summary">
                  <span><b>{usageInsights.commandSearches || 0}</b><small>Command Search</small></span>
                  <span><b>{usageInsights.workflowRuns || 0}</b><small>{language === 'vi' ? 'Workflow đã chạy' : 'Workflow runs'}</small></span>
                </div>
                {usageRows.length ? (
                  <div className="bqa-usage-list">
                    {usageRows.map((entry) => (
                      <div key={entry.itemId}>
                        <span>{labelFor(entry.item, language)}</span>
                        <b>{entry.opens}</b>
                        <small>{entry.lastUsed ? new Date(entry.lastUsed).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className="bqa-usage-empty">{language === 'vi' ? 'Chưa có dữ liệu sử dụng.' : 'No usage data yet.'}</small>
                )}
              </div>

              <div className="bqa-snapshot-control">
                <header>
                  <span>
                    <strong>{language === 'vi' ? 'Sidebar Snapshot' : 'Sidebar Snapshot'}</strong>
                    <small>{language === 'vi' ? 'Sao lưu bố cục trước khi thử cách sắp xếp mới.' : 'Back up the layout before trying a new arrangement.'}</small>
                  </span>
                  <button type="button" onClick={createSidebarSnapshot}>
                    <Plus size={13} aria-hidden="true" />
                    {language === 'vi' ? 'Lưu' : 'Save'}
                  </button>
                </header>
                {sidebarSnapshots.length ? (
                  <div className="bqa-snapshot-list">
                    {sidebarSnapshots.map((snapshot) => (
                      <div key={snapshot.id}>
                        <span><strong>{snapshot.name}</strong><small>{new Date(snapshot.at).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</small></span>
                        <button type="button" onClick={() => restoreSidebarSnapshot(snapshot)}>{language === 'vi' ? 'Khôi phục' : 'Restore'}</button>
                        <button type="button" onClick={() => deleteSidebarSnapshot(snapshot.id)} aria-label={language === 'vi' ? 'Xóa snapshot' : 'Delete snapshot'}><X size={12} aria-hidden="true" /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small className="bqa-snapshot-empty">{language === 'vi' ? 'Chưa có snapshot.' : 'No snapshots yet.'}</small>
                )}
              </div>
            </section>

            <div className="bqa-customizer-selected">
              {selectedItems.map((item) => {
                const Icon = item.icon || Boxes;
                return (
                  <div
                    className="bqa-customizer-row is-selected"
                    key={item.id}
                    draggable
                    onDragStart={(event) => {
                      setDragId(item.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', item.id);
                    }}
                    onDragEnd={() => setDragId('')}
                    onDragOver={(event) => {
                      if (!dragId) return;
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveDraggedBefore(item.id);
                    }}
                  >
                    <GripVertical size={18} className="bqa-customizer-grip" aria-hidden="true" />
                    <span className="bqa-customizer-icon" style={{ '--bqa-accent': item.accent }}><Icon size={19} aria-hidden="true" /></span>
                    <strong>{labelFor(item, language)}</strong>
                    <button type="button" onClick={() => removeItem(item.id)} aria-label={language === 'vi' ? `Bỏ ${labelFor(item, language)}` : `Remove ${labelFor(item, language)}`}>
                      <X size={17} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bqa-customizer-divider">
              <span>{language === 'vi' ? 'Ứng dụng & tính năng khác' : 'Other apps & features'}</span>
            </div>

            <label className="bqa-customizer-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={customizerQuery}
                onChange={(event) => setCustomizerQuery(event.target.value)}
                placeholder={language === 'vi' ? 'Tìm ứng dụng hoặc tính năng…' : 'Search apps or features…'}
                aria-label={language === 'vi' ? 'Tìm ứng dụng hoặc tính năng' : 'Search apps or features'}
              />
              {customizerQuery ? (
                <button type="button" onClick={() => setCustomizerQuery('')} aria-label={language === 'vi' ? 'Xóa tìm kiếm' : 'Clear search'}>
                  <X size={16} aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <div className="bqa-customizer-available">
              {filteredAvailableItems.map((item) => {
                const Icon = item.icon || Boxes;
                const disabled = config.items.length >= QUICK_ACCESS_MAX_ITEMS;
                return (
                  <button
                    type="button"
                    className="bqa-customizer-row"
                    key={item.id}
                    disabled={disabled}
                    onClick={() => addItem(item.id)}
                  >
                    <span className="bqa-customizer-icon" style={{ '--bqa-accent': item.accent }}><Icon size={19} aria-hidden="true" /></span>
                    <strong>{labelFor(item, language)}</strong>
                    <span className="bqa-add-mark">+</span>
                  </button>
                );
              })}
              {!filteredAvailableItems.length ? (
                <div className="bqa-customizer-empty">
                  {customizerNeedle
                    ? (language === 'vi' ? 'Không tìm thấy ứng dụng hoặc tính năng phù hợp.' : 'No matching app or feature.')
                    : (language === 'vi' ? 'Bạn đã chọn toàn bộ mục hiện có.' : 'You selected every available item.')}
                </div>
              ) : null}
            </div>

            <footer>
              <button type="button" className="bqa-reset" onClick={reset}>{language === 'vi' ? 'Khôi phục mặc định' : 'Reset defaults'}</button>
              <button type="button" className="bqa-done" onClick={() => { setCustomizerQuery(''); setCustomizing(false); }}>{language === 'vi' ? 'Xong' : 'Done'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );

  return typeof document !== 'undefined'
    ? createPortal(quickAccessUi, document.body)
    : quickAccessUi;
}
