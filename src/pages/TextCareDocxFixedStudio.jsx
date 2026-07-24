import JSZip from 'jszip';
import TextCareCompactStudio from './TextCareCompactStudio.jsx';

const WORDPROCESSING_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const OFFICE_RELATIONSHIPS_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const PATCH_MARK = Symbol.for('textcare.docx.wordprocessingml-repair.v1');

function hasParserError(documentNode) {
  return Boolean(documentNode?.getElementsByTagName?.('parsererror')?.length);
}

function isEscapedWordRun(value) {
  const source = String(value || '').trim();
  return source.startsWith('<w:r>')
    || source.startsWith('<w:r ')
    || source.startsWith('<w:hyperlink>')
    || source.startsWith('<w:hyperlink ');
}

/**
 * The original DOCX builder passed the XML returned by wRun() to wParagraph()
 * as a normal string. wParagraph() escaped that string again, so document.xml
 * contained literal text such as &lt;w:r&gt; and Word displayed the XML tags.
 *
 * This repair is deliberately limited to word/document.xml. It replaces only
 * a run whose text node itself contains a complete escaped WordprocessingML
 * run/hyperlink. User-authored text is left untouched.
 */
function repairEscapedWordprocessingMl(xmlSource) {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return xmlSource;
  }

  const parser = new DOMParser();
  const documentNode = parser.parseFromString(String(xmlSource || ''), 'application/xml');
  if (hasParserError(documentNode)) {
    throw new Error('Không thể phân tích word/document.xml trước khi xuất DOCX.');
  }

  let replacements = 0;
  let pass = 0;

  do {
    replacements = 0;
    pass += 1;

    const textElements = Array.from(documentNode.getElementsByTagNameNS(WORDPROCESSING_NS, 't'));
    textElements.forEach((textElement) => {
      const encodedMarkup = String(textElement.textContent || '').trim();
      if (!isEscapedWordRun(encodedMarkup)) return;

      const outerRun = textElement.parentNode;
      if (!outerRun || outerRun.namespaceURI !== WORDPROCESSING_NS || outerRun.localName !== 'r') return;

      const fragmentDocument = parser.parseFromString(
        `<tc-root xmlns:w="${WORDPROCESSING_NS}" xmlns:r="${OFFICE_RELATIONSHIPS_NS}">${encodedMarkup}</tc-root>`,
        'application/xml',
      );
      if (hasParserError(fragmentDocument)) {
        throw new Error('DOCX chứa một đoạn WordprocessingML không hợp lệ.');
      }

      const fragmentNodes = Array.from(fragmentDocument.documentElement.childNodes)
        .filter((node) => node.nodeType === 1);
      if (!fragmentNodes.length) return;

      const parent = outerRun.parentNode;
      if (!parent) return;
      fragmentNodes.forEach((node) => {
        parent.insertBefore(documentNode.importNode(node, true), outerRun);
      });
      parent.removeChild(outerRun);
      replacements += 1;
    });
  } while (replacements > 0 && pass < 5);

  const serialized = new XMLSerializer().serializeToString(documentNode)
    .replace(/^<\?xml[^>]*>\s*/i, '');

  if (/<w:t\b[^>]*>\s*&lt;w:(?:r|hyperlink)\b/i.test(serialized)) {
    throw new Error('DOCX vẫn còn mã XML bị escape; hệ thống đã dừng tải file để tránh tạo tài liệu hỏng.');
  }

  return `${XML_DECLARATION}${serialized}`;
}

function installTextCareDocxRepair() {
  const prototype = JSZip?.prototype;
  if (!prototype || prototype[PATCH_MARK]) return;

  const originalFile = prototype.file;
  const originalGenerateAsync = prototype.generateAsync;

  Object.defineProperty(prototype, PATCH_MARK, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  prototype.file = function textCareSafeFile(path, data, options) {
    const normalizedPath = `${this.root || ''}${path || ''}`.replace(/^\/+/, '');
    if (normalizedPath === 'word/document.xml' && typeof data === 'string') {
      return originalFile.call(this, path, repairEscapedWordprocessingMl(data), options);
    }
    return originalFile.call(this, path, data, options);
  };

  prototype.generateAsync = async function textCareValidatedGenerateAsync(options, onUpdate) {
    const documentEntry = originalFile.call(this, 'word/document.xml');
    if (documentEntry && typeof documentEntry.async === 'function') {
      const documentXml = await documentEntry.async('string');
      const parsed = new DOMParser().parseFromString(documentXml, 'application/xml');
      if (hasParserError(parsed)) {
        throw new Error('word/document.xml không hợp lệ; DOCX chưa được tạo.');
      }
      if (/<w:t\b[^>]*>\s*&lt;w:(?:r|hyperlink)\b/i.test(documentXml)) {
        throw new Error('Phát hiện XML bị hiển thị như văn bản; DOCX chưa được tạo.');
      }
      if (!parsed.getElementsByTagNameNS(WORDPROCESSING_NS, 'document').length) {
        throw new Error('Gói DOCX thiếu phần tử w:document.');
      }
    }
    return originalGenerateAsync.call(this, options, onUpdate);
  };
}

installTextCareDocxRepair();

export default TextCareCompactStudio;
