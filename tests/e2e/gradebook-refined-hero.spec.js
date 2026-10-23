import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const styles = ['GradebookMacShell.css', 'GradebookHeroCanvas.css', 'GradebookHeroRefined.css']
 .map(name => readFileSync(new URL('../../src/styles/' + name, import.meta.url), 'utf8')).join('\n');
for (const width of [1440, 390]) {
  test(`Gradebook editorial Hero remains compact with legible functional controls at ${width}px`, async ({page}) => {
    await page.setViewportSize({width,height:900});
    await page.setContent(`
      <div id="root">
       <main class="gbmac-studio" style="padding:12px">
        <section class="gbmac-shell gbmac-hero-canvas gbmac-hero-refined has-custom-media"
          style="width:100%; --gbmac-hero-title:#193b68">
         <div class="gbmac-hero-media" aria-hidden="true"
              style="background:linear-gradient(120deg,#f9fbfd,#f7d5a6,#854c7f)"></div>
         <div class="gbmac-hero-content">
          <div class="gbmac-shell-head">
           <div class="gbmac-shell-identity">
            <span class="gbmac-shell-icon">▣</span>
            <div class="gbmac-shell-identity-copy">
             <div class="gbmac-shell-title"><h1>Sổ điểm</h1></div>
             <div class="gbmac-hero-meta"><span>28 học sinh</span><span class="gbmac-meta-dot"></span>
              <span>Tiếng Anh</span><span class="gbmac-meta-dot"></span><span>2026–2027</span></div>
            </div>
           </div>
           <button class="gbmac-hero-edit" aria-label="Chỉnh sửa Hero">✎</button>
          </div>
          <div class="gbmac-shell-selectors" role="group" aria-label="Chọn lớp và học kỳ">
           <label><span>Lớp học</span><select aria-label="Lớp học"><option>12.6</option><option>11.3</option></select></label>
           <label><span>Học kỳ</span><select aria-label="Học kỳ"><option>Học kỳ I</option><option>Học kỳ II</option></select></label>
          </div>
          <div class="gbmac-shell-utilities">
           <button>♙ Danh sách học sinh</button><button>＋ Thêm lớp</button>
           <span class="gbmac-hero-save-state"><i></i>Đã lưu</span>
          </div>
         </div>
        </section>
       </main>
      </div>`);
    await page.addStyleTag({content:styles});
    const metrics = await page.evaluate(() => {
      const bounds=(sel)=>{const x=document.querySelector(sel); const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,scrollWidth:x.scrollWidth}};
      const hero=bounds('.gbmac-hero-refined');
      const content=bounds('.gbmac-hero-content');
      const selects=[...document.querySelectorAll('.gbmac-shell-selectors label')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,height:r.height}});
      const buttons=[...document.querySelectorAll('.gbmac-shell-utilities button')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,height:r.height}});
      return {hero,content,selects,buttons,bodyScrollWidth:document.documentElement.scrollWidth};
    });
    expect(metrics.selects).toHaveLength(2);
    expect(metrics.selects[0].left).toBeLessThan(metrics.selects[1].left);
    for(const x of [...metrics.selects,...metrics.buttons]){
      expect(x.right).toBeLessThanOrEqual(metrics.hero.right+2);
      expect(x.height).toBeGreaterThanOrEqual(33);
    }
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(width+2);
    expect(metrics.content.right).toBeLessThanOrEqual(metrics.hero.right+2);
    if(width>680) {
      expect(metrics.hero.height).toBeLessThan(350);
      expect(metrics.content.width / metrics.hero.width).toBeLessThan(.68);
    } else {
      expect(metrics.content.width).toBeGreaterThan(metrics.hero.width*.9);
    }
    await page.getByRole('combobox',{name:'Lớp học'}).selectOption({label:'11.3'});
    await expect(page.getByRole('combobox',{name:'Lớp học'})).toHaveValue('11.3');
    await page.getByRole('combobox',{name:'Học kỳ'}).selectOption({label:'Học kỳ II'});
    await expect(page.getByRole('combobox',{name:'Học kỳ'})).toHaveValue('Học kỳ II');
  });
}
