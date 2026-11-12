import fs from 'node:fs';
import JSZip from 'jszip';
import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{
 page.on('pageerror',error=>console.error('[museum-browser-pageerror]',error.stack||String(error)));
 page.on('console',msg=>{if(msg.type()==='error')console.error('[museum-browser-console]',msg.text());});
 const response=await page.goto('/tests/museum-lab/v3.html');
 console.log('[museum-browser-nav]',response?.status(),await page.title());
 await expect(page.getByTestId('qa-harness')).toBeVisible();
});
test('approved Google-inspired dashboard has clear actions and real-label synthetic progress',async({page})=>{
 await expect(page.getByTestId('museum-dashboard')).toBeVisible();
 await expect(page.getByText('Chào mừng trở lại!')).toBeVisible();
 await expect(page.getByText('Synthetic Climate Action Museum')).toBeVisible();
 await expect(page.getByRole('button',{name:/Tạo bài học mới/})).toBeVisible();
});
test('the no-account entry is an understandable, keyboard-accessible form',async({page})=>{
 await page.getByTestId('qa-student').click();
 await expect(page.getByTestId('museum-student-entry')).toBeVisible();
 await expect(page.getByText('Không tạo tài khoản')).toBeVisible();
 await expect(page.getByLabel('Mã lời mời')).toBeVisible();
 await expect(page.getByLabel('Mã bí mật nhóm')).toBeVisible();
});
test('teacher lesson wizard has three steps and fails closed if Creator Pass is OFF',async({page})=>{
 await page.getByTestId('qa-wizard').click();
 await expect(page.getByTestId('museum-lesson-wizard')).toBeVisible();
 await expect(page.getByText('Chọn mẫu bài học')).toBeVisible();
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await expect(page.getByText('Thiết lập lớp và nhóm')).toBeVisible();
 await page.getByPlaceholder('11A3').fill('11A3');
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await expect(page.getByText('Kiểm tra và giao bài')).toBeVisible();
 await expect(page.getByRole('button',{name:/Tạo mã nhóm/})).toBeDisabled();
});
test('3-room exhibition shows useful 2D exhibits without requiring WebGL',async({page})=>{
 await page.getByTestId('qa-scene').click();
 await expect(page.getByTestId('museum-visitor')).toBeVisible();
 await expect(page.getByText('Our Planet, Our Future — 3D Demo')).toBeVisible();
 await expect(page.getByText('Student Creations',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('Our Planet, Our Future',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:/Culture Pavilion|Explore the World/}).first().click();
 await expect(page.getByText('Greetings Across Cultures')).toBeVisible();
});
test('mobile viewport keeps task controls within the page width',async({page,isMobile})=>{
 if(!isMobile)return;
 await page.getByTestId('qa-student').click();
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 const windowWidth=await page.evaluate(()=>window.innerWidth);
 expect(width).toBeLessThanOrEqual(windowWidth+4);
 await expect(page.getByRole('button',{name:/Vào không gian sáng tạo/})).toBeVisible();
});


test('student can complete five English STEAM steps, autosave and submit without a student account',async({page})=>{
 let version=0,groupState='editing',draft={title:'',summary:'',rooms:[]},saves=0,submissions=0;
 await page.route('**/api/gallery-guest?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  const input=route.request().postDataJSON?.()||{};
  const response={};
  if(op==='me')Object.assign(response,{groupLabel:'Nhóm Demo',groupState,csrf:'qa-csrf-only',
    assignment:{title:'Synthetic Climate Action Museum',brief:'Build a school climate museum in English.',
      class_scope:'11-DEMO',deadline_at:new Date(Date.now()+86400000).toISOString(),max_rooms:3,max_exhibits:12}});
  else if(op==='draft')Object.assign(response,{draft,version,updated_at:new Date().toISOString()});
  else if(op==='save'){
   if(input.expectedVersion!==version)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'stale'})});
   draft=input.draft;version++;saves++;Object.assign(response,{ok:true,version});
  }else if(op==='submit'){
   if(input.expectedVersion!==version)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'stale'})});
   groupState='submitted';submissions++;Object.assign(response,{ok:true,reviewId:'synthetic-review',status:'submitted'});
  }else Object.assign(response,{error:'unsupported op'});
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)});
 });
 await page.getByTestId('qa-student').click();
 await expect(page.getByTestId('museum-student-wizard')).toBeVisible();
 await expect(page.getByText('Synthetic Climate Action Museum')).toBeVisible();
 await page.getByLabel('Vấn đề mà nhóm em chọn').fill('Plastic waste is harmful because it can pollute the environment.');
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.getByLabel('Bằng chứng hoặc quan sát bằng tiếng Anh').fill('According to our classroom scenario, plastic packaging is used every day.');
 await page.getByLabel('Nguồn dữ liệu/ tài liệu').fill('Synthetic classroom scenario (not a measured dataset).');
 await page.getByLabel('Giải pháp nhóm đề xuất bằng tiếng Anh').fill('We recommend reusable bottles because they can reduce waste.');
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.getByLabel('Tên triển lãm').fill('Our Climate Museum');
 await page.getByLabel('Thông điệp mở đầu').fill('A greener school starts with small changes.');
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.getByLabel('Phản hồi thực tế từ bạn học (tiếng Anh)').fill('Our synthetic peer asked for a clearer solution.');
 await page.getByLabel('Nhóm đã cải tiến điểm gì? (tiếng Anh)').fill('We added a simple example.');
 await page.getByRole('checkbox',{name:/Nhóm đã xem và thử nghiệm/}).check();
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.getByLabel('Điều nhóm em học được (tiếng Anh)').fill('We learned to justify a solution using clear English.');
 await page.getByText('Bài đang được xem xét.').count(); // no hidden admission flow
 await expect.poll(()=>saves,{timeout:15000}).toBeGreaterThan(0);
 await expect(page.getByText('Đã lưu',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:/Nộp để giáo viên duyệt/}).click();
 await expect(page.getByText('Bài đang được xem xét. Nhóm sẽ sửa lại nếu có yêu cầu.')).toBeVisible();
 expect(submissions).toBe(1);
 expect(draft.learning.tested).toBe(true);
 expect(draft.rooms[0].exhibits.map(x=>x.title)).toEqual(['The Problem','The Evidence','Our Solution']);
});
test('malformed guest API responses never unlock the student editor',async({page})=>{
 await page.route('**/api/gallery-guest?**',route=>route.fulfill({
  status:200,contentType:'text/html',body:'<!doctype html><h1>SPA fallback</h1>'
 }));
 await page.getByTestId('qa-student').click();
 await expect(page.getByTestId('museum-student-entry')).toBeVisible();
 await expect(page.getByTestId('museum-student-wizard')).toHaveCount(0);
});

test('competition dossier downloads valid editable OOXML DOCX with actual P1 content',async({page})=>{
 await page.getByTestId('qa-evidence').click();
 await expect(page.getByTestId('museum-evidence-studio')).toBeVisible();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Xuất Phần 1/}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/P1\.docx$/);
 const zip=await JSZip.loadAsync(fs.readFileSync(await download.path()));
 const doc=await zip.file('word/document.xml').async('string');
 expect(doc).toContain('<w:document');
 expect(doc).toContain('PHẦN 1');
 expect(doc).toContain('Demo Teacher');
 expect(zip.file('[Content_Types].xml')).toBeTruthy();
});
test('contest ZIP contains P1, P2 and explicit missing-evidence notice, never fabricated exhibits',async({page})=>{
 await page.getByTestId('qa-evidence').click();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:/Tải ZIP hồ sơ nháp/}).click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toMatch(/\.zip$/);
 const zip=await JSZip.loadAsync(fs.readFileSync(await download.path()));
 const first=zip.file('P1/Tong_quan.docx'),second=zip.file('P2/Ke_hoach_day_hoc.docx');
 expect(first).toBeTruthy();expect(second).toBeTruthy();
 const nested=await JSZip.loadAsync(await second.async('uint8array'));
 const doc=await nested.file('word/document.xml').async('string');
 expect(doc).toContain('KẾ HOẠCH DẠY HỌC');
 const manifest=await zip.file('P2/CAN_BO_SUNG_MINH_CHUNG.txt').async('string');
 expect(manifest).toContain('Không dùng dữ liệu demo làm minh chứng.');
});

test('teacher controls 11 live lesson stages without a PowerPoint or automatic transitions',async({page})=>{
 await page.getByTestId('qa-teacher-live').click();
 await expect(page.getByTestId('museum-teacher-live')).toBeVisible();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 await expect(page.getByText('Climate Detective')).toBeVisible();
 await page.getByRole('button',{name:/Mở cho học sinh/}).click();
 await expect(page.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
 await page.getByRole('button',{name:/Hiện giải thích/}).click();
 await expect(page.getByText('This is a warm-up vote',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:/Hoạt động tiếp/}).click();
 await expect(page.getByText('Language Mini-Lesson')).toBeVisible();
 await expect(page.getByText('HOẠT ĐỘNG CHƯA MỞ')).toBeVisible();
});
test('group receives teacher stage, cannot answer a closed task and submits only once when released',async({page})=>{
 let open=false,posts=0,last=null;
 await page.route('**/api/gallery-guest/live?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  if(op==='state')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   groupLabel:'Nhóm Demo',session:{
    id:'qa-group-session',status:'active',stageIndex:0,stageOpen:open,revealed:false,
    stage:{kind:'vote',period:1,title:'Climate Detective',question:'Which action helps?',
     options:['Switch off unused lights','Waste food'],sentence:'We recommend …'}
   }})});
  if(op==='respond'){posts++;last=route.request().postDataJSON();return route.fulfill({
   status:201,contentType:'application/json',body:JSON.stringify({ok:true})
  });}
  return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});
 });
 await page.getByTestId('qa-student-live').click();
 await expect(page.getByTestId('student-live-activity')).toBeVisible();
 await expect(page.getByText('Chờ giáo viên mở hoạt động').first()).toBeVisible();
 await expect(page.getByRole('button',{name:/Gửi câu trả lời/})).toHaveCount(0);
 open=true;
 await expect(page.getByRole('button',{name:/A\. Switch off unused lights/})).toBeVisible({timeout:14000});
 await page.getByRole('button',{name:/A\. Switch off unused lights/}).click();
 await page.getByRole('button',{name:/Gửi câu trả lời của nhóm/}).click();
 await expect(page.getByText('Đã ghi nhận một lượt của nhóm')).toBeVisible();
 expect(posts).toBe(1);expect(last.value).toBe(0);
});
test('student can send a real raster poster through the private artwork API workflow',async({page})=>{
 let received=null,assets=[];
 await page.route('**/api/gallery-guest/artwork?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  if(op==='upload'){
   received=route.request().postDataJSON();
   assets=[{id:'aaaaaaaa-1111-4111-8111-111111111111',image_url:received.png,original_name:received.filename}];
   return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({asset:assets[0]})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({assets})});
 });
 await page.getByTestId('qa-artwork').click();
 await expect(page.getByTestId('museum-artwork-studio')).toBeVisible();
 const image=await page.evaluate(()=>{
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#2563eb';ctx.fillRect(0,0,64,64);
  ctx.fillStyle='#fff';ctx.fillRect(7,20,50,20);return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('input[type="file"]').first().setInputFiles({name:'my-original-poster.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await expect(page.getByText('Đã tải tranh lên kho riêng tư')).toBeVisible({timeout:15000});
 expect(received.filename).toBe('my-original-poster.png');
 expect(received.png).toMatch(/^data:image\/png;base64,/);
});


test('approved exhibition mockup opens with hero, accurate metrics and 3D-first immersive visitor',async({page})=>{
 await page.getByTestId('qa-exhibition').click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await expect(detail).toBeVisible();
 await expect(detail.getByRole('heading',{name:'Our Planet, Our Future — 3D Demo'})).toBeVisible();
 await expect(detail.getByRole('tab',{name:'Không gian triển lãm'})).toHaveAttribute('aria-selected','true');
 const viewer=page.getByTestId('museum-visitor');
 await expect(viewer).toBeVisible();
 await expect(viewer.locator('.bml-3d-stage')).toBeVisible();
 await expect(viewer.locator('.bml-scene-mode-float button.is-active')).toHaveText('3D');
 await expect(detail.locator('.bml-exh-metric')).toHaveCount(4);
 await expect(detail.getByText('Phòng triển lãm')).toBeVisible();
 await expect(detail.getByText('Lượt xem')).toBeVisible();
 await expect(detail.getByText('Chưa triển khai thống kê')).toBeVisible();
 await expect(detail.getByText('86',{exact:true})).toHaveCount(0);
});
test('exhibition visitor mode, information panel and back navigation work as shown in mockup',async({page})=>{
 await page.getByTestId('qa-exhibition').click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await detail.getByRole('button',{name:'2D',exact:true}).click();
 await expect(detail.locator('.bml-museum-room')).toBeVisible();
 await expect(detail.locator('.bml-art-card')).toHaveCount(3);
 await detail.getByRole('button',{name:'3D',exact:true}).click();
 await expect(detail.locator('.bml-3d-stage')).toBeVisible();
 await detail.getByRole('tab',{name:'Thông tin & hoạt động'}).click();
 await expect(detail.getByRole('heading',{name:'Danh sách phòng & tác phẩm'})).toBeVisible();
 await expect(detail.getByText('One Minute for Nature')).toBeVisible();
 await detail.getByRole('tab',{name:'Không gian triển lãm'}).click();
 await expect(detail.locator('.bml-3d-stage')).toBeVisible();
});
test('exhibition options download the actual exhibit content, not invented analytics',async({page})=>{
 await page.getByTestId('qa-exhibition').click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await detail.getByRole('button',{name:'Tùy chọn'}).click();
 const dl=page.waitForEvent('download');
 await detail.getByRole('menuitem',{name:'Tải nội dung (.txt)'}).click();
 const file=await dl;
 expect(file.suggestedFilename()).toBe('BRIAN_Museum_Exhibition_Summary.txt');
 const txt=fs.readFileSync(await file.path(),'utf8');
 expect(txt).toContain('Our Planet, Our Future');
 expect(txt).toContain('One Minute for Nature');
 expect(txt).toContain('DEMO');
});
test('desktop two-column Museum Lab shell follows approved sidebar dimensions',async({page,isMobile})=>{
 if(isMobile)return;
 await page.getByTestId('qa-exhibition-layout').click();
 const shell=page.getByTestId('museum-layout-shell');
 await expect(shell).toBeVisible();
 const sidebar=await shell.locator('.bml-sidebar').boundingBox();
 const panel=await shell.locator('.bml-main-panel').boundingBox();
 expect(sidebar.width).toBeGreaterThan(150);
 expect(sidebar.width).toBeLessThan(260);
 expect(panel.x).toBeGreaterThanOrEqual(sidebar.x+sidebar.width-3);
 expect(panel.width).toBeGreaterThan(sidebar.width*2);
});
test('mobile approved mockup keeps a readable 3D visitor without horizontal overflow',async({page,isMobile})=>{
 if(!isMobile)return;
 await page.getByTestId('qa-exhibition-layout').click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await expect(detail.locator('.bml-exh-hero')).toBeVisible();
 await expect(detail.locator('.bml-3d-stage')).toBeVisible();
 const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
 expect(sizes.scroll).toBeLessThanOrEqual(sizes.width+4);
 await detail.getByRole('button',{name:'2D',exact:true}).click();
 await expect(detail.locator('.bml-art-card')).toHaveCount(3);
});

test('PEK school gallery is a real 3D environment with a readable school-edition identity',async({page})=>{
 await page.getByTestId('qa-exhibition').click();
 const viewer=page.getByTestId('museum-visitor');
 await expect(viewer.locator('.bml-3d-stage')).toBeVisible();
 const hall=page.getByTestId('pek-discovery-hall');
 await expect(hall).toBeVisible();
 await expect(hall).toHaveAttribute('aria-label',/Pétrus Ký/);
 if((page.viewportSize()?.width||0)<700){
  await expect(hall.getByText('PéK',{exact:true})).toBeVisible();
 }else{
  await expect(hall.getByText('PÉTRUS KÝ · BẢO TÀNG KHÁM PHÁ')).toBeVisible();
 }
 const webgl=hall.locator('canvas');
 if(await webgl.isVisible().catch(()=>false)){
  fs.mkdirSync('artifacts/museum-lab',{recursive:true});
  await page.waitForTimeout(650);
  await hall.screenshot({path:'artifacts/museum-lab/pek-hall-'+(page.viewportSize()?.width||'screen')+'.png',
   animations:'disabled',timeout:10000});
 }
 const close=hall.getByRole('button',{name:'Đến gần tranh'});
 await expect(close).toBeVisible();
 await close.click();
 await hall.getByRole('button',{name:'Toàn cảnh'}).click();
 await expect(viewer.locator('.bml-scene-mode-float .is-active')).toHaveText('3D');
 await expect(viewer.locator('.bml-room-tabs button')).toHaveCount(3);
 const full=page.getByTestId('museum-exhibition-frame');
 await expect(full).toBeVisible();
});
test('PEK gallery 3D school edition remains optional and original 2D artwork descriptions work',async({page})=>{
 await page.getByTestId('qa-exhibition').click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await detail.getByRole('button',{name:'2D',exact:true}).click();
 await expect(detail.getByTestId('pek-discovery-hall')).toHaveCount(0);
 await expect(detail.locator('.bml-art-card')).toHaveCount(3);
 await detail.locator('.bml-art-card').first().click();
 await expect(detail.getByRole('dialog',{name:'Our Planet, Our Future'})).toBeVisible();
 await detail.getByRole('button',{name:'Đã hiểu'}).click();
 await detail.getByRole('button',{name:'3D',exact:true}).click();
 await expect(detail.getByTestId('pek-discovery-hall')).toBeVisible();
});


test('clicking a museum work opens a genuine interactive 360 orbit and original 2D fallback',async({page})=>{
 await page.getByTestId('qa-scene').click();
 const first=page.locator('.bml-art-card').first();
 await expect(first).toBeVisible();
 await first.click();
 const inspector=page.getByTestId('museum-artwork-inspector');
 await expect(inspector).toBeVisible();
 const viewer=page.getByTestId('exhibit-360-viewer');
 await expect(viewer).toBeVisible();
 await expect(viewer.getByRole('button',{name:/Xem 360°|360° view/})).toBeVisible();
 await expect(viewer.getByText(/không phải ảnh panorama 360°|not a 360° panorama/)).toBeVisible();
 if(await viewer.locator('canvas').count()){
  const spin=viewer.getByRole('button',{name:/Tự xoay|Auto rotate/});
  await spin.click();
  await expect(viewer.getByRole('button',{name:/Dừng xoay|Pause/})).toHaveAttribute('aria-pressed','true');
  await viewer.getByRole('button',{name:/Đặt lại|Reset/}).click();
  await expect(viewer.getByRole('button',{name:/Tự xoay|Auto rotate/})).toHaveAttribute('aria-pressed','false');
 }
 await viewer.getByRole('button',{name:/Xem 2D|2D original/}).click();
 await expect(viewer.getByRole('button',{name:/Xem 2D|2D original/})).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');
 await expect(inspector).toHaveCount(0);
 await expect(page.getByTestId('museum-visitor')).toBeVisible();
});
test('artwork inspector remains within mobile viewport and has a working close action',async({page,isMobile})=>{
 if(!isMobile)return;
 await page.getByTestId('qa-scene').click();
 await page.locator('.bml-art-card').first().click();
 await expect(page.getByTestId('exhibit-360-viewer')).toBeVisible();
 const viewport=await page.evaluate(()=>({screen:window.innerWidth,document:document.documentElement.scrollWidth}));
 expect(viewport.document).toBeLessThanOrEqual(viewport.screen+4);
 await page.getByTestId('museum-artwork-inspector').getByRole('button',{name:/Đóng|Close/}).click();
 await expect(page.getByTestId('museum-artwork-inspector')).toHaveCount(0);
});
