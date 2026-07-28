"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  WIDGET_CATALOG,
  WidgetLayer,
  createWidget,
  parseWidgetTable,
  type WidgetCommand,
  type WidgetData,
  type WidgetInstance,
  type WidgetType,
} from "./classroom-widgets";

type SceneType =
  | "cover"
  | "lesson"
  | "question"
  | "vocabulary"
  | "activity"
  | "exit";

type Question = {
  stem: string;
  options: string[];
  answer: number;
  explanation?: string;
};

type VocabularyItem = {
  term: string;
  meaning: string;
  example?: string;
};

type Scene = {
  id: string;
  type: SceneType;
  title: string;
  kicker?: string;
  body: string[];
  accent: string;
  question?: Question;
  vocabulary?: VocabularyItem[];
  notes?: string;
};

type ImportMode =
  | "auto"
  | "questions"
  | "vocabulary"
  | "slides"
  | "widgets"
  | "class";
type ImportKind = Exclude<ImportMode, "auto"> | "unknown";

type ImportResult = {
  kind: ImportKind;
  title: string;
  detail: string;
  scenes: Scene[];
  names: string[];
  widgets?: WidgetInstance[];
  warnings: string[];
};

type Point = { x: number; y: number };
type Stroke = {
  id: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  opacity: number;
  points: Point[];
};

type ToolName = "pointer" | "pen" | "highlighter" | "eraser" | "spotlight";
type InspectorTab = "content" | "tools" | "widgets" | "class";
type LanguageMode = "vi" | "en" | "both";
type TextScale = 0 | 1 | 2 | 3 | 4;

const TEXT_SCALE_LABELS = ["XS", "S", "M", "L", "XL"] as const;
const TEXT_SCALE_NAMES = [
  ["Compact", "Gọn"],
  ["Small", "Nhỏ"],
  ["Standard", "Chuẩn"],
  ["Large", "Lớn"],
  ["Extra large", "Rất lớn"],
] as const;

const normalizeTextScale = (value: unknown): TextScale => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(0, Math.min(4, Math.round(parsed))) as TextScale;
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const PALETTE = ["#4285f4", "#34a853", "#fbbc04", "#ea4335", "#a142f4", "#00acc1"];
const PEN_COLORS = [
  "#0f172a",
  "#155eef",
  "#7c3aed",
  "#dc2626",
  "#0f766e",
  "#f97316",
  "#ffffff",
];
const HIGHLIGHT_COLORS = [
  "#fde047",
  "#86efac",
  "#93c5fd",
  "#f9a8d4",
  "#fdba74",
  "#c4b5fd",
];
const LEGACY_ACCENT_MAP: Record<string, string> = {
  "#b7c83e": PALETTE[0],
  "#ff7557": PALETTE[1],
  "#6d62d9": PALETTE[2],
  "#147d92": PALETTE[3],
  "#ecb22e": PALETTE[4],
  "#9ccfff": PALETTE[0],
  "#69aee8": PALETTE[0],
  "#899cf5": PALETTE[4],
  "#63c7cf": PALETTE[5],
  "#b8d5ff": PALETTE[2],
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const INITIAL_SCENES: Scene[] = [
  {
    id: "scene-cover",
    type: "cover",
    title: "Articles in real life",
    kicker: "ENGLISH 12 · LANGUAGE LAB",
    body: ["a / an", "the", "Ø no article"],
    accent: PALETTE[0],
    notes:
      "Mở đầu bằng ba biển hiệu quen thuộc. Yêu cầu học sinh đoán vì sao mỗi danh từ dùng một loại mạo từ khác nhau.",
  },
  {
    id: "scene-goal",
    type: "lesson",
    title: "Today, we can…",
    kicker: "LEARNING MAP · 02",
    body: [
      "recognise specific and general reference",
      "choose a, an, the or no article in context",
      "explain why an answer is grammatically appropriate",
    ],
    accent: PALETTE[1],
    notes:
      "Dùng chế độ Hiện dần. Sau mỗi mục, yêu cầu một học sinh diễn đạt lại mục tiêu bằng tiếng Việt.",
  },
  {
    id: "scene-question",
    type: "question",
    title: "Quick check",
    kicker: "CHECK FOR UNDERSTANDING · 03",
    body: [],
    accent: PALETTE[2],
    question: {
      stem: "Mai hopes to become ___ architect who designs sustainable schools.",
      options: ["a", "an", "the", "Ø"],
      answer: 1,
      explanation:
        "Architect begins with a vowel sound and refers to one non-specific member of a profession, so “an” is required.",
    },
    notes:
      "Cho học sinh 20 giây. Chọn một phương án trên bảng để mô phỏng bình chọn, sau đó mở đáp án.",
  },
  {
    id: "scene-vocab",
    type: "vocabulary",
    title: "Meaning before memory",
    kicker: "VOCABULARY REVEAL · 04",
    body: [],
    accent: PALETTE[3],
    vocabulary: [
      {
        term: "sustainable",
        meaning: "able to continue without harming the environment",
        example: "The school uses sustainable materials.",
      },
      {
        term: "specific",
        meaning: "clearly identified or particular",
        example: "The speaker refers to a specific building.",
      },
      {
        term: "reference",
        meaning: "the relationship between a word and what it points to",
        example: "The article changes the noun’s reference.",
      },
    ],
    notes: "Bấm từng thẻ để lật nghĩa. Không mở cả ba thẻ cùng lúc.",
  },
  {
    id: "scene-exit",
    type: "exit",
    title: "One-minute exit",
    kicker: "REFLECT & SUBMIT · 05",
    body: [
      "Write one sentence with a or an.",
      "Write one sentence with the.",
      "Write one sentence with no article.",
    ],
    accent: PALETTE[4],
    notes:
      "Đếm ngược 60 giây. Mời hai học sinh đọc câu và cả lớp sửa nhanh.",
  },
];

const INITIAL_WIDGETS_BY_SCENE: Record<string, WidgetInstance[]> = {
  "scene-cover": [
    createWidget("clock", {
      id: "widget-cover-clock",
      x: 72,
      y: 7,
      width: 21,
      height: 22,
      zIndex: 24,
    }),
    createWidget("workSymbol", {
      id: "widget-cover-work",
      x: 5,
      y: 7,
      width: 24,
      height: 20,
      zIndex: 23,
      data: { mode: "teacher" },
    }),
  ],
  "scene-question": [
    createWidget("visualTimer", {
      id: "widget-question-timer",
      x: 70,
      y: 67,
      width: 24,
      height: 25,
      zIndex: 24,
      data: { duration: 60, remaining: 60, running: false },
    }),
    createWidget("poll", {
      id: "widget-question-poll",
      x: 54,
      y: 38,
      width: 39,
      height: 27,
      zIndex: 23,
      data: {
        prompt: "Chọn đáp án của em",
        options: [
          { label: "A", count: 0, color: "#69aee8" },
          { label: "B", count: 0, color: "#9ccfff" },
          { label: "C", count: 0, color: "#899cf5" },
          { label: "D", count: 0, color: "#63c7cf" },
        ],
      },
    }),
  ],
  "scene-vocab": [
    createWidget("randomizer", {
      id: "widget-vocab-picker",
      x: 65,
      y: 24,
      width: 29,
      height: 39,
      zIndex: 23,
    }),
  ],
  "scene-exit": [
    createWidget("trafficLight", {
      id: "widget-exit-traffic",
      x: 4,
      y: 60,
      width: 14,
      height: 31,
      zIndex: 23,
    }),
    createWidget("scoreboard", {
      id: "widget-exit-scoreboard",
      x: 57,
      y: 8,
      width: 37,
      height: 23,
      zIndex: 23,
    }),
  ],
};

const QUESTION_TEMPLATE = `1. Yesterday, Lan visited ___ museum near her school.
A. a
B. an
C. the
D. Ø
ANSWER: C
EXPLANATION: The museum is identified by the phrase "near her school".

2. My brother wants to become ___ engineer.
A. a
B. an
C. the
D. Ø
ANSWER: B
EXPLANATION: Engineer begins with a vowel sound.`;

const VOCAB_TEMPLATE = `term | meaning | example
sustainable | able to continue without harming the environment | We need sustainable cities.
evidence | facts that support a conclusion | The report provides clear evidence.
reliable | consistently good or accurate | Use a reliable source.`;

const SLIDE_TEMPLATE = `# The definite article
Use "the" when the listener can identify the noun.
Use "the" with a unique person or thing.
Use "the" with superlative adjectives.

# No article
Use no article with plural nouns in a general sense.
Use no article with most languages and school subjects.`;

const CLASS_TEMPLATE = `Nguyễn An
Trần Bình
Lê Chi
Phạm Duy
Hoàng Giang
Võ Hà`;

const WIDGET_TEMPLATE = `type,title,label,value,extra
poll,Mức độ hiểu bài,Rất rõ,0,#69aee8
poll,Mức độ hiểu bài,Cần ví dụ,0,#9ccfff
poll,Mức độ hiểu bài,Chưa chắc,0,#899cf5
timetable,Tiến trình tiết học,07:30,Khởi động,Solo
timetable,Tiến trình tiết học,07:40,Luyện tập,Pairs
timetable,Tiến trình tiết học,07:55,Chia sẻ,Groups
scoreboard,Điểm hoạt động,Blue,0,#69aee8
scoreboard,Điểm hoạt động,Mint,0,#63c7cf
countdown,Ngày kiểm tra,Mini test,2026-09-05T07:30,
qr,Bài tập về nhà,Class form,https://example.com/class-task,`;

const sceneTypeNames: Record<SceneType, string> = {
  cover: "Trang mở đầu",
  lesson: "Nội dung",
  question: "Câu hỏi",
  vocabulary: "Từ vựng",
  activity: "Hoạt động",
  exit: "Exit ticket",
};

const sceneTypeNamesEn: Record<SceneType, string> = {
  cover: "Opening",
  lesson: "Content",
  question: "Question",
  vocabulary: "Vocabulary",
  activity: "Activity",
  exit: "Exit ticket",
};

const UI_TEXT = {
  localWorkspace: ["Teaching board · local workspace", "Bảng dạy học · xử lý cục bộ"],
  noAi: ["No AI · local device data", "Không AI · dữ liệu trên thiết bị"],
  dataStudio: ["Data Studio", "Data Studio"],
  fontSize: ["Text size", "Cỡ chữ"],
  smallerText: ["Smaller text", "Giảm cỡ chữ"],
  largerText: ["Larger text", "Tăng cỡ chữ"],
  export: ["Export", "Xuất"],
  save: ["Save", "Lưu"],
  present: ["Present", "Trình chiếu"],
  leftPanel: ["Scene list", "Danh sách Scene"],
  rightPanel: ["Control panel", "Bảng điều khiển"],
  lessonFlow: ["Lesson flow", "Luồng bài dạy"],
  addScene: ["Add Scene", "Thêm Scene"],
  previousScene: ["Previous Scene", "Scene trước"],
  nextScene: ["Next Scene", "Scene sau"],
  select: ["Select", "Chọn"],
  pen: ["Pen", "Bút"],
  highlight: ["Highlight", "Tô sáng"],
  eraser: ["Eraser", "Tẩy"],
  undo: ["Undo", "Hoàn tác"],
  penColor: ["Pen color", "Màu bút"],
  highlightColor: ["Highlight color", "Màu tô"],
  thickness: ["Thickness", "Độ dày"],
  eraseStroke: ["Erase strokes", "Tẩy nét"],
  eraserSize: ["Eraser size", "Cỡ tẩy"],
  clearAll: ["Clear all", "Xoá hết"],
  beamSize: ["Beam size", "Vùng sáng"],
  progressive: ["Reveal", "Hiện dần"],
  revealNext: ["Next", "Tiếp"],
  curtain: ["Curtain", "Che bảng"],
  widget: ["Widget", "Widget"],
  content: ["Content", "Nội dung"],
  tools: ["Tools", "Công cụ"],
  class: ["Class", "Lớp học"],
  sceneEditor: ["Scene editor", "Trình chỉnh Scene"],
  editContent: ["Edit content", "Chỉnh nội dung"],
  sceneType: ["Scene type", "Loại Scene"],
  title: ["Title", "Tiêu đề"],
  kicker: ["Small label", "Nhãn nhỏ"],
  bodyLines: ["Content · one idea per line", "Nội dung · mỗi dòng một ý"],
  question: ["Question", "Câu hỏi"],
  options: ["Options · one option per line", "Phương án · mỗi dòng một phương án"],
  answer: ["Answer", "Đáp án"],
  explanation: ["Answer explanation", "Giải thích đáp án"],
  vocabulary: ["Vocabulary · term | meaning | example", "Từ vựng · term | meaning | example"],
  teacherNotes: ["Teacher notes", "Ghi chú giáo viên"],
  notesPlaceholder: ["Only visible on the teacher screen…", "Chỉ hiển thị trong màn hình giáo viên…"],
  sceneColor: ["Scene color", "Màu Scene"],
  duplicate: ["Duplicate", "Nhân bản"],
  delete: ["Delete", "Xóa"],
  teachingTools: ["Teaching tools", "Công cụ dạy học"],
  lessonControls: ["Lesson controls", "Điều khiển tiết học"],
  timer: ["Timer", "Đồng hồ"],
  dockTimerHint: ["Always shown on the Teaching Dock", "Luôn hiển thị trên Teaching Dock"],
  pause: ["Pause", "Tạm dừng"],
  start: ["Start", "Bắt đầu"],
  contentCurtain: ["Content curtain", "Che nội dung"],
  curtainHint: ["Drag to control the visible board area", "Kéo để kiểm soát phần bảng đang mở"],
  openAll: ["Open", "Mở hết"],
  coverAll: ["Cover", "Che hết"],
  noNotes: ["This Scene has no teacher notes yet.", "Scene này chưa có ghi chú dành cho giáo viên."],
  shortcuts: ["Shortcuts", "Phím tắt"],
  previousNext: ["Previous / next Scene", "Scene trước / sau"],
  penPointer: ["Pen / pointer", "Bút / con trỏ"],
  textSizeShortcut: ["Text size", "Cỡ chữ"],
  deleteWidgetShortcut: ["Delete selected widget", "Xóa widget đang chọn"],
  liveWidgetLayer: ["Live widget layer", "Lớp widget trực tiếp"],
  interactiveGraphics: ["Interactive graphics", "Đồ hoạ tương tác"],
  selectedWidget: ["Selected widget", "Widget đang chọn"],
  widgetName: ["Widget name", "Tên widget"],
  widgetQuickActions: ["Quick actions", "Thao tác nhanh"],
  widgetLayout: ["Layout", "Bố cục"],
  position: ["Position", "Vị trí"],
  size: ["Size", "Kích thước"],
  rotate: ["Rotate", "Xoay"],
  layer: ["Layer", "Lớp"],
  front: ["Front", "Lên trước"],
  back: ["Back", "Về sau"],
  resetWidget: ["Reset widget data", "Đặt lại dữ liệu widget"],
  timerPresets: ["Timer presets", "Mốc thời gian"],
  pinnedAcross: ["Pinned across all Scenes · ", "Đang ghim qua mọi Scene · "],
  lockedPosition: ["Position locked", "Đã khóa vị trí"],
  dragResize: ["Drag and resize on the canvas", "Có thể kéo và resize trên canvas"],
  pin: ["Pin", "Ghim"],
  unpin: ["Unpin", "Bỏ ghim"],
  lock: ["Lock", "Khóa"],
  unlock: ["Unlock", "Mở khóa"],
  widgetEmpty: [
    "Tap a widget on the board or add a new one. Each widget has its own graphic states.",
    "Chạm một widget trên bảng hoặc thêm widget mới. Mỗi widget đều có đồ hoạ riêng và trạng thái tương tác rõ ràng.",
  ],
  widgetLibrary: ["Material classroom widgets", "Thư viện widget Material"],
  graphicStandard: ["Graphic standard", "Chuẩn đồ hoạ"],
  graphicStandardText: [
    "Widgets must show idle/active/result states, purposeful motion, large touch targets, and not rely on color alone.",
    "Widget phải có trạng thái idle/active/result, chuyển động có ý nghĩa, touch target lớn và không phụ thuộc màu sắc đơn lẻ.",
  ],
  liveClass: ["Live classroom", "Lớp học trực tiếp"],
  randomPicker: ["Random picker", "Gọi tên ngẫu nhiên"],
  readyPick: ["Ready to pick", "Sẵn sàng gọi tên"],
  pickStudent: ["Pick student", "Chọn học sinh"],
  classList: ["Class list", "Danh sách lớp"],
  update: ["Update", "Cập nhật"],
  otherStudents: ["other students", "học sinh khác"],
  otherItems: ["more items", "mục khác"],
  localEngine: ["Local content engine", "Bộ nhận diện cục bộ"],
  dataIntro: [
    "Upload a file or paste a template. The system parses data locally, without AI calls or external transfer.",
    "Tải tệp hoặc dán theo mẫu. Hệ thống phân tích ngay trên thiết bị, không gọi AI và không gửi dữ liệu ra ngoài.",
  ],
  autoDetect: ["Auto detect", "Tự nhận diện"],
  questions: ["Questions", "Câu hỏi"],
  vocabShort: ["Vocabulary", "Từ vựng"],
  slides: ["Slides", "Nội dung"],
  interactions: ["Interactions", "Tương tác"],
  uploadData: ["Upload data file", "Tải tệp dữ liệu lên"],
  fileHint: ["TXT, MD, CSV, TSV or JSON · max 5 MB", "TXT, MD, CSV, TSV hoặc JSON · tối đa 5 MB"],
  pasteDivider: ["Or paste content", "Hoặc dán nội dung"],
  pastePlaceholder: [
    "Paste questions, vocabulary tables, lesson content, widgets or class lists…",
    "Dán câu hỏi, bảng từ vựng, nội dung bài dạy, widget hoặc danh sách lớp…",
  ],
  useTemplate: ["Use template:", "Dùng mẫu:"],
  csvTemplates: ["CSV templates", "Tải file CSV mẫu"],
  csvHint: ["Open with Excel or Google Sheets", "Mở bằng Excel hoặc Google Sheets"],
  liveDetection: ["Live detection", "Nhận diện trực tiếp"],
  waitingData: ["Waiting for data", "Chờ dữ liệu"],
  analysed: ["Analysed", "Đã phân tích"],
  preview: ["Preview", "Xem trước"],
  formatRules: ["Detection rules", "Quy tắc nhận diện"],
  localProcessing: ["characters · local processing", "ký tự · xử lý cục bộ"],
  cancel: ["Cancel", "Hủy"],
  useThisList: ["Use this list", "Dùng danh sách này"],
  addWidgets: ["Add widgets", "Thêm widget"],
  addScenes: ["Add Scenes", "Thêm Scene"],
  exit: ["Exit", "Thoát"],
} as const satisfies Record<string, readonly [string, string]>;

type UiKey = keyof typeof UI_TEXT;

const WIDGET_TEXT: Record<
  WidgetType,
  { label: readonly [string, string]; description: readonly [string, string] }
> = {
  clock: {
    label: ["Clock", "Đồng hồ"],
    description: ["Analog face plus flip-clock digits.", "Mặt đồng hồ analog + flip clock số."],
  },
  visualTimer: {
    label: ["Visual Timer", "Visual Timer"],
    description: ["Countdown ring with warning pulse.", "Vòng đếm ngược có nhịp cảnh báo."],
  },
  stopwatch: {
    label: ["Stopwatch", "Stopwatch"],
    description: ["Stopwatch with lap and reset.", "Đồng hồ bấm giờ, lap và reset."],
  },
  trafficLight: {
    label: ["Traffic light", "Traffic light"],
    description: ["Tap to change classroom signal.", "Đèn lớp học đổi trạng thái bằng chạm."],
  },
  workSymbol: {
    label: ["Work symbols", "Work symbols"],
    description: ["Solo, pair, team or teacher focus.", "Biểu tượng cách làm việc: cá nhân, cặp, nhóm."],
  },
  randomizer: {
    label: ["Randomizer", "Randomizer"],
    description: ["Spinning name wheel with result history.", "Vòng quay gọi tên có kết quả và lịch sử."],
  },
  groupMaker: {
    label: ["Group maker", "Group maker"],
    description: ["Student cards fly into group zones.", "Chia nhóm bằng thẻ học sinh bay vào ô nhóm."],
  },
  scoreboard: {
    label: ["Scoreboard", "Scoreboard"],
    description: ["Arena-style team score panel.", "Bảng điểm sân vận động cho hoạt động nhóm."],
  },
  poll: {
    label: ["Poll", "Poll"],
    description: ["Animated voting bars for class checks.", "Bình chọn tại lớp bằng cột kết quả động."],
  },
  dice: {
    label: ["Dice", "Dice"],
    description: ["Rolling dice with dotted faces.", "Xúc xắc có hiệu ứng lắc và mặt chấm."],
  },
  soundLevel: {
    label: ["Sound level", "Sound level"],
    description: ["Noise gauge with threshold warning.", "Đồng hồ âm lượng, ngưỡng và cảnh báo."],
  },
  timetable: {
    label: ["Timetable", "Timetable"],
    description: ["Lesson timeline with active marker.", "Dòng thời gian tiết học có mốc hiện tại."],
  },
  countdown: {
    label: ["Event countdown", "Event countdown"],
    description: ["Days and hours until class events.", "Đếm ngày/giờ đến sự kiện lớp học."],
  },
  qrLink: {
    label: ["QR / Link", "QR / Link"],
    description: ["Large link card with QR-like visual.", "Thẻ link lớn kèm ma trận QR đồ hoạ."],
  },
};

const iconPaths: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  data: (
    <>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7Z" />,
  save: (
    <>
      <path d="M5 3h11l3 3v15H5Z" />
      <path d="M8 3v6h8V3" />
      <rect x="8" y="14" width="8" height="7" rx="1" />
    </>
  ),
  pointer: (
    <>
      <path d="m5 3 14 9-7 2-3 7Z" />
      <path d="m12 14 5 6" />
    </>
  ),
  pen: (
    <>
      <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10Z" />
      <path d="m13.5 7 3.5 3.5" />
    </>
  ),
  highlighter: (
    <>
      <path d="m6 15 8-11 5 4-8 11Z" />
      <path d="m5 20 6-1" />
      <path d="m14 4 5 4" />
    </>
  ),
  eraser: (
    <>
      <path d="m4 15 8.5-8.5a3 3 0 0 1 4.2 0l1.8 1.8a3 3 0 0 1 0 4.2L11 20H4Z" />
      <path d="m9 10 5 5" />
      <path d="M14 20h6" />
    </>
  ),
  spotlight: (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  curtain: (
    <>
      <path d="M4 4h16v16H4Z" />
      <path d="M12 4v16" />
      <path d="m8 4 2 4-2 4 2 4-2 4M16 4l-2 4 2 4-2 4 2 4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v5l3 2M9 2h6M12 2v3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-4 2-6 6-6s6 2 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 15c3.5 0 5 1.7 5 5" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 3h6l1 4H8Z" />
      <path d="m7 7 1 14h8l1-14M10 11v6M14 11v6" />
    </>
  ),
  undo: (
    <>
      <path d="m9 7-5 5 5 5" />
      <path d="M4 12h10a6 6 0 0 1 6 6" />
    </>
  ),
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  close: (
    <>
      <path d="M5 5l14 14" />
      <path d="M19 5 5 19" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V3M7 8l5-5 5 5" />
      <path d="M4 14v6h16v-6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v13M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  shuffle: (
    <>
      <path d="M4 7h3c4 0 5 10 10 10h3" />
      <path d="m17 14 3 3-3 3M4 17h3c1.5 0 2.6-1.4 3.6-3" />
      <path d="M14 8c.9-.7 1.8-1 3-1h3M17 4l3 3-3 3" />
    </>
  ),
};

function Icon({
  name,
  size = 20,
}: {
  name: keyof typeof iconPaths;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function cleanOption(value: string) {
  return value.replace(/^\s*[A-Da-d][.)]\s*/, "").trim();
}

function makeQuestionScene(question: Question, index: number): Scene {
  return {
    id: uid(),
    type: "question",
    title: `Quick check ${index + 1}`,
    kicker: `IMPORTED QUESTION · ${String(index + 1).padStart(2, "0")}`,
    body: [],
    accent: PALETTE[(index + 2) % PALETTE.length],
    question,
    notes: "Câu hỏi được tạo tự động từ dữ liệu nhập. Kiểm tra lại đáp án trước khi trình chiếu.",
  };
}

function parseQuestions(raw: string): Question[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const questions: Question[] = [];
  let current: {
    stem: string;
    options: string[];
    answer: number;
    explanation?: string;
  } | null = null;

  const push = () => {
    if (current && current.stem && current.options.length >= 2) {
      questions.push({
        stem: current.stem.trim(),
        options: current.options.map(cleanOption),
        answer: Math.max(0, Math.min(current.answer, current.options.length - 1)),
        explanation: current.explanation?.trim(),
      });
    }
  };

  for (const sourceLine of lines) {
    const line = sourceLine.trim();
    if (!line) continue;

    const questionMatch = line.match(/^\s*(?:Q(?:uestion)?\s*)?(\d+)[.)]\s*(.+)$/i);
    const optionMatch = line.match(/^\s*([A-D])[.)]\s*(.+)$/i);
    const answerMatch = line.match(
      /^\s*(?:ANSWER|KEY|ĐÁP\s*ÁN|DAP\s*AN)\s*[:=-]\s*([A-D]|\d+)/i,
    );
    const explanationMatch = line.match(
      /^\s*(?:EXPLANATION|GIẢI\s*THÍCH|GIAI\s*THICH)\s*[:=-]\s*(.+)$/i,
    );

    if (questionMatch && !optionMatch) {
      push();
      current = {
        stem: questionMatch[2],
        options: [],
        answer: 0,
      };
    } else if (optionMatch && current) {
      current.options.push(optionMatch[2]);
    } else if (answerMatch && current) {
      const answerToken = answerMatch[1].toUpperCase();
      current.answer = /^[A-D]$/.test(answerToken)
        ? answerToken.charCodeAt(0) - 65
        : Math.max(0, Number(answerToken) - 1);
    } else if (explanationMatch && current) {
      current.explanation = explanationMatch[1];
    } else if (current && current.options.length === 0) {
      current.stem += ` ${line}`;
    } else if (current && current.explanation) {
      current.explanation += ` ${line}`;
    }
  }
  push();
  return questions;
}

function parseDelimited(raw: string) {
  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  let explicitSeparator = "";
  if (/^sep=./i.test(lines[0])) {
    explicitSeparator = lines.shift()?.slice(4, 5) || "";
  }
  if (lines.length < 2) return null;

  const separators = ["\t", "|", ";", ","];
  const countOutsideQuotes = (line: string, token: string) => {
    let quoted = false;
    let count = 0;
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] === '"') {
        if (quoted && line[index + 1] === '"') index += 1;
        else quoted = !quoted;
      } else if (!quoted && line[index] === token) {
        count += 1;
      }
    }
    return count;
  };
  const separator =
    explicitSeparator ||
    separators
      .map((token) => ({ token, count: countOutsideQuotes(lines[0], token) }))
      .sort((a, b) => b.count - a.count)[0]?.token ||
    "|";

  const parseRow = (line: string) => {
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === separator && !quoted) {
        cells.push(cell.trim());
        cell = "";
      } else {
        cell += character;
      }
    }
    cells.push(cell.trim());
    return cells;
  };
  const rows = lines.map(parseRow);
  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").toLowerCase().replace(/[\s_-]/g, ""),
  );
  return { headers, rows: rows.slice(1) };
}

function parseVocabulary(raw: string): VocabularyItem[] {
  const table = parseDelimited(raw);
  if (!table) return [];
  const termIndex = table.headers.findIndex((header) =>
    /^(term|word|vocabulary|từ|tu)$/.test(header),
  );
  const meaningIndex = table.headers.findIndex((header) =>
    /^(meaning|definition|nghĩa|nghia)$/.test(header),
  );
  const exampleIndex = table.headers.findIndex((header) =>
    /^(example|sentence|vídụ|vidu)$/.test(header),
  );
  if (termIndex < 0 || meaningIndex < 0) return [];
  return table.rows
    .filter((row) => row[termIndex] && row[meaningIndex])
    .map((row) => ({
      term: row[termIndex],
      meaning: row[meaningIndex],
      example: exampleIndex >= 0 ? row[exampleIndex] : undefined,
    }));
}

function parseQuestionTable(raw: string): Question[] {
  const table = parseDelimited(raw);
  if (!table) return [];
  const questionIndex = table.headers.findIndex((header) =>
    /^(question|stem|câuhỏi|cauhoi)$/.test(header),
  );
  const answerIndex = table.headers.findIndex((header) =>
    /^(answer|key|đápán|dapan)$/.test(header),
  );
  if (questionIndex < 0 || answerIndex < 0) return [];
  const optionIndices = ["a", "b", "c", "d"]
    .map((letter) =>
      table.headers.findIndex((header) =>
        new RegExp(`^(?:option)?${letter}$`).test(header),
      ),
    )
    .filter((index) => index >= 0);
  if (optionIndices.length < 2) return [];
  const explanationIndex = table.headers.findIndex((header) =>
    /^(explanation|giảithích|giaithich)$/.test(header),
  );
  return table.rows
    .filter((row) => row[questionIndex])
    .map((row) => {
      const token = (row[answerIndex] || "A").trim().toUpperCase();
      return {
        stem: row[questionIndex],
        options: optionIndices.map((index) => row[index] || ""),
        answer: /^[A-D]$/.test(token)
          ? token.charCodeAt(0) - 65
          : Math.max(0, Number(token) - 1),
        explanation:
          explanationIndex >= 0 ? row[explanationIndex] : undefined,
      };
    });
}

function parseSlideTable(raw: string): Scene[] {
  const table = parseDelimited(raw);
  if (!table) return [];
  const titleIndex = table.headers.findIndex((header) =>
    /^(title|heading|tiêuđề|tieude)$/.test(header),
  );
  const contentIndex = table.headers.findIndex((header) =>
    /^(content|body|points|nộidung|noidung)$/.test(header),
  );
  const notesIndex = table.headers.findIndex((header) =>
    /^(notes|presenternotes|ghịchú|ghichu)$/.test(header),
  );
  if (titleIndex < 0 || contentIndex < 0) return [];
  return table.rows
    .filter((row) => row[titleIndex])
    .map(
      (row, index) =>
        ({
          id: uid(),
          type: "lesson",
          title: row[titleIndex],
          kicker: `IMPORTED CSV · ${String(index + 1).padStart(2, "0")}`,
          body: (row[contentIndex] || "")
            .split(/\s*(?:\|\||•|;)\s*/)
            .map((item) => item.trim())
            .filter(Boolean),
          accent: PALETTE[(index + 1) % PALETTE.length],
          notes:
            (notesIndex >= 0 ? row[notesIndex] : "") ||
            "Scene được tạo tự động từ file CSV.",
        }) satisfies Scene,
    );
}

function parseClassTable(raw: string): string[] {
  const table = parseDelimited(raw);
  if (!table) return [];
  const nameIndex = table.headers.findIndex((header) =>
    /^(name|student|studentname|họvàtên|hovaten|họten|hoten)$/.test(header),
  );
  if (nameIndex < 0) return [];
  return table.rows.map((row) => row[nameIndex]?.trim()).filter(Boolean);
}

function parseSlides(raw: string): Scene[] {
  const sections = raw
    .replace(/\r/g, "")
    .split(/(?=^\s*#\s+)/gm)
    .map((section) => section.trim())
    .filter(Boolean);
  if (!sections.length || !sections.some((section) => /^#\s+/.test(section))) {
    return [];
  }
  return sections.map((section, index) => {
    const lines = section.split("\n").map((line) => line.trim());
    const title = lines[0].replace(/^#\s+/, "").trim();
    return {
      id: uid(),
      type: "lesson",
      title: title || `Nội dung ${index + 1}`,
      kicker: `IMPORTED CONTENT · ${String(index + 1).padStart(2, "0")}`,
      body: lines
        .slice(1)
        .map((line) => line.replace(/^[-•]\s*/, ""))
        .filter(Boolean),
      accent: PALETTE[(index + 1) % PALETTE.length],
      notes: "Scene được tạo tự động từ tiêu đề bắt đầu bằng dấu #.",
    } satisfies Scene;
  });
}

function parseJson(raw: string): {
  scenes?: Scene[];
  questions?: Question[];
  vocabulary?: VocabularyItem[];
  names?: string[];
} | null {
  try {
    const parsed = JSON.parse(raw);
    const data = Array.isArray(parsed) ? { items: parsed } : parsed;
    const items = Array.isArray(data.items) ? data.items : [];
    const scenes = Array.isArray(data.scenes)
      ? data.scenes
      : items.some((item) => item?.title && item?.type)
        ? items
        : undefined;
    const questions = Array.isArray(data.questions)
      ? data.questions
      : items.some((item) => item?.stem || item?.question)
        ? items.map((item) => ({
            stem: item.stem || item.question,
            options: item.options || [item.a, item.b, item.c, item.d].filter(Boolean),
            answer:
              typeof item.answer === "number"
                ? item.answer
                : String(item.answer || "A")
                    .toUpperCase()
                    .charCodeAt(0) - 65,
            explanation: item.explanation,
          }))
        : undefined;
    const vocabulary = Array.isArray(data.vocabulary)
      ? data.vocabulary
      : items.some((item) => item?.term && item?.meaning)
        ? items
        : undefined;
    const names = Array.isArray(data.names)
      ? data.names.map(String)
      : Array.isArray(data.students)
        ? data.students.map((item: string | { name?: string }) =>
            typeof item === "string" ? item : item.name || "",
          )
        : undefined;
    return { scenes, questions, vocabulary, names };
  } catch {
    return null;
  }
}

function normalizeImportedScene(scene: Partial<Scene>, index: number): Scene {
  const validType: SceneType[] = [
    "cover",
    "lesson",
    "question",
    "vocabulary",
    "activity",
    "exit",
  ];
  return {
    id: uid(),
    type: validType.includes(scene.type as SceneType)
      ? (scene.type as SceneType)
      : "lesson",
    title: scene.title || `Scene ${index + 1}`,
    kicker: scene.kicker || `IMPORTED SCENE · ${String(index + 1).padStart(2, "0")}`,
    body: Array.isArray(scene.body) ? scene.body.map(String) : [],
    accent: scene.accent || PALETTE[index % PALETTE.length],
    question: scene.question,
    vocabulary: scene.vocabulary,
    notes: scene.notes || "Scene được nhập từ tệp JSON.",
  };
}

function detectContent(raw: string, mode: ImportMode): ImportResult {
  const text = raw.trim();
  if (!text) {
    return {
      kind: "unknown",
      title: "Chưa có dữ liệu",
      detail: "Dán nội dung hoặc tải tệp để bắt đầu nhận diện.",
      scenes: [],
      names: [],
      warnings: [],
    };
  }

  const json = parseJson(text);
  if (json) {
    if ((mode === "auto" || mode === "slides") && json.scenes?.length) {
      const scenes = json.scenes.map(normalizeImportedScene);
      return {
        kind: "slides",
        title: `Đã nhận diện ${scenes.length} Scene`,
        detail: "Cấu trúc JSON hợp lệ · sẵn sàng thêm vào bảng",
        scenes,
        names: [],
        warnings: [],
      };
    }
    if ((mode === "auto" || mode === "questions") && json.questions?.length) {
      const scenes = json.questions.map(makeQuestionScene);
      return {
        kind: "questions",
        title: `Đã nhận diện ${scenes.length} câu hỏi`,
        detail: "Đáp án và phương án đã được ánh xạ tự động",
        scenes,
        names: [],
        warnings: [],
      };
    }
    if ((mode === "auto" || mode === "vocabulary") && json.vocabulary?.length) {
      const scene: Scene = {
        id: uid(),
        type: "vocabulary",
        title: "Vocabulary reveal",
        kicker: "IMPORTED VOCABULARY",
        body: [],
        accent: PALETTE[3],
        vocabulary: json.vocabulary,
        notes: "Bấm từng thẻ để mở nghĩa và ví dụ.",
      };
      return {
        kind: "vocabulary",
        title: `Đã nhận diện ${json.vocabulary.length} mục từ`,
        detail: "Sẽ tạo một Scene thẻ từ vựng tương tác",
        scenes: [scene],
        names: [],
        warnings: [],
      };
    }
    if ((mode === "auto" || mode === "class") && json.names?.length) {
      return {
        kind: "class",
        title: `Đã nhận diện ${json.names.length} học sinh`,
        detail: "Danh sách sẽ được dùng cho công cụ gọi tên",
        scenes: [],
        names: json.names.filter(Boolean),
        warnings: [],
      };
    }
  }

  if (mode === "auto" || mode === "widgets") {
    const widgetImport = parseWidgetTable(text);
    if (widgetImport.widgets.length) {
      return {
        kind: "widgets",
        title: `Đã nhận diện ${widgetImport.widgets.length} widget tương tác`,
        detail:
          "Sẽ thêm các widget đồ hoạ vào Scene hiện tại: poll, timetable, scoreboard, countdown, QR hoặc group maker.",
        scenes: [],
        names: [],
        widgets: widgetImport.widgets,
        warnings: widgetImport.warnings,
      };
    }
  }

  if (mode === "auto" || mode === "questions") {
    const tableQuestions = parseQuestionTable(text);
    const questions = tableQuestions.length ? tableQuestions : parseQuestions(text);
    if (questions.length) {
      const incomplete = questions.filter(
        (question) =>
          question.options.length < 4 ||
          question.answer < 0 ||
          question.answer >= question.options.length,
      ).length;
      return {
        kind: "questions",
        title: `Đã nhận diện ${questions.length} câu hỏi`,
        detail: "Sẽ tạo một Scene tương tác cho mỗi câu",
        scenes: questions.map(makeQuestionScene),
        names: [],
        warnings: incomplete
          ? [`${incomplete} câu chưa đủ bốn phương án hoặc cần kiểm tra đáp án.`]
          : [],
      };
    }
  }

  if (mode === "auto" || mode === "vocabulary") {
    const vocabulary = parseVocabulary(text);
    if (vocabulary.length) {
      const chunks: VocabularyItem[][] = [];
      for (let index = 0; index < vocabulary.length; index += 6) {
        chunks.push(vocabulary.slice(index, index + 6));
      }
      const scenes = chunks.map(
        (items, index) =>
          ({
            id: uid(),
            type: "vocabulary",
            title: chunks.length > 1 ? `Vocabulary ${index + 1}` : "Vocabulary reveal",
            kicker: `IMPORTED VOCABULARY · ${String(index + 1).padStart(2, "0")}`,
            body: [],
            accent: PALETTE[(index + 3) % PALETTE.length],
            vocabulary: items,
            notes: "Bấm từng thẻ để mở nghĩa và ví dụ.",
          }) satisfies Scene,
      );
      return {
        kind: "vocabulary",
        title: `Đã nhận diện ${vocabulary.length} mục từ`,
        detail: `Tự động chia thành ${scenes.length} Scene, tối đa 6 thẻ mỗi Scene`,
        scenes,
        names: [],
        warnings: [],
      };
    }
  }

  if (mode === "auto" || mode === "slides") {
    const tableSlides = parseSlideTable(text);
    const slides = tableSlides.length ? tableSlides : parseSlides(text);
    if (slides.length) {
      return {
        kind: "slides",
        title: `Đã nhận diện ${slides.length} phần nội dung`,
        detail: tableSlides.length
          ? "Mỗi dòng CSV sẽ trở thành một Scene"
          : "Mỗi tiêu đề bắt đầu bằng # sẽ trở thành một Scene",
        scenes: slides,
        names: [],
        warnings: [],
      };
    }
  }

  if (mode === "auto" || mode === "class") {
    const tableNames = parseClassTable(text);
    const names = tableNames.length
      ? tableNames
      : mode === "class"
        ? text
            .split(/\n|;/)
            .map((line) => line.replace(/^\s*\d+[.)-]?\s*/, "").trim())
            .filter(Boolean)
        : [];
    if (!names.length) {
      return {
        kind: "unknown",
        title: "Chưa nhận diện được danh sách lớp",
        detail: "Dùng cột CSV có tiêu đề name hoặc dán mỗi học sinh trên một dòng.",
        scenes: [],
        names: [],
        warnings: ["Không có tên học sinh hợp lệ."],
      };
    }
    return {
      kind: "class",
      title: `Đã nhận diện ${names.length} học sinh`,
      detail: tableNames.length
        ? "Đã đọc cột name từ file CSV"
        : "Mỗi dòng được xem là một học sinh",
      scenes: [],
      names,
      warnings: [],
    };
  }

  return {
    kind: "unknown",
    title: "Chưa nhận diện được cấu trúc",
    detail: "Chọn đúng loại dữ liệu hoặc dùng một trong các mẫu có sẵn.",
    scenes: [],
    names: [],
    warnings: ["Không có dữ liệu nào được thêm vào bảng."],
  };
}

function formatTime(seconds: number) {
  const value = Math.max(0, seconds);
  const minutes = Math.floor(value / 60);
  return `${String(minutes).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function getScenePreview(scene: Scene) {
  if (scene.type === "question") return scene.question?.stem || "Question";
  if (scene.type === "vocabulary")
    return scene.vocabulary?.map((item) => item.term).join(" · ") || "Vocabulary";
  return scene.body[0] || scene.kicker || sceneTypeNames[scene.type];
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
}

function isStrokeNearPoint(stroke: Stroke, point: Point, radius: number) {
  if (stroke.points.length < 2) {
    const first = stroke.points[0];
    return first ? Math.hypot(point.x - first.x, point.y - first.y) <= radius : false;
  }
  for (let index = 1; index < stroke.points.length; index += 1) {
    if (
      distanceToSegment(point, stroke.points[index - 1], stroke.points[index]) <=
      radius
    ) {
      return true;
    }
  }
  return false;
}

function SceneCanvas({
  scene,
  selectedAnswer,
  onSelectAnswer,
  showAnswer,
  onToggleAnswer,
  activeTool,
  penColor,
  highlighterColor,
  eraserSize,
  spotlightSize,
  strokes,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  spotlight,
  setSpotlight,
  curtain,
  progressive,
  revealedCount,
  flippedTerms,
  onFlipTerm,
  widgets,
  selectedWidgetId,
  onSelectWidget,
  onWidgetLayoutChange,
  onWidgetDataChange,
  onWidgetCommand,
  onWidgetDelete,
  onWidgetDuplicate,
  onWidgetToggleLock,
  onWidgetTogglePin,
  classNames,
  now,
}: {
  scene: Scene;
  selectedAnswer?: number;
  onSelectAnswer: (index: number) => void;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  activeTool: ToolName;
  penColor: string;
  highlighterColor: string;
  eraserSize: number;
  spotlightSize: number;
  strokes: Stroke[];
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
  spotlight: Point;
  setSpotlight: (point: Point) => void;
  curtain: number;
  progressive: boolean;
  revealedCount: number;
  flippedTerms: Set<number>;
  onFlipTerm: (index: number) => void;
  widgets: WidgetInstance[];
  selectedWidgetId: string;
  onSelectWidget: (id: string) => void;
  onWidgetLayoutChange: (id: string, patch: Partial<WidgetInstance>) => void;
  onWidgetDataChange: (
    id: string,
    updater: (data: WidgetData) => WidgetData,
  ) => void;
  onWidgetCommand: (
    widget: WidgetInstance,
    command: WidgetCommand,
    payload?: unknown,
  ) => void;
  onWidgetDelete: (id: string) => void;
  onWidgetDuplicate: (id: string) => void;
  onWidgetToggleLock: (id: string) => void;
  onWidgetTogglePin: (id: string) => void;
  classNames: string[];
  now: Date;
}) {
  const sceneStyle = {
    "--scene-accent": scene.accent,
    "--ink-color": activeTool === "highlighter" ? highlighterColor : penColor,
    "--eraser-size": `${eraserSize}px`,
    "--spot-size": `${spotlightSize}%`,
  } as React.CSSProperties;

  return (
    <div
      className={`stage-canvas scene-${scene.type} tool-${activeTool}`}
      style={sceneStyle}
      onPointerMove={(event) => {
        if (activeTool !== "spotlight" && activeTool !== "eraser") return;
        const rect = event.currentTarget.getBoundingClientRect();
        setSpotlight({
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      <div className="stage-grid" />
      <div className="stage-corner-mark">B.</div>
      <div className="stage-content">
        <div className="scene-kicker">
          <span className="kicker-dot" />
          {scene.kicker || sceneTypeNames[scene.type]}
        </div>

        {scene.type === "cover" && (
          <div className="cover-layout">
            <div>
              <h1>{scene.title}</h1>
              <p className="cover-subtitle">Learn · interact · remember</p>
            </div>
            <div className="cover-orbit">
              {scene.body.map((item, index) => (
                <span key={item} className={`orbit-item orbit-${index + 1}`}>
                  {item}
                </span>
              ))}
              <div className="orbit-center">12</div>
            </div>
          </div>
        )}

        {(scene.type === "lesson" ||
          scene.type === "activity" ||
          scene.type === "exit") && (
          <div className="lesson-layout">
            <h1>{scene.title}</h1>
            <div className="lesson-items">
              {scene.body.map((item, index) => {
                const hidden = progressive && index >= revealedCount;
                return (
                  <div
                    key={`${item}-${index}`}
                    className={`lesson-item ${hidden ? "is-hidden" : ""}`}
                  >
                    <span className="item-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {scene.type === "question" && scene.question && (
          <div className="question-layout">
            <div className="question-topline">
              <h1>{scene.title}</h1>
              <span className="question-chip">1 point</span>
            </div>
            <p className="question-stem">{scene.question.stem}</p>
            <div className="answer-grid">
              {scene.question.options.map((option, index) => {
                const selected = selectedAnswer === index;
                const correct = showAnswer && scene.question?.answer === index;
                const wrong = showAnswer && selected && !correct;
                return (
                  <button
                    type="button"
                    key={`${option}-${index}`}
                    className={`answer-option ${selected ? "is-selected" : ""} ${
                      correct ? "is-correct" : ""
                    } ${wrong ? "is-wrong" : ""}`}
                    onClick={() => onSelectAnswer(index)}
                    disabled={activeTool !== "pointer"}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                  </button>
                );
              })}
            </div>
            <div className={`explanation-card ${showAnswer ? "is-visible" : ""}`}>
              <strong>
                Answer: {String.fromCharCode(65 + scene.question.answer)}
              </strong>
              <span>
                {scene.question.explanation || "No explanation was supplied."}
              </span>
            </div>
            <button
              type="button"
              className="canvas-answer-toggle"
              onClick={onToggleAnswer}
              disabled={activeTool !== "pointer"}
            >
              <Icon name="eye" size={17} />
              {showAnswer ? "Ẩn đáp án" : "Mở đáp án"}
            </button>
          </div>
        )}

        {scene.type === "vocabulary" && (
          <div className="vocab-layout">
            <h1>{scene.title}</h1>
            <div className="vocab-grid">
              {(scene.vocabulary || []).map((item, index) => {
                const flipped = flippedTerms.has(index);
                return (
                  <button
                    type="button"
                    key={`${item.term}-${index}`}
                    className={`vocab-card ${flipped ? "is-flipped" : ""}`}
                    onClick={() => onFlipTerm(index)}
                    disabled={activeTool !== "pointer"}
                  >
                    <span className="vocab-index">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{item.term}</strong>
                    <span className="vocab-meaning">{item.meaning}</span>
                    {item.example && (
                      <em className="vocab-example">{item.example}</em>
                    )}
                    <span className="vocab-hint">
                      {flipped ? "tap to hide" : "tap to reveal"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <WidgetLayer
        widgets={widgets}
        selectedWidgetId={selectedWidgetId}
        activeTool={activeTool}
        now={now}
        classNames={classNames}
        onSelect={onSelectWidget}
        onLayoutChange={onWidgetLayoutChange}
        onDataChange={onWidgetDataChange}
        onCommand={onWidgetCommand}
        onDelete={onWidgetDelete}
        onDuplicate={onWidgetDuplicate}
        onToggleLock={onWidgetToggleLock}
        onTogglePin={onWidgetTogglePin}
      />

      {activeTool === "spotlight" && (
        <div
          className="spotlight-layer"
          style={
            {
              "--spot-x": `${spotlight.x}%`,
              "--spot-y": `${spotlight.y}%`,
            } as React.CSSProperties
          }
        />
      )}

      {activeTool === "eraser" && (
        <div
          className="eraser-cursor"
          style={
            {
              "--eraser-x": `${spotlight.x}%`,
              "--eraser-y": `${spotlight.y}%`,
            } as React.CSSProperties
          }
        >
          <span />
        </div>
      )}

      {curtain > 0 && (
        <div className="curtain-layer" style={{ width: `${curtain}%` }}>
          <span>BRIAN CLASSROOM STAGE</span>
        </div>
      )}

      <svg
        className={`ink-layer ${
          activeTool === "pen" ||
          activeTool === "highlighter" ||
          activeTool === "eraser"
            ? "is-active"
            : ""
        }`}
        viewBox="0 0 1000 562.5"
        preserveAspectRatio="none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width || (stroke.tool === "highlighter" ? 18 : 5)}
            opacity={stroke.opacity ?? (stroke.tool === "highlighter" ? 0.36 : 1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              mixBlendMode: stroke.tool === "highlighter" ? "multiply" : "normal",
              filter:
                stroke.tool === "pen"
                  ? "drop-shadow(0 1px 0 rgba(255,255,255,0.28))"
                  : undefined,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function App() {
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [activeSceneId, setActiveSceneId] = useState(INITIAL_SCENES[0].id);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [activeTool, setActiveTool] = useState<ToolName>("pointer");
  const [languageMode, setLanguageMode] = useState<LanguageMode>("both");
  const [textScale, setTextScale] = useState<TextScale>(2);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("auto");
  const [importText, setImportText] = useState("");
  const [importFilename, setImportFilename] = useState("");
  const [toast, setToast] = useState("");
  const [presentationMode, setPresentationMode] = useState(false);
  const [strokesByScene, setStrokesByScene] = useState<Record<string, Stroke[]>>(
    {},
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [answerVisibility, setAnswerVisibility] = useState<Record<string, boolean>>(
    {},
  );
  const [penColor, setPenColor] = useState(PEN_COLORS[1]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penWidth, setPenWidth] = useState(7);
  const [highlighterWidth, setHighlighterWidth] = useState(26);
  const [eraserSize, setEraserSize] = useState(42);
  const [spotlightSize, setSpotlightSize] = useState(20);
  const [progressive, setProgressive] = useState(false);
  const [revealedByScene, setRevealedByScene] = useState<Record<string, number>>(
    {},
  );
  const [flippedByScene, setFlippedByScene] = useState<
    Record<string, number[]>
  >({});
  const [curtain, setCurtain] = useState(0);
  const [spotlight, setSpotlight] = useState<Point>({ x: 50, y: 50 });
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [classNames, setClassNames] = useState([
    "Nguyễn An",
    "Trần Bình",
    "Lê Chi",
    "Phạm Duy",
    "Hoàng Giang",
    "Võ Hà",
  ]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [teams, setTeams] = useState({ Avocado: 0, Tangerine: 0 });
  const [widgetsByScene, setWidgetsByScene] = useState<Record<string, WidgetInstance[]>>(
    INITIAL_WIDGETS_BY_SCENE,
  );
  const [selectedWidgetId, setSelectedWidgetId] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [hydrated, setHydrated] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentStrokeRef = useRef<string | null>(null);

  const activeSceneIndex = Math.max(
    0,
    scenes.findIndex((scene) => scene.id === activeSceneId),
  );
  const activeScene = scenes[activeSceneIndex] || scenes[0];
  const activeStrokes = strokesByScene[activeScene?.id] || [];
  const activeWidgets = useMemo(() => {
    if (!activeScene) return [];
    const local = widgetsByScene[activeScene.id] || [];
    const pinned = Object.entries(widgetsByScene).flatMap(([sceneId, widgets]) =>
      sceneId === activeScene.id
        ? []
        : widgets.filter((widget) => widget.pinned),
    );
    return [...pinned, ...local].sort((a, b) => a.zIndex - b.zIndex);
  }, [activeScene, widgetsByScene]);
  const selectedWidget = useMemo(
    () =>
      Object.values(widgetsByScene)
        .flat()
        .find((widget) => widget.id === selectedWidgetId),
    [selectedWidgetId, widgetsByScene],
  );
  const importResult = useMemo(
    () => detectContent(importText, importMode),
    [importText, importMode],
  );

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved =
          window.localStorage.getItem("brian-classroom-stage-v2") ||
          window.localStorage.getItem("brian-classroom-stage-v1");
        if (saved) {
          const data = JSON.parse(saved);
          if (Array.isArray(data.scenes) && data.scenes.length) {
            setScenes(
              data.scenes.map((scene: Scene) => ({
                ...scene,
                accent: LEGACY_ACCENT_MAP[scene.accent] || scene.accent,
              })),
            );
            setActiveSceneId(data.activeSceneId || data.scenes[0].id);
          }
          if (Array.isArray(data.classNames)) setClassNames(data.classNames);
          if (data.widgetsByScene && typeof data.widgetsByScene === "object") {
            setWidgetsByScene(data.widgetsByScene);
          }
          if (["vi", "en", "both"].includes(data.languageMode)) {
            setLanguageMode(data.languageMode);
          }
          setTextScale(normalizeTextScale(data.textScale));
        }
      } catch {
        // Keep the bundled lesson if local data is invalid.
      }
      setHydrated(true);
    });
  }, []);

  const tx = useCallback(
    (key: UiKey) => {
      const [en, vi] = UI_TEXT[key];
      if (languageMode === "en") return en;
      if (languageMode === "vi") return vi;
      return `${vi} · ${en}`;
    },
    [languageMode],
  );

  const sceneLabel = useCallback(
    (type: SceneType) => {
      if (languageMode === "en") return sceneTypeNamesEn[type];
      if (languageMode === "vi") return sceneTypeNames[type];
      return `${sceneTypeNames[type]} · ${sceneTypeNamesEn[type]}`;
    },
    [languageMode],
  );

  const widgetLabel = useCallback(
    (type: WidgetType) => {
      const copy = WIDGET_TEXT[type]?.label;
      if (!copy) return type;
      if (languageMode === "en") return copy[0];
      if (languageMode === "vi") return copy[1];
      return `${copy[1]} · ${copy[0]}`;
    },
    [languageMode],
  );

  const widgetDescription = useCallback(
    (type: WidgetType) => {
      const copy = WIDGET_TEXT[type]?.description;
      if (!copy) return "";
      if (languageMode === "en") return copy[0];
      if (languageMode === "vi") return copy[1];
      return `${copy[1]} · ${copy[0]}`;
    },
    [languageMode],
  );

  const textScaleName = useMemo(() => {
    const [en, vi] = TEXT_SCALE_NAMES[textScale];
    if (languageMode === "en") return en;
    if (languageMode === "vi") return vi;
    return `${vi} · ${en}`;
  }, [languageMode, textScale]);

  const cycleLanguage = () => {
    setLanguageMode((current) =>
      current === "both" ? "vi" : current === "vi" ? "en" : "both",
    );
  };

  const changeTextScale = (delta: number) => {
    setTextScale((current) => normalizeTextScale(current + delta));
  };

  const saveBoard = useCallback(
    (silent = false) => {
      if (!hydrated) return;
      window.localStorage.setItem(
        "brian-classroom-stage-v2",
        JSON.stringify({
          scenes,
          activeSceneId,
          classNames,
          widgetsByScene,
          languageMode,
          textScale,
        }),
      );
      if (!silent) notify("Đã lưu bảng trên thiết bị này");
    },
    [
      activeSceneId,
      classNames,
      hydrated,
      languageMode,
      notify,
      scenes,
      textScale,
      widgetsByScene,
    ],
  );

  useEffect(() => {
    if (!hydrated) return;
    const timeout = window.setTimeout(() => saveBoard(true), 700);
    return () => window.clearTimeout(timeout);
  }, [hydrated, saveBoard]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          notify("Hết giờ!");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [notify, timerRunning]);

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setNow(new Date());
      setWidgetsByScene((current) => {
        let changed = false;
        const next = Object.fromEntries(
          Object.entries(current).map(([sceneId, widgets]) => [
            sceneId,
            widgets.map((widget) => {
              if (widget.type === "visualTimer" && widget.data.running) {
                const remaining = Math.max(0, Number(widget.data.remaining || 0) - 1);
                changed = true;
                if (remaining === 0) {
                  notify(`${widget.title} đã hết giờ`);
                }
                return {
                  ...widget,
                  data: {
                    ...widget.data,
                    remaining,
                    running: remaining > 0,
                  },
                };
              }
              if (widget.type === "stopwatch" && widget.data.running) {
                changed = true;
                return {
                  ...widget,
                  data: {
                    ...widget.data,
                    elapsed: Number(widget.data.elapsed || 0) + 1,
                  },
                };
              }
              if (
                widget.type === "soundLevel" &&
                widget.data.listening &&
                widget.data.micError
              ) {
                const threshold = Number(widget.data.threshold || 65);
                const level = Math.max(
                  0,
                  Math.min(
                    100,
                    34 + Math.sin(Date.now() / 420) * 23 + Math.random() * 24,
                  ),
                );
                changed = true;
                return {
                  ...widget,
                  data: {
                    ...widget.data,
                    level: Math.round(level),
                    violations:
                      Number(widget.data.level || 0) < threshold && level >= threshold
                        ? Number(widget.data.violations || 0) + 1
                        : widget.data.violations,
                  },
                };
              }
              return widget;
            }),
          ]),
        ) as Record<string, WidgetInstance[]>;
        return changed ? next : current;
      });
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [notify]);

  const moveScene = useCallback(
    (offset: number) => {
      const next = Math.min(
        scenes.length - 1,
        Math.max(0, activeSceneIndex + offset),
      );
      setActiveSceneId(scenes[next].id);
      setCurtain(0);
    },
    [activeSceneIndex, scenes],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      )
        return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        moveScene(1);
      }
	      if (event.key === "ArrowLeft" || event.key === "PageUp") {
	        event.preventDefault();
	        moveScene(-1);
	      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        setTextScale((current) => normalizeTextScale(current + 1));
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        setTextScale((current) => normalizeTextScale(current - 1));
      }
	      if (event.key.toLowerCase() === "p") setActiveTool("pen");
	      if (event.key.toLowerCase() === "v") setActiveTool("pointer");
      if (event.key === "Escape" && presentationMode) {
        setPresentationMode(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveScene, presentationMode]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setPresentationMode(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const updateActiveScene = (patch: Partial<Scene>) => {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === activeSceneId ? { ...scene, ...patch } : scene,
      ),
    );
  };

  const changeSceneType = (type: SceneType) => {
    const patch: Partial<Scene> = { type };
    if (type === "question" && !activeScene.question) {
      patch.question = {
        stem: "Enter your question here.",
        options: ["Option A", "Option B", "Option C", "Option D"],
        answer: 0,
        explanation: "Add a concise explanation for the correct answer.",
      };
      patch.body = [];
    }
    if (type === "vocabulary" && !activeScene.vocabulary?.length) {
      patch.vocabulary = [
        {
          term: "new term",
          meaning: "add the meaning",
          example: "Add an example sentence.",
        },
      ];
      patch.body = [];
    }
    if (
      (type === "lesson" || type === "activity" || type === "exit") &&
      !activeScene.body.length
    ) {
      patch.body = ["Add the first learning point", "Add a supporting example"];
    }
    if (type === "cover" && !activeScene.body.length) {
      patch.body = ["key idea", "topic", "class"];
    }
    updateActiveScene(patch);
  };

  const addScene = () => {
    const scene: Scene = {
      id: uid(),
      type: "lesson",
      title: "New teaching scene",
      kicker: `LESSON CONTENT · ${String(scenes.length + 1).padStart(2, "0")}`,
      body: ["Add the first learning point", "Add a supporting example"],
      accent: PALETTE[scenes.length % PALETTE.length],
      notes: "",
    };
    setScenes((current) => [...current, scene]);
    setActiveSceneId(scene.id);
    setInspectorTab("content");
    notify("Đã thêm Scene mới");
  };

  const duplicateScene = () => {
    const copy = {
      ...activeScene,
      id: uid(),
      title: `${activeScene.title} · copy`,
      question: activeScene.question
        ? { ...activeScene.question, options: [...activeScene.question.options] }
        : undefined,
      vocabulary: activeScene.vocabulary?.map((item) => ({ ...item })),
    };
    setScenes((current) => {
      const next = [...current];
      next.splice(activeSceneIndex + 1, 0, copy);
      return next;
    });
    setActiveSceneId(copy.id);
    notify("Đã nhân bản Scene");
  };

  const deleteScene = () => {
    if (scenes.length === 1) {
      notify("Bảng cần ít nhất một Scene");
      return;
    }
    const nextId =
      scenes[Math.max(0, activeSceneIndex - 1)]?.id ||
      scenes[Math.min(scenes.length - 1, activeSceneIndex + 1)]?.id;
    setScenes((current) => current.filter((scene) => scene.id !== activeSceneId));
    setActiveSceneId(nextId);
    notify("Đã xóa Scene");
  };

  const updateWidget = useCallback(
    (id: string, updater: (widget: WidgetInstance) => WidgetInstance) => {
      setWidgetsByScene((current) => {
        let changed = false;
        const next = Object.fromEntries(
          Object.entries(current).map(([sceneId, widgets]) => [
            sceneId,
            widgets.map((widget) => {
              if (widget.id !== id) return widget;
              changed = true;
              return updater(widget);
            }),
          ]),
        ) as Record<string, WidgetInstance[]>;
        return changed ? next : current;
      });
    },
    [],
  );

  const updateWidgetLayout = useCallback(
    (id: string, patch: Partial<WidgetInstance>) => {
      updateWidget(id, (widget) => ({ ...widget, ...patch }));
    },
    [updateWidget],
  );

  const updateWidgetData = useCallback(
    (id: string, updater: (data: WidgetData) => WidgetData) => {
      updateWidget(id, (widget) => ({
        ...widget,
        data: updater(widget.data),
      }));
    },
    [updateWidget],
  );

  const addWidget = (type: WidgetType, overrides: Partial<WidgetInstance> = {}) => {
    const widget = createWidget(type, {
      zIndex: 40 + activeWidgets.length,
      x: overrides.x ?? 8 + ((activeWidgets.length * 7) % 48),
      y: overrides.y ?? 9 + ((activeWidgets.length * 8) % 45),
      ...overrides,
    });
    setWidgetsByScene((current) => ({
      ...current,
      [activeScene.id]: [...(current[activeScene.id] || []), widget],
    }));
    setSelectedWidgetId(widget.id);
    setInspectorTab("widgets");
    notify(`Đã thêm ${widget.title}`);
  };

  const addImportedWidgets = (widgets: WidgetInstance[]) => {
    if (!widgets.length) return;
    const existing = widgetsByScene[activeScene.id] || [];
    const imported = widgets.map((widget, index) => ({
      ...widget,
      id: uid(),
      zIndex: 45 + existing.length + index,
      x: Math.min(86 - widget.width, widget.x + index * 3),
      y: Math.min(86 - widget.height, widget.y + index * 4),
    }));
    setWidgetsByScene((current) => ({
      ...current,
      [activeScene.id]: [...(current[activeScene.id] || []), ...imported],
    }));
    setSelectedWidgetId(imported[0].id);
    setInspectorTab("widgets");
  };

  const deleteWidget = useCallback((id: string) => {
    setWidgetsByScene((current) =>
      Object.fromEntries(
        Object.entries(current).map(([sceneId, widgets]) => [
          sceneId,
          widgets.filter((widget) => widget.id !== id),
        ]),
      ) as Record<string, WidgetInstance[]>,
    );
    if (selectedWidgetId === id) setSelectedWidgetId("");
    notify("Đã xóa widget");
  }, [notify, selectedWidgetId]);

  useEffect(() => {
    const onDeleteSelectedWidget = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      )
        return;

      if (!selectedWidgetId) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteWidget(selectedWidgetId);
        setInspectorTab("widgets");
      }
    };

    window.addEventListener("keydown", onDeleteSelectedWidget);
    return () => window.removeEventListener("keydown", onDeleteSelectedWidget);
  }, [deleteWidget, selectedWidgetId]);

  const duplicateWidget = (id: string) => {
    const sceneEntry = Object.entries(widgetsByScene).find(([, widgets]) =>
      widgets.some((widget) => widget.id === id),
    );
    const widget = sceneEntry?.[1].find((item) => item.id === id);
    if (!sceneEntry || !widget) return;
    const copy: WidgetInstance = {
      ...widget,
      id: uid(),
      title: `${widget.title} copy`,
      x: Math.min(88 - widget.width, widget.x + 3),
      y: Math.min(88 - widget.height, widget.y + 3),
      zIndex: widget.zIndex + 1,
      data: JSON.parse(JSON.stringify(widget.data)) as WidgetData,
    };
    setWidgetsByScene((current) => ({
      ...current,
      [sceneEntry[0]]: [...(current[sceneEntry[0]] || []), copy],
    }));
    setSelectedWidgetId(copy.id);
    notify("Đã nhân bản widget");
  };

  const toggleWidgetLock = (id: string) => {
    updateWidget(id, (widget) => ({ ...widget, locked: !widget.locked }));
  };

  const toggleWidgetPin = (id: string) => {
    updateWidget(id, (widget) => ({ ...widget, pinned: !widget.pinned }));
  };

  const handleWidgetCommand = useCallback(
    (widget: WidgetInstance, command: WidgetCommand, payload?: unknown) => {
      const shuffle = (items: string[]) =>
        [...items].sort(() => Math.random() - 0.5);

      if (command === "clock-toggle") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          mode: data.mode === "digital" ? "analog" : "digital",
        }));
      }

      if (command === "timer-toggle") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          remaining:
            Number(data.remaining || 0) > 0
              ? data.remaining
              : Number(data.duration || 60),
          running: !data.running,
        }));
      }

      if (command === "timer-reset") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          remaining: Number(data.duration || 60),
          running: false,
        }));
      }

      if (command === "timer-preset") {
        const seconds = Number(payload || 60);
        updateWidgetData(widget.id, (data) => ({
          ...data,
          duration: seconds,
          remaining: seconds,
          running: false,
        }));
      }

      if (command === "stopwatch-toggle") {
        updateWidgetData(widget.id, (data) => ({ ...data, running: !data.running }));
      }

      if (command === "stopwatch-reset") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          elapsed: 0,
          running: false,
          laps: [],
        }));
      }

      if (command === "stopwatch-lap") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          laps: [Number(data.elapsed || 0), ...((data.laps as number[]) || [])].slice(
            0,
            5,
          ),
        }));
      }

      if (command === "cycle-traffic") {
        const order = ["green", "yellow", "red"];
        updateWidgetData(widget.id, (data) => ({
          ...data,
          state: order[(order.indexOf(String(data.state || "green")) + 1) % order.length],
        }));
      }

      if (command === "set-traffic") {
        const nextState = String(payload || "green");
        if (!["green", "yellow", "red"].includes(nextState)) return;
        updateWidgetData(widget.id, (data) => ({
          ...data,
          state: nextState,
        }));
      }

      if (command === "cycle-work") {
        const order = ["solo", "pair", "team", "teacher"];
        updateWidgetData(widget.id, (data) => ({
          ...data,
          mode: order[(order.indexOf(String(data.mode || "solo")) + 1) % order.length],
        }));
      }

      if (command === "set-work") {
        const nextMode = String(payload || "solo");
        if (!["solo", "pair", "team", "teacher"].includes(nextMode)) return;
        updateWidgetData(widget.id, (data) => ({
          ...data,
          mode: nextMode,
        }));
      }

      if (command === "randomize") {
        const source = Array.isArray(widget.data.items) && widget.data.items.length
          ? (widget.data.items as string[])
          : classNames;
        const items = source.map(String).filter(Boolean);
        if (!items.length) {
          notify("Hãy nhập danh sách lớp trước");
          return;
        }
        updateWidgetData(widget.id, (data) => ({ ...data, spinning: true, items }));
        window.setTimeout(() => {
          updateWidgetData(widget.id, (data) => {
            const previous = String(data.result || "");
            const pool =
              items.length > 1 ? items.filter((item) => item !== previous) : items;
            const result = pool[Math.floor(Math.random() * pool.length)];
            return {
              ...data,
              result,
              spinning: false,
              history: [result, ...(((data.history as string[]) || []) as string[])].slice(
                0,
                6,
              ),
            };
          });
        }, 900);
      }

      if (command === "group-count") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          groupCount: Math.max(2, Math.min(8, Number(data.groupCount || 3) + Number(payload || 0))),
        }));
      }

      if (command === "make-groups") {
        if (!classNames.length) {
          notify("Hãy nhập danh sách lớp trước");
          return;
        }
        const groupCount = Math.max(2, Number(widget.data.groupCount || 3));
        const groups = Array.from({ length: groupCount }, (_, index) => ({
          name: `Nhóm ${index + 1}`,
          students: [] as string[],
        }));
        shuffle(classNames).forEach((name, index) => {
          groups[index % groupCount].students.push(name);
        });
        updateWidgetData(widget.id, (data) => ({ ...data, groups }));
      }

      if (command === "score" && payload && typeof payload === "object") {
        const { index, delta } = payload as { index: number; delta: number };
        updateWidgetData(widget.id, (data) => ({
          ...data,
          teams: ((data.teams as Array<{ name: string; score: number; color: string }>) || []).map(
            (team, teamIndex) =>
              teamIndex === index
                ? { ...team, score: Math.max(0, Number(team.score || 0) + delta) }
                : team,
          ),
        }));
      }

      if (command === "poll-vote") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          options: ((data.options as Array<{ label: string; count: number; color: string }>) || []).map(
            (option, index) =>
              index === Number(payload)
                ? { ...option, count: Number(option.count || 0) + 1 }
                : option,
          ),
        }));
      }

      if (command === "poll-clear") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          options: ((data.options as Array<{ label: string; count: number; color: string }>) || []).map(
            (option) => ({ ...option, count: 0 }),
          ),
        }));
      }

      if (command === "poll-reveal") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          reveal: !data.reveal,
        }));
      }

      if (command === "roll-dice") {
        updateWidgetData(widget.id, (data) => ({ ...data, rolling: true }));
        window.setTimeout(() => {
          updateWidgetData(widget.id, (data) => ({
            ...data,
            rolling: false,
            values: [
              Math.floor(Math.random() * 6) + 1,
              Math.floor(Math.random() * 6) + 1,
            ],
          }));
        }, 620);
      }

      if (command === "sound-toggle") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          listening: !data.listening,
          micError: false,
        }));
      }

      if (command === "sound-nudge") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          threshold: Math.max(20, Math.min(95, Number(data.threshold || 65) + Number(payload || 0))),
        }));
      }

      if (command === "timetable-next") {
        updateWidgetData(widget.id, (data) => ({
          ...data,
          active:
            (Number(data.active || 0) + 1) %
            Math.max(1, ((data.items as unknown[]) || []).length),
        }));
      }

      if (command === "copy-link") {
        const url = String(widget.data.url || "");
        navigator.clipboard?.writeText(url).catch(() => undefined);
        notify("Đã copy link");
      }
    },
	    [classNames, notify, updateWidgetData],
	  );

  const updateWidgetTitle = (id: string, title: string) => {
    updateWidget(id, (widget) => ({ ...widget, title }));
  };

  const resetWidgetData = (widget: WidgetInstance) => {
    const fresh = createWidget(widget.type);
    updateWidget(widget.id, (current) => ({
      ...current,
      data: fresh.data,
    }));
    notify("Đã đặt lại dữ liệu widget");
  };

  const moveWidgetLayer = (id: string, delta: number) => {
    updateWidget(id, (widget) => ({
      ...widget,
      zIndex: clampNumber(widget.zIndex + delta, 1, 999),
    }));
  };

  const renderWidgetQuickControls = (widget: WidgetInstance) => {
    const timerRunningValue = Boolean(widget.data.running);
    const teams = Array.isArray(widget.data.teams)
      ? (widget.data.teams as Array<{ name: string; score: number; color: string }>)
      : [];
    const pollOptions = Array.isArray(widget.data.options)
      ? (widget.data.options as Array<{ label: string; count: number; color: string }>)
      : [];
    const groupCount = Number(widget.data.groupCount || 3);
    const soundThreshold = Number(widget.data.threshold || 65);

    const quickContent = (() => {
      switch (widget.type) {
        case "clock":
          return (
            <button type="button" onClick={() => handleWidgetCommand(widget, "clock-toggle")}>
              {widget.data.mode === "digital" ? "Analog" : "Digital"}
            </button>
          );
        case "visualTimer":
          return (
            <>
              {[60, 180, 300, 600].map((seconds) => (
                <button
                  type="button"
                  key={seconds}
                  onClick={() => handleWidgetCommand(widget, "timer-preset", seconds)}
                >
                  {seconds / 60}m
                </button>
              ))}
              <button type="button" onClick={() => handleWidgetCommand(widget, "timer-toggle")}>
                {timerRunningValue ? tx("pause") : tx("start")}
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "timer-reset")}>
                Reset
              </button>
            </>
          );
        case "stopwatch":
          return (
            <>
              <button type="button" onClick={() => handleWidgetCommand(widget, "stopwatch-toggle")}>
                {timerRunningValue ? tx("pause") : tx("start")}
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "stopwatch-lap")}>
                Lap
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "stopwatch-reset")}>
                Reset
              </button>
            </>
          );
        case "trafficLight":
          return (
            <>
              {(["green", "yellow", "red"] as const).map((state) => (
                <button
                  type="button"
                  key={state}
                  className={`traffic-choice state-${state} ${
                    widget.data.state === state ? "is-active" : ""
                  }`}
                  onClick={() => handleWidgetCommand(widget, "set-traffic", state)}
                >
                  {state === "green" ? "Go" : state === "yellow" ? "Focus" : "Stop"}
                </button>
              ))}
            </>
          );
        case "workSymbol":
          return (
            <>
              {[
                ["solo", "Solo"],
                ["pair", "Pairs"],
                ["team", "Groups"],
                ["teacher", "Teacher"],
              ].map(([mode, label]) => (
                <button
                  type="button"
                  key={mode}
                  className={widget.data.mode === mode ? "is-active" : ""}
                  onClick={() => handleWidgetCommand(widget, "set-work", mode)}
                >
                  {label}
                </button>
              ))}
            </>
          );
        case "randomizer":
          return (
            <>
              <button type="button" onClick={() => handleWidgetCommand(widget, "randomize")}>
                Quay chọn
              </button>
              <span className="quick-mini-result">{String(widget.data.result || "Chưa có kết quả")}</span>
            </>
          );
        case "groupMaker":
          return (
            <>
              <button type="button" onClick={() => handleWidgetCommand(widget, "group-count", -1)}>
                −
              </button>
              <span className="quick-mini-result">{groupCount} nhóm</span>
              <button type="button" onClick={() => handleWidgetCommand(widget, "group-count", 1)}>
                +
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "make-groups")}>
                Chia lại
              </button>
            </>
          );
        case "scoreboard":
          return teams.length ? (
            <>
              {teams.map((team, index) => (
                <span
                  className="quick-score-team"
                  key={`${team.name}-${index}`}
                  style={{ "--team-color": team.color } as React.CSSProperties}
                >
                  <small>{team.name}</small>
                  <button
                    type="button"
                    onClick={() => handleWidgetCommand(widget, "score", { index, delta: -1 })}
                  >
                    −
                  </button>
                  <strong>{Number(team.score || 0)}</strong>
                  <button
                    type="button"
                    onClick={() => handleWidgetCommand(widget, "score", { index, delta: 1 })}
                  >
                    +1
                  </button>
                </span>
              ))}
            </>
          ) : null;
        case "poll":
          return (
            <>
              <button type="button" onClick={() => handleWidgetCommand(widget, "poll-reveal")}>
                {widget.data.reveal ? "Ẩn kết quả" : "Mở kết quả"}
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "poll-clear")}>
                Xóa lượt
              </button>
              {pollOptions.slice(0, 4).map((option, index) => (
                <button
                  type="button"
                  key={`${option.label}-${index}`}
                  onClick={() => handleWidgetCommand(widget, "poll-vote", index)}
                >
                  + {option.label}
                </button>
              ))}
            </>
          );
        case "dice":
          return (
            <button type="button" onClick={() => handleWidgetCommand(widget, "roll-dice")}>
              Roll dice
            </button>
          );
        case "soundLevel":
          return (
            <>
              <button type="button" onClick={() => handleWidgetCommand(widget, "sound-toggle")}>
                {widget.data.listening ? "Dừng nghe" : "Lắng nghe"}
              </button>
              <button type="button" onClick={() => handleWidgetCommand(widget, "sound-nudge", -5)}>
                − ngưỡng
              </button>
              <span className="quick-mini-result">{soundThreshold}%</span>
              <button type="button" onClick={() => handleWidgetCommand(widget, "sound-nudge", 5)}>
                + ngưỡng
              </button>
            </>
          );
        case "timetable":
          return (
            <button type="button" onClick={() => handleWidgetCommand(widget, "timetable-next")}>
              Hoạt động tiếp
            </button>
          );
        case "qrLink":
          return (
            <button type="button" onClick={() => handleWidgetCommand(widget, "copy-link")}>
              Copy link
            </button>
          );
        case "countdown":
          return <span className="quick-mini-result">Tự cập nhật theo thời gian thực</span>;
        default:
          return null;
      }
    })();

    return (
      <div className="widget-quick-controls">
        <span>{tx("widgetQuickActions").toUpperCase()}</span>
        <div>{quickContent}</div>
      </div>
    );
  };

	  const enterPresentation = async () => {
    setPresentationMode(true);
    setLeftOpen(false);
    setRightOpen(false);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Presentation layout still works if full screen permission is unavailable.
    }
  };

  const exitPresentation = async () => {
    setPresentationMode(false);
    setLeftOpen(true);
    setRightOpen(true);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Browser may already be leaving full screen.
      }
    }
  };

  const fileToText = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify("Tệp vượt quá giới hạn 5 MB");
      event.target.value = "";
      return;
    }
    setImportFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ""));
    };
    reader.onerror = () => notify("Không thể đọc tệp này");
    reader.readAsText(file);
    event.target.value = "";
  };

  const applyImport = () => {
    if (importResult.kind === "unknown") {
      notify("Chưa có dữ liệu hợp lệ để nhập");
      return;
    }
    if (importResult.kind === "class") {
      setClassNames(importResult.names);
      setInspectorTab("class");
      notify(`Đã cập nhật ${importResult.names.length} học sinh`);
    } else if (importResult.kind === "widgets") {
      addImportedWidgets(importResult.widgets || []);
      notify(`Đã thêm ${(importResult.widgets || []).length} widget tương tác`);
    } else {
      setScenes((current) => [...current, ...importResult.scenes]);
      if (importResult.scenes[0]) setActiveSceneId(importResult.scenes[0].id);
      notify(`Đã thêm ${importResult.scenes.length} Scene vào bảng`);
    }
    setIsImportOpen(false);
    setImportText("");
    setImportFilename("");
    setImportMode("auto");
  };

  const loadTemplate = (mode: ImportMode) => {
    setImportMode(mode);
    setImportFilename("");
    setImportText(
      mode === "questions"
        ? QUESTION_TEMPLATE
        : mode === "vocabulary"
          ? VOCAB_TEMPLATE
          : mode === "slides"
            ? SLIDE_TEMPLATE
            : mode === "widgets"
              ? WIDGET_TEMPLATE
              : CLASS_TEMPLATE,
    );
  };

  const exportBoard = () => {
    const payload = {
      format: "brian-classroom-stage",
      version: 1,
      exportedAt: new Date().toISOString(),
      scenes,
      names: classNames,
      widgetsByScene,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "brian-classroom-stage.json";
    link.click();
    URL.revokeObjectURL(url);
    notify("Đã xuất gói bài dạy");
  };

  const pointerToViewBox = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 1000,
      y: ((event.clientY - rect.top) / rect.height) * 562.5,
    };
  };

  const startStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (
      activeTool !== "pen" &&
      activeTool !== "highlighter" &&
      activeTool !== "eraser"
    )
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (activeTool === "eraser") {
      currentStrokeRef.current = "__eraser__";
      eraseAtPoint(pointerToViewBox(event));
      return;
    }
    const stroke: Stroke = {
      id: uid(),
      tool: activeTool,
      color: activeTool === "highlighter" ? highlighterColor : penColor,
      width: activeTool === "highlighter" ? highlighterWidth : penWidth,
      opacity: activeTool === "highlighter" ? 0.44 : 1,
      points: [pointerToViewBox(event)],
    };
    currentStrokeRef.current = stroke.id;
    setStrokesByScene((current) => ({
      ...current,
      [activeScene.id]: [...(current[activeScene.id] || []), stroke],
    }));
  };

  const continueStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!currentStrokeRef.current) return;
    const point = pointerToViewBox(event);
    if (currentStrokeRef.current === "__eraser__") {
      eraseAtPoint(point);
      return;
    }
    setStrokesByScene((current) => ({
      ...current,
      [activeScene.id]: (current[activeScene.id] || []).map((stroke) =>
        stroke.id === currentStrokeRef.current
          ? { ...stroke, points: [...stroke.points, point] }
          : stroke,
      ),
    }));
  };

  const endStroke = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    currentStrokeRef.current = null;
  };

  const undoStroke = () => {
    setStrokesByScene((current) => ({
      ...current,
      [activeScene.id]: (current[activeScene.id] || []).slice(0, -1),
    }));
  };

  const eraseAtPoint = (point: Point) => {
    setStrokesByScene((current) => ({
      ...current,
      [activeScene.id]: (current[activeScene.id] || []).filter(
        (stroke) => !isStrokeNearPoint(stroke, point, eraserSize),
      ),
    }));
  };

  const clearSceneInk = () => {
    setStrokesByScene((current) => ({
      ...current,
      [activeScene.id]: [],
    }));
    notify("Đã xoá toàn bộ nét vẽ trên Scene này");
  };

  const toggleProgressive = () => {
    setProgressive((current) => !current);
    setRevealedByScene((current) => ({
      ...current,
      [activeScene.id]: 0,
    }));
  };

  const revealNext = () => {
    setRevealedByScene((current) => ({
      ...current,
      [activeScene.id]: Math.min(
        activeScene.body.length,
        (current[activeScene.id] || 0) + 1,
      ),
    }));
  };

  const pickStudent = () => {
    if (!classNames.length) {
      notify("Hãy nhập danh sách lớp trước");
      return;
    }
    let next = classNames[Math.floor(Math.random() * classNames.length)];
    if (classNames.length > 1 && next === selectedStudent) {
      next = classNames[(classNames.indexOf(next) + 1) % classNames.length];
    }
    setSelectedStudent("");
    window.setTimeout(() => setSelectedStudent(next), 120);
  };

  const flippedTerms = new Set(flippedByScene[activeScene?.id] || []);

  if (!activeScene) return null;

  return (
	    <main
      className={`classroom-app google-material lang-${languageMode} font-scale-${textScale} ${
        presentationMode ? "present-mode" : ""
      } ${
        leftOpen ? "left-open" : "left-closed"
      } ${rightOpen ? "right-open" : "right-closed"}`}
    >
      <header className="app-header">
        <button
          type="button"
          className="brand-mark"
          aria-label="Brian home"
          onClick={() => notify("Brian English Studio")}
        >
          B.
        </button>
        <div className="brand-copy">
          <strong>Brian Classroom Stage</strong>
          <span>{tx("localWorkspace")}</span>
        </div>
        <div className="header-status">
          <span className="status-dot" />
          {tx("noAi")}
        </div>
        <div className="header-actions">
	          <button
	            type="button"
	            className="language-toggle"
	            onClick={cycleLanguage}
	            aria-label="Change language mode"
            title="VI / EN / VI+EN"
          >
	            <span>{languageMode === "both" ? "VI+EN" : languageMode.toUpperCase()}</span>
	            <small>{languageMode === "both" ? "Bilingual" : "Language"}</small>
	          </button>
          <div className="font-size-control" aria-label={tx("fontSize")} title={tx("fontSize")}>
            <button
              type="button"
              onClick={() => changeTextScale(-1)}
              disabled={textScale === 0}
              aria-label={tx("smallerText")}
            >
              A−
            </button>
            <span>
              <strong>{TEXT_SCALE_LABELS[textScale]}</strong>
              <small>{textScaleName}</small>
            </span>
            <button
              type="button"
              onClick={() => changeTextScale(1)}
              disabled={textScale === 4}
              aria-label={tx("largerText")}
            >
              A+
            </button>
          </div>
          <button
            type="button"
            className={`icon-button panel-toggle ${leftOpen ? "is-active" : ""}`}
            onClick={() => setLeftOpen((current) => !current)}
            aria-label={tx("leftPanel")}
            title={tx("leftPanel")}
          >
            <Icon name="grid" />
          </button>
          <button
            type="button"
            className="quiet-button"
            onClick={() => setIsImportOpen(true)}
          >
            <Icon name="data" />
            {tx("dataStudio")}
          </button>
          <button type="button" className="icon-button" onClick={exportBoard} title={tx("export")}>
            <Icon name="download" />
          </button>
          <button type="button" className="quiet-button" onClick={() => saveBoard()}>
            <Icon name="save" />
            {tx("save")}
          </button>
          <button
            type="button"
            className="present-button"
            onClick={enterPresentation}
          >
            <Icon name="play" />
            {tx("present")}
          </button>
          <button
            type="button"
            className={`icon-button panel-toggle ${rightOpen ? "is-active" : ""}`}
            onClick={() => setRightOpen((current) => !current)}
            aria-label={tx("rightPanel")}
            title={tx("rightPanel")}
          >
            <Icon name="grid" />
          </button>
        </div>
      </header>

      <aside className="scene-rail">
        <div className="rail-heading">
          <div>
            <span>{tx("lessonFlow").toUpperCase()}</span>
            <strong>{scenes.length} Scenes</strong>
          </div>
          <button type="button" className="small-add" onClick={addScene}>
            <Icon name="plus" size={18} />
          </button>
        </div>
        <div className="scene-list">
          {scenes.map((scene, index) => (
            <button
              type="button"
              key={scene.id}
              className={`scene-thumb ${
                scene.id === activeSceneId ? "is-active" : ""
              }`}
              onClick={() => {
                setActiveSceneId(scene.id);
                setCurtain(0);
              }}
            >
              <span
                className="thumb-preview"
                style={{ "--thumb-accent": scene.accent } as React.CSSProperties}
              >
                <span className="thumb-kicker">
                  {scene.type === "question" ? "Q" : String(index + 1)}
                </span>
                <strong>{scene.title}</strong>
                <small>{getScenePreview(scene)}</small>
              </span>
              <span className="thumb-meta">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {sceneLabel(scene.type)}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="rail-new-scene" onClick={addScene}>
          <Icon name="plus" size={18} />
          {tx("addScene")}
        </button>
      </aside>

      <section className="stage-workspace">
        <div className="workspace-topline">
          <div className="scene-breadcrumb">
            <span>{sceneLabel(activeScene.type)}</span>
            <strong>{activeScene.title}</strong>
          </div>
          <div className="workspace-controls">
            <span>
              {activeSceneIndex + 1} / {scenes.length}
            </span>
            <button
              type="button"
              className="icon-button compact"
              onClick={() => moveScene(-1)}
              disabled={activeSceneIndex === 0}
              aria-label={tx("previousScene")}
            >
              <Icon name="chevronLeft" size={17} />
            </button>
            <button
              type="button"
              className="icon-button compact"
              onClick={() => moveScene(1)}
              disabled={activeSceneIndex === scenes.length - 1}
              aria-label={tx("nextScene")}
            >
              <Icon name="chevronRight" size={17} />
            </button>
          </div>
        </div>

        <div className="canvas-shell">
          <SceneCanvas
            key={activeScene.id}
            scene={activeScene}
            selectedAnswer={answers[activeScene.id]}
            onSelectAnswer={(index) =>
              setAnswers((current) => ({ ...current, [activeScene.id]: index }))
            }
            showAnswer={Boolean(answerVisibility[activeScene.id])}
            onToggleAnswer={() =>
              setAnswerVisibility((current) => ({
                ...current,
                [activeScene.id]: !current[activeScene.id],
              }))
            }
            activeTool={activeTool}
            penColor={penColor}
            highlighterColor={highlighterColor}
            eraserSize={eraserSize}
            spotlightSize={spotlightSize}
            strokes={activeStrokes}
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            spotlight={spotlight}
            setSpotlight={setSpotlight}
            curtain={curtain}
            progressive={progressive}
            revealedCount={revealedByScene[activeScene.id] || 0}
            flippedTerms={flippedTerms}
            onFlipTerm={(index) =>
              setFlippedByScene((current) => {
                const values = new Set(current[activeScene.id] || []);
                if (values.has(index)) values.delete(index);
                else values.add(index);
                return { ...current, [activeScene.id]: [...values] };
              })
            }
            widgets={activeWidgets}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
            onWidgetLayoutChange={updateWidgetLayout}
            onWidgetDataChange={updateWidgetData}
            onWidgetCommand={handleWidgetCommand}
            onWidgetDelete={deleteWidget}
            onWidgetDuplicate={duplicateWidget}
            onWidgetToggleLock={toggleWidgetLock}
            onWidgetTogglePin={toggleWidgetPin}
            classNames={classNames}
            now={now}
          />
        </div>

        <div className="teaching-dock">
          <div className="dock-group">
            {(
              [
                ["pointer", "pointer", "Chọn"],
                ["pen", "pen", "Bút"],
                ["highlighter", "highlighter", "Tô sáng"],
                ["eraser", "eraser", "Tẩy"],
                ["spotlight", "spotlight", "Spotlight"],
              ] as const
            ).map(([tool, icon]) => (
              <button
                type="button"
                key={tool}
                className={`dock-tool ${activeTool === tool ? "is-active" : ""}`}
                onClick={() => setActiveTool(tool)}
                title={
                  tool === "pointer"
                    ? tx("select")
                    : tool === "pen"
                      ? tx("pen")
                      : tool === "highlighter"
                        ? tx("highlight")
                        : tool === "eraser"
                          ? tx("eraser")
                          : "Spotlight"
                }
              >
                <Icon name={icon} />
                <span>
                  {tool === "pointer"
                    ? tx("select")
                    : tool === "pen"
                      ? tx("pen")
                      : tool === "highlighter"
                        ? tx("highlight")
                        : tool === "eraser"
                          ? tx("eraser")
                          : "Spotlight"}
                </span>
              </button>
            ))}
            <button
              type="button"
              className="dock-tool"
              onClick={undoStroke}
              disabled={!activeStrokes.length}
              title={tx("undo")}
            >
              <Icon name="undo" />
              <span>{tx("undo")}</span>
            </button>
          </div>
          {(activeTool === "pen" || activeTool === "highlighter") && (
            <div className="ink-control-panel">
              <span>{activeTool === "pen" ? tx("penColor") : tx("highlightColor")}</span>
              <div className="swatch-row">
                {(activeTool === "pen" ? PEN_COLORS : HIGHLIGHT_COLORS).map(
                  (color) => {
                    const selected =
                      activeTool === "pen"
                        ? penColor === color
                        : highlighterColor === color;
                    return (
                      <button
                        type="button"
                        key={color}
                        className={selected ? "is-active" : ""}
                        style={{ "--swatch": color } as React.CSSProperties}
                        aria-label={`Chọn màu ${color}`}
                        onClick={() =>
                          activeTool === "pen"
                            ? setPenColor(color)
                            : setHighlighterColor(color)
                        }
                      />
                    );
                  },
                )}
              </div>
              <label>
                <span>{tx("thickness")}</span>
                <input
                  type="range"
                  min={activeTool === "pen" ? 3 : 14}
                  max={activeTool === "pen" ? 18 : 44}
                  value={activeTool === "pen" ? penWidth : highlighterWidth}
                  onChange={(event) =>
                    activeTool === "pen"
                      ? setPenWidth(Number(event.target.value))
                      : setHighlighterWidth(Number(event.target.value))
                  }
                />
              </label>
            </div>
          )}
          {activeTool === "eraser" && (
            <div className="ink-control-panel eraser-panel">
              <span>{tx("eraseStroke")}</span>
              <label>
                <span>{tx("eraserSize")}</span>
                <input
                  type="range"
                  min="18"
                  max="76"
                  value={eraserSize}
                  onChange={(event) => setEraserSize(Number(event.target.value))}
                />
              </label>
              <button
                type="button"
                className="clear-ink-button"
                onClick={clearSceneInk}
                disabled={!activeStrokes.length}
              >
                {tx("clearAll")}
              </button>
            </div>
          )}
          {activeTool === "spotlight" && (
            <div className="ink-control-panel spotlight-panel">
              <span>Spotlight</span>
              <label>
                <span>{tx("beamSize")}</span>
                <input
                  type="range"
                  min="12"
                  max="34"
                  value={spotlightSize}
                  onChange={(event) =>
                    setSpotlightSize(Number(event.target.value))
                  }
                />
              </label>
            </div>
          )}
          <div className="dock-divider" />
          <div className="dock-group">
            <button
              type="button"
              className={`dock-tool ${progressive ? "is-active" : ""}`}
              onClick={toggleProgressive}
            >
              <Icon name="eye" />
              <span>{tx("progressive")}</span>
            </button>
            {progressive && (
              <button type="button" className="dock-tool is-accent" onClick={revealNext}>
                <Icon name="chevronRight" />
                <span>{tx("revealNext")}</span>
              </button>
            )}
            <button
              type="button"
              className={`dock-tool ${curtain > 0 ? "is-active" : ""}`}
              onClick={() => setCurtain((current) => (current > 0 ? 0 : 55))}
            >
              <Icon name="curtain" />
              <span>{tx("curtain")}</span>
            </button>
            <button
              type="button"
              className={`dock-tool ${inspectorTab === "widgets" ? "is-active" : ""}`}
              onClick={() => {
                setInspectorTab("widgets");
                setRightOpen(true);
              }}
            >
              <Icon name="grid" />
              <span>{tx("widget")}</span>
            </button>
          </div>
          <div className="dock-spacer" />
          <div className={`dock-timer ${timerRunning ? "is-running" : ""}`}>
            <Icon name="timer" />
            <strong>{formatTime(timerSeconds)}</strong>
          </div>
          <button
            type="button"
            className="dock-next"
            onClick={() => moveScene(1)}
            disabled={activeSceneIndex === scenes.length - 1}
          >
            {tx("nextScene")}
            <Icon name="chevronRight" />
          </button>
        </div>

        {curtain > 0 && (
          <div className="curtain-control">
            <span>{tx("curtain")}</span>
            <input
              aria-label={tx("curtain")}
              type="range"
              min="0"
              max="100"
              value={curtain}
              onChange={(event) => setCurtain(Number(event.target.value))}
            />
            <button type="button" onClick={() => setCurtain(0)}>
              {tx("openAll")}
            </button>
          </div>
        )}
      </section>

      <aside className="inspector">
        <div className="inspector-tabs">
          {(
            [
              ["content", tx("content")],
              ["tools", tx("tools")],
              ["widgets", tx("widget")],
              ["class", tx("class")],
            ] as const
          ).map(([tab, label]) => (
            <button
              type="button"
              key={tab}
              className={inspectorTab === tab ? "is-active" : ""}
              onClick={() => setInspectorTab(tab)}
            >
              {label}
            </button>
          ))}
        </div>

        {inspectorTab === "content" && (
          <div className="inspector-body">
            <div className="inspector-heading">
              <div>
                <span>{tx("sceneEditor").toUpperCase()}</span>
                <h2>{tx("editContent")}</h2>
              </div>
              <span className="scene-number">
                {String(activeSceneIndex + 1).padStart(2, "0")}
              </span>
            </div>
            <label className="field-label">
              {tx("sceneType")}
              <select
                value={activeScene.type}
                onChange={(event) => changeSceneType(event.target.value as SceneType)}
              >
                {Object.keys(sceneTypeNames).map((value) => (
                  <option key={value} value={value}>
                    {sceneLabel(value as SceneType)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              {tx("title")}
              <input
                value={activeScene.title}
                onChange={(event) =>
                  updateActiveScene({ title: event.target.value })
                }
              />
            </label>
            <label className="field-label">
              {tx("kicker")}
              <input
                value={activeScene.kicker || ""}
                onChange={(event) =>
                  updateActiveScene({ kicker: event.target.value })
                }
              />
            </label>
            {(activeScene.type === "lesson" ||
              activeScene.type === "activity" ||
              activeScene.type === "exit" ||
              activeScene.type === "cover") && (
              <label className="field-label">
                {tx("bodyLines")}
                <textarea
                  rows={6}
                  value={activeScene.body.join("\n")}
                  onChange={(event) =>
                    updateActiveScene({
                      body: event.target.value.split("\n"),
                    })
                  }
                />
              </label>
            )}
            {activeScene.type === "question" && activeScene.question && (
              <>
                <label className="field-label">
                  {tx("question")}
                  <textarea
                    rows={4}
                    value={activeScene.question.stem}
                    onChange={(event) =>
                      updateActiveScene({
                        question: {
                          ...activeScene.question!,
                          stem: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  {tx("options")}
                  <textarea
                    rows={5}
                    value={activeScene.question.options.join("\n")}
                    onChange={(event) =>
                      updateActiveScene({
                        question: {
                          ...activeScene.question!,
                          options: event.target.value.split("\n"),
                        },
                      })
                    }
                  />
                </label>
                <label className="field-label">
                  {tx("answer")}
                  <select
                    value={activeScene.question.answer}
                    onChange={(event) =>
                      updateActiveScene({
                        question: {
                          ...activeScene.question!,
                          answer: Number(event.target.value),
                        },
                      })
                    }
                  >
                    {activeScene.question.options.map((_, index) => (
                      <option value={index} key={index}>
                        {String.fromCharCode(65 + index)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  {tx("explanation")}
                  <textarea
                    rows={4}
                    value={activeScene.question.explanation || ""}
                    onChange={(event) =>
                      updateActiveScene({
                        question: {
                          ...activeScene.question!,
                          explanation: event.target.value,
                        },
                      })
                    }
                  />
                </label>
              </>
            )}
            {activeScene.type === "vocabulary" && (
              <label className="field-label">
                {tx("vocabulary")}
                <textarea
                  rows={9}
                  value={(activeScene.vocabulary || [])
                    .map(
                      (item) =>
                        `${item.term} | ${item.meaning} | ${item.example || ""}`,
                    )
                    .join("\n")}
                  onChange={(event) =>
                    updateActiveScene({
                      vocabulary: event.target.value
                        .split("\n")
                        .map((line) => line.split("|").map((cell) => cell.trim()))
                        .filter((cells) => cells[0])
                        .map(([term, meaning = "", example = ""]) => ({
                          term,
                          meaning,
                          example,
                        })),
                    })
                  }
                />
              </label>
            )}
            <label className="field-label">
              {tx("teacherNotes")}
              <textarea
                rows={4}
                value={activeScene.notes || ""}
                onChange={(event) =>
                  updateActiveScene({ notes: event.target.value })
                }
                placeholder={tx("notesPlaceholder")}
              />
            </label>
            <div className="accent-picker">
              <span>{tx("sceneColor")}</span>
              <div>
                {PALETTE.map((color) => (
                  <button
                    type="button"
                    aria-label={`Chọn màu ${color}`}
                    key={color}
                    className={activeScene.accent === color ? "is-active" : ""}
                    style={{ backgroundColor: color }}
                    onClick={() => updateActiveScene({ accent: color })}
                  />
                ))}
              </div>
            </div>
            <div className="scene-actions">
              <button type="button" onClick={duplicateScene}>
                <Icon name="duplicate" size={18} />
                {tx("duplicate")}
              </button>
              <button type="button" className="danger" onClick={deleteScene}>
                <Icon name="trash" size={18} />
                {tx("delete")}
              </button>
            </div>
          </div>
        )}

        {inspectorTab === "tools" && (
          <div className="inspector-body">
            <div className="inspector-heading">
              <div>
                <span>{tx("teachingTools").toUpperCase()}</span>
                <h2>{tx("lessonControls")}</h2>
              </div>
            </div>
            <section className="tool-card timer-card">
              <div className="tool-card-heading">
                <Icon name="timer" />
                <div>
                  <strong>{tx("timer")}</strong>
                  <span>{tx("dockTimerHint")}</span>
                </div>
              </div>
              <div className="large-timer">{formatTime(timerSeconds)}</div>
              <div className="preset-row">
                {[30, 60, 120, 300].map((seconds) => (
                  <button
                    type="button"
                    key={seconds}
                    onClick={() => {
                      setTimerSeconds(seconds);
                      setTimerRunning(false);
                    }}
                  >
                    {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="tool-primary"
                onClick={() => {
                  if (timerSeconds === 0) setTimerSeconds(60);
                  setTimerRunning((current) => !current);
                }}
              >
                {timerRunning ? tx("pause") : tx("start")}
              </button>
            </section>
            <section className="tool-card">
              <div className="tool-card-heading">
                <Icon name="curtain" />
                <div>
                  <strong>{tx("contentCurtain")}</strong>
                  <span>{tx("curtainHint")}</span>
                </div>
              </div>
              <input
                aria-label="Mức che nội dung"
                className="wide-range"
                type="range"
                min="0"
                max="100"
                value={curtain}
                onChange={(event) => setCurtain(Number(event.target.value))}
              />
              <div className="range-labels">
                <span>{tx("openAll")}</span>
                <strong>{curtain}%</strong>
                <span>{tx("coverAll")}</span>
              </div>
            </section>
            <section className="notes-card">
              <span>PRESENTER NOTES</span>
              <p>
                {activeScene.notes ||
                  tx("noNotes")}
              </p>
            </section>
            <section className="shortcut-card">
              <strong>{tx("shortcuts")}</strong>
              <div>
                <span>{tx("previousNext")}</span>
                <kbd>←</kbd>
                <kbd>→</kbd>
              </div>
	              <div>
	                <span>{tx("penPointer")}</span>
	                <kbd>P</kbd>
	                <kbd>V</kbd>
	              </div>
              <div>
                <span>{tx("textSizeShortcut")}</span>
                <kbd>⌘/Ctrl</kbd>
                <kbd>＋/−</kbd>
              </div>
              <div>
                <span>{tx("deleteWidgetShortcut")}</span>
                <kbd>Delete</kbd>
                <kbd>⌫</kbd>
              </div>
	            </section>
          </div>
        )}

        {inspectorTab === "widgets" && (
          <div className="inspector-body">
            <div className="inspector-heading">
              <div>
                <span>{tx("liveWidgetLayer").toUpperCase()}</span>
                <h2>{tx("interactiveGraphics")}</h2>
              </div>
              <span className="scene-number">{activeWidgets.length}</span>
            </div>
            <section className="widget-selected-card">
              <span>{tx("selectedWidget").toUpperCase()}</span>
	              {selectedWidget ? (
	                <>
                  <label className="selected-widget-title">
                    <span>{tx("widgetName")}</span>
                    <input
                      value={selectedWidget.title}
                      onChange={(event) =>
                        updateWidgetTitle(selectedWidget.id, event.target.value)
                      }
                    />
                  </label>
	                  <p>
	                    {selectedWidget.pinned ? tx("pinnedAcross") : ""}
	                    {selectedWidget.locked
	                      ? tx("lockedPosition")
	                      : tx("dragResize")}
	                  </p>
                  {renderWidgetQuickControls(selectedWidget)}
                  <div className="selected-widget-layout">
                    <span>{tx("widgetLayout").toUpperCase()}</span>
                    <div className="widget-layout-grid">
                      <label>
                        <small>X</small>
                        <input
                          type="number"
                          min="0"
                          max="95"
                          value={Math.round(selectedWidget.x)}
                          onChange={(event) =>
                            updateWidgetLayout(selectedWidget.id, {
                              x: clampNumber(Number(event.target.value), 0, 95),
                            })
                          }
                        />
                      </label>
                      <label>
                        <small>Y</small>
                        <input
                          type="number"
                          min="0"
                          max="95"
                          value={Math.round(selectedWidget.y)}
                          onChange={(event) =>
                            updateWidgetLayout(selectedWidget.id, {
                              y: clampNumber(Number(event.target.value), 0, 95),
                            })
                          }
                        />
                      </label>
                      <label>
                        <small>W</small>
                        <input
                          type="number"
                          min="10"
                          max="70"
                          value={Math.round(selectedWidget.width)}
                          onChange={(event) =>
                            updateWidgetLayout(selectedWidget.id, {
                              width: clampNumber(Number(event.target.value), 10, 70),
                            })
                          }
                        />
                      </label>
                      <label>
                        <small>H</small>
                        <input
                          type="number"
                          min="10"
                          max="70"
                          value={Math.round(selectedWidget.height)}
                          onChange={(event) =>
                            updateWidgetLayout(selectedWidget.id, {
                              height: clampNumber(Number(event.target.value), 10, 70),
                            })
                          }
                        />
                      </label>
                    </div>
                    <label className="layout-slider">
                      <span>{tx("rotate")}</span>
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        value={selectedWidget.rotation || 0}
                        onChange={(event) =>
                          updateWidgetLayout(selectedWidget.id, {
                            rotation: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <div className="layer-actions">
                      <button type="button" onClick={() => moveWidgetLayer(selectedWidget.id, -5)}>
                        {tx("back")}
                      </button>
                      <strong>{tx("layer")} {selectedWidget.zIndex}</strong>
                      <button type="button" onClick={() => moveWidgetLayer(selectedWidget.id, 5)}>
                        {tx("front")}
                      </button>
                    </div>
                  </div>
	                  <div className="selected-widget-actions">
	                    <button type="button" onClick={() => toggleWidgetPin(selectedWidget.id)}>
	                      {selectedWidget.pinned ? tx("unpin") : tx("pin")}
                    </button>
                    <button type="button" onClick={() => toggleWidgetLock(selectedWidget.id)}>
                      {selectedWidget.locked ? tx("unlock") : tx("lock")}
                    </button>
	                    <button type="button" onClick={() => duplicateWidget(selectedWidget.id)}>
	                      {tx("duplicate")}
	                    </button>
                    <button type="button" onClick={() => resetWidgetData(selectedWidget)}>
                      {tx("resetWidget")}
                    </button>
	                    <button
	                      type="button"
	                      className="danger"
                      onClick={() => deleteWidget(selectedWidget.id)}
                    >
                      {tx("delete")}
                    </button>
                  </div>
                </>
              ) : (
                <p>
                  {tx("widgetEmpty")}
                </p>
              )}
            </section>

            <section className="widget-library">
              <div className="widget-library-heading">
                <strong>{tx("widgetLibrary")}</strong>
                <span>{WIDGET_CATALOG.length} widget</span>
              </div>
              <div className="widget-library-grid">
                {WIDGET_CATALOG.map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => addWidget(item.type)}
                  >
                    <span>{item.emoji}</span>
                    <strong>{widgetLabel(item.type)}</strong>
                    <small>{widgetDescription(item.type)}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="widget-quality-card">
              <strong>{tx("graphicStandard")}</strong>
              <p>{tx("graphicStandardText")}</p>
            </section>
          </div>
        )}

        {inspectorTab === "class" && (
          <div className="inspector-body">
            <div className="inspector-heading">
              <div>
                <span>CLASSROOM</span>
                <h2>{tx("liveClass")}</h2>
              </div>
              <span className="student-count">{classNames.length}</span>
            </div>
            <section className="picker-card">
              <span className="picker-label">{tx("randomPicker").toUpperCase()}</span>
              <div className={`picked-student ${selectedStudent ? "has-name" : ""}`}>
                {selectedStudent || tx("readyPick")}
              </div>
              <button type="button" onClick={pickStudent}>
                <Icon name="shuffle" />
                {tx("pickStudent")}
              </button>
            </section>
            <section className="team-card">
              <div className="team-row avocado-team">
                <div>
                  <span>TEAM 01</span>
                  <strong>Avocado</strong>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTeams((current) => ({
                      ...current,
                      Avocado: current.Avocado + 1,
                    }))
                  }
                >
                  {teams.Avocado}
                  <small>+1</small>
                </button>
              </div>
              <div className="team-row tangerine-team">
                <div>
                  <span>TEAM 02</span>
                  <strong>Tangerine</strong>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTeams((current) => ({
                      ...current,
                      Tangerine: current.Tangerine + 1,
                    }))
                  }
                >
                  {teams.Tangerine}
                  <small>+1</small>
                </button>
              </div>
            </section>
            <section className="class-list-card">
              <div className="class-list-heading">
                <div>
                  <Icon name="users" />
                  <strong>{tx("classList")}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportMode("class");
                    setImportText("");
                    setIsImportOpen(true);
                  }}
                >
                  {tx("update")}
                </button>
              </div>
              <div className="name-list">
                {classNames.slice(0, 8).map((name, index) => (
                  <span key={`${name}-${index}`}>
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    {name}
                  </span>
                ))}
                {classNames.length > 8 && (
                  <em>+ {classNames.length - 8} {tx("otherStudents")}</em>
                )}
              </div>
            </section>
          </div>
        )}
      </aside>

      {presentationMode && (
        <div className="presentation-controls">
          <button
            type="button"
            onClick={() => moveScene(-1)}
            disabled={activeSceneIndex === 0}
            aria-label={tx("previousScene")}
          >
            <Icon name="chevronLeft" />
          </button>
          <span>
            {activeSceneIndex + 1} / {scenes.length}
          </span>
          <button
            type="button"
            onClick={() => moveScene(1)}
            disabled={activeSceneIndex === scenes.length - 1}
            aria-label={tx("nextScene")}
          >
            <Icon name="chevronRight" />
          </button>
          <button type="button" onClick={exitPresentation}>
            <Icon name="close" />
            {tx("exit")}
          </button>
        </div>
      )}

      {isImportOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="data-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="data-modal-title"
          >
            <header className="data-modal-header">
              <div>
                <span>{tx("localEngine").toUpperCase()}</span>
                <h2 id="data-modal-title">Data Studio</h2>
                <p>{tx("dataIntro")}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsImportOpen(false)}
                aria-label={tx("exit")}
              >
                <Icon name="close" />
              </button>
            </header>

            <div className="data-modal-body">
              <div className="data-input-column">
                <div className="mode-tabs">
                  {(
                    [
                      ["auto", tx("autoDetect")],
                      ["questions", tx("questions")],
                      ["vocabulary", tx("vocabShort")],
                      ["slides", tx("slides")],
                      ["widgets", tx("interactions")],
                      ["class", tx("class")],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      type="button"
                      key={mode}
                      className={importMode === mode ? "is-active" : ""}
                      onClick={() => setImportMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="upload-icon">
                    <Icon name="upload" size={24} />
                  </span>
                  <span>
                    <strong>
                      {importFilename || tx("uploadData")}
                    </strong>
                    <small>{tx("fileHint")}</small>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".txt,.md,.csv,.tsv,.json,text/plain,text/csv,application/json"
                  onChange={fileToText}
                />

                <div className="or-divider">
                  <span>{tx("pasteDivider").toUpperCase()}</span>
                </div>

                <textarea
                  className="data-textarea"
                  value={importText}
                  onChange={(event) => {
                    setImportText(event.target.value);
                    setImportFilename("");
                  }}
                  placeholder={tx("pastePlaceholder")}
                  spellCheck={false}
                />
                <div className="template-row">
                  <span>{tx("useTemplate")}</span>
                  <button type="button" onClick={() => loadTemplate("questions")}>
                    {tx("questions")}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadTemplate("vocabulary")}
                  >
                    {tx("vocabShort")}
                  </button>
                  <button type="button" onClick={() => loadTemplate("slides")}>
                    {tx("slides")}
                  </button>
                  <button type="button" onClick={() => loadTemplate("widgets")}>
                    {tx("interactions")}
                  </button>
                  <button type="button" onClick={() => loadTemplate("class")}>
                    {tx("class")}
                  </button>
                </div>
                <div className="csv-downloads">
                  <div>
                    <span>{tx("csvTemplates").toUpperCase()}</span>
                    <small>{tx("csvHint")}</small>
                  </div>
                  <div className="csv-download-grid">
                    <a href="/templates/questions-template.csv" download>
                      <Icon name="download" size={16} />
                      {tx("questions")}
                    </a>
                    <a href="/templates/vocabulary-template.csv" download>
                      <Icon name="download" size={16} />
                      {tx("vocabShort")}
                    </a>
                    <a href="/templates/content-template.csv" download>
                      <Icon name="download" size={16} />
                      {tx("slides")}
                    </a>
                    <a href="/templates/class-list-template.csv" download>
                      <Icon name="download" size={16} />
                      {tx("class")}
                    </a>
                    <a href="/templates/widgets-template.csv" download>
                      <Icon name="download" size={16} />
                      {tx("interactions")}
                    </a>
                    <a href="/templates/timetable-template.csv" download>
                      <Icon name="download" size={16} />
                      Timetable
                    </a>
                    <a href="/templates/poll-template.csv" download>
                      <Icon name="download" size={16} />
                      Poll
                    </a>
                    <a href="/templates/scoreboard-template.csv" download>
                      <Icon name="download" size={16} />
                      Score
                    </a>
                    <a href="/templates/group-maker-template.csv" download>
                      <Icon name="download" size={16} />
                      Group
                    </a>
                    <a href="/templates/qr-links-template.csv" download>
                      <Icon name="download" size={16} />
                      QR Link
                    </a>
                    <a href="/templates/countdown-template.csv" download>
                      <Icon name="download" size={16} />
                      Countdown
                    </a>
                  </div>
                </div>
              </div>

              <div className="detection-column">
                <div className="detection-heading">
                  <span>{tx("liveDetection").toUpperCase()}</span>
                  <strong>
                    {importResult.kind === "unknown" ? tx("waitingData") : tx("analysed")}
                  </strong>
                </div>
                <div
                  className={`detection-result ${
                    importResult.kind !== "unknown" ? "is-success" : ""
                  }`}
                >
                  <span className="detection-icon">
                    <Icon
                      name={importResult.kind === "unknown" ? "data" : "check"}
                      size={25}
                    />
                  </span>
                  <h3>{importResult.title}</h3>
                  <p>{importResult.detail}</p>
                </div>

                {importResult.kind !== "unknown" && (
                  <div className="import-preview">
                    <span>{tx("preview").toUpperCase()}</span>
                    {importResult.kind === "class" ? (
                      importResult.names.slice(0, 4).map((name, index) => (
                        <div className="preview-row" key={`${name}-${index}`}>
                          <small>{String(index + 1).padStart(2, "0")}</small>
                          <strong>{name}</strong>
                        </div>
                      ))
                    ) : importResult.kind === "widgets" ? (
                      (importResult.widgets || []).slice(0, 4).map((widget, index) => (
                        <div className="preview-row" key={widget.id}>
                          <small>{String(index + 1).padStart(2, "0")}</small>
                          <div>
                            <strong>{widget.title}</strong>
                            <span>
                              {WIDGET_CATALOG.find((item) => item.type === widget.type)
                                ? widgetLabel(widget.type)
                                : widget.type}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      importResult.scenes.slice(0, 4).map((scene, index) => (
                        <div className="preview-row" key={scene.id}>
                          <small>{String(index + 1).padStart(2, "0")}</small>
                          <div>
                            <strong>{scene.title}</strong>
                            <span>{getScenePreview(scene)}</span>
                          </div>
                        </div>
                      ))
                    )}
                    {(importResult.scenes.length > 4 ||
                      (importResult.widgets || []).length > 4 ||
                      importResult.names.length > 4) && (
                      <em>
                        +{" "}
                        {Math.max(
                          importResult.scenes.length,
                          (importResult.widgets || []).length,
                          importResult.names.length,
                        ) - 4}{" "}
                        {tx("otherItems")}
                      </em>
                    )}
                  </div>
                )}

                {importResult.warnings.map((warning) => (
                  <p className="data-warning" key={warning}>
                    {warning}
                  </p>
                ))}

                <div className="format-guide">
                  <strong>{tx("formatRules")}</strong>
                  <ul>
                    <li>Câu hỏi: 1. + A/B/C/D + ANSWER</li>
                    <li>Từ vựng: term | meaning | example</li>
                    <li>Nội dung: tiêu đề # hoặc CSV title, content</li>
                    <li>Widget: type, title, label, value, extra</li>
                    <li>Lớp học: mỗi dòng hoặc cột CSV name</li>
                  </ul>
                </div>
              </div>
            </div>

            <footer className="data-modal-footer">
              <span>
                {importText.length.toLocaleString("vi-VN")} {tx("localProcessing")}
              </span>
              <div>
                <button
                  type="button"
                  className="modal-secondary"
                  onClick={() => setIsImportOpen(false)}
                >
                  {tx("cancel")}
                </button>
                <button
                  type="button"
                  className="modal-primary"
                  onClick={applyImport}
                  disabled={importResult.kind === "unknown"}
                >
                  <Icon name="plus" />
                  {importResult.kind === "class"
                    ? tx("useThisList")
                    : importResult.kind === "widgets"
                      ? `${tx("addWidgets")} (${(importResult.widgets || []).length})`
                    : `${tx("addScenes")} (${importResult.scenes.length || ""})`}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </main>
  );
}
