import React,{useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,X} from 'lucide-react';
import {loadMammoth,loadPdfjs} from '../../../utils/documentParsers.js';
import {saveBlob} from './museumDocx.js';
import './museumFileDialog.css';

const tr=(language,vi,en)=>language==='en'?en:vi;
const extension=filename=>filename.split('.').at(-1).toLowerCase();

function wordPage(body,language){
 return `<!doctype html><html lang="${language==='en'?'en':'vi'}"><head>
 <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
 <style>
 *{box-sizing:border-box}body{margin:0;padding:26px;background:#ede9e1;color:#191715;font:16px/1.58 Arial,sans-serif}
 article{max-width:900px;margin:auto;padding:clamp(25px,6vw,68px);background:white;overflow-wrap:anywhere;min-height:65vh}
 h1,h2,h3{line-height:1.17}img{max-width:100%;height:auto}a{color:#a91d18}table{width:100%;border-collapse:collapse}th,td{padding:6px;border:1px solid #bfb8ad;vertical-align:top}
 @media(max-width:540px){body{padding:8px}article{padding:17px;font-size:14px}}
 </style></head><body><article>${body}</article></body></html>`;
}

async function readFile(file,signal){
 if(file.blob)return file.blob;
 if(file.text!==undefined)return new Blob([file.text],{type:file.mime});
 const response=await fetch(file.href,{signal});
 if(!response.ok)throw new Error(String(response.status));
 return response.blob();
}

async function preparePreview(file,blob,kind){
 if(kind==='docx'){
  const mammoth=await loadMammoth();
  const result=await mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});
  return {html:result.value};
 }
 if(kind==='zip'){
  if(file.entries)return {entries:file.entries};
  const {default:JSZip}=await import('jszip');
  const zip=await JSZip.loadAsync(await blob.arrayBuffer());
  return {entries:Object.values(zip.files).filter(entry=>!entry.dir).map(entry=>entry.name)};
 }
 if(['csv','json','txt'].includes(kind)){
  const limit=250000;
  const sample=await blob.slice(0,limit).text();
  return {text:sample,truncated:blob.size>limit};
 }
 if(kind==='pdf')return {};
 return {url:URL.createObjectURL(blob)};
}

function PdfPreview({blob,language}){
 const [status,setStatus]=useState({pdf:null,error:false});
 const [pageNumber,setPageNumber]=useState(1);
 const [renderedPage,setRenderedPage]=useState(0);
 const canvasRef=useRef(null);
 useEffect(()=>{
  let active=true,task;
  const load=async()=>{
   const [pdfjs,data]=await Promise.all([loadPdfjs(),blob.arrayBuffer()]);
   if(!active)return;
   task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true});
   const pdf=await task.promise;
   if(active)setStatus({pdf,error:false});
  };
  load().catch(()=>{if(active)setStatus({pdf:null,error:true});});
  return ()=>{active=false;task?.destroy().catch(()=>{});};
 },[blob]);
 useEffect(()=>{
  const pdf=status.pdf;
  if(!pdf)return undefined;
  let active=true,task;
  const render=async()=>{
   const page=await pdf.getPage(pageNumber);
   if(!active)return;
   const canvas=canvasRef.current;
   const viewport=page.getViewport({scale:1200/page.getViewport({scale:1}).width});
   canvas.width=Math.ceil(viewport.width);
   canvas.height=Math.ceil(viewport.height);
   task=page.render({canvas,viewport});
   await task.promise;
   if(active)setRenderedPage(pageNumber);
  };
  render().catch(()=>{if(active)setStatus({pdf:null,error:true});});
  return ()=>{active=false;task?.cancel();};
 },[status.pdf,pageNumber]);

 if(status.error)return <p className="bml-file-state" role="alert">{tr(language,'Không thể hiển thị PDF. Thầy có thể tải tệp gốc.','Could not render this PDF. You can download the original.')}</p>;
 if(!status.pdf)return <p className="bml-file-state" role="status">{tr(language,'Đang dựng trang PDF…','Rendering the PDF…')}</p>;
 const pages=status.pdf.numPages;
 return <div className="bml-file-pdf">
  <div className="bml-file-pagebar">
   <button type="button" disabled={pageNumber<=1} onClick={()=>setPageNumber(pageNumber-1)}
    aria-label={tr(language,'Trang trước','Previous page')}><ArrowLeft size={17}/></button>
   <span aria-live="polite">{tr(language,'Trang','Page')} {pageNumber} / {pages}</span>
   <button type="button" disabled={pageNumber>=pages} onClick={()=>setPageNumber(pageNumber+1)}
    aria-label={tr(language,'Trang sau','Next page')}><ArrowRight size={17}/></button>
  </div>
  <canvas ref={canvasRef} role="img" aria-label={tr(language,'Trang PDF ','PDF page ')+pageNumber}
   style={{visibility:renderedPage===pageNumber?'visible':'hidden'}}/>
 </div>;
}

export default function MuseumFileDialog({file,language,onClose}){
 const dialogRef=useRef(null),titleId=useId();
 const kind=extension(file.filename);
 const [state,setState]=useState({});
 useEffect(()=>{
  const dialog=dialogRef.current;
  dialog.showModal();
  return ()=>{if(dialog.open)dialog.close();};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();
  let previewUrl;
  setState({});
  const load=async()=>{
   const blob=await readFile(file,controller.signal);
   if(controller.signal.aborted)return;
   setState({blob});
   const view=await preparePreview(file,blob,kind);
   previewUrl=view.url;
   if(controller.signal.aborted){if(previewUrl)URL.revokeObjectURL(previewUrl);return;}
   setState({blob,view});
  };
  load().catch(()=>{if(!controller.signal.aborted)setState(current=>({...current,error:true}));});
  return ()=>{controller.abort();if(previewUrl)URL.revokeObjectURL(previewUrl);};
 },[file,kind]);
 const title=file.title||file.filename;
 const {blob,view,error}=state;
 const label=tr(language,'Xem tệp','File preview');
 return <dialog ref={dialogRef} className="bml-file-dialog" aria-labelledby={titleId}
  onCancel={event=>{event.preventDefault();onClose();}}>
  <div className="bml-file-shell">
   <header className="bml-file-header">
    <div><p>{label} · {kind.toUpperCase()}</p><h2 id={titleId}>{title}</h2>
     {title!==file.filename?<small>{file.filename}</small>:null}</div>
    <div className="bml-file-actions">
     <button type="button" className="bml-file-download" disabled={!blob} onClick={()=>saveBlob(blob,file.filename)}>
      <Download size={17} aria-hidden="true"/>{tr(language,'Tải về','Download')}</button>
     <button type="button" autoFocus onClick={onClose} aria-label={tr(language,'Đóng','Close')}><X size={19}/></button>
    </div>
   </header>
   <div className="bml-file-body">
    {error?<p className="bml-file-state" role="alert">{tr(language,'Không thể mở bản xem trước.','Could not open the preview.')}</p>
     :!view?<p className="bml-file-state" role="status">{tr(language,'Đang mở tệp…','Opening the file…')}</p>
     :kind==='pdf'?<PdfPreview blob={blob} language={language}/>
     :kind==='docx'?<iframe title={title} sandbox="" srcDoc={wordPage(view.html,language)}/>
     :kind==='zip'?<ul className="bml-file-list" aria-label={tr(language,'Tệp trong ZIP','Files in ZIP')}>
       {view.entries.map(name=><li key={name}>{name}</li>)}</ul>
     :kind==='html'?<iframe title={title} src={view.url} sandbox={file.interactive?'allow-scripts':''}/>
     :kind==='png'?<img className="bml-file-image" src={view.url} alt={title}/>
     :<pre className="bml-file-text">{view.text}{view.truncated?'\n…':''}</pre>}
   </div>
  </div>
 </dialog>;
}
