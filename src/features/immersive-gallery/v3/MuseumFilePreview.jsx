import React,{createContext,lazy,Suspense,useCallback,useContext,useRef,useState} from 'react';
import {saveBlob} from './museumDocx.js';

const MuseumFileDialog=lazy(()=>import('./MuseumFileDialog.jsx'));
const FilePreviewContext=createContext(null);

function saveExistingFile({blob,href,filename,text,mime}){
 if(blob){saveBlob(blob,filename);return;}
 if(text!==undefined){saveBlob(new Blob([text],{type:mime}),filename);return;}
 const link=document.createElement('a');
 link.href=href;
 link.download=filename;
 document.body.appendChild(link);
 link.click();
 link.remove();
}

export function useMuseumFilePreview(){
 return useContext(FilePreviewContext)||saveExistingFile;
}

export function MuseumFileLink({href,filename,title,children,...props}){
 const preview=useContext(FilePreviewContext);
 return <a {...props} href={href} download={preview?undefined:filename} aria-haspopup={preview?'dialog':undefined}
  onClick={preview?event=>{
   event.preventDefault();
   preview({href,filename,title},event.currentTarget);
  }:undefined}>{children}</a>;
}

export function MuseumFilePreviewProvider({language,enabled=true,children}){
 const [file,setFile]=useState(null);
 const openerRef=useRef(null);
 const open=useCallback((selected,opener=document.activeElement)=>{
  openerRef.current=opener;
  setFile(selected);
 },[]);
 const close=()=>{
  const opener=openerRef.current;
  setFile(null);
  window.requestAnimationFrame(()=>opener?.focus?.({preventScroll:true}));
 };
 return <FilePreviewContext.Provider value={enabled?open:null}>
  {children}
  {enabled&&file?<Suspense fallback={null}>
   <MuseumFileDialog file={file} language={language} onClose={close}/>
  </Suspense>:null}
 </FilePreviewContext.Provider>;
}
