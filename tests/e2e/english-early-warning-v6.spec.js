import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';
const DEMO_ADMIN = {
  id:'english-e2e-admin', authId:'english-e2e-admin', role:'admin',
  name:'English E2E Admin', school:'Brian CI',
  email:'english-e2e-admin@brianenglish.local',
  approved:true,createdAt:'2026-11-14T00:00:00.000Z',
  updatedAt:'2026-11-14T00:00:00.000Z',
  permissions:{mode:'all',allowed:[]},provider:'offline-demo',demo:true,
};
const CSV = [
 'student_id,listening,speaking,reading,writing,recent1,recent2,missing14d,post_listening,post_speaking,post_reading,post_writing',
 'P001,50,55,60,60,50,50,2,55,60,70,65',
 'P002,55,55,60,60,50,50,2,60,65,65,65',
 'P003,60,60,60,60,65,65,0,65,65,70,65',
 'P004,62,62,62,62,64,64,0,65,65,65,65',
 'P005,52,60,60,60,55,55,2,60,65,65,65',
].join('\r\n')+'\r\n';
async function enterPilot(page) {
  await page.addInitScript(({key,user}) => {
    localStorage.setItem(key,JSON.stringify(user));
    localStorage.setItem('bet-language','en');
  },{key:DEMO_SESSION_KEY,user:DEMO_ADMIN});
  await page.goto('/#/student-support?tab=english');
  await expect(page.getByRole('heading',{name:'Early Warning & Intervention'})).toBeVisible({timeout:12000});
}
async function uploadCodedScores(page) {
  await page.locator('#bew-csv-import').setInputFiles({
    name:'coded-assessment-fixture.csv',
    mimeType:'text/csv',
    buffer:Buffer.from(CSV,'utf8'),
  });
  await expect(page.getByRole('heading',{name:'P001'})).toBeVisible();
}

test('V6 teacher-reviewed eight-week workflow and two-file dossier export',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error?.message||error)));
  await enterPilot(page);
  await expect(page.getByText('Cloud saving is off by default.')).toBeVisible();
  await expect(page.getByText('Start with a coded assessment cohort')).toBeVisible();
  await uploadCodedScores(page);
  await expect(page.getByText('Priority review').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Record intervention'})).toBeDisabled();
  await page.getByRole('button',{name:'Confirm support need'}).click();
  await expect(page.getByRole('button',{name:'Record intervention'})).toBeEnabled();
  await page.locator('#bew-completed').fill('1');
  await page.getByRole('button',{name:'Record intervention'}).click();
  await expect(page.getByText('Week 1 entry recorded.',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Study evidence & data quality'})).toBeVisible();
  await expect(page.getByText('5 / 5').first()).toBeVisible();
  const markdownPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export aggregate dossier draft'}).click();
  const markdown=await markdownPromise;
  expect(markdown.suggestedFilename()).toMatch(/aggregate-report.*\.md$/);
  const jsonPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export SHA-256 audit manifest'}).click();
  const json=await jsonPromise;
  expect(json.suggestedFilename()).toMatch(/aggregate-audit.*\.json$/);
  const markdownBytes=await readFile(await markdown.path());
  const manifest=JSON.parse(await readFile(await json.path(),'utf8'));
  const actualHash=createHash('sha256').update(markdownBytes).digest('hex');
  expect(manifest.reportSha256).toBe(actualHash);
  expect(manifest.reportSizeBytes).toBe(markdownBytes.length);
  expect(manifest.reportFile).toBe(markdown.suggestedFilename());
  expect(manifest.attestations.effectCausalityEstablished).toBe(false);
  expect(manifest.attestations.studentObservationsAuthenticatedBySystem).toBe(false);
  await page.reload();
  await expect(page.getByText('Start with a coded assessment cohort')).toBeVisible();
  await expect(page.getByText('Intervention entries').locator('..')).toContainText('0');
  expect(errors).toEqual([]);
});
test('V6 mobile layout and reject identifying CSV header',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await enterPilot(page);
  await page.locator('#bew-csv-import').setInputFiles({
    name:'identifying.csv',mimeType:'text/csv',
    buffer:Buffer.from('student_id,full_name,listening,speaking,reading,writing\nP001,Student Name,60,60,60,60','utf8'),
  });
  await expect(page.getByRole('alert')).toContainText('Personal-identification columns are not allowed');
  await expect(page.getByText('Start with a coded assessment cohort')).toBeVisible();
  await uploadCodedScores(page);
  const overflow=await page.evaluate(()=>({
    body:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth,
  }));
  expect(overflow.body).toBeLessThanOrEqual(overflow.viewport+1);
});
