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
test('English-only student route shows only English access, privacy and passcode instructions',async({page})=>{
 await page.getByTestId('qa-student-en').click();
 const entry=page.getByTestId('museum-student-entry');
 await expect(entry).toBeVisible();
 await expect(entry.getByRole('heading',{name:'Start creating'})).toBeVisible();
 await expect(entry.getByText('No account needed')).toBeVisible();
 await expect(entry.getByLabel('Invitation code')).toBeVisible();
 await expect(entry.getByLabel('Private group passcode')).toBeVisible();
 expect((await entry.innerText())).not.toMatch(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u);
});
test('English-only teacher, lesson wizard, reviews and dossier show translated UI',async({page})=>{
 const assertOnlyEnglish=async()=>{
  const visible=await page.locator('.bml').first().innerText();
  expect(visible).not.toMatch(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u);
 };

 await page.getByTestId('qa-teacher-live-en').click();
 await expect(page.getByRole('heading',{name:'Teacher Live'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Start lesson/})).toBeVisible();
 await assertOnlyEnglish();
 await page.getByRole('button',{name:/Start lesson/}).click();
 await expect(page.getByTestId('museum-live-slide')).toBeVisible();
 await expect(page.getByText('Climate Detective')).toBeVisible();
 await expect(page.locator('.bml-live-vietnamese')).toHaveCount(0);
 await assertOnlyEnglish();
 await page.getByTestId('qa-wizard-en').click();
 await expect(page.getByRole('heading',{name:'Create a new lesson'})).toBeVisible();
 await assertOnlyEnglish();
 await page.getByTestId('qa-admin-review-en').click();
 await expect(page.getByRole('heading',{name:'Student submissions'})).toBeVisible();
 await assertOnlyEnglish();
 await page.getByTestId('qa-evidence-en').click();
 await expect(page.getByText('Section 1: Teacher and school context')).toBeVisible();
 await assertOnlyEnglish();
});
test('English-only group workspace shows no Vietnamese UI in all five project steps',async({page})=>{
 await page.route('**/api/gallery-guest?**',async route=>{
  const operation=new URL(route.request().url()).searchParams.get('operation');
  const body=operation==='me'?{groupLabel:'Nhóm 01',groupState:'editing',csrf:'english-only-qa',
   assignment:{title:'Our Climate Action Museum',brief:'Investigate one school climate action using real evidence.',
    class_scope:'11-DEMO',deadline_at:new Date(Date.now()+86400000).toISOString()}}:
   {draft:{title:'',summary:'',rooms:[]},version:0};
  await route.fulfill({json:body});
 });
 await page.route('**/api/gallery-guest/live?**',route=>route.fulfill({json:{session:null,survey:null}}));
 await page.getByTestId('qa-student-en').click();
 const app=page.getByTestId('museum-student-wizard');
 await expect(app).toBeVisible();
 await expect(app).toHaveAttribute('lang','en');
 await expect(app.getByText('Group 01')).toBeVisible();
 for(let step=0;step<5;step++){
  await app.locator('.bml-student-steps button').nth(step).click();
  await expect(app.locator('.bml-student-task')).toBeVisible();
  if(step===1||step===2){
   for(const index of step===1?[0,1]:[0,1,2]){
    await app.locator('.bml-student-subpages button').nth(index).click();
    const visible=await app.innerText();
    expect(visible).not.toMatch(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u);
   }
  }
  const visible=await app.innerText();
  expect(visible).not.toMatch(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u);
  const placeholders=await app.locator('input,textarea').evaluateAll(elements=>elements.map(x=>x.placeholder||'').join(' '));
  expect(placeholders).not.toMatch(/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃĂẰẮẶẲẴÂẦẤẬẨẪÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/u);
 }
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
 await expect(page.getByRole('heading',{name:'Kế hoạch bài dạy'})).toBeVisible();
 const plan=page.getByTestId('museum-single-unit5-plan');
 await expect(plan).toBeVisible();
 await expect(plan.getByRole('heading',{name:'Our Climate Action Museum'})).toBeVisible();
 await expect(plan).toContainText('Global Warming');
 await expect(page.locator('.bml-single-period')).toHaveCount(2);
 await expect(page.locator('.bml-single-period li')).toHaveCount(11);
 await expect(page.getByText('Protecting Marine Life',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Sustainable School',{exact:true})).toHaveCount(0);
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



test('FULL BRIAN ENTRYPOINT: Group 01 can tap live answers and edit with no global shell interception',async({page,isMobile})=>{
 // Unlike the isolated Museum harness, this loads the actual src/main.jsx entrypoint,
 // which previously mounted floating Brian tools and transformed layout layers.
 let posts=0,saves=0,version=0;
 let draft={title:'',summary:'',rooms:[]};
 await page.route('**/api/gallery-guest?**',async route=>{
  const operation=new URL(route.request().url()).searchParams.get('operation');
  if(operation==='me')return route.fulfill({json:{
   groupLabel:'Nhóm 01',groupState:'issued',csrf:'safe-synthetic-csrf',uploadEnabled:true,
   assignment:{title:'Our Climate Action Museum',brief:'Original group project',class_scope:'11.3',
    deadline_at:new Date(Date.now()+86400000).toISOString(),max_rooms:3,max_exhibits:12}
  }});
  if(operation==='draft')return route.fulfill({json:{draft,version}});
  if(operation==='save'){
   let input=route.request().postDataJSON();
   expect(input.expectedVersion).toBe(version);
   draft=input.draft;version++;saves++;
   return route.fulfill({json:{version,ok:true}});
  }
  return route.fulfill({json:{ok:true}});
 });
 await page.route('**/api/gallery-guest/live?**',async route=>{
  const operation=new URL(route.request().url()).searchParams.get('operation');
  if(operation==='respond'){
   expect(route.request().postDataJSON().value).toBe(1);posts++;
   return route.fulfill({status:201,json:{ok:true}});
  }
  if(operation==='need-help')return route.fulfill({json:{ok:true}});
  return route.fulfill({json:{session:{
    id:'full-entry-stage-one',status:'active',stageIndex:0,stageOpen:true,
    stage:{id:'climate-detective',kind:'vote',title:'Climate Detective',period:1,
     question:'Which everyday school action could best reduce our environmental impact?',
     options:['Walking or cycling when possible','Switching off unused lights','Reducing food waste','I am not sure yet'],
     sentence:'I think … because …'}
   },survey:null,submitted:posts>0}});
 });
 const res=await page.goto('/#/gallery-create?invite=synthetic-public-handle');
 expect(res?.status()).toBe(200);
 const root=page.getByTestId('museum-student-wizard');
 await expect(root).toBeVisible({timeout:18000});
 // The student page must be a direct fullscreen workspace, never a child of
 // the authenticated/global application shell, chat, and floating tools.
 await expect(page.locator('.app-shell')).toHaveCount(0);
 await expect(page.locator('#bes-main-content')).toHaveCount(0);
 await expect(page.getByTestId('student-tab-live')).toHaveAttribute('aria-pressed','true',{timeout:15000});
 const option=page.getByRole('button',{name:/B\. Switching off unused lights/});
 await expect(option).toBeEnabled();
 await option.scrollIntoViewIfNeeded();
 await expect(option).toBeInViewport();
 const hit=await option.evaluate(el=>{
  const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {hit:top===el||el.contains(top),element:top?.tagName};
 });
 expect(hit.hit).toBe(true);
 const submit=page.getByRole('button',{name:'Submit group response'});
 await expect(submit).toBeDisabled();
 await option.click();
 await expect(option).toHaveAttribute('aria-pressed','true');
 await expect(submit).toBeEnabled();
 await submit.click();
 await expect(page.getByTestId('student-action-notice')).toContainText('Your group response was saved');
 expect(posts).toBe(1);
 await page.getByTestId('student-tab-studio').click();
 await expect(page.getByLabel('Describe your problem')).toBeEnabled();
 await page.getByLabel('Describe your problem').fill('Our school leaves unused lights switched on.');
 await expect.poll(()=>saves,{timeout:16000}).toBeGreaterThan(0);
 await page.locator('.bml-student-steps button').nth(2).click();
 await expect(page.getByLabel('Exhibition title')).toBeEnabled();
 if(!isMobile){
  const box=await root.boundingBox();
  expect(box.x).toBeLessThanOrEqual(2);
  expect(box.width).toBeLessThanOrEqual(1442);
 }
});

test('Student Focus is touch-friendly and keeps an unsent group vote when switching to the studio',async({page})=>{
 await page.route('**/api/gallery-guest?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  const body=op==='me'?{groupLabel:'Nhóm Demo',groupState:'editing',csrf:'synthetic-csrf',
   assignment:{title:'Synthetic Climate Action Museum',brief:'Design a class exhibit.',
    class_scope:'11-DEMO',deadline_at:new Date(Date.now()+86400000).toISOString()}}:
   {draft:{title:'',summary:'',rooms:[]},version:0};
  await route.fulfill({json:body});
 });
 await page.route('**/api/gallery-guest/live?**',async route=>{
  await route.fulfill({json:{session:{id:'student-focus-qa',status:'active',stageIndex:0,stageOpen:true,
   stage:{id:'climate-detective',kind:'vote',period:1,title:'Climate Detective',
    question:'Which action helps?',sentence:'I think … because …',
    options:['Switch off unused lights','Reduce food waste']}},
   survey:null,feedback:[],submitted:false}});
 });
 await page.getByTestId('qa-student').click();
 const liveTab=page.getByTestId('student-tab-live');
 const studioTab=page.getByTestId('student-tab-studio');
 await expect(page.getByTestId('student-focus-switch')).toBeVisible();
 await expect(liveTab).toHaveAttribute('aria-pressed','true',{timeout:10000});
 const choice=page.getByRole('button',{name:/A\. Switch off unused lights/});
 await expect(choice).toBeVisible();
 await choice.click();
 await expect(choice).toHaveAttribute('aria-pressed','true');
 await studioTab.click();
 await expect(page.getByTestId('student-live-activity')).toBeHidden();
 await expect(page.getByLabel('Vấn đề mà nhóm em chọn')).toBeVisible();
 await liveTab.click();
 await expect(choice).toBeVisible();
 await expect(choice).toHaveAttribute('aria-pressed','true');
 const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
 expect(dims.scroll).toBeLessThanOrEqual(dims.width+4);
});

test('realistic Group 01 Stage 1 permits vote, help, all group project steps and autosave',async({page,isMobile})=>{
 if(!isMobile)await page.setViewportSize({width:1366,height:768});
 let version=0,saves=0,posts=0,helps=0,draft={title:'',summary:'',rooms:[]};
 await page.route('**/api/gallery-guest?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  const input=route.request().postDataJSON?.()||{};
  if(op==='me')return route.fulfill({json:{groupLabel:'Nhóm 01',groupState:'issued',csrf:'qa-csrf',
   uploadEnabled:true,assignment:{title:'Our Climate Action Museum',
    brief:'Create an authentic class exhibition.',class_scope:'11.3',
    deadline_at:new Date(Date.now()+86400000).toISOString(),max_rooms:3,max_exhibits:12}}});
  if(op==='draft')return route.fulfill({json:{draft,version}});
  if(op==='save'){
   expect(input.expectedVersion).toBe(version);
   draft=input.draft;version++;saves++;
   return route.fulfill({json:{ok:true,version}});
  }
  return route.fulfill({json:{ok:true}});
 });
 await page.route('**/api/gallery-guest/live?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  if(op==='respond'){
   expect(route.request().postDataJSON()?.value).toBe(1);posts++;
   return route.fulfill({json:{ok:true,stageIndex:0,unit:'one group device'},status:201});
  }
  if(op==='need-help'){helps++;return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:{
   session:{id:'stage-one-interactive',status:'active',stageIndex:0,stageOpen:true,
    stage:{kind:'vote',id:'climate-detective',period:1,title:'Climate Detective',
     question:'Which everyday school action could best reduce our environmental impact?',
     options:['Walking or cycling when possible','Switching off unused lights','Reducing food waste','I am not sure yet'],
     sentence:'I think … because …'}},
   survey:null,submitted:posts>0
  }});
 });
 await page.getByTestId('qa-student-en').click();
 const app=page.getByTestId('museum-student-wizard');
 await expect(app).toBeVisible();
 await expect(page.getByTestId('student-tab-live')).toHaveAttribute('aria-pressed','true',{timeout:12000});
 const vote=page.getByRole('button',{name:/B\. Switching off unused lights/});
 await expect(vote).toBeVisible();
 await expect(vote).toBeEnabled();
 await vote.scrollIntoViewIfNeeded();
 await expect(vote).toBeInViewport();
 const hit=await vote.evaluate(el=>{
  const rect=el.getBoundingClientRect(),top=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);
  return Boolean(top&&(top===el||el.contains(top)));
 });
 expect(hit).toBe(true);
 const submit=page.getByRole('button',{name:'Submit group response'});
 await expect(submit).toBeDisabled();
 await expect(page.getByTestId('student-vote-guidance')).toContainText('Select A, B, C or D');
 await vote.click();
 await expect(vote).toHaveAttribute('aria-pressed','true');
 await expect(page.getByTestId('student-vote-guidance')).toContainText('Option B selected');
 await expect(submit).toBeEnabled();
 await submit.click();
 await expect(page.getByTestId('student-action-notice')).toContainText('Your group response was saved');
 expect(posts).toBe(1);
 await page.getByRole('button',{name:'Need help'}).click();
 await expect(page.getByTestId('student-action-notice')).toContainText('Help request sent');
 expect(helps).toBe(1);
 await page.getByTestId('student-tab-studio').click();
 await expect(page.getByTestId('student-tab-studio')).toHaveAttribute('aria-pressed','true');
 await expect(app.locator('.bml-student-steps button')).toHaveCount(5);
 for(let i=0;i<5;i++)await expect(app.locator('.bml-student-steps button').nth(i)).toBeEnabled();
 const problem=page.getByLabel('Describe your problem');
 await expect(problem).toBeEnabled();
 await problem.fill('Unused lights waste electricity at our school.');
 await expect.poll(()=>saves,{timeout:12000}).toBeGreaterThan(0);
 await app.locator('.bml-student-steps button').nth(1).click();
 await expect(page.getByLabel('Group roles')).toBeEnabled();
 await page.getByLabel('Group roles').fill('Data checker: A; editor: B');
 await expect.poll(()=>saves,{timeout:12000}).toBeGreaterThan(1);
 await app.locator('.bml-student-steps button').nth(2).click();
 await expect(page.getByLabel('Exhibition title')).toBeEnabled();
 await app.locator('.bml-student-steps button').nth(3).click();
 await expect(page.getByLabel('Actual peer feedback (English)')).toBeEnabled();
 await app.locator('.bml-student-steps button').nth(4).click();
 await expect(page.getByLabel('Our learning reflection (English)')).toBeEnabled();
 // Final submission must still wait for the teacher's Exit Ticket stage.
 await expect(page.getByRole('button',{name:'Submit for Admin review'})).toBeDisabled();
 await page.getByTestId('student-tab-live').click();
 await expect(page.getByTestId('student-vote-guidance')).toContainText('already submitted');
});
test('Museum Field Journal Stage 2 is legible, clickable and contained on a 16:9 classroom screen',async({page,isMobile})=>{
 if(!isMobile)await page.setViewportSize({width:1366,height:768});
 await page.route('**/api/gallery-guest?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  return route.fulfill({json:op==='me'?{
   groupLabel:'Nhóm 01',groupState:'editing',csrf:'qa-editorial',
   assignment:{title:'Our Climate Action Museum',brief:'An authentic climate action project for school.',
    class_scope:'11.3',deadline_at:new Date(Date.now()+86400000).toISOString()}
  }:{draft:{title:'',summary:'',rooms:[]},version:0}});
 });
 await page.route('**/api/gallery-guest/live?**',async route=>route.fulfill({json:{
  session:{id:'editorial-quiz',status:'active',stageIndex:1,stageOpen:true,
   stage:{id:'language-mini-lesson',kind:'quiz',period:1,title:'Language Mini-Lesson',
    question:'Practise evidence, cause and recommendation language.',
    questions:[
     {q:'Which sentence gives evidence?',choices:['This is nice.','According to our survey, four groups agreed.','Do it now.'],explanation:'Use evidence.'},
     {q:'Which sentence shows a cause?',choices:['Because our lights stay on, we waste energy.','I am a student.','Good morning.'],explanation:'Because introduces a cause.'},
     {q:'Which sentence makes a recommendation?',choices:['The sky is blue.','We recommend reusing water bottles.','He went home yesterday.'],explanation:'We recommend signals advice.'}
    ]}},survey:null,submitted:false
 }}));
 await page.getByTestId('qa-student-en').click();
 const root=page.getByTestId('museum-student-wizard');
 await expect(root).toHaveClass(/bml-student-editorial/);
 await expect(page.getByText('Your museum workshop')).toBeVisible();
 await expect(page.getByTestId('student-tab-live')).toHaveAttribute('aria-pressed','true',{timeout:12000});
 const firstChoice=page.getByRole('button',{name:'B. According to our survey, four groups agreed.'});
 await firstChoice.scrollIntoViewIfNeeded();
 await expect(firstChoice).toBeEnabled();
 await firstChoice.click();
 await expect(firstChoice).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Next question'}).click();
 await expect(page.getByText('Which sentence shows a cause?')).toBeVisible();
 await page.getByRole('button',{name:'Next question'}).click();
 await expect(page.getByText('Which sentence makes a recommendation?')).toBeVisible();
 await page.getByRole('button',{name:'B. We recommend reusing water bottles.'}).click();
 await expect(page.getByRole('button',{name:'B. We recommend reusing water bottles.'})).toHaveAttribute('aria-pressed','true');
 if(!isMobile){
  const geometry=await root.evaluate(el=>{
   const box=x=>{const r=el.querySelector(x).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};};
   const side=box('.bml-student-toolrail'),main=box('.bml-student-primary'),project=box('.bml-student-projectrail');
   return {side,main,project,viewportWidth:innerWidth,viewportHeight:innerHeight};
  });
  expect(geometry.side.right).toBeLessThan(geometry.main.left);
  expect(geometry.main.right).toBeLessThan(geometry.project.left);
  expect(geometry.main.bottom).toBeLessThanOrEqual(geometry.viewportHeight+1);
  expect(geometry.project.bottom).toBeLessThanOrEqual(geometry.viewportHeight+1);
  // The synthetic QA harness is longer than the viewport; only the fixed student canvas must fit.
 }
 await page.getByTestId('student-tab-studio').click();
 await expect(page.getByLabel('Describe your problem')).toBeEnabled();
});
test('student canvas keeps 16:9 activity, navigation and project panels on one desktop viewport',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await page.route('**/api/gallery-guest?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  await route.fulfill({json:op==='me'?{groupLabel:'Nhóm Demo',groupState:'editing',csrf:'synthetic-csrf',
   assignment:{title:'Our Climate Action Museum',brief:'Authentic English presentation.',
    class_scope:'11-DEMO',deadline_at:new Date(Date.now()+86400000).toISOString()}}:
   {draft:{title:'Our Climate Action Museum',summary:'One solution per exhibit.',rooms:[]},version:0}});
 });
 await page.route('**/api/gallery-guest/live?**',route=>route.fulfill({json:{
  session:{id:'one-screen-qa',status:'active',stageIndex:9,stageOpen:true,
   stage:{id:'present',kind:'present',period:2,title:'Present and Discuss',
    question:'Explain your problem, one authentic figure with N, and one practical solution.',
    sentence:'We propose …'}},survey:null,feedback:[]}}));
 await page.getByTestId('qa-student').click();
 const root=page.getByTestId('museum-student-wizard');
 await expect(root).toBeVisible();
 await expect(page.getByTestId('student-one-screen-workspace')).toBeVisible();
 await expect(page.getByTestId('student-tab-studio')).toHaveAttribute('aria-pressed','true',{timeout:10000});
 const geometry=await root.evaluate(el=>{
  const a=el.getBoundingClientRect();
  const workspace=el.querySelector('[data-testid="student-one-screen-workspace"]').getBoundingClientRect();
  const rail=el.querySelector('.bml-student-projectrail').getBoundingClientRect();
  return {rootWidth:a.width,rootHeight:a.height,rootTop:a.top,workspaceBottom:workspace.bottom,railBottom:rail.bottom,
   viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,overflow:el.scrollWidth>el.clientWidth+2};
 });
 expect(geometry.rootTop).toBeGreaterThanOrEqual(-1);
 expect(geometry.rootWidth).toBeLessThanOrEqual(geometry.viewportWidth+2);
 expect(geometry.rootHeight).toBeLessThanOrEqual(geometry.viewportHeight+2);
 expect(geometry.workspaceBottom).toBeLessThanOrEqual(geometry.viewportHeight+1);
 expect(geometry.railBottom).toBeLessThanOrEqual(geometry.viewportHeight+1);
 expect(geometry.overflow).toBe(false);
 await expect(page.getByLabel('Phản hồi thực tế từ bạn học (tiếng Anh)')).toBeVisible();
 await page.getByTestId('student-tab-live').click();
 await expect(page.getByTestId('student-live-activity')).toBeVisible();
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
 await page.getByRole('button',{name:'Trang 2'}).click();
 await page.getByLabel('Bằng chứng hoặc quan sát bằng tiếng Anh').fill('According to our classroom scenario, plastic packaging is used every day.');
 await page.getByLabel('Nguồn dữ liệu/ tài liệu').fill('Synthetic classroom scenario (not a measured dataset).');
 await page.getByLabel('Giải pháp nhóm đề xuất bằng tiếng Anh').fill('We recommend reusable bottles because they can reduce waste.');
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await page.getByLabel('Tên triển lãm').fill('Our Climate Museum');
 await page.getByLabel('Thông điệp mở đầu').fill('A greener school starts with small changes.');
 await page.getByRole('button',{name:/Tiếp tục/}).click(); // Captions page
 await page.getByRole('button',{name:/Tiếp tục/}).click(); // Artwork page
 await page.getByRole('button',{name:/Tiếp tục/}).click(); // Peer feedback step
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
 expect(doc).toContain('PART 1');
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
 const first=zip.file('P1/TiengAnh_THPT_Demo-Teacher_STEM_P1.docx'),second=zip.file('P2/TiengAnh_THPT_Demo-Teacher_STEM_P2.docx');
 expect(first).toBeTruthy();expect(second).toBeTruthy();
 const nested=await JSZip.loadAsync(await second.async('uint8array'));
 const doc=await nested.file('word/document.xml').async('string');
 expect(doc).toContain('TEACHING PLAN');
 const manifest=await zip.file('P2/REQUIRED_EVIDENCE_CHECKLIST.txt').async('string');
 expect(manifest).toContain('Never use demonstration data as evidence.');
});

test('teacher controls 11 live lesson stages without a PowerPoint or automatic transitions',async({page})=>{
 await page.getByTestId('qa-teacher-live').click();
 await expect(page.getByTestId('museum-teacher-live')).toBeVisible();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 await expect(page.getByText('Climate Detective')).toBeVisible();
 // Students can respond as soon as Admin starts; no extra Open action.
 await expect(page.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
 await expect(page.getByRole('button',{name:/Khóa hoạt động/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Mở cho học sinh/})).toHaveCount(0);
 await page.getByRole('button',{name:/Hiện giải thích/}).click();
 await expect(page.getByText('This is a warm-up vote',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:/Hoạt động tiếp/}).click();
 await expect(page.getByText('Language Mini-Lesson')).toBeVisible();
 await expect(page.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
 await page.getByRole('button',{name:/Khóa hoạt động/}).click();
 await expect(page.getByText('HOẠT ĐỘNG CHƯA MỞ')).toBeVisible();
 await page.getByRole('button',{name:/Mở lại tương tác/}).click();
 await expect(page.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
 await page.getByRole('button',{name:/Tạm dừng/}).click();
 await expect(page.getByText('HOẠT ĐỘNG CHƯA MỞ')).toBeVisible();
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await expect(page.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
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


test('three English lessons expose eighteen group projects and a navigable 3D artwork collection',async({page})=>{
 await page.getByTestId('qa-prepared').click();
 const lessons=page.getByTestId('museum-lessons');
 await expect(lessons).toBeVisible();
 await expect(lessons.locator('.bml-lesson-block')).toHaveCount(3);
 await expect(lessons.getByText('Protecting Marine Life',{exact:true})).toHaveCount(2);
 await expect(lessons.getByText('Sustainable School',{exact:true})).toHaveCount(1);
 const first=lessons.locator('.bml-lesson-block').first();
 await first.getByRole('button',{name:/Xem các nhóm|View groups/}).click();
 await expect(first.getByTestId('lesson-portfolio-marine-12')).toBeVisible();
 await expect(first.locator('.bml-prepared-project')).toHaveCount(6);
 await first.getByRole('button',{name:/Triển lãm 3D|3D exhibition/}).click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await expect(detail).toBeVisible();
 await expect(detail.getByRole('heading',{name:'Protecting Marine Life · 12.1'})).toBeVisible();
 await detail.getByRole('button',{name:'2D',exact:true}).click();
 await expect(detail.locator('.bml-room-tabs button')).toHaveCount(6);
 await expect(detail.locator('.bml-art-card')).toHaveCount(3);
 await expect(detail.locator('.bml-art-card img').first()).toHaveAttribute('src',/^data:image\/png;base64,/);
 await detail.locator('.bml-art-card').first().click();
 await expect(detail.getByTestId('exhibit-360-viewer')).toBeVisible();
 await detail.getByTestId('museum-artwork-inspector').getByRole('button',{name:/Đóng|Close/}).click();
 await expect(detail.getByTestId('museum-artwork-inspector')).toHaveCount(0);
});


test('school poster artworks have actual topic illustration pixels, not text-only placeholders',async({page})=>{
 await page.getByTestId('qa-prepared').click();
 const school=page.getByTestId('museum-lessons').locator('.bml-lesson-block').nth(1);
 await school.getByRole('button',{name:/Triển lãm 3D|3D exhibition/}).click();
 const detail=page.getByTestId('museum-exhibition-detail');
 await detail.getByRole('button',{name:'2D',exact:true}).click();
 const frames=detail.locator('.bml-art-card img');
 await expect(frames).toHaveCount(3);
 for(const [i,stage] of ['problem','evidence','solution'].entries()){
  await expect(frames.nth(i)).toHaveAttribute('src',
   '/museum/artwork/green-campus-0'+(i+1)+'-'+stage+'.avif');
  const status=await frames.nth(i).evaluate(async img=>{
   await img.decode();
   return {complete:img.complete,width:img.naturalWidth,height:img.naturalHeight};
  });
  expect(status.complete).toBe(true);
  expect(status.width).toBe(1024);
  expect(status.height).toBe(768);
 }
 const sample=await frames.first().evaluate(async(img)=>{
  await img.decode();
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,0,0);
  const data=ctx.getImageData(64,230,760,380).data;
  const palette=new Set();let saturated=0;
  for(let i=0;i<data.length;i+=4*44){
   const r=data[i],g=data[i+1],b=data[i+2];
   palette.add([r>>4,g>>4,b>>4].join('.'));
   if(Math.max(r,g,b)-Math.min(r,g,b)>42)saturated++;
  }
  return {width:img.naturalWidth,height:img.naturalHeight,palette:palette.size,saturated};
 });
 expect(sample.width).toBeGreaterThanOrEqual(1000);
 expect(sample.height).toBeGreaterThanOrEqual(700);
 expect(sample.palette).toBeGreaterThan(30);
 expect(sample.saturated).toBeGreaterThan(100);
 const one=await frames.first().getAttribute('src');
 const two=await frames.nth(1).getAttribute('src');
 expect(one).not.toBe(two);
 await detail.locator('.bml-art-card').first().click();
 const viewer=detail.getByTestId('exhibit-360-viewer');
 await viewer.getByRole('button',{name:/Xem 2D|2D original/}).click();
 const original=viewer.locator('img.bml-exhibit-original-image');
 await expect(original).toBeVisible();
 const resolution=await original.evaluate(async img=>{await img.decode();return img.naturalWidth;});
 expect(resolution).toBeGreaterThanOrEqual(1000);
});

test('peer response submits structured learning, clarification and clarity score',async({page})=>{
 let received=null;
 await page.route('**/api/gallery-guest/live?**',route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  if(op==='respond'){received=route.request().postDataJSON();return route.fulfill({json:{ok:true}});}
  return route.fulfill({json:{session:{id:'qa-peer',status:'active',stageIndex:7,stageOpen:true,stage:{kind:'peer',period:2,title:'Peer Gallery Walk',question:'What did you learn?',sentence:'I learned … .'}}}});
 });
 await page.getByTestId('qa-student-live').click();
 await page.getByLabel('I learned …',{exact:true}).fill('I learned why unused lights waste energy.');
 await page.getByLabel('The message would be clearer if …',{exact:true}).fill('Please explain who will switch the lights off.');
 await page.getByRole('combobox').selectOption('3');
 await page.getByRole('button',{name:/Gửi câu trả lời của nhóm/}).click();
 await expect(page.getByText('Đã ghi nhận một lượt của nhóm')).toBeVisible();
 expect(received.value.rating).toBe(3);expect(received.value.clarify).toContain('who');
});
test('frozen survey chart uploads real computed PNG instead of an empty evidence label',async({page})=>{
 let received=null;
 const snapshot={id:'qa-snapshot',counts:[1,2,0,1],n:4,source:'online',created_at:'2026-11-13T01:00:00Z',options:[{label:'Walking',count:1},{label:'Lights',count:2},{label:'Food',count:0},{label:'Other',count:1}]};
 await page.route('**/api/gallery-guest/live?**',r=>r.fulfill({json:{snapshot}}));
 await page.route('**/api/gallery-guest/artwork?**',r=>{
  if(new URL(r.request().url()).searchParams.get('operation')==='upload'){received=r.request().postDataJSON();return r.fulfill({json:{asset:{id:'aaaaaaaa-1111-4111-8111-111111111111'}}});}
  return r.fulfill({json:{assets:[]}});
 });
 await page.getByTestId('qa-artwork').click();
 await page.getByRole('button',{name:/Gắn biểu đồ khảo sát/}).click();
 await expect(page.getByText('Đã gắn biểu đồ thật.',{exact:false})).toBeVisible();
 expect(received.png).toMatch(/^data:image\/png;base64,/);expect(received.png.length).toBeGreaterThan(2000);
});


test('Admin directly manages assignments and submitted work without delegating a reviewer',async({page})=>{
 await page.getByTestId('qa-wizard').click();
 await expect(page.getByTestId('museum-lesson-wizard')).toBeVisible();
 await page.getByRole('button',{name:/Tiếp tục/}).click();
 await expect(page.getByText('Thiết lập lớp và nhóm')).toBeVisible();
 await expect(page.getByText(/Admin trực tiếp giao nhiệm vụ/)).toBeVisible();
 await expect(page.getByText('Người duyệt chuyên môn')).toHaveCount(0);
 await page.getByTestId('qa-prepared').click();
 const first=page.getByTestId('museum-lessons').locator('.bml-lesson-block').first();
 await expect(first.getByRole('button',{name:/Xóa bài học/})).toBeVisible();
 await page.getByTestId('qa-admin-review').click();
 await expect(page.getByTestId('museum-review-desk')).toBeVisible();
 await page.getByRole('button',{name:/Group climate work/}).first().click();
 await expect(page.getByRole('button',{name:/Admin phê duyệt/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Xóa bài nộp/})).toBeVisible();
 await expect(page.getByRole('button',{name:/Chuyển TTCM duyệt/})).toHaveCount(0);
});


test('Admin deleting lesson with published exhibition explains gallery retention before archive',async({page})=>{
 await page.getByTestId('qa-published-lesson').click();
 const lessons=page.getByTestId('museum-lessons');
 await expect(lessons.getByText('Synthetic Climate Action Museum')).toBeVisible();
 let confirmation='';
 page.once('dialog',async dialog=>{
  confirmation=dialog.message();
  await dialog.dismiss();
 });
 await lessons.getByRole('button',{name:/Xóa bài học Synthetic Climate Action Museum/}).click();
 expect(confirmation).toContain('1 triển lãm đã công bố');
 expect(confirmation).toContain('triển lãm vẫn còn trong mục Triển lãm');
 await expect(lessons.getByText('Synthetic Climate Action Museum')).toBeVisible();
});


test('approved paper collage renders all eleven live stages with separated title, question, status and controls',async({page})=>{
 const names=['Climate Detective','Language Mini-Lesson','Live Classroom Survey',
  'Problem · Evidence · Solution','Storyboard Checkpoint','Recap and Resume',
  'Create the 3D Museum','Peer Gallery Walk','Improve the Exhibition',
  'Present and Discuss','Exit Ticket'];
 await page.getByTestId('qa-teacher-live').click();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 const screen=page.getByTestId('museum-live-paper-stage');
 await expect(screen).toBeVisible();
 for(let i=0;i<names.length;i++){
  await expect(screen).toHaveAttribute('data-stage-index',String(i));
  await expect(screen.getByRole('heading',{name:names[i],exact:true})).toBeVisible();
  await expect(screen.locator('.bml-paper-question-sheet')).toHaveCount(1);
  await expect(screen.locator('.bml-paper-illustration')).toHaveCount(1);
  await expect(screen.locator('.bml-live-bottom')).toBeVisible();
  await expect(screen.getByText('ĐANG MỞ HOẠT ĐỘNG')).toBeVisible();
  if([0,2].includes(i))await expect(screen.locator('.bml-live-choices>div')).toHaveCount(4);
  else if(i===1)await expect(screen.locator('.bml-live-quiz>div')).toHaveCount(3);
  else await expect(screen.locator('.bml-paper-task')).toHaveCount(3);
  const layout=await screen.evaluate(el=>{
   const slide=el.querySelector('.bml-live-slide'),footer=el.querySelector('.bml-live-bottom'),
    top=el.querySelector('.bml-live-topbar'),question=el.querySelector('.bml-live-question'),
    hero=el.querySelector('.bml-paper-stage-intro'),bounds=x=>x.getBoundingClientRect();
   const a=bounds(slide),b=bounds(footer),c=bounds(top),q=bounds(question),h=bounds(hero),e=bounds(el);
   return {
    titleHasRoom:h.bottom<=b.top+1,
    questionInWidth:q.left>=e.left-3&&q.right<=e.right+3,
    questionAboveFooter:q.top<b.top,
    stageDoesNotOverlayFooter:a.bottom<=b.top+2,
    topDoesNotOverlayStage:c.bottom<=a.top+2,
    hasScrollableSlide:getComputedStyle(slide).overflowY==='auto',
    screenWidth:e.width
   };
  });
  expect(layout).toMatchObject({
   titleHasRoom:true,questionInWidth:true,questionAboveFooter:true,
   stageDoesNotOverlayFooter:true,topDoesNotOverlayStage:true,hasScrollableSlide:true
  });
  if(i<names.length-1)await page.getByRole('button',{name:/Hoạt động tiếp/}).click();
 }
 await page.getByRole('button',{name:/Kho tư liệu/}).click();
 await expect(page.getByTestId('museum-live-resources')).toBeVisible();
 await expect(page.getByTestId('museum-live-paper-stage').locator('.bml-learning-resources')).toHaveCount(0);
});

test('paper live presenter avoids horizontally clipped text on a narrow MacBook or mobile screen',async({page})=>{
 await page.setViewportSize({width:820,height:760});
 await page.getByTestId('qa-teacher-live').click();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 const stage=page.getByTestId('museum-live-paper-stage');
 await expect(stage.locator('.bml-live-choices>div')).toHaveCount(4);
 const results=await stage.evaluate(el=>{
  const screen=el.getBoundingClientRect(),
   candidates=[...el.querySelectorAll('.bml-live-choices>div,.bml-live-question,.bml-paper-status,.bml-live-slide h2')];
  return candidates.map(x=>({text:x.textContent.slice(0,30),right:x.getBoundingClientRect().right-screen.right,
   left:screen.left-x.getBoundingClientRect().left}));
 });
 for(const r of results){
  expect(r.right,r.text+' clipped on right').toBeLessThanOrEqual(4);
  expect(r.left,r.text+' clipped on left').toBeLessThanOrEqual(4);
 }
});


test('Teacher Live has real stage motion control, readable voiceover, research library and persistent curated videos',async({page})=>{
 await page.getByTestId('qa-teacher-live').click();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 const stage=page.getByTestId('museum-live-paper-stage');
 await expect(stage).toHaveAttribute('data-motion','on');
 await page.getByRole('button',{name:'Motion ON'}).click();
 await expect(stage).toHaveAttribute('data-motion','off');
 await page.getByRole('button',{name:'Motion OFF'}).click();
 await expect(stage).toHaveAttribute('data-motion','on');
 await page.getByRole('button',{name:'Voiceover'}).click();
 await expect(page.getByTestId('museum-voiceover')).toBeVisible();
 await expect(page.getByText('Welcome to our Climate Action Museum.',{exact:false})).not.toBeVisible();
 await page.getByText('Xem kịch bản lời dẫn').click();
 await expect(page.getByText('Welcome to our Climate Action Museum.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:/Kho tư liệu/}).click();
 await expect(page.getByTestId('museum-research-library')).toBeVisible();
 await expect(page.getByRole('link',{name:/NASA/})).toBeVisible();
 await page.getByRole('button',{name:'Video Lab'}).click();
 const lab=page.getByTestId('museum-video-lab');
 await expect(lab).toBeVisible();
 await lab.getByPlaceholder('school climate actions reducing carbon footprint').fill('global warming causes for students');
 await lab.getByRole('button',{name:'Assign research task'}).click();
 await expect(lab.getByText('Research task assigned to the current activity.')).toBeVisible();
 await lab.getByPlaceholder('https://www.youtube.com/watch?v=…').fill('https://youtu.be/jNQXAC9IVRw');
 await lab.getByPlaceholder('Teacher-curated climate video').fill('Teacher-selected classroom video');
 await lab.getByRole('button',{name:'Assign video to this activity'}).click();
 await expect(lab.getByText('Teacher-selected classroom video')).toBeVisible();
 await expect(lab.getByText('VIDEO GIÁO VIÊN ĐÃ CHỌN',{exact:false})).toBeVisible();
});

test('Student Studio can watch a teacher-selected video and save source-based English reasoning by group',async({page})=>{
 let microPosts=0,record=null;
 await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({status:200,contentType:'text/html',body:'<html><body>Video host test</body></html>'}));
 await page.route('**/api/gallery-guest/live?**',async route=>{
  const op=new URL(route.request().url()).searchParams.get('operation');
  if(op==='state')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   session:{id:'qa-comp-session',status:'active',stageIndex:3,stageOpen:true,revealed:false,
    media:{query:'NASA climate change school',instruction:'Find a checkable scientific source.',
     videos:[{id:'jNQXAC9IVRw',title:'Teacher-selected classroom video',channel:'Chosen source'}]},
    stage:{id:'problem-evidence-solution',kind:'group',period:1,title:'Problem · Evidence · Solution',
     question:'How can our school reduce one environmental problem?',sentence:'One problem is…'}
   },micro:null,survey:null,feedback:[]})});
  if(op==='micro-submit'){microPosts++;record=route.request().postDataJSON();
   return route.fulfill({status:201,contentType:'application/json',body:'{"ok":true}'});}
  if(op==='video-search')return route.fulfill({status:200,contentType:'application/json',
   body:'{"available":false,"results":[],"reason":"youtube_api_key_not_configured"}'});
  return route.fulfill({status:404,body:'{"error":"Unexpected operation"}'});
 });
 await page.getByTestId('qa-student-live').click();
 await expect(page.getByTestId('student-live-activity')).toBeVisible();
 const lab=page.getByTestId('museum-video-lab');
 await expect(lab.getByText('Teacher-selected classroom video')).toBeVisible();
 await lab.getByRole('button',{name:/Xem tại đây/}).click();
 await expect(page.getByTestId('museum-youtube-player').locator('iframe')).toHaveCount(1);
 await lab.getByRole('button',{name:/Tìm video/}).click();
 await expect(lab.getByText('Tìm kiếm YouTube trong ứng dụng cần cấu hình',{exact:false})).toBeVisible();
 const mini=page.getByTestId('museum-micro-challenge');
 await expect(mini.getByText('Evidence Detective')).toBeVisible();
 await mini.getByRole('button',{name:/A.*A dated observation/}).click();
 await mini.getByPlaceholder('We chose this because …').fill('A dated observation gives a checkable source and context.');
 await mini.getByRole('button',{name:/Gửi lập luận của nhóm/}).click();
 await expect(mini.getByText('Đã ghi nhận lựa chọn và lập luận',{exact:false})).toBeVisible();
 expect(microPosts).toBe(1);expect(record.choice).toBe(0);
 expect(record.reason).toContain('checkable source');
});


test('fullscreen presenter keeps primary and research tools inside the actual fullscreen element',async({page})=>{
 await page.addInitScript(()=>{
  if(!('speechSynthesis' in window))return;
  try{
   Object.defineProperty(window.speechSynthesis,'getVoices',{
    configurable:true,value:()=>[
     {name:'Samantha',lang:'en-US',voiceURI:'qa-samantha',localService:true},
     {name:'British Voice',lang:'en-GB',voiceURI:'qa-british',localService:true}]
   });
  }catch{}
 });
 await page.getByTestId('qa-teacher-live').click();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 await page.getByRole('button',{name:/Toàn màn hình/}).click();
 const surface=page.getByTestId('museum-fullscreen-surface');
 await expect(surface).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement?.getAttribute('data-testid')||''))
  .toBe('museum-fullscreen-surface');
 const dock=page.getByTestId('museum-fullscreen-toolbar');
 await expect(dock).toBeVisible();
 await expect(dock.getByRole('button',{name:'Voiceover'})).toBeVisible();
 await expect(dock.getByRole('button',{name:'Video Lab'})).toBeVisible();
 await expect(dock.getByRole('button',{name:/Kho tư liệu/})).toBeVisible();
 const geometry=await page.evaluate(()=>{
  const full=document.fullscreenElement.getBoundingClientRect();
  const d=document.querySelector('[data-testid="museum-fullscreen-toolbar"]').getBoundingClientRect();
  const screen=document.querySelector('[data-testid="museum-live-paper-stage"]').getBoundingClientRect();
  return {inside:d.top>=full.top&&d.bottom<=full.bottom+2, separated:screen.bottom<=d.top+2};
 });
 expect(geometry).toMatchObject({inside:true,separated:true});
 await dock.getByRole('button',{name:'Voiceover'}).click();
 const panel=page.getByTestId('museum-fullscreen-panel');
 await expect(panel).toBeVisible();
 await expect(panel.getByTestId('museum-voiceover')).toBeVisible();
 await expect(panel.getByLabel('American English voice')).toBeVisible();
 const voiceOptions=panel.getByLabel('American English voice').locator('option');
 await expect(voiceOptions).toHaveCount(1);
 const choice=await voiceOptions.first().innerText();
 expect(choice.includes('Samantha · en-US')||choice.includes('Chưa tìm thấy giọng en-US'),
  'Only an available en-US system voice or a clear no-US-voice message is permitted').toBe(true);
 expect(choice).not.toContain('British');
 await dock.getByRole('button',{name:'Video Lab'}).click();
 const videoLab=panel.getByTestId('museum-video-lab');
 await expect(videoLab).toBeVisible();
 await videoLab.getByPlaceholder('https://www.youtube.com/watch?v=…').fill('https://youtu.be/jNQXAC9IVRw');
 await videoLab.getByPlaceholder('Teacher-curated climate video').fill('Classroom source video');
 await videoLab.getByRole('button',{name:'Assign video to this activity'}).click();
 await videoLab.getByRole('button',{name:/Chiếu video/}).click();
 const videoModal=page.getByTestId('museum-projector-video');
 await expect(videoModal).toBeVisible();
 await expect(videoModal.locator('iframe')).toHaveCount(1);
 await videoModal.getByRole('button',{name:/Đóng video/}).click();
 await expect(videoModal).toHaveCount(0);
 await dock.getByRole('button',{name:/Kho tư liệu/}).click();
 await expect(panel.getByTestId('museum-research-library')).toBeVisible();
 await dock.getByRole('button',{name:/Nhóm/}).click();
 await expect(panel.getByText('Demo Group 1')).toBeVisible();
 await dock.getByRole('button',{name:'QR'}).click();
 await expect(panel.getByAltText('Student Creator QR')).toBeVisible();
 await dock.getByRole('button',{name:/Tập trung/}).click();
 await expect(dock).toHaveClass(/is-focus/);
 await dock.getByRole('button',{name:/Đủ nút/}).click();
 await expect(dock).not.toHaveClass(/is-focus/);
 await dock.getByRole('button',{name:/Thoát/}).click();
 await expect.poll(()=>page.evaluate(()=>document.fullscreenElement===null)).toBe(true);
});

test('fullscreen can switch lesson stages and open presenter explanation without leaving projection',async({page})=>{
 await page.getByTestId('qa-teacher-live').click();
 await page.getByRole('button',{name:/Bắt đầu buổi dạy/}).click();
 await page.getByRole('button',{name:/Toàn màn hình/}).click();
 const screen=page.getByTestId('museum-live-paper-stage');
 const dock=page.getByTestId('museum-fullscreen-toolbar');
 await expect(screen).toHaveAttribute('data-stage-index','0');
 await dock.getByRole('button',{name:'Tiếp',exact:true}).click();
 await expect(screen).toHaveAttribute('data-stage-index','1');
 await dock.getByRole('button',{name:/Giải thích/}).click();
 const panel=page.getByTestId('museum-fullscreen-panel');
 await expect(panel).toBeVisible();
 await expect(panel).toHaveAttribute('data-active-tool','explain');
 await expect(page.getByTestId('museum-fullscreen-toolbar')).toBeVisible();
 await panel.getByRole('button',{name:'Close presenter panel'}).click();
 await dock.getByRole('button',{name:'Voiceover'}).click();
 await expect(panel).toHaveAttribute('data-active-tool','voice');
 await dock.getByRole('button',{name:/Thoát/}).click();
});
