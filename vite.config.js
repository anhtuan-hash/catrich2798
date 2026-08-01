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

export default defineConfig({
  plugins: [randomGroupGeneratorPlugin(), react()],
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
          if (id.includes('/src/components/GlobalMusicPlayer')) return 'chrome-music';
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
