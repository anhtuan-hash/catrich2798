import { DEPARTMENT_APP } from './department.js';

export const APPS = [
  DEPARTMENT_APP,

  {
    slug: 'thpt-practice-hub', icon: 'TH', tone: 'orange', group: 'Exam Preparation', groupVi: 'Luyện thi THPT',
    title: 'THPT Interactive Practice Hub', titleVi: 'Luyện thi THPT',
    desc: 'Upload, name, organize and run interactive HTML learning files directly in the browser.',
    descVi: 'Tải lên, đặt tên, quản lý và chạy trực tiếp các file học tập tương tác HTML.',
    status: 'HTML player · Offline library', statusVi: 'Chạy HTML · Kho offline', api: false, featured: true,
  },
  {
    slug: 'work-hub', route: 'work-hub', icon: 'WH', tone: 'mint', group: 'Connected Workflow', groupVi: 'Công việc liên thông',
    title: 'Unified Work Hub', titleVi: 'Trung tâm công việc',
    desc: 'Manage tasks, submissions, feedback, schedules and approval workflows in one place.',
    descVi: 'Quản lí nhiệm vụ, sản phẩm nộp, phản hồi, lịch và phê duyệt trong một nơi.',
    status: 'Realtime · Role-aware', statusVi: 'Realtime · Theo vai trò', api: true, featured: true,
  },
  {
    slug: 'knowledge-hub', route: 'knowledge-hub', icon: 'KH', tone: 'blue', group: 'Teaching Resources', groupVi: 'Học liệu thông minh',
    title: 'Smart Knowledge Library', titleVi: 'Kho học liệu thông minh',
    desc: 'Search, classify, favorite and organize approved resources with lifecycle metadata.',
    descVi: 'Tìm kiếm, phân loại, yêu thích và tổ chức học liệu theo metadata và vòng đời.',
    status: 'Metadata · Collections', statusVi: 'Metadata · Bộ sưu tập', api: true, featured: true,
  },
  {
    slug: 'assessment-core', route: 'assessment-core', icon: 'AC', tone: 'orange', group: 'Assessment', groupVi: 'Đánh giá',
    title: 'Assessment Core', titleVi: 'Ngân hàng câu hỏi & đề thi',
    desc: 'Manage question banks, import items, build blueprints and generate multiple test codes.',
    descVi: 'Quản lí ngân hàng câu hỏi, nhập dữ liệu, tạo blueprint và nhiều mã đề.',
    status: 'Question bank · Blueprints', statusVi: 'Ngân hàng · Blueprint', api: true, featured: true,
  },
  {
    slug: 'platform-readiness', route: 'platform-readiness', icon: 'PR', tone: 'mint', group: 'Platform', groupVi: 'Nền tảng',
    title: 'Platform Readiness', titleVi: 'PWA, bảo mật & tiếp cận',
    desc: 'Install the site as an app, audit security headers, tune accessibility and monitor performance budgets.',
    descVi: 'Cài website như ứng dụng, kiểm tra bảo mật, điều chỉnh khả năng tiếp cận và theo dõi ngân sách hiệu năng.',
    status: 'PWA · Security · WCAG · Web Vitals', statusVi: 'PWA · Bảo mật · WCAG · Hiệu năng', api: true, featured: true,
  },
  {
    slug: 'cloud-operations', route: 'cloud-operations', icon: 'CO', tone: 'mint', group: 'Operations', groupVi: 'Tự động hóa & vận hành',
    title: 'Cloud Operations', titleVi: 'Vận hành nền 24/7',
    desc: 'Run automation with durable queues, Supabase Cron, controlled retries, approval gates and operations digests.',
    descVi: 'Chạy tự động hóa bằng hàng đợi bền vững, Supabase Cron, retry, phê duyệt và bản tin vận hành.',
    status: '24/7 worker · Queue · Digest', statusVi: 'Worker 24/7 · Hàng đợi · Bản tin', api: true, featured: true,
  },
  {
    slug: 'data-governance', route: 'data-governance', icon: 'DG', tone: 'orange', group: 'Governance', groupVi: 'Quản trị dữ liệu',
    title: 'Data Governance', titleVi: 'Quản trị dữ liệu & tuân thủ',
    desc: 'Audit actions, control permission overrides, create snapshots and restore deleted content safely.',
    descVi: 'Theo dõi thao tác, kiểm soát quyền ngoại lệ, tạo snapshot và khôi phục dữ liệu an toàn.',
    status: 'Audit · Backup · Trash · RLS', statusVi: 'Audit · Sao lưu · Thùng rác · RLS', api: true, featured: true,
  },
  {
    slug: 'resource-library-hub', route: 'resource-library', icon: 'RL', tone: 'blue', group: 'Teaching Resources', groupVi: 'Học liệu dùng chung',
    title: 'Brian Resource Library', titleVi: 'Kho học liệu Tổ Tiếng Anh',
    desc: 'A shared English teaching-resource library backed by the department leader’s Google Drive, AI search and approval workflows.',
    descVi: 'Kho sách và học liệu dùng chung, tự lưu lên Google Drive của TTCM, có AI phân loại, tìm kiếm và quy trình duyệt.',
    status: 'Google Drive · AI Knowledge', statusVi: 'Google Drive · Kho tri thức AI', api: true, featured: true,
  },
  {
    slug: 'news-reader', route: 'news', icon: 'NW', tone: 'mint', group: 'Reading & News', groupVi: 'Đọc báo',
    title: 'Newsroom Reader', titleVi: 'Newsroom – Đọc báo',
    desc: 'Read Vietnamese education news and English-language reporting in a focused, source-attributed daily reader.',
    descVi: 'Đọc tin giáo dục Việt Nam và báo tiếng Anh trong giao diện tập trung, rõ nguồn và cập nhật tự động.',
    status: 'Live RSS · Reading mode', statusVi: 'RSS trực tiếp · Chế độ đọc', api: true, featured: true,
  },
  {
    slug: 'vietnam-tax', icon: 'TX', tone: 'blue', group: 'Teacher Utilities', groupVi: 'Tiện ích giáo viên',
    title: 'Vietnam Tax Studio', titleVi: 'Tính thuế TNCN 2026',
    desc: 'Estimate Vietnam personal income tax, mandatory insurance and net salary, with a clear comparison between the former 7-bracket and current 5-bracket scales.',
    descVi: 'Ước tính thuế TNCN, bảo hiểm bắt buộc và lương thực nhận; so sánh rõ biểu thuế 7 bậc với biểu thuế 5 bậc hiện hành.',
    status: '2026 tax scale · Offline calculator', statusVi: 'Biểu thuế 2026 · Tính offline', api: true, featured: true,
  },
  {
    slug: 'textlab-activities', icon: 'TL', tone: 'blue', group: 'Teaching Design', groupVi: 'Tạo hoạt động',
    title: 'Brian TextLab Activities', titleVi: 'Brian TextLab Activities',
    desc: 'Turn text into 18 interactive classroom activities with live preview and offline export.',
    descVi: 'Biến văn bản thành 18 dạng hoạt động tương tác, xem trước trực tiếp và xuất gói dùng offline.',
    status: '18 templates · Offline', statusVi: '18 mẫu · Offline', api: true, featured: true,
  },
  {
    slug: 'word2graph', icon: 'WG', tone: 'teal', group: 'Vocabulary', groupVi: 'Từ vựng',
    title: 'WordGraph Studio', titleVi: 'WordGraph Studio',
    desc: 'Map word families, collocations and examples.', descVi: 'Vẽ sơ đồ word family, collocation và ví dụ.',
    status: 'AI powered', statusVi: 'AI hỗ trợ', api: true,
  },
  {
    slug: 'lesson-plan-ai', icon: 'LA', tone: 'blue', group: 'Teaching Design', groupVi: 'Hỗ trợ dạy',
    title: 'Lesson Architect', titleVi: 'Lesson Architect',
    desc: 'Create one lesson or a full-year 5512 lesson-plan set from curriculum plans and textbooks.',
    descVi: 'Đọc KHGD và SGK, trích bảng PPCT, soạn từng bài hoặc toàn bộ English-only annual lesson plans with digital competence và xuất Word A4.',
    status: '5512 + annual curriculum', statusVi: '5512 + English-only annual lesson plans with digital competence', api: true, featured: true,
  },
  {
    slug: 'english-lesson-integration', icon: 'EL', tone: 'purple', group: 'Teaching Design', groupVi: 'Thiết kế bài dạy',
    title: 'AI Lesson Integration Studio', titleVi: 'Tích hợp AI vào giáo án Tiếng Anh',
    desc: 'Analyze existing Grade 10–12 English lesson plans, integrate digital competence, AI literacy and inclusive support, then generate connected resources.',
    descVi: 'Phân tích giáo án Tiếng Anh THPT, tích hợp năng lực số, giáo dục AI và hỗ trợ hòa nhập; tạo học liệu và chuyển sang các Studio liên kết.',
    status: 'DOCX · AI · Inclusive · Connected', statusVi: 'DOCX · AI · Hòa nhập · Liên thông', api: true, featured: true,
  },
  {
    slug: 'textcare', icon: 'TC', tone: 'red', group: 'Document AI', groupVi: 'Văn bản',
    title: 'TextCare Fixer', titleVi: 'TextCare Fixer',
    desc: 'Upload, paste, detect and normalize administrative documents.', descVi: 'Tải file/dán text, nhận diện và chuẩn hoá văn bản hành chính.',
    status: 'AI powered', statusVi: 'AI hỗ trợ', api: true,
  },
  {
    slug: 'grammar-builder', icon: 'GB', tone: 'blue', group: 'Language', groupVi: 'Ngôn ngữ',
    title: 'Grammar Builder', titleVi: 'Grammar Builder',
    desc: 'Design blueprints, generate and audit grammar items, manage a teacher vault and publish to connected teaching apps.',
    descVi: 'Thiết kế blueprint, tạo và kiểm định item ngữ pháp, quản lý Teacher Vault và gửi sang các ứng dụng dạy học.',
    status: 'Workflow V2 · AI', statusVi: 'Workflow V2 · AI', api: true, featured: true,
  },
];

export const GAME_APPS = [
  {
    slug: 'game-hub', route: 'games', icon: 'GH', tone: 'teal', group: 'Third-party Launchers', groupVi: 'Cổng trò chơi',
    title: 'Game Hub', titleVi: 'Game Hub',
    desc: 'Open trusted third-party classroom game platforms and save useful links for lessons.',
    descVi: 'Mở nhanh các nền tảng game lớp học bên thứ ba và lưu link hữu ích cho bài dạy.',
    status: 'Launcher', statusVi: 'Cổng mở nhanh', api: true, featured: true,
  },
];

export const SPECIAL_TOOLS = [];

export const ARCHIVED_APPS = [
  'QuizForge AI', 'WordForm Forge', 'GapCraft Builder', 'Teacher Tools Hub', 'Activity Tiles', 'FormFlow AI', 'ExamSmith AI',
  'THPT Item Lab', 'ReadSpark MCQ', 'TalkDeck Prompts', 'WriteMirror', 'TextOptimus Reader', 'Mystery Tiles', 'Sprint Arena',
  'SpinBurst', 'Link Clash', 'Rubric Foundry', 'Exam Weaver', 'Prompt Vault', 'Blueprint Grid', 'ModelTest Planner',
  'TryHard Exam Lab', 'SpeakEasy Coach', 'SkillCheck AI', 'Syntax Tree Studio', 'PromptChef', 'BookTranslate Studio',
  'BookOCR Clean', 'ArticleAudio Studio', 'PDFClear Clean',
];

export const RESOURCE_ITEMS = [
  {
    icon: 'AI', title: 'AI Access', titleVi: 'Kết nối AI',
    text: 'Configure one OpenRouter API key for every AI feature across the website.',
    textVi: 'Cấu hình một OpenRouter API key cho toàn bộ chức năng AI trên website.',
  },
  {
    icon: 'WF', title: 'Teacher Flow', titleVi: 'Quy trình',
    text: 'Choose a tool, paste content, generate, teach live, or export offline.',
    textVi: 'Chọn công cụ, dán nội dung, tạo hoạt động, dạy trực tiếp hoặc xuất file.',
  },
  {
    icon: 'DB', title: 'V1.0 Official Dashboard', titleVi: 'Dashboard chính thức V1.0',
    text: 'The dashboard is organized by workflow groups for faster opening, creating and saving.',
    textVi: 'Dashboard được sắp xếp theo nhóm chức năng để mở nhanh, tạo nhanh và lưu nhanh.',
  },
];
