import {build} from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {SNAPSHOT_FORMAT} from '../src/features/immersive-gallery/v3/offline/snapshot.js';

export async function buildMuseumOffline(outDir='dist'){
 const root=process.cwd(),folder=path.join(root,'src/features/immersive-gallery/v3/offline');
 const result=await build({configFile:false,root,publicDir:false,logLevel:'warn',
  define:{'process.env.NODE_ENV':JSON.stringify('production')},
  plugins:[{name:'museum-offline-cloud-boundary',enforce:'pre',resolveId(source){
   if(/(?:^|\/)utils\/supabase\.js$/.test(source))return path.join(folder,'cloudStub.js');
   if(source.endsWith('/MuseumOfflineExport.jsx'))return path.join(folder,'exportStub.jsx');
  }}],
  build:{write:false,target:'es2020',minify:true,cssCodeSplit:false,assetsInlineLimit:100000000,
   lib:{entry:path.join(folder,'entry.jsx'),name:'BrianMuseumOffline',formats:['iife']},
   rollupOptions:{output:{inlineDynamicImports:true}},chunkSizeWarningLimit:15000}});
 const output=(Array.isArray(result)?result[0]:result).output;
 let script=output.filter(x=>x.type==='chunk').map(x=>x.code).join('\n');
 let css=output.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>String(x.source)).join('\n');
 const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2','.html':'text/html'};
 const assetPaths=new Set([...((script+'\n'+css).matchAll(/["'`(](\/(?:assets|museum)\/[^"'`()\s]+)["'`)]/g))].map(m=>m[1]));
 for(const asset of assetPaths){
  const absolute=path.join(root,'public',asset);const bytes=await fs.readFile(absolute);
  const type=mime[path.extname(absolute)];if(!type)throw new Error('Unsupported offline asset: '+asset);
  const data='data:'+type+';base64,'+bytes.toString('base64');
  script=script.replaceAll(asset,data);css=css.replaceAll(asset,data);
 }
 // All scripts are inline; an offline reader must never fetch a code chunk.
 if(/import\s*\(/.test(script))throw new Error('Offline build still contains dynamic imports.');
 let revision='local';try{revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
 const artifact={format:SNAPSHOT_FORMAT,build:revision,script,css,embeddedStaticAssets:[...assetPaths]};
 await fs.mkdir(outDir,{recursive:true});await fs.writeFile(path.join(outDir,'museum-offline-runtime.json'),JSON.stringify(artifact));
 console.log('[museum-offline] Self-contained runtime built; '+assetPaths.size+' static assets embedded.');
 return artifact;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve('scripts/build-museum-offline.mjs'))await buildMuseumOffline(process.argv[2]||'dist');
