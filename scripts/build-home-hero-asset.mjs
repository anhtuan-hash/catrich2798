import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const partsDir = 'scripts/assets/hero-vietnam';
const targetDir = 'public/home';
const targetFile = path.join(targetDir, 'hero-vietnam.svg');
const expectedParts = 6;

if (!fs.existsSync(partsDir)) {
  throw new Error(`Missing homepage illustration source directory: ${partsDir}`);
}

const files = fs.readdirSync(partsDir)
  .filter((name) => /^part-\d+\.txt$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (files.length !== expectedParts) {
  throw new Error(`Homepage illustration requires ${expectedParts} parts; found ${files.length}.`);
}

const base64 = files
  .map((name) => fs.readFileSync(path.join(partsDir, name), 'utf8').replace(/\s+/g, ''))
  .join('');

const image = Buffer.from(base64, 'base64');
const sha256 = createHash('sha256').update(image).digest('hex');
const riff = image.subarray(0, 4).toString('ascii');
const webp = image.subarray(8, 12).toString('ascii');

if (image.length < 30000 || riff !== 'RIFF' || webp !== 'WEBP') {
  throw new Error(`Homepage illustration is not a valid WebP payload: bytes=${image.length}, sha256=${sha256}.`);
}

fs.mkdirSync(targetDir, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="879" height="617" viewBox="0 0 879 617" preserveAspectRatio="xMidYMid slice"><image width="879" height="617" href="data:image/webp;base64,${base64}"/></svg>\n`;
fs.writeFileSync(targetFile, svg);

console.log(`Homepage illustration built: ${targetFile} · ${image.length} bytes · ${sha256}`);
