import {createHash} from 'node:crypto';
import {canonicalArtworkPng} from './_museumPng.js';

const JPEG_PREFIX='data:image/jpeg;base64,';
const MAX_JPEG_URL_LENGTH=900000;
const MAX_SIDE=1100;

export async function canonicalArtworkImage({png,jpeg}){
 if(jpeg===undefined)return canonicalArtworkPng(png);
 if(png!==undefined||typeof jpeg!=='string'||jpeg.length>MAX_JPEG_URL_LENGTH||
  !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(jpeg))
  throw new Error('Invalid or oversized artwork image.');
 const input=Buffer.from(jpeg.slice(JPEG_PREFIX.length),'base64');
 if(input[0]!==0xff||input[1]!==0xd8||input[2]!==0xff)
  throw new Error('Only rasterized JPEG image data is accepted.');
 const {default:sharp}=await import('sharp');
 const image=sharp(input,{limitInputPixels:MAX_SIDE*MAX_SIDE,failOn:'warning'});
 const metadata=await image.metadata();
 if(metadata.format!=='jpeg'||metadata.width<30||metadata.height<30||
  metadata.width>MAX_SIDE||metadata.height>MAX_SIDE)
  throw new Error('Invalid image dimensions.');
 // Keep existing PNG-only storage and publishing contracts. Sharp drops
 // embedded metadata when encoding unless it is explicitly preserved.
 const {data:buffer,info}=await image.toColourspace('srgb')
  .png({compressionLevel:4,adaptiveFiltering:true}).toBuffer({resolveWithObject:true});
 if(buffer.length>3200000)throw new Error('Processed image too large.');
 return {buffer,width:info.width,height:info.height,bytes:buffer.length,
  sha256:createHash('sha256').update(buffer).digest('hex'),mime:'image/png'};
}
