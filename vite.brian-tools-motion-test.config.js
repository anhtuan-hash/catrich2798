import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

const stub=fileURLToPath(new URL('./tests/fixtures/brian-tools-motion-stub.mjs',import.meta.url));
export default defineConfig({
  plugins:[
    {
      name:'isolate-toolbox-from-app-global-motion',
      enforce:'pre',
      resolveId(source,importer){
        if(source==='../../utils/bubbleMotion.js'&&importer?.includes('/BrianInstantTools/BrianInstantTools.jsx')){
          return stub;
        }
        return null;
      },
    },
    react(),
  ],
});
