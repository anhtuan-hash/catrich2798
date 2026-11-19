const PHOTO_BUDGET = 360 * 1024;
const PHOTO_EDGE = 1600;

function animatedRaster(bytes, type) {
 if (type === 'image/webp') {
  return bytes[12] === 86 && bytes[13] === 80 && bytes[14] === 56 && bytes[15] === 88 &&
   Boolean(bytes[20] & 0x02);
 }
 if (type !== 'image/png') return false;
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 for (let offset = 8; offset + 12 <= bytes.length;) {
  const chunk = view.getUint32(offset + 4);
  if (chunk === 0x6163544c) return true; // acTL
  if (chunk === 0x49444154) return false; // IDAT
  offset += view.getUint32(offset) + 12;
 }
 return false;
}

export async function prepareOfflineArtwork(blob, bytes, check) {
 if (blob.size <= PHOTO_BUDGET || !/^image\/(jpeg|png|webp)$/.test(blob.type) ||
  animatedRaster(bytes, blob.type)) return blob;

 const bitmap = await createImageBitmap(blob);
 const canvas = document.createElement('canvas');
 try {
  const context = canvas.getContext('2d');
  if (!context) return blob;
  const base = Math.min(1, PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  for (const scale of [1, 0.75, 0.5, 0.35]) {
   check();
   canvas.width = Math.max(1, Math.round(bitmap.width * base * scale));
   canvas.height = Math.max(1, Math.round(bitmap.height * base * scale));
   context.imageSmoothingQuality = 'high';
   context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
   for (const quality of [0.90, 0.78, 0.65]) {
    check();
    const photo = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (photo?.size && photo.size <= PHOTO_BUDGET) return photo;
    if (photo?.type !== 'image/webp') break;
   }
  }
  return blob;
 } finally {
  bitmap.close();
  canvas.width = canvas.height = 1;
 }
}
