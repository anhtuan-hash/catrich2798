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
