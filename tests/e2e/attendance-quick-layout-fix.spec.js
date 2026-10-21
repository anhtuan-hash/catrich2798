import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const css=[
  'src/components/GlobalAttendanceNavigationTab.css',
  'src/components/attendance/AttendanceMaterial3.css',
  'src/components/attendance/AttendanceUnifiedDesign.css',
  'src/components/attendance/AttendanceTypography.css',
  'src/components/attendance/AttendanceTypographyViews.css',
  'src/components/attendance/AttendanceIphoneReadable.css',
  'src/pages/AttendanceWorkspace.css',
  'src/pages/AttendanceWorkspaceRebuilt.css',
  'src/pages/AttendanceQuickLayoutFix.css',
].map(path=>readFileSync(path,'utf8')).join('\n');

const rosterRow=(i)=>'<div class="att-m3-roster-entry is-present">'+
  '<label>'+
  '<span class="attendance-index">'+i+'</span>'+
  '<div><b>Nguyễn Hoàng Minh Anh</b><small>Không có mã HS</small></div>'+
  '<span class="attendance-school-class">11.6</span>'+
  '<div class="att-m3-attendance-status" role="group" aria-label="Trạng thái Nguyễn Hoàng Minh Anh">'+
  '<button data-status="present" class="is-active is-present" type="button">Có mặt</button>'+
  '<button data-status="late" type="button">Đi trễ</button>'+
  '<button data-status="absent" type="button">Vắng</button></div></label></div>';

const html=
  '<main id="bes-main-content" data-route="attendance"><div class="attendance-workspace-page">'+
  '<div class="attendance-standalone-root"><section class="attendance-shell is-standalone">'+
  '<header class="attendance-topbar"><div class="attendance-title"><span>▣</span><div><small>ESL Brian</small><strong>Điểm danh lớp phụ đạo & bồi dưỡng</strong></div></div></header>'+
  '<nav class="attendance-tabs"><button>Điểm danh</button><button>Báo cáo</button></nav>'+
  '<div class="attendance-content">'+
  '<div class="attendance-quick-layout" data-testid="quick-layout">'+
  '<aside class="attendance-class-list" data-testid="class-list"><header><strong>Lớp hoạt động</strong><span>28 lớp</span></header>'+
  '<div class="att-m3-class-discovery"><label>Tìm nhanh lớp<input placeholder="Tên lớp"></label></div>'+
  '<div>'+Array.from({length:20},(_,i)=>'<button type="button">Bồi dưỡng Lịch sử 11 - '+i+'</button>').join('')+'</div></aside>'+
  '<section class="attendance-rollcall" data-testid="rollcall">'+
  '<header class="attendance-rollcall-head"><div><h2>Bồi dưỡng Lịch sử 11</h2></div></header>'+
  '<div class="attendance-session-controls"><label>Giáo viên<select><option>Giáo viên</option></select></label></div>'+
  '<div class="attendance-roster-head"><span>Học sinh</span><span>Lớp chính khóa</span><span>Trạng thái</span></div>'+
  '<div class="attendance-roster" data-testid="roster">'+Array.from({length:25},(_,i)=>rosterRow(i+1)).join('')+'</div>'+
  '<section class="att-m3-proof-card">Minh chứng hình ảnh</section>'+
  '<footer class="attendance-confirm-bar"><label>Ghi chú<input></label><div class="att-m3-session-actions"><button>Xác nhận điểm danh</button></div></footer>'+
  '</section></div></div></section></div></div></main>';

const rect=(page,selector)=>page.locator(selector).first().boundingBox();
const statusRects=async(page)=>page.locator('.att-m3-roster-entry').first()
  .locator('.att-m3-attendance-status button').evaluateAll(btns=>btns.map(b=>{
    const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,text:b.textContent};
  }));
async function setup(page,width) {
  await page.setViewportSize({width,height:900});
  await page.setContent(html);
  await page.addStyleTag({content:css});
}
for (const width of [2048,1440,1200,760,390]) {
  test('rollcall does not overlap status buttons at '+width+'px',async({page})=>{
    await setup(page,width);
    const [present,late,absent]=await statusRects(page);
    for (const b of [present,late,absent]) {
      expect(b.w,'status button must be wider than its text').toBeGreaterThan(55);
      expect(b.h).toBeGreaterThanOrEqual(32);
    }
    expect(present.x+present.w+2).toBeLessThanOrEqual(late.x+3);
    expect(late.x+late.w+2).toBeLessThanOrEqual(absent.x+3);
    const group=await rect(page,'.att-m3-attendance-status');
    const row=await rect(page,'.att-m3-roster-entry>label');
    expect(group.x).toBeGreaterThanOrEqual(row.x-1);
    expect(group.x+group.width).toBeLessThanOrEqual(row.x+row.width+1);
    expect(group.y+group.height).toBeLessThanOrEqual(row.y+row.height+2);
    await expect(page.getByTestId('class-list')).toBeVisible();
    await expect(page.locator('.attendance-roster .att-m3-roster-entry')).toHaveCount(25);
    const pageBox=await rect(page,'.attendance-content');
    const rollBox=await rect(page,'[data-testid=rollcall]');
    expect(rollBox.x+rollBox.width).toBeLessThanOrEqual(pageBox.x+pageBox.width+2);
    const xOverflow=await page.locator('.attendance-content').evaluate(el=>el.scrollWidth-el.clientWidth);
    expect(xOverflow,'quick pane must not create sideways overflow').toBeLessThanOrEqual(5);
  });
}
test('small screens put controls under student details',async({page})=>{
  await setup(page,390);
  const student=await rect(page,'.attendance-roster .att-m3-roster-entry>label>div:nth-child(2)');
  const status=await rect(page,'.att-m3-attendance-status');
  expect(status.y).toBeGreaterThan(student.y);
  const list=await rect(page,'[data-testid=class-list]');
  const roll=await rect(page,'[data-testid=rollcall]');
  expect(roll.y).toBeGreaterThan(list.y);
  expect(list.height).toBeLessThanOrEqual(370);
});
test('quick attendance supports natural content height without clipping',async({page})=>{
  await setup(page,1440);
  const lastRow=await page.locator('.att-m3-roster-entry').last().boundingBox();
  const footer=await rect(page,'.attendance-confirm-bar');
  expect(footer.y).toBeGreaterThan(lastRow.y);
  expect(await page.getByTestId('roster').evaluate(el=>getComputedStyle(el).overflowY)).toBe('visible');
});
