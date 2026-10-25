/** Local-only raster crop utility. Requires genuine user action in the Layers panel.
 * Never uploads images or uses AI.
 */
export async function cropBoardImageData(src,edge='right',ratio=.12){
 if(!/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(src||'')))
  throw Error('Only locally embedded PNG, JPEG and WebP images can be cropped');
 if(!['left','right','top','bottom'].includes(edge))throw Error('Invalid crop edge');
 const fraction=Math.max(.03,Math.min(.35,Number(ratio)||.12));
 const img=new Image();img.decoding='async';img.src=src;
 await (img.decode?img.decode():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;}));
 const w=img.naturalWidth,h=img.naturalHeight;
 if(!w||!h||w*h>18000000)throw Error('Image dimensions unavailable or too large');
 const side=edge==='left'||edge==='right',size=Math.floor((side?w:h)*fraction);
 const cropX=edge==='left'?size:0,cropY=edge==='top'?size:0;
 const newW=w-(side?size:0),newH=h-(!side?size:0);
 const canvas=document.createElement('canvas');
 canvas.width=newW;canvas.height=newH;
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)throw Error('Canvas 2D unavailable');
 ctx.drawImage(img,cropX,cropY,newW,newH,0,0,newW,newH);
 const data=canvas.toDataURL('image/webp',.9);
 if(data.length>3000000)throw Error('Cropped image exceeds the maximum size');
 return {src:data,ratio:newW/newH};
}

/** Portable normalized cropping geometry. The preview and raster encoder share it. */
export function normalizeBoardCrop(rect){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Number(v):a));
 const x=clamp(rect?.x,0,.92),y=clamp(rect?.y,0,.92);
 return {x,y,width:clamp(rect?.width,.08,1-x),height:clamp(rect?.height,.08,1-y)};
}
export async function cropBoardImageRegion(src,region){
 if(!/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(src||'')))throw Error('Invalid local image');
 const r=normalizeBoardCrop(region);
 const img=new Image();img.decoding='async';img.src=src;
 await (img.decode?img.decode():new Promise((resolve,reject)=>{
  img.onload=resolve;img.onerror=reject;
 }));
 const w=img.naturalWidth,h=img.naturalHeight;
 if(!w||!h||w*h>18000000)throw Error('Image dimensions unsupported');
 const left=Math.max(0,Math.min(w-1,Math.round(r.x*w)));
 const top=Math.max(0,Math.min(h-1,Math.round(r.y*h)));
 const width=Math.max(1,Math.min(w-left,Math.round(r.width*w)));
 const height=Math.max(1,Math.min(h-top,Math.round(r.height*h)));
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{alpha:true});
 if(!context)throw Error('Canvas 2D unavailable');
 context.drawImage(img,left,top,width,height,0,0,width,height);
 const encoded=canvas.toDataURL('image/webp',.86);
 if(encoded.length>3000000)throw Error('Cropped image exceeds 3 MB');
 return {src:encoded,ratio:width/height,region:r};
}
