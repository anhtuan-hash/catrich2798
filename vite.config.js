import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import attendanceConductLinkPlugin from './build/attendanceConductLinkPlugin.js';
import conductAttendanceIdentityRepairPlugin from './build/conductAttendanceIdentityRepairPlugin.js';
import conductBulkActionsPlugin from './build/conductBulkActionsPlugin.js';

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
export const CONDUCT_WEEKLY_SCORE_SCALE = Object.freeze({ divisor: 25, maximum: 4 });

export function conductWeeklyScorePoint(score) {
  const value = Number(score) || 0;
  return Math.max(0, Math.min(CONDUCT_WEEKLY_SCORE_SCALE.maximum, value / CONDUCT_WEEKLY_SCORE_SCALE.divisor));
}

export function classifyConductPeriodAverage(averagePoint) {
  const value = Number(averagePoint) || 0;
  if (value >= 3.6) return { id: 'good', label: 'Tốt' };
  if (value >= 3) return { id: 'fair', label: 'Khá' };
  if (value >= 2.4) return { id: 'pass', label: 'Đạt' };
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
      if (!cleanId.endsWith('/src/utils/homeroomConduct.js')) return null;

      let next = code;
      next = next.replace(
        '  const baseScore = Number(settings.weeklyBaseScore) || 100;',
        '  const baseScore = 100;',
      );
      next = next.replace(
        '  const maxScore = Math.max(baseScore, Number(settings.carryBonusCap) || baseScore);',
        '  const maxScore = 100;',
      );

      if (!next.includes('classifyConductPeriodAverage')) {
        next = next.replace(
          'export function calculateConductPeriod(workspace, startDate, endDate) {',
          `${helperSource}\nexport function calculateConductPeriod(workspace, startDate, endDate, options = {}) {`,
        );
        next = next.replace(
          '    const average = weekly.length ? weekly.reduce((sum, row) => sum + row.score, 0) / weekly.length : 100;',
          `    const weeklyPoints = weekly.map((row) => conductWeeklyScorePoint(row.score));
    const averagePoint = weeklyPoints.length ? weeklyPoints.reduce((sum, point) => sum + point, 0) / weeklyPoints.length : 4;`,
        );
        next = next.replace(
          '    const criticalWeeks = weekly.filter((row) => row.critical).length;',
          `    const criticalWeeks = weekly.filter((row) => row.critical).length;
    const baseClassification = classifyConductPeriodAverage(averagePoint);
    const prohibitedStartDate = options.prohibitedStartDate || startDate;
    const prohibitedEndDate = options.prohibitedEndDate || endDate;
    const prohibitedRecords = options.enforceProhibitedDowngrade === true
      ? prohibitedConductRecordsForPeriod(current, prohibitedStartDate, prohibitedEndDate, student.id)
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
      weeklyPoints,
      conversionScale: CONDUCT_WEEKLY_SCORE_SCALE,
      prohibitedRange: { start: prohibitedStartDate, end: prohibitedEndDate },`,
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
    },
  };
}

export default defineConfig({
  plugins: [attendanceConductLinkPlugin(), conductAttendanceIdentityRepairPlugin(), conductBulkActionsPlugin(), conductPeriodEvaluationPlugin(), randomGroupGeneratorPlugin(), react()],
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