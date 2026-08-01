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

function conductProhibitedDowngradePlugin() {
  const helperSource = `
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
    name: 'brian-conduct-prohibited-downgrade',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');

      if (cleanId.endsWith('/src/utils/homeroomConduct.js')) {
        let next = code;
        if (!next.includes('downgradeConductClassificationOneLevel')) {
          next = next.replace(
            'export function calculateConductPeriod(workspace, startDate, endDate) {',
            `${helperSource}\nexport function calculateConductPeriod(workspace, startDate, endDate, options = {}) {`,
          );
          next = next.replace(
            '    const criticalWeeks = weekly.filter((row) => row.critical).length;',
            `    const criticalWeeks = weekly.filter((row) => row.critical).length;
    const baseClassification = classifyConductScore(average, current.conductSettings?.thresholds);
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
        if (!next.includes('enforceProhibitedDowngrade: periodMode')) {
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
            "<p>Kết quả là trung bình điểm của các tuần thuộc giai đoạn. Riêng lớp 12, bốn tuần hè 15/06–11/07/2026 được tính vào Học kỳ I và cả năm.</p>",
            "<p>Kết quả là trung bình điểm của các tuần thuộc giai đoạn. Khi chốt Học kỳ I hoặc II, học sinh có ít nhất một vi phạm đã xác nhận thuộc 10 điều cấm sẽ tự động bị hạ đúng một bậc rèn luyện. Riêng lớp 12, bốn tuần hè 15/06–11/07/2026 được tính vào Học kỳ I và cả năm.</p>",
          );
          next = next.replace(
            "<td>{row.criticalWeeks ? <span className=\"hr-conduct-alert\">{row.criticalWeeks} tuần</span> : '0'}</td>",
            "<td>{row.prohibitedDowngraded ? <span className=\"hr-conduct-alert\" title={`Xếp loại theo điểm: ${row.baseClassification?.label || '—'}`}>Hạ 1 bậc · {row.prohibitedViolationCount} vi phạm điều cấm</span> : row.criticalWeeks ? <span className=\"hr-conduct-alert\">{row.criticalWeeks} tuần</span> : '0'}</td>",
          );
        }
        return next;
      }

      if (cleanId.endsWith('/src/conductExportReports.js')) {
        let next = code;
        if (!next.includes("enforceProhibitedDowngrade: range.type === 'semester1'")) {
          next = next.replaceAll(
            'const rows = calculateConductPeriod(workspace, range.start, range.end);',
            "const rows = calculateConductPeriod(workspace, range.start, range.end, { enforceProhibitedDowngrade: range.type === 'semester1' || range.type === 'semester2' });",
          );
          next = next.replace(
            '<td>${row.criticalWeeks ? `${row.criticalWeeks} tuần` : \'\'}</td>',
            '<td>${row.prohibitedDowngraded ? `Hạ 1 bậc (${row.prohibitedViolationCount} vi phạm điều cấm)` : row.criticalWeeks ? `${row.criticalWeeks} tuần` : \'\'}</td>',
          );
          next = next.replace(
            "<section class=\"result-banner\"><span>Xếp loại giai đoạn</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.criticalWeeks ? `${row.criticalWeeks} tuần có cảnh báo cần xem xét.` : 'Không có tuần cảnh báo nghiêm trọng.'}</small></section>",
            "<section class=\"result-banner\"><span>Xếp loại giai đoạn</span><b>${escapeHtml(row.classification?.label || '')}</b><small>${row.prohibitedDowngraded ? `Đã hạ một bậc từ ${escapeHtml(row.baseClassification?.label || '—')} do có ${row.prohibitedViolationCount} vi phạm đã xác nhận thuộc 10 điều cấm.` : row.criticalWeeks ? `${row.criticalWeeks} tuần có cảnh báo cần xem xét.` : 'Không có tuần cảnh báo nghiêm trọng.'}</small></section>",
          );
        }
        return next;
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [conductProhibitedDowngradePlugin(), randomGroupGeneratorPlugin(), react()],
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
