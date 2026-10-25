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
