let mammothLoader;
let pdfjsLoader;

export function loadMammoth() {
  if (!mammothLoader) {
    mammothLoader = import('mammoth/mammoth.browser.js').then((module) => module.default || module);
  }
  return mammothLoader;
}

export function loadPdfjs() {
  if (!pdfjsLoader) {
    pdfjsLoader = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
    ]).then(([pdfjsLib, workerUrl]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default || workerUrl;
      return pdfjsLib;
    });
  }

  return pdfjsLoader;
}

export async function readDocxTextFromBuffer(arrayBuffer) {
  const mammoth = await loadMammoth();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

export async function readPdfTextFromBuffer(arrayBuffer, { maxPages = 40, maxChars = 120000 } = {}) {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;
  const safeMax = Math.min(pdf.numPages, maxPages);
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= safeMax; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const pageText = (content.items || [])
        .map((item) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) pages.push(`--- PDF Page ${pageNumber} ---\n${pageText}`);
      page.cleanup?.();
      if (pages.join('\n\n').length >= maxChars) break;
    }
  } finally {
    await pdf.destroy?.();
  }

  return pages.join('\n\n').slice(0, maxChars);
}
