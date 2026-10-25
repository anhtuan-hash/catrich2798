// Imported ONLY by the localhost Playwright QA fixture.
import {defineConfig,mergeConfig} from 'vite';
import {resolve,dirname} from 'node:path';
import productionConfig from './vite.config.js';
const target=resolve('src/utils/supabase.js');
const substitute=resolve('tests/fixtures/sync-doctor-supabase-shim.js');
export default defineConfig(mergeConfig(productionConfig,{
  plugins:[{
    name:'sync-doctor-no-cloud-test-shim',
    enforce:'pre',
    resolveId(source,importer){
      if(!importer || !source.endsWith('supabase.js'))return null;
      const resolved=resolve(dirname(importer.split('?')[0]),source);
      return resolved===target?substitute:null;
    },
  }],
  server:{host:'127.0.0.1',port:4174,strictPort:true},
}));
