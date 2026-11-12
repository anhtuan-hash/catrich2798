// Strict PNG decoder and re-encoder: strip all EXIF/text/ICC/ancillary metadata.
// Supported input: 8-bit, noninterlaced RGB/RGBA PNG rasterized from JPG/PNG/WebP in browser.
// No user-provided SVG/GLB/PDF or executable payload is accepted.
import {inflateSync,deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const SIG=Buffer.from([137,80,78,71,13,10,26,10]);
const MAX_BYTES=2900000,MAX_PIXELS=1600*1600;
const crcTable=Array.from({length:256},(_,n)=>{
 let c=n;for(let i=0;i<8;i++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
 return c>>>0;
});
function crc32(buffer){
 let crc=0xffffffff;for(const b of buffer)crc=crcTable[(crc^b)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function chunk(type,data){
 const name=Buffer.from(type,'ascii'),payload=Buffer.concat([name,data]);
 const out=Buffer.alloc(data.length+12);
 out.writeUInt32BE(data.length,0);payload.copy(out,4);out.writeUInt32BE(crc32(payload),data.length+8);
 return out;
}
export function canonicalArtworkPng(value){
 if(typeof value!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value)||
  value.length>4000000)throw new Error('Only rasterized PNG image data is accepted.');
 const b=Buffer.from(value.slice(22),'base64');
 if(b.length<70||b.length>MAX_BYTES||!b.subarray(0,8).equals(SIG))
  throw new Error('Invalid or oversized PNG data.');
 let pos=8,width=0,height=0,bpp=0,seenIHDR=false,seenIEND=false;
 const compressed=[];let idatBytes=0;
 while(pos+12<=b.length){
  const len=b.readUInt32BE(pos);if(len>MAX_BYTES||pos+12+len>b.length)throw new Error('Invalid PNG chunk length.');
  const type=b.toString('ascii',pos+4,pos+8);
  const data=b.subarray(pos+8,pos+8+len);
  if(crc32(b.subarray(pos+4,pos+8+len))!==b.readUInt32BE(pos+8+len))throw new Error('PNG checksum mismatch.');
  pos+=len+12;
  if(type==='IHDR'){
   if(seenIHDR||len!==13)throw new Error('Invalid PNG header.');
   seenIHDR=true;width=data.readUInt32BE(0);height=data.readUInt32BE(4);
   const depth=data[8],color=data[9];
   if(!width||!height||width>1600||height>1600||width*height>MAX_PIXELS||
     depth!==8||![2,6].includes(color)||data[10]!==0||data[11]!==0||data[12]!==0)
    throw new Error('Unsupported image size or format.');
   bpp=color===6?4:3;
  }else if(type==='IDAT'){
   if(!seenIHDR||seenIEND)throw new Error('Invalid PNG chunk order.');
   compressed.push(data);idatBytes+=len;if(idatBytes>MAX_BYTES)throw new Error('PNG data too large.');
  }else if(type==='IEND'){
   if(len!==0)throw new Error('Malformed PNG end.');
   seenIEND=true;break;
  }else if(type==='PLTE')throw new Error('Palette PNG is not allowed.');
  else if(!/^[a-z]$/.test(type[0]))throw new Error('Unknown critical PNG chunk.');
  // Ancillary metadata is ignored and never copied into the canonical output.
 }
 if(!seenIHDR||!seenIEND||!compressed.length||pos!==b.length)throw new Error('PNG has incomplete or trailing data.');
 const stride=width*bpp,expected=height*(stride+1);
 const decoded=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected});
 if(decoded.length!==expected)throw new Error('Image decompression length mismatch.');
 const clean=Buffer.alloc(height*(width*4+1));
 let prev=Buffer.alloc(stride),offset=0;
 for(let y=0;y<height;y++){
  const filter=decoded[offset++];if(filter>4)throw new Error('Invalid PNG row filter.');
  const row=Buffer.from(decoded.subarray(offset,offset+stride));offset+=stride;
  for(let x=0;x<stride;x++){
   const a=x>=bpp?row[x-bpp]:0,left=a,up=prev[x],upperLeft=x>=bpp?prev[x-bpp]:0;
   let predict=0;
   if(filter===1)predict=left;
   if(filter===2)predict=up;
   if(filter===3)predict=(left+up)>>>1;
   if(filter===4){const p=left+up-upperLeft,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-upperLeft);predict=pa<=pb&&pa<=pc?left:pb<=pc?up:upperLeft;}
   row[x]=(row[x]+predict)&255;
  }
  const start=y*(width*4+1);clean[start]=0;
  for(let x=0;x<width;x++){
   const src=x*bpp,dst=start+1+x*4;
   clean[dst]=row[src];clean[dst+1]=row[src+1];clean[dst+2]=row[src+2];clean[dst+3]=bpp===4?row[src+3]:255;
  }
  prev=row;
 }
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
 header[8]=8;header[9]=6;header[10]=0;header[11]=0;header[12]=0;
 const output=Buffer.concat([SIG,chunk('IHDR',header),chunk('IDAT',deflateSync(clean,{level:8})),chunk('IEND',Buffer.alloc(0))]);
 if(output.length>3200000)throw new Error('Processed image too large.');
 return {buffer:output,width,height,bytes:output.length,sha256:createHash('sha256').update(output).digest('hex'),mime:'image/png'};
}
