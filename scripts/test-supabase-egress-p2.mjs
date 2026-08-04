import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const settings = read('src/utils/vietnamAtmosphereSettings.js');
const base = read('src/utils/vietnamAtmosphereSettingsBase.js');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

check(settings.includes('const MAX_DELIVERED_IMAGE_SIZE = 900 * 1024'), 'Delivered-image egress cap is missing.');
check(settings.includes('const MAX_RASTER_DIMENSION = 768'), 'Raster dimension cap is missing.');
check(settings.includes('optimizeAtmosphereUpload(file)'), 'Client-side image optimization is missing.');
check(settings.includes("canvasToBlob(canvas, 'image/webp', RASTER_WEBP_QUALITY)"), 'WebP conversion is missing.');
check(settings.includes('upload(path, uploadFile'), 'Storage upload must use the optimized file.');
check(settings.includes("cacheControl: '31536000'"), 'Immutable objects must use one-year cache control.');
check(settings.includes('base.VIETNAM_ATMOSPHERE_LIMITS?.maxImages'), 'Existing image-count compatibility must be preserved.');
check(base.includes('const MAX_IMAGES = 12'), 'The legacy 12-image data contract must remain intact.');
check(!settings.includes(".channel('bes-vietnam-atmosphere-storage"), 'Storage optimizer must not add a Realtime channel.');

if (failures.length) {
  console.error('\nSupabase egress P2 guard failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Supabase egress P2 guard passed.');
console.log('New atmosphere image delivery: capped below 1 MB.');
console.log('Raster uploads: resized and converted to WebP when beneficial.');
console.log('Existing atmosphere images: preserved.');
