import {test,expect} from '@playwright/test';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const url=file=>pathToFileURL(path.resolve('artifacts/museum-offline/'+file+'.html')).href;
test('file opens without network, navigates frozen lessons, submissions and live presentation',async({page},info)=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(url('qa'));
 await expect(page.getByTestId('immersive-gallery-v2')).toBeVisible();
 await expect(page.getByText('Synthetic Offline QA Museum',{exact:true}).first()).toBeVisible();
 await expect(page.getByRole('button',{name:/Create a lesson|New lesson|Download offline/})).toHaveCount(0);
 await expect.poll(()=>page.getByTestId('igv2-competition-banner').locator('img').evaluateAll(imgs=>imgs.length===2&&imgs.every(i=>i.complete&&i.naturalWidth>0&&i.src.startsWith('data:')))).toBe(true);
 await page.screenshot({path:info.outputPath('offline-dashboard.png'),fullPage:true});
 await page.getByTestId('igv2-nav-submissions').first().click();
 await expect(page.getByTestId('brian-museum-lab-v3')).toContainText('Synthetic QA exhibition');
 await page.getByTestId('igv2-nav-teaching-plan').first().click();
 await expect(page.getByRole('button',{name:/Create lesson from/})).toHaveCount(0);
 await page.getByTestId('igv2-nav-teacher-live').first().click();
 await expect(page.getByTestId('igv2-teacher-live-screen')).toBeVisible();
 const slide=page.getByTestId('igv2-teacher-live-stage'),before=await slide.innerText();
 await page.getByRole('button',{name:'Advance to next activity',exact:true}).click();
 await expect(slide).not.toHaveText(before);
 await page.getByRole('button',{name:'Show explanation',exact:true}).click();
 await expect(page.getByRole('button',{name:'Hide explanation',exact:true})).toBeVisible();
 for(let i=2;i<=10;i++){
  await page.getByRole('button',{name:'Advance to next activity',exact:true}).click();
  await expect(page.getByTestId('igv2-teacher-live-stage')).toContainText('ACTIVITY '+String(i+1).padStart(2,'0')+' / 11');
 }
 await page.getByRole('button',{name:'Evidence records',exact:true}).click();
 await page.getByText('Activity responses (1)',{exact:true}).click();
 await expect(page.getByText('answer: QA recorded response',{exact:true})).toBeVisible();
 await expect(page.getByText(/^Source note:.*SYNTHETIC QA ONLY/)).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(document.getElementById('museum-frozen-payload').textContent).snapshot.live['qa-lesson'].session.stageIndex)).toBe(0);
 await page.screenshot({path:info.outputPath('offline-evidence.png'),fullPage:true});
 expect(errors).toEqual([]);expect(requests).toEqual([]);
});
test('saved artwork works in 2D and actual WebGL 3D with no server',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url('qa'));await page.getByRole('button',{name:'Saved student work',exact:true}).click();
 await page.getByLabel('Choose a group').selectOption('qa-group');
 await expect(page.getByTestId('museum-paper-2d-room')).toBeVisible();
 await expect.poll(()=>page.getByTestId('museum-paper-2d-room').locator('img').evaluateAll(imgs=>imgs.length>0&&imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
 await page.getByRole('button',{name:'3D',exact:true}).click();
 await expect(page.locator('canvas')).toBeVisible();
 await expect.poll(()=>page.locator('canvas').evaluate(c=>!!(c.getContext('webgl2')||c.getContext('webgl')))).toBe(true);
 await page.waitForTimeout(1500);
 await page.screenshot({path:info.outputPath('offline-3d.png'),fullPage:true});
 await page.getByRole('button',{name:'2D',exact:true}).click();
 await expect(page.getByTestId('museum-paper-2d-room')).toBeVisible();
 expect(errors).toEqual([]);
});
test('modified frozen data is rejected',async({page})=>{
 await page.goto(url('tampered'));await expect(page.locator('#root')).toContainText('snapshot checksum does not match');
 await expect(page.getByTestId('immersive-gallery-v2')).toHaveCount(0);
});
test('ASEAN ZIP opens the teacher dossier and the six student activities without the network',async({page})=>{
 const requests=[],errors=[];
 page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url('asean/PetrusKy_Museum_Offline'));
 await page.getByTestId('igv2-nav-competition-dossier').click();
 await expect(page.getByRole('heading',{name:'ASEAN in Three Frames · Teaching dossier'})).toBeVisible();
 await expect(page.getByTestId('museum-offline-export')).toHaveCount(0);
 await page.getByRole('link',{name:'3 student workshops'}).click();
 await expect(page.getByRole('heading',{name:'3 student workshops'})).toBeVisible();
 await page.getByRole('row',{name:/Nhóm 01/}).getByRole('button',{name:'Open',exact:true}).click();
 const workshop=page.getByTestId('asean-student-lesson');
 await expect(workshop.getByTestId('asean-student-slide-1')).toBeVisible();
 await expect(workshop.getByRole('textbox',{name:'One thing a visitor can do'})).toHaveValue('Visitors can explore the QA market.');
 await expect(workshop.getByRole('textbox',{name:'One thing a visitor can do'})).toBeDisabled();
 await workshop.getByRole('button',{name:'Review activity',exact:true}).click();
 for(let n=2;n<=6;n++){
  await workshop.getByRole('button',{name:'Next activity',exact:true}).click();
  await expect(workshop.getByTestId('asean-student-slide-'+n)).toBeVisible();
 }
 await expect(workshop.getByRole('textbox',{name:'One thing a visitor can do'})).toHaveValue('Visitors can see the QA temple.');
 expect(errors).toEqual([]);expect(requests).toEqual([]);
});
