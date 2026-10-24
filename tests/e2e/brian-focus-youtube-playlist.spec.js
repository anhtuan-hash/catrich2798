import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const bundled = await build({
  entryPoints:[fileURLToPath(new URL('../fixtures/focusYoutubePlaylistHarness.jsx',import.meta.url))],
  outfile:'playlist-harness.js',bundle:true,write:false,platform:'browser',
  format:'iife',jsx:'automatic',loader:{'.css':'empty'},
  define:{'process.env.NODE_ENV':'"production"','import.meta.env':'{}'},
});
const js=bundled.outputFiles.find(f=>f.path.endsWith('.js')).text;
// Use the real import ordering instead of a partial CSS fixture. This catches
// global Focus 6/7/8 controls overriding the textarea's dark appearance.
const focusSource=readFileSync(new URL('../../src/components/BrianFocus/BrianFocus.jsx',import.meta.url),'utf8');
const cssImports=focusSource.split('\n')
  .filter(line=>line.startsWith("import './") && line.trim().endsWith(".css';"))
  .map(line=>line.split("'")[1].slice(2));
const stylesheet=cssImports.map(name=>
  readFileSync(new URL('../../src/components/BrianFocus/'+name,import.meta.url),'utf8')).join('\n');

const first='dQw4w9WgXcQ',second='aBcD1234_Xy',third='ZyXw9876_Ab';
async function setup(page) {
  await page.route('**/www.youtube-nocookie.com/**', route=>route.abort());
  await page.setContent('<html><head><meta charset="utf-8"></head><body style="margin:0;background:#0d1a34"><div id="root"></div></body></html>');
  await page.addStyleTag({content:stylesheet});
  await page.addScriptTag({content:js});
  await expect(page.getByRole('region',{name:'Cài đặt nền Focus dùng chung'})).toBeVisible();
}
for(const viewport of [{width:1366,height:900},{width:390,height:844}]) {
  test(`Focus Scene Studio accepts and edits an ordered YouTube playlist on ${viewport.width}px`,async ({page})=>{
    await page.setViewportSize(viewport);
    await setup(page);
    const field=page.locator('#bfc-youtube-url');
    await expect(field).toHaveValue('https://www.youtube.com/watch?v='+first);
    await field.fill(['https://www.youtube.com/watch?v='+first,'https://youtu.be/'+second,'https://youtu.be/'+third].join('\n'));
    await expect(page.getByText('3 video hợp lệ')).toBeVisible();
    // Regression: screenshot reported a native white textarea that expanded
    // outside its dark container and covered the helper/status text.
    const layout=await page.locator('#bfc-youtube-url').evaluate(area=>{
      const shell=area.closest('.bfc-scene-editor__youtube-input');
      const field=area.closest('.bfc-scene-editor__youtube-field');
      const help=field.querySelector('#bfc-youtube-playlist-hint');
      const a=area.getBoundingClientRect(),w=shell.getBoundingClientRect(),
        h=help.getBoundingClientRect();
      const style=getComputedStyle(area);
      return {
        areaLeft:a.left,areaRight:a.right,areaBottom:a.bottom,
        shellLeft:w.left,shellRight:w.right,shellBottom:w.bottom,
        helperTop:h.top,viewportWidth:window.innerWidth,
        bodyWidth:document.documentElement.scrollWidth,
        background:style.backgroundColor,color:style.color,
        minWidth:style.minWidth,boxSizing:style.boxSizing,
      };
    });
    expect(layout.background).toBe('rgba(0, 0, 0, 0)');
    expect(layout.color).toBe('rgb(234, 243, 255)');
    expect(layout.boxSizing).toBe('border-box');
    expect(layout.areaLeft).toBeGreaterThan(layout.shellLeft+18);
    expect(layout.areaRight).toBeLessThanOrEqual(layout.shellRight-7);
    expect(layout.areaBottom).toBeLessThanOrEqual(layout.shellBottom);
    expect(layout.helperTop).toBeGreaterThanOrEqual(layout.shellBottom-1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth+1);
    const items=page.locator('.bfc-scene-editor__playlist-item');
    await expect(items).toHaveCount(3);
    const src=await page.locator('.bfc-scene-editor__youtube-player').getAttribute('src');
    const u=new URL(src);
    expect(u.pathname).toBe('/embed/'+first);
    expect(u.searchParams.get('playlist')).toBe(second+','+third);
    await page.getByRole('button',{name:'Đưa video 2 lên'}).click();
    const after=new URL(await page.locator('.bfc-scene-editor__youtube-player').getAttribute('src'));
    expect(after.pathname).toBe('/embed/'+second);
    expect(after.searchParams.get('playlist')).toBe(first+','+third);
    await page.getByRole('button',{name:'Xóa video 2'}).click();
    await expect(items).toHaveCount(2);
    const remaining=await field.inputValue();
    expect(remaining).not.toContain(first);
    await field.fill('https://fake-youtube.com/watch?v='+first);
    await expect(page.locator('.bfc-scene-editor__youtube-status.is-invalid')).toBeVisible();
    await expect(page.locator('.bfc-scene-editor__playlist-item')).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  });
}
