#!/usr/bin/env node
/**
 * BRIAN Design-to-Code visual evaluator.
 *
 * Captures a real Chromium render and optionally compares it with an image
 * mockup. No external AI API, secrets or user accounts are required.
 *
 * Example:
 * node tools/design-to-code/cli.mjs capture \
 *   --url http://127.0.0.1:4173/tools/design-to-code/fixtures/settings-paper.html \
 *   --reference ./mockups/settings-paper.png \
 *   --width 1145 --height 1374 --out ./artifacts/design-to-code
 */
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

function parseOptions(argv) {
  const [, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const raw = rest[i];
    if (!raw.startsWith('--')) throw new Error('Expected --option, got ' + raw);
    const key = raw.slice(2);
    if (!/^[a-z][a-z0-9-]*$/.test(key) || i + 1 >= rest.length) throw new Error('Invalid option ' + raw);
    options[key] = rest[++i];
  }
  return options;
}
function numberOption(input, fallback) {
  const value = input === undefined ? fallback : Number(input);
  if (!Number.isInteger(value) || value < 200 || value > 4096) throw new Error('Invalid viewport size: ' + input);
  return value;
}
function imageType(path) {
  const ext = extname(path).toLowerCase();
  return ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[ext] || null;
}
async function makeDifference(page, expectedPath, actualBuffer) {
  const mime = imageType(expectedPath);
  if (!mime) throw new Error('Reference must be PNG, JPEG or WebP');
  const expected = await readFile(resolve(expectedPath));
  const input = {
    referenceUrl: 'data:' + mime + ';base64,' + expected.toString('base64'),
    actualUrl: 'data:image/png;base64,' + actualBuffer.toString('base64'),
  };
  // Image decoding is done in the browser so the engine needs no extra
  // raster comparison packages. Resampling is explicitly reported; a scaled
  // comparison must not be presented as exact pixel-perfect fidelity.
  return page.evaluate(async ({ referenceUrl, actualUrl }) => {
    const load = (src) => new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = reject;
      picture.src = src;
    });
    const [ref, actual] = await Promise.all([load(referenceUrl), load(actualUrl)]);
    const width = actual.naturalWidth, height = actual.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(ref, 0, 0, width, height);
    const reference = ctx.getImageData(0, 0, width, height);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(actual, 0, 0, width, height);
    const observed = ctx.getImageData(0, 0, width, height);
    const heat = ctx.createImageData(width, height);
    let totalAbsolute = 0, changedPixels = 0;
    const pixelCount = width * height;
    for (let p = 0; p < pixelCount; p++) {
      const i = p * 4;
      const meanDelta = (Math.abs(reference.data[i] - observed.data[i])
        + Math.abs(reference.data[i+1] - observed.data[i+1])
        + Math.abs(reference.data[i+2] - observed.data[i+2])) / 3;
      totalAbsolute += meanDelta;
      if (meanDelta > 28) changedPixels++;
      const intensity = Math.min(255, meanDelta * 3);
      heat.data[i] = Math.min(255, intensity + 30);
      heat.data[i+1] = Math.round((255-intensity) * .25);
      heat.data[i+2] = Math.round((255-intensity) * .4);
      heat.data[i+3] = 255;
    }
    ctx.putImageData(heat, 0, 0);
    return {
      width, height,
      referenceWidth: ref.naturalWidth, referenceHeight: ref.naturalHeight,
      scaledReference: width !== ref.naturalWidth || height !== ref.naturalHeight,
      meanAbsoluteRGBError: Number((totalAbsolute / pixelCount).toFixed(2)),
      changedPixelRatio: Number((changedPixels / pixelCount).toFixed(4)),
      note: 'Raw pixel difference is a diagnostic, not an AI-generated fidelity score. Layout must also be reviewed.',
      diffPNG: ctx.canvas.toDataURL('image/png').split(',')[1],
    };
  }, input);
}

export async function captureDesign(options = {}) {
  const url = new URL(options.url || 'http://127.0.0.1:4173/tools/design-to-code/fixtures/settings-paper.html');
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP(S) URL required.');
  const width = numberOption(options.width, 1145);
  const height = numberOption(options.height, 1374);
  const outputDir = resolve(options.out || 'artifacts/design-to-code');
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width, height }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', colorScheme: 'light',
    });
    await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 45_000 });
    await page.locator('[data-design-to-code="settings-paper-v1"]').waitFor();
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('[data-design-to-code="settings-paper-v1"]');
      const r = root.getBoundingClientRect();
      const cards = [...root.querySelectorAll('.sl2-tile')].map((element) => {
        const b = element.getBoundingClientRect();
        return { title: element.querySelector('strong')?.textContent || '',
          x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width),
          height: Math.round(b.height), clipped: b.left < 0 || b.right > innerWidth + 1 };
      });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        rootWidth: Math.round(r.width), contentScrollWidth: document.documentElement.scrollWidth,
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
        cardCount: cards.length, cards,
      };
    });
    const screenshot = await page.screenshot({ fullPage: options['full-page'] === 'true', animations: 'disabled' });
    const screenshotPath = outputDir + '/settings-paper-actual.png';
    await writeFile(screenshotPath, screenshot);
    const report = {
      engine: 'BRIAN DESIGN-TO-CODE v1',
      source: url.toString(),
      screenshotPath,
      capturedAt: new Date().toISOString(),
      ...metrics,
      comparison: { status: 'reference-not-provided' },
    };
    if (options.reference) {
      const { diffPNG, ...comparison } = await makeDifference(page, options.reference, screenshot);
      const diffPath = outputDir + '/settings-paper-difference.png';
      await writeFile(diffPath, Buffer.from(diffPNG, 'base64'));
      report.comparison = { status: 'compared', reference: resolve(options.reference), diffPath, ...comparison };
    }
    await writeFile(outputDir + '/report.json', JSON.stringify(report, null, 2) + '\n');
    if (metrics.horizontalOverflow || metrics.cards.some((card) => card.clipped)) throw new Error('Layout clipping detected. See '+outputDir+'/report.json');
    return report;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === new URL('file://' + resolve(process.argv[1])).href) {
  const [command, ...args] = process.argv.slice(2);
  if (command !== 'capture') {
    process.stderr.write('Usage: node tools/design-to-code/cli.mjs capture --url URL [--reference path] [--out path] [--width 1145] [--height 1374] [--full-page true]\n');
    process.exitCode = 2;
  } else {
    captureDesign(parseOptions(['capture', ...args]))
      .then((result) => process.stdout.write(JSON.stringify({ report: result.screenshotPath, ...result.comparison }, null, 2) + '\n'))
      .catch((error) => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
  }
}
