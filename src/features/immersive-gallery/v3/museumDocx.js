// Generate actual Office Open XML documents, without synthesizing school evidence.
const escapeXml=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&apos;");
const p=(v,style='Normal')=>'<w:p><w:pPr><w:pStyle w:val="'+style+'"/></w:pPr><w:r><w:t xml:space="preserve">'+escapeXml(v)+'</w:t></w:r></w:p>';
function renderBlock(node){
 if(node.tagName==='H1')return p(node.textContent,'Title');
 if(node.tagName==='H2')return p(node.textContent,'Heading2');
 if(node.tagName==='H3')return p(node.textContent,'Heading3');
 if(node.tagName==='TABLE'){
  const rows=[...node.querySelectorAll('tr')].map(row=>'<w:tr>'+[...row.children].filter(c=>/^(TD|TH)$/.test(c.tagName)).map(c=>
   '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>'+p(c.textContent,c.tagName==='TH'?'TableHeading':'Normal')+'</w:tc>').join('')+'</w:tr>').join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:color="C5D6E7" w:sz="6"/>').join('')+'</w:tblBorders></w:tblPr>'+rows+'</w:tbl>';
 }
 if(node.tagName==='UL'||node.tagName==='OL')return [...node.querySelectorAll('li')].map((li,i)=>p((node.tagName==='OL'?(i+1)+'. ':'• ')+li.textContent)).join('');
 return p(node.textContent);
}
export function htmlToWordDocument(html){
 if(typeof DOMParser==='undefined')throw new Error('A browser is required for Word export.');
 const parsed=new DOMParser().parseFromString(String(html),'text/html');
 const body=[...parsed.body.children].map(renderBlock).join('');
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+
 '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1191" w:right="1191" w:bottom="1191" w:left="1191"/></w:sectPr></w:body></w:document>';
}
const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
 '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
 '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'+
 '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="174EA6"/></w:rPr></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="174EA6"/></w:rPr></w:style>'+
 '<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style>'+
 '<w:style w:type="paragraph" w:styleId="TableHeading"><w:name w:val="Table heading"/><w:rPr><w:b/></w:rPr></w:style></w:styles>';
export async function buildWordDraft(html){
 const {default:JSZip}=await import('jszip');
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?>'+
 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
 '<Default Extension="xml" ContentType="application/xml"/>'+
 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
 '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
 '</Types>');
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
 '</Relationships>');
 zip.file('word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8"?>'+
 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
 '</Relationships>');
 zip.file('word/document.xml',htmlToWordDocument(html));
 zip.file('word/styles.xml',styles);
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
export async function buildCompetitionZip(first,second,checklist){
 const {default:JSZip}=await import('jszip');
 const zip=new JSZip();
 const [a,b]=await Promise.all([buildWordDraft(first),buildWordDraft(second)]);
 zip.file('P1/Tong_quan.docx',a);
 zip.file('P2/Ke_hoach_day_hoc.docx',b);
 const instructions='BẢN NHÁP - cần xác nhận trước khi nộp.\nChỉ đính kèm học liệu và minh chứng lớp học có thật, được phép sử dụng.\nKhông dùng dữ liệu demo làm minh chứng.\n\n'+
 checklist.map(c=>(c.done?'[x] ':'[ ] ')+c.label+' - '+c.desc).join('\n');
 zip.file('P2/CAN_BO_SUNG_MINH_CHUNG.txt',instructions);
 return zip.generateAsync({type:'blob',compression:'DEFLATE'});
}
export function saveBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
