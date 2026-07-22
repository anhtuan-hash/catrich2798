import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const departmentCloudEnabled = process.env.VITE_DEPARTMENT_CLOUD_ENABLED || 'true';
const departmentId = process.env.VITE_DEPARTMENT_ID || '00000000-0000-0000-0000-000000000001';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEPARTMENT_CLOUD_ENABLED': JSON.stringify(departmentCloudEnabled),
    'import.meta.env.VITE_DEPARTMENT_ID': JSON.stringify(departmentId)},
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html')},
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
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
          if (id.includes('/src/pages/TestBuilder') || id.includes('/src/pages/ClassroomGame') || id.includes('/src/pages/DominoWordForm')) return 'tool-games-tests';
          if (id.includes('/src/pages/AdminPage') || id.includes('/src/pages/AuthPage') || id.includes('/src/pages/SupabaseSetup')) return 'auth-admin';
          return undefined;
        }}},
    chunkSizeWarningLimit: 650}});
