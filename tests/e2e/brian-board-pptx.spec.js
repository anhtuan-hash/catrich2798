import {test,expect} from '@playwright/test';
import JSZip from 'jszip';
const NS='http://schemas.openxmlformats.org/presentationml/2006/main';
const A='http://schemas.openxmlformats.org/drawingml/2006/main';
const R='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const relRoot='http://schemas.openxmlformats.org/package/2006/relationships';
const presentation=()=>`<?xml version="1.0"?><p:presentation xmlns:p="${NS}" xmlns:r="${R}">
  <p:sldIdLst><p:sldId id="256" r:id="rId1"/><p:sldId id="257" r:id="rId2"/></p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/></p:presentation>`;
const textShape=(text,color='D7E7DD')=>`<p:sp><p:nvSpPr><p:cNvPr id="3" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr><a:xfrm><a:off x="500000" y="500000"/><a:ext cx="8500000" cy="1600000"/></a:xfrm>
  <a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></p:spPr>
  <p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1">
  <a:solidFill><a:srgbClr val="203A30"/></a:solidFill></a:rPr><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;
const pic=`<p:pic><p:nvPicPr><p:cNvPr id="4" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
 <p:blipFill><a:blip r:embed="rIdImage1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
 <p:spPr><a:xfrm><a:off x="700000" y="2900000"/><a:ext cx="1600000" cy="1200000"/></a:xfrm>
 <a:prstGeom prst="rect"/></p:spPr></p:pic>`;
const slide=(shape,extras='')=>`<?xml version="1.0"?><p:sld xmlns:p="${NS}" xmlns:a="${A}" xmlns:r="${R}">
 <p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${shape}${extras}</p:spTree></p:cSld></p:sld>`;
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/NwAAAABJRU5ErkJggg==','base64');
async function samplePptx(){
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
 zip.file('ppt/presentation.xml',presentation());
 zip.file('ppt/_rels/presentation.xml.rels',`<Relationships xmlns="${relRoot}">
  <Relationship Id="rId1" Target="slides/slide1.xml"/>
  <Relationship Id="rId2" Target="slides/slide2.xml"/></Relationships>`);
 zip.file('ppt/slides/slide1.xml',slide(textShape('Hello PPTX'),pic));
 zip.file('ppt/slides/_rels/slide1.xml.rels',`<Relationships xmlns="${relRoot}">
  <Relationship Id="rIdImage1" Target="../media/image1.png"/></Relationships>`);
 zip.file('ppt/media/image1.png',png);
 zip.file('ppt/slides/slide2.xml',slide(textShape('Second slide','FCEBD4')));
 return zip.generateAsync({type:'nodebuffer'});
}
test('local PPTX imports text, shapes and pictures; teacher can edit and switch slides',async({page})=>{
 await page.goto('/tests/fixtures/brian-board-pptx-qa.html');
 const payload=await samplePptx();
 await page.locator('#pptx-file').setInputFiles({name:'test-class.pptx',
  mimeType:'application/vnd.openxmlformats-officedocument.presentationml.presentation',buffer:payload});
 await expect(page.locator('#status')).toContainText('Imported 2 slides',{timeout:15000});
 await expect(page.locator('#summary')).toContainText('Hello PPTX');
 let result=await page.evaluate(()=>window.__boardPptxResult);
 expect(result.pages).toBe(2);
 expect(result.objects.some(o=>o.kind==='text'&&o.text==='Hello PPTX')).toBe(true);
 expect(result.objects.some(o=>o.kind==='shape'&&o.fill==='#d7e7dd')).toBe(true);
 expect(result.objects.some(o=>o.kind==='image'&&o.src.startsWith('data:image/png;base64,'))).toBe(true);
 expect(result.student.objects.some(o=>o.kind==='text')).toBe(true);
 await page.getByRole('textbox',{name:'Sửa văn bản 1'}).fill('Edited by teacher');
 await expect(page.locator('#summary')).toContainText('Edited by teacher');
 result=await page.evaluate(()=>window.__boardPptxResult);
 expect(result.objects.some(o=>o.text==='Edited by teacher')).toBe(true);
 await page.getByRole('button',{name:'Slide kế'}).click();
 await expect(page.locator('#summary')).toContainText('Second slide');
 await page.getByRole('button',{name:'Trình chiếu trên TV'}).click();
 await expect(page.locator('#status')).toHaveText('Present requested');
});
test('untrusted files are rejected without rendering',async({page})=>{
 await page.goto('/tests/fixtures/brian-board-pptx-qa.html');
 await page.locator('#pptx-file').setInputFiles({name:'bad.pptx',mimeType:'application/octet-stream',
  buffer:Buffer.from('not an actual PowerPoint zip archive but long enough to pass length')});
 await expect(page.locator('#status')).toContainText('Error:');
 await expect(page.locator('[data-testid=board-pptx-studio]')).toHaveCount(0);
});
