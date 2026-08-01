import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const departmentCloudEnabled = process.env.VITE_DEPARTMENT_CLOUD_ENABLED || 'true';
const departmentId = process.env.VITE_DEPARTMENT_ID || '00000000-0000-0000-0000-000000000001';

function randomGroupGeneratorPlugin() {
  const appRecord = `
  {
    slug: 'random-group-generator', icon: 'RG', tone: 'blue', group: 'Classroom Utilities', groupVi: 'Tiện ích lớp học',
    title: 'Brian Group Maker', titleVi: 'Brian Group Maker',
    desc: 'Create fair random groups, manage attendance, assign roles, adjust teams by drag-and-drop and present results fullscreen.',
    descVi: 'Tạo nhóm ngẫu nhiên công bằng, đánh dấu vắng, gán vai trò, kéo thả điều chỉnh và trình chiếu toàn màn hình.',
    status: 'Offline · Projector · Saved classes', statusVi: 'Offline · Máy chiếu · Lưu lớp',
    api: false, featured: true,
  },`;

  return {
    name: 'brian-random-group-generator',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');

      if (cleanId.endsWith('/src/data/apps.js') && !code.includes("slug: 'random-group-generator'")) {
        return code.replace('export const APPS = [', `export const APPS = [${appRecord}`);
      }

      if (cleanId.endsWith('/src/pages/RandomGroupGenerator.jsx') && !code.includes('random-group-generator-clean.css')) {
        return code.replace(
          "import '../styles/random-group-generator.css';",
          "import '../styles/random-group-generator.css';\nimport '../styles/random-group-generator-clean.css';",
        );
      }

      if (cleanId.endsWith('/src/pages/ToolPage.jsx')) {
        let next = code;
        if (!next.includes("const RandomGroupGenerator = lazy")) {
          next = next.replace(
            "const WordOrbitGame = lazy(() => import('./WordOrbitGame.jsx'));",
            "const WordOrbitGame = lazy(() => import('./WordOrbitGame.jsx'));\nconst RandomGroupGenerator = lazy(() => import('./RandomGroupGenerator.jsx'));",
          );
        }
        if (!next.includes("tool?.slug === 'random-group-generator'")) {
          next = next.replace(
            "  if (tool?.slug === 'word-orbit') return renderLazy(WordOrbitGame, props);",
            "  if (tool?.slug === 'word-orbit') return renderLazy(WordOrbitGame, props);\n  if (tool?.slug === 'random-group-generator') return renderLazy(RandomGroupGenerator, props);",
          );
        }
        return next;
      }

      return null;
    },
  };
}

function conductPeriodEvaluationPlugin() {
  const helperSource = `
export const CONDUCT_WEEKLY_CONVERSION = Object.freeze({ good: 4, fair: 3, pass: 2, fail: 0 });

export function conductWeeklyClassificationPoint(classification = {}) {
  return CONDUCT_WEEKLY_CONVERSION[classification?.id] ?? 0;
}

export function classifyConductPeriodAverage(averagePoint) {
  const value = Number(averagePoint) || 0;
  if (value >= 3.5) return { id: 'good', label: 'Tốt' };
  if (value >= 2.5) return { id: 'fair', label: 'Khá' };
  if (value >= 1.5) return { id: 'pass', label: 'Đạt' };
  return { id: 'fail', label: 'Chưa đạt' };
}

export function downgradeConductClassificationOneLevel(classification = {}) {
  const order = ['good', 'fair', 'pass', 'fail'];
  const labels = { good: 'Tốt', fair: 'Khá', pass: 'Đạt', fail: 'Chưa đạt' };
  const currentIndex = order.indexOf(classification?.id);
  const nextId = currentIndex >= 0 ? order[Math.min(currentIndex + 1, order.length - 1)] : 'fail';
  return { id: nextId, label: labels[nextId] };
}

export function prohibitedConductRecordsForPeriod(workspace, startDate, endDate, studentId = '') {
  const current = normalizeHomeroomWorkspace(workspace);
  const prohibitedKeys = new Set(
    OFFICIAL_CONDUCT_RULES
      .filter((rule) => rule.isProhibited)
      .flatMap((rule) => [rule.id, rule.code])
      .filter(Boolean),
  );
  return (current.conductRecords || []).filter((record) => {
    if (record.status !== 'confirmed') return false;
    if (studentId && record.studentId !== studentId) return false;
    const date = safeText(record.date);
    if (!date || (startDate && date < startDate) || (endDate && date > endDate)) return false;
    return prohibitedKeys.has(record.ruleId) || prohibitedKeys.has(record.code);
  });
}
`;

  return {
    name: 'brian-conduct-period-evaluation',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');

      if (cleanId.endsWith('/src/utils/homeroomConduct.js')) {
        let next = code;
        if (!next.includes('classifyConductPeriodAverage')) {
          next = next.replace(
            'export function calculateConductPeriod(workspace, startDate, endDate) {',
            `${helperSource}\nexport function calculateConductPeriod(workspace, startDate, endDate, options = {}) {`,
          );
          next = next.replace(
            '    const average = weekly.length ? weekly.reduce((sum, row) => sum + row.score, 0) / weekly.length : 100;',
            `    const weeklyPoints = weekly.map((row) => conductWeeklyClassificationPoint(row.classification));
    const averagePoint = weeklyPoints.length ? weeklyPoints.reduce((sum, point) => sum + point, 0) / weeklyPoints.length : 4;
    const scoreAverage = weekly.length ? weekly.reduce((sum, row) => sum + row.score, 0) / weekly.length : 100;`,
          );
          next = next.replace(
            '    const criticalWeeks = weekly.filter((row) => row.critical).length;',
            `    const criticalWeeks = weekly.filter((row) => row.critical).length;
    const baseClassification = classifyConductPeriodAverage(averagePoint);
    const prohibitedRecords = options.enforceProhibitedDowngrade === true
      ? prohibitedConductRecordsForPeriod(current, startDate, endDate, student.id)
      : [];
    const prohibitedViolationCount = prohibitedRecords.length;
    const prohibitedDowngraded = prohibitedViolationCount > 0 && baseClassification.id !== 'fail';
    const classification = prohibitedViolationCount > 0
      ? downgradeConductClassificationOneLevel(baseClassification)
      : baseClassification;`,
          );
          next = next.replace(
            '      average: Math.round(average * 100) / 100,',
            `      average: Math.round(averagePoint * 100) / 100,
      scoreAverage: Math.round(scoreAverage * 100) / 100,
      weeklyPoints,
      conversionScale: CONDUCT_WEEKLY_CONVERSION,`,
          );
          next = next.replace(
            '      classification: classifyConductScore(average, current.conductSettings?.thresholds),',
            `      classification,
      baseClassification,
      prohibitedViolationCount,
      prohibitedRecords,
      prohibitedDowngraded,`,
          );
        }
        return next;
      }

      if (cleanId.endsWith('/src/components/HomeroomConductTab.jsx')) {
        let next = code;
        if (!next.includes('Tốt = 4 điểm')) {
          next = next.replace("  const [periodMode, setPeriodMode] = useState('month');", "  const [periodMode, setPeriodMode] = useState('mid1');");
          next = next.replace(
            '    () => calculateConductPeriod({ ...workspace, conductSettings: settingsDraft }, periodRange.start, periodRange.end),',
            `    () => calculateConductPeriod(
      { ...workspace, conductSettings: settingsDraft },
      periodRange.start,
      periodRange.end,
      { enforceProhibitedDowngrade: periodMode === 'semester1' || periodMode === 'semester2' },
    ),`,
          );
          next = next.replace(
            '[workspace, settingsDraft, periodRange.start, periodRange.end],',
            '[workspace, settingsDraft, periodRange.start, periodRange.end, periodMode],',
          );
          next = next.replace(
            /<div className="hr-panel-head"><div><small>TỔNG HỢP ĐỊNH KỲ<\/small><h2>Tháng · Giữa kỳ · Cuối kỳ · Cả năm<\/h2><p>[\s\S]*?<\/p><\/div><div className="hr-head-actions"><select value=\{periodMode\} onChange=\{\(event\) => setPeriodMode\(event\.target\.value\)\}>[\s\S]*?<\/select>\{periodMode === 'month' \? <input type="month"[\s\S]*? : null\}<\/div><\/div>/,
            `<div className="hr-panel-head"><div><small>TỔNG HỢP ĐỊNH KỲ</small><h2>Giữa kỳ · Cuối kỳ</h2><p>Tốt = 4 điểm, Khá = 3 điểm, Đạt = 2 điểm, Chưa đạt = 0 điểm. Giữa kỳ lấy trung bình từ đầu học kỳ đến hết tuần giữa kỳ; cuối kỳ lấy trung bình toàn bộ các tuần của học kỳ. Khi chốt cuối kỳ, có vi phạm đã xác nhận thuộc 10 điều cấm sẽ hạ đúng một bậc.</p></div><div className="hr-head-actions"><select value={periodMode} onChange={(event) => setPeriodMode(event.target.value)}><option value="mid1">Giữa học kỳ I</option><option value="semester1">Cuối học kỳ I</option><option value="mid2">Giữa học kỳ II</option><option value="semester2">Cuối học kỳ II</option></select></div></div>`,
          );
          next = next.replace('<th>Điểm trung bình</th>', '<th>Điểm TB quy đổi</th>');
          next = next.replace(
            "<td>{row.criticalWeeks ? <span className=\"hr-conduct-alert\">{row.criticalWeeks} tuần</span> : '0'}</td>",
            "<td>{row.prohibitedViolationCount ? <span className=\"hr-conduct-alert\" title={`Xếp loại trước ràng buộc: ${row.baseClassification?.label || '—'}`}>{row.prohibitedDowngraded ? 'Hạ 1 bậc' : 'Đã ở mức Chưa đạt'} · {row.prohibitedViolationCount} vi phạm điều cấm</span> : row.criticalWeeks ? <span className=\"hr-conduct-alert\">{row.criticalWeeks} tuần</span> : '0'}</td>",
          );
        }
        return next;
      }

      if (cleanId.endsWith('/src/conductExportReports.js')) {
        let next = code;
        if (!next.includes('Giữa học kỳ I</option><option value="semester1"')) {
          next = next.replace(
            "  const key = period === 'semester2' ? 'semester2' : 'semester1';\n  const range = ranges[key] || {};\n  return {\n    type: key,\n    label: key === 'semester2' ? 'Học kỳ II' : 'Học kỳ I',",
            "  const key = ['mid1', 'semester1', 'mid2', 'semester2'].includes(period) ? period : 'mid1';\n  const labels = { mid1: 'Giữa học kỳ I', semester1: 'Cuối học kỳ I', mid2: 'Giữa học kỳ II', semester2: 'Cuối học kỳ II' };\n  const range = ranges[key] || {};\n  return {\n    type: key,\n    label: labels[key],",
          );
          next = next.replaceAll(
            'calculateConductPeriod(workspace, range.start, range.end)',
            "calculateConductPeriod(workspace, range.start, range.end, { enforceProhibitedDowngrade: range.type === 'semester1' || range.type === 'semester2' })",
          );
          next = next.replace(' : 100;\n  const counts = classificationCounts(rows);', ' : 4;\n  const counts = classificationCounts(rows);');
          next = next.replace('<article><small>Điểm trung bình lớp</small>', '<article><small>Điểm TB quy đổi lớp</small>');
          next = next.replace('<th>Điểm TB</th>', '<th>Điểm TB quy đổi</th>');
          next = next.replace(
            '<td>${row.criticalWeeks ? `${row.criticalWeeks} tuần` : \'\'}</td>',
            '<td>${row.prohibitedViolationCount ? `${row.prohibitedDowngraded ? \'Hạ 1 bậc\' : \'Đã ở mức Chưa đạt\'} (${row.prohibitedViolationCount} vi phạm điều cấm)` : row.criticalWeeks ? `${row.criticalWeeks} tuần` : \'\'}</td>',
          );
          next = next.replace(
            "<section class=\"result-banner\"><span>Xếp loại giai đoạn</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.criticalWeeks ? `${row.criticalWeeks} tuần có cảnh báo cần xem xét.` : 'Không có tuần cảnh báo nghiêm trọng.'}</small></section>",
            "<section class=\"result-banner\"><span>Xếp loại giai đoạn</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.prohibitedViolationCount ? row.prohibitedDowngraded ? `Đã hạ một bậc từ ${escapeHtml(row.baseClassification?.label || '—')} do có ${row.prohibitedViolationCount} vi phạm đã xác nhận thuộc 10 điều cấm.` : `Có ${row.prohibitedViolationCount} vi phạm đã xác nhận thuộc 10 điều cấm; kết quả trước ràng buộc đã là Chưa đạt.` : `Điểm trung bình quy đổi: ${Number(row.average || 0).toFixed(2)} trên thang 4.`}</small></section>",
          );
          next = next.replace('Lớp và cá nhân theo tuần, tháng, học kỳ', 'Lớp và cá nhân theo tuần, giữa kỳ, cuối kỳ');
          next = next.replace('Tạo bản A4 có thông tin lớp, bảng điểm, chi tiết ghi nhận và khu vực ký xác nhận.', 'Tạo bản A4 theo thang quy đổi Tốt 4 · Khá 3 · Đạt 2 · Chưa đạt 0, kèm chi tiết ghi nhận và khu vực ký xác nhận.');
          next = next.replace(
            /<option value="week"[\s\S]*?<option value="semester2"[^>]*>Học kỳ II<\/option>/,
            '<option value="week"${prefs.period === \'week\' || !prefs.period ? \' selected\' : \'\'}>Theo tuần</option><option value="mid1"${prefs.period === \'mid1\' ? \' selected\' : \'\'}>Giữa học kỳ I</option><option value="semester1"${prefs.period === \'semester1\' ? \' selected\' : \'\'}>Cuối học kỳ I</option><option value="mid2"${prefs.period === \'mid2\' ? \' selected\' : \'\'}>Giữa học kỳ II</option><option value="semester2"${prefs.period === \'semester2\' ? \' selected\' : \'\'}>Cuối học kỳ II</option>',
          );
          next = next.replace("  if (monthField) monthField.hidden = period !== 'month';", '  if (monthField) monthField.hidden = true;');
        }
        return next;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [conductPeriodEvaluationPlugin(), randomGroupGeneratorPlugin(), react()],
  resolve: {
    alias: [{ find: /^read-excel-file$/, replacement: 'read-excel-file/browser' }],
  },
  define: {
    'import.meta.env.VITE_DEPARTMENT_CLOUD_ENABLED': JSON.stringify(departmentCloudEnabled),
    'import.meta.env.VITE_DEPARTMENT_ID': JSON.stringify(departmentId),
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('pdf-lib') || id.includes('@pdf-lib')) return 'vendor-pdf-export';
            if (id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('mammoth')) return 'vendor-docx';
            return 'vendor-misc';
          }

          if (id.includes('/src/components/FullMotionEffects') || id.includes('/src/components/WP8TileTransition') || id.includes('/src/components/Win8Loader') || id.includes('/src/components/WindowsPhoneIndicator')) {
            return 'motion-full-wp8';
          }
          if (id.includes('/src/components/StatusMenuBar')) return 'chrome-status';
          if (id.includes('/src/utils/documentParsers') || id.includes('/src/utils/pdfLoader')) return 'document-parsers';

          if (id.includes('/src/pages/SpecializedAppPage') || id.includes('/src/utils/specializedAppEngines')) return 'tool-specialized-apps';
          if (id.includes('/src/pages/TextCareStudio') || id.includes('/src/pages/LessonArchitect')) return 'tool-docs-lessons';
          if (id.includes('/src/pages/ReadingStudio') || id.includes('/src/pages/SpeakingStudio') || id.includes('/src/pages/WordGraphStudio')) return 'tool-skills';
          if (id.includes('/src/pages/TestBuilder') || id.includes('/src/pages/ClassroomGame') || id.includes('/src/pages/DominoWordForm') || id.includes('/src/pages/RandomGroupGenerator')) return 'tool-games-tests';
          if (id.includes('/src/pages/AdminPage') || id.includes('/src/pages/AuthPage') || id.includes('/src/pages/SupabaseSetup')) return 'auth-admin';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 650,
  },
});
