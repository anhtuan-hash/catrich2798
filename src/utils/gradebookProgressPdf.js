import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';
import { buildStudentProgressModel } from './gradebookPhase3.js';

const PW=595.28,PH=841.89,M=40;
const navy=rgb(.09,.21,.37),blue=rgb(.13,.42,.79),muted=rgb(.42,.51,.62),line=rgb(.83,.88,.94),pale=rgb(.96,.98,1);
function drawText(page,font,value,x,y,size=10,color=navy,maxWidth=510){
  let str=String(value??'—');
  while(str.length>1&&font.widthOfTextAtSize(str,size)>maxWidth)str=str.slice(0,-1);
  if(str!==String(value??'—'))str=str.slice(0,-1)+'…';
  page.drawText(str,{x,y,font,size,color});
}
function splitLines(font,input,maxWidth,size=9,maxLines=5){
  const words=String(input||'').split(/\s+/).filter(Boolean),out=[];
  let current='';
  for(const word of words){
    const next=current?current+' '+word:word;
    if(font.widthOfTextAtSize(next,size)>maxWidth&&current){
      out.push(current);current=word;
      if(out.length>=maxLines)return out;
    }else current=next;
  }
  if(current&&out.length<maxLines)out.push(current);
  return out;
}
function header(page,font,data,stamp){
  page.drawRectangle({x:0,y:PH-124,width:PW,height:124,color:pale});
  page.drawLine({start:{x:M,y:PH-119},end:{x:PW-M,y:PH-119},thickness:1,color:line});
  drawText(page,font,'BRIAN ENGLISH · GRADEBOOK',M,PH-38,10,blue);
  drawText(page,font,'PHIẾU THEO DÕI TIẾN BỘ HỌC TẬP',M,PH-68,17,navy);
  drawText(page,font,data.subjectName+' · '+(data.semesterId==='semester2'?'Học kỳ II':'Học kỳ I'),M,PH-92,10,muted);
  drawText(page,font,'Ngày xuất: '+stamp,PW-M-168,PH-38,8,muted,168);
}
function scoreCard(page,font,name,value,x,y,w=76){
  page.drawRectangle({x,y,width:w,height:71,color:pale,borderColor:line,borderWidth:.5});
  drawText(page,font,name,x+8,y+51,8,muted,w-12);
  drawText(page,font,value==null?'—':Number(value).toFixed(2).replace(/0$/,'').replace(/\.$/,''),x+8,y+20,16,navy,w-12);
}
function chart(page,font,scores){
  const x=64,y=309,w=455,h=133;
  page.drawRectangle({x,y,width:w,height:h,borderColor:line,borderWidth:.8,color:rgb(1,1,1)});
  for(let n=0;n<=5;n++){
    const yy=y+21+(n/5)*98;
    page.drawLine({start:{x:x+38,y:yy},end:{x:x+w-18,y:yy},thickness:.5,color:line});
    drawText(page,font,String(n*2),x+12,yy-3,7,muted,22);
  }
  const starts=x+66,dx=110;
  const points=scores.map((s,i)=>s==null?null:{x:starts+i*dx,y:y+21+(Number(s)/10)*98});
  for(let i=1;i<points.length;i++){
    if(points[i]&&points[i-1])page.drawLine({start:points[i-1],end:points[i],thickness:2.4,color:blue});
  }
  for(let i=0;i<4;i++){
    const point=points[i];
    if(point)page.drawCircle({x:point.x,y:point.y,size:4,color:blue});
    drawText(page,font,'TX '+(i+1),starts+i*dx-12,y+7,8,muted,52);
  }
}
export async function buildGradebookProgressPdf({student,students,semester,semesterId,subjectName,
  intervention,records,fontBytes,schoolYear='',className=''}={}){
  const data=buildStudentProgressModel({student,students,semester,semesterId,subjectName,intervention,records});
  let bytes=fontBytes;
  if(!bytes){
    const locations=[
      '/bes-fonts/brian-personal-font.ttf',
      'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    ];
    for(const address of locations){
      try{
        const response=await fetch(address);
        if(response.ok){
          const buffer=new Uint8Array(await response.arrayBuffer());
          if(buffer.length>4000){bytes=buffer;break;}
        }
      }catch{ /* Next font source */ }
    }
    if(!bytes)throw new Error('Không tải được font tiếng Việt cho phiếu tiến bộ.');
  }
  const pdf=await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font=await pdf.embedFont(bytes,{subset:true});
  const page=pdf.addPage([PW,PH]);
  const stamp=new Intl.DateTimeFormat('vi-VN').format(new Date());
  pdf.setTitle('Phiếu tiến bộ - '+data.studentName);
  pdf.setAuthor('BRIAN English - Gradebook');
  header(page,font,data,stamp);
  drawText(page,font,'HỌC SINH',M,PH-154,9,blue);
  drawText(page,font,data.studentName,M,PH-178,15,navy,390);
  drawText(page,font,'Mã: '+(data.studentCode||'—')+' · Lớp: '+(className||'—')+' · Năm học: '+(schoolYear||'—'),M,PH-199,9,muted,510);
  page.drawLine({start:{x:M,y:PH-215},end:{x:PW-M,y:PH-215},thickness:.7,color:line});
  drawText(page,font,'KẾT QUẢ CÁC THÀNH PHẦN',M,PH-244,10,blue);
  const labels=['TX 1','TX 2','TX 3','TX 4','Giữa kỳ','Cuối kỳ'];
  labels.forEach((label,i)=>scoreCard(page,font,label,data.components[i],M+i*86,PH-327,79));
  drawText(page,font,'Tiến độ: '+data.completed+'/6 thành phần có điểm',M,PH-347,10,navy);
  drawText(page,font,'Điểm TB theo công thức Sổ điểm (tạm tính nếu chưa đủ điểm): '+(data.semesterAverage??'—'),M,PH-367,9,navy);
  drawText(page,font,'BIẾN ĐỘNG KẾT QUẢ THƯỜNG XUYÊN',M,461,10,blue);
  chart(page,font,data.components.slice(0,4));
  drawText(page,font,'KẾT QUẢ RUBRIC SPEAKING / WRITING',M,289,10,blue);
  const rubricLines=data.rubricRecords.slice(0,3);
  if(!rubricLines.length)drawText(page,font,'Chưa có lần đánh giá rubric được lưu.',M,268,9,muted);
  else rubricLines.forEach((r,i)=>drawText(page,font,(r.type==='speaking'?'Speaking':'Writing')+' · '+r.activity+': '+Number(r.score).toFixed(2)+'/10',M,268-i*18,9,navy));
  drawText(page,font,'THEO DÕI HỖ TRỢ HỌC TẬP',M,203,10,blue);
  const interventionText=data.intervention?.note || 'Chưa có kế hoạch hỗ trợ được ghi nhận.';
  const noteLines=splitLines(font,interventionText,PW-2*M,9,5);
  noteLines.forEach((text,i)=>drawText(page,font,text,M,183-i*17,9,muted));
  if(data.intervention?.target!=null)drawText(page,font,'Mục tiêu do giáo viên đặt: '+data.intervention.target+'/10',M,91,9,navy);
  page.drawLine({start:{x:M,y:74},end:{x:PW-M,y:74},thickness:.6,color:line});
  drawText(page,font,'Thông tin lấy từ dữ liệu Sổ điểm tại thời điểm xuất. Không phải dự báo hoặc đánh giá tự động.',M,57,7.5,muted,520);
  drawText(page,font,'BRIAN ENGLISH · SẢN PHẨM CÔNG NGHỆ SỐ',M,38,7.5,muted,500);
  const pdfBytes=await pdf.save();
  return {bytes:pdfBytes,mimeType:'application/pdf',
    fileName:'BRIAN-Tien-bo-'+String(data.studentCode||data.studentName).normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]/g,'-').slice(0,65)+'.pdf',
    model:data};
}
export async function exportGradebookProgressPdf(input){
  const result=await buildGradebookProgressPdf(input);
  const url=URL.createObjectURL(new Blob([result.bytes],{type:result.mimeType}));
  const a=document.createElement('a');a.href=url;a.download=result.fileName;
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),10000);
  return result;
}
