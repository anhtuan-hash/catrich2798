import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const cssFiles=[
  'src/components/GlobalAttendanceNavigationTab.css',
  'src/components/attendance/AttendanceMaterial3.css',
  'src/components/attendance/AttendanceUnifiedDesign.css',
  'src/components/attendance/AttendanceTypography.css',
  'src/components/attendance/AttendanceTypographyViews.css',
  'src/components/attendance/AttendanceClassManagementWorkspace.css',
  'src/components/attendance/AttendanceMonthlyReport.css',
  'src/components/attendance/StudentAttendanceReport.css',
  'src/components/attendance/StudentAttendanceReportTheme.css',
  'src/components/attendance/AttendanceArchive.css',
  'src/pages/AttendanceWorkspace.css',
  'src/pages/AttendanceWorkspaceRebuilt.css',
];
const css=cssFiles.map(path=>readFileSync(path,'utf8')).join('\n');
const fixtures=[
  ['quick','Điểm danh nhanh','attendance-quick-layout','attendance-rollcall'],
  ['calendar','Lịch điểm danh','attendance-calendar-layout','attendance-daily-floor-card'],
  ['manage','Quản lý lớp học','attendance-manage-overview','attendance-manage-overview-toolbar'],
  ['history','Lịch sử điểm danh','ahv3__shell','ahv3__list'],
  ['report','Báo cáo chuyên cần','att-report-m3','att-report-m3__toolbar'],
  ['archive','Kho lưu trữ','attendance-archive','attendance-archive__hero'],
];
const HTML=(view,title,outer,panel)=>[
  '<main id="bes-main-content" data-route="attendance"><div class="attendance-workspace-page">',
  '<div class="attendance-standalone-root"><section class="attendance-shell is-standalone" role="region">',
  '<header class="attendance-topbar"><div class="attendance-title"><span>▣</span><div><small>ESL BRIAN</small><strong>Ứng dụng Điểm danh</strong></div></div></header>',
  '<nav class="attendance-tabs"><button type="button" class="is-active">Điểm danh nhanh</button><button type="button">Báo cáo</button></nav>',
  '<div class="attendance-content">',
  '<header class="awu-page-head" data-awu-page="'+view+'" data-testid="page-head">',
  '<div class="awu-page-head__identity"><span class="awu-page-head__icon">▦</span><div class="awu-page-head__copy">',
  '<div class="awu-page-head__breadcrumb">ESL Brian / Điểm danh</div><div class="awu-page-head__eyebrow">QUẢN LÝ CHUYÊN CẦN</div>',
  '<h1 data-testid="title">'+title+'</h1><p>Đồng bộ danh sách và điều hành buổi học</p></div></div>',
  '<div class="awu-page-head__right"><div class="awu-page-head__indicators"><div class="awu-page-head__indicator is-teal" data-testid="indicator"><span>Lớp học</span><b>24</b></div></div></div></header>',
  '<section class="'+outer+'"><div class="'+panel+'" data-testid="panel"><header class="awu-panel-head" data-testid="panel-header">',
  '<div class="awu-panel-head__copy"><span class="awu-panel-head__icon">▤</span><div><h2>Danh sách</h2><p>Thao tác theo chức năng</p></div></div></header>',
  '<label>Họ và tên <input data-testid="field" placeholder="Tìm kiếm"></label>',
  '<button data-testid="save" type="button">Lưu thay đổi</button><table><thead><tr><th>Học sinh</th></tr></thead><tbody><tr><td>Nguyễn Văn A</td></tr></tbody></table></div></section>',
  '</div></section></div></main>'
].join('');
const rgbColor=async(page,selector,prop)=>page.locator(selector).first().evaluate((el,p)=>getComputedStyle(el).getPropertyValue(p).trim(),prop);

for(const [view,title,outer,panel] of fixtures){
  test(view+' shares title, surface, controls and legible desktop type', async ({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await page.setContent(HTML(view,title,outer,panel));
    await page.addStyleTag({content:css});
    await expect(page.getByTestId('title')).toHaveText(title);
    expect(await rgbColor(page,'[data-testid=page-head]','background-color')).toBe('rgb(255, 255, 255)');
    const radius=parseFloat(await rgbColor(page,'[data-testid=page-head]','border-radius'));
    expect(radius).toBeGreaterThanOrEqual(16);
    expect(parseFloat(await rgbColor(page,'[data-testid=title]','font-size'))).toBeGreaterThanOrEqual(20);
    expect(parseFloat(await rgbColor(page,'[data-testid=field]','font-size'))).toBeGreaterThanOrEqual(13);
    expect(await rgbColor(page,'[data-testid=panel-header]','background-color')).toBe('rgb(255, 255, 255)');
    await expect(page.locator('.attendance-layer')).toHaveCount(0);
  });
}
test('narrow screen preserves reading order and form touch sizes',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.setContent(HTML('manage','Quản lý lớp học','attendance-manage-overview','attendance-manage-overview-toolbar'));
  await page.addStyleTag({content:css});
  const top=await page.getByTestId('page-head').boundingBox();
  const panel=await page.getByTestId('panel').boundingBox();
  expect(top.y).toBeLessThan(panel.y);
  expect(top.width).toBeGreaterThan(300);
  expect(parseFloat(await rgbColor(page,'[data-testid=field]','font-size'))).toBeGreaterThanOrEqual(16);
  expect((await page.locator('.attendance-tabs').evaluate(x=>getComputedStyle(x).flexDirection))).toBe('row');
});
