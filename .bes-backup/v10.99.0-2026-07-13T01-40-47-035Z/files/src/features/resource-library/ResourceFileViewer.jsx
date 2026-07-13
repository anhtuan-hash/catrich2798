import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadMammoth } from '../../utils/documentParsers.js';

const PREVIEW_EXTENSIONS = new Set([
  'pdf', 'docx', 'xlsx', 'xls', 'pptx',
  'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'ogg',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'txt', 'md', 'csv', 'html',
]);

const IMAGE_MIME_BY_EXTENSION = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  svg: 'image/svg+xml', webp: 'image/webp', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
};

function fileExtension(item) {
  return String(item?.fileName || item?.title || '').split('.').pop()?.toLowerCase() || '';
}

function previewKind(item) {
  const mime = String(item?.mimeType || '').toLowerCase();
  const extension = fileExtension(item);
  if (mime.includes('pdf') || extension === 'pdf') return 'pdf';
  if (mime.includes('wordprocessingml') || extension === 'docx') return 'docx';
  if (mime.includes('spreadsheetml') || mime.includes('ms-excel') || ['xlsx', 'xls'].includes(extension)) return 'xlsx';
  if (mime.includes('presentationml') || extension === 'pptx') return 'pptx';
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(extension)) return 'video';
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a', 'ogg'].includes(extension)) return 'audio';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'html'].includes(extension)) return 'text';
  return 'unsupported';
}

export function supportsResourcePreview(item) {
  const mime = String(item?.mimeType || '').toLowerCase();
  return previewKind(item) !== 'unsupported' || mime.startsWith('image/') || PREVIEW_EXTENSIONS.has(fileExtension(item));
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function docxDocument(title, body) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#dfe8f0;color:#172b3d;font-family:Arial,Helvetica,sans-serif;line-height:1.55;padding:32px}
    article{width:min(900px,100%);min-height:1120px;margin:0 auto;background:#fff;padding:72px 78px;box-shadow:0 18px 48px rgba(25,57,82,.16);overflow-wrap:anywhere}
    h1,h2,h3,h4{line-height:1.2;color:#102d49}p{margin:.65em 0}table{border-collapse:collapse;width:100%;margin:1em 0}th,td{border:1px solid #aab9c5;padding:7px 9px;vertical-align:top}img{max-width:100%;height:auto}a{color:#1669b2}ul,ol{padding-left:1.5rem}blockquote{border-left:4px solid #8cb9df;margin:1em 0;padding:.5em 1em;background:#f4f8fb}
    @media(max-width:720px){body{padding:10px}article{padding:28px 22px;min-height:0}}
  </style></head><body><article>${body}</article></body></html>`;
}

function normaliseZipPath(baseFile, target) {
  const baseParts = String(baseFile || '').split('/');
  baseParts.pop();
  const targetParts = String(target || '').split('/');
  for (const part of targetParts) {
    if (!part || part === '.') continue;
    if (part === '..') baseParts.pop();
    else baseParts.push(part);
  }
  return baseParts.join('/');
}

function parseXml(text) {
  const document = new DOMParser().parseFromString(text, 'application/xml');
  const parseError = document.getElementsByTagName('parsererror')[0];
  if (parseError) throw new Error('Không thể đọc cấu trúc XML trong file PowerPoint.');
  return document;
}

function firstByLocalName(node, localName) {
  if (!node) return null;
  const list = node.getElementsByTagNameNS('*', localName);
  return list?.[0] || null;
}

function allByLocalName(node, localName) {
  return node ? Array.from(node.getElementsByTagNameNS('*', localName) || []) : [];
}

function numericAttribute(node, name, fallback = 0) {
  const value = Number(node?.getAttribute?.(name));
  return Number.isFinite(value) ? value : fallback;
}

function colourFromNode(node, fallback = '') {
  const srgb = firstByLocalName(node, 'srgbClr');
  if (srgb?.getAttribute('val')) return `#${srgb.getAttribute('val')}`;
  const scheme = firstByLocalName(node, 'schemeClr');
  const schemeValue = scheme?.getAttribute('val');
  const schemeMap = {
    dk1: '#15283a', lt1: '#ffffff', dk2: '#244c69', lt2: '#eef4f8',
    accent1: '#2878d0', accent2: '#7650c7', accent3: '#24865f', accent4: '#d04a55', accent5: '#b97908', accent6: '#1689a4',
    tx1: '#15283a', bg1: '#ffffff', tx2: '#244c69', bg2: '#eef4f8',
  };
  return schemeMap[schemeValue] || fallback;
}

function elementBox(node, slideWidth, slideHeight) {
  const xfrm = firstByLocalName(node, 'xfrm');
  const off = xfrm && firstByLocalName(xfrm, 'off');
  const ext = xfrm && firstByLocalName(xfrm, 'ext');
  const x = numericAttribute(off, 'x', 0);
  const y = numericAttribute(off, 'y', 0);
  const width = numericAttribute(ext, 'cx', slideWidth);
  const height = numericAttribute(ext, 'cy', Math.max(slideHeight * .08, 1));
  const rotation = numericAttribute(xfrm, 'rot', 0) / 60000;
  return {
    left: `${Math.max(0, x / slideWidth) * 100}%`,
    top: `${Math.max(0, y / slideHeight) * 100}%`,
    width: `${Math.max(.1, width / slideWidth) * 100}%`,
    height: `${Math.max(.1, height / slideHeight) * 100}%`,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
  };
}

function shapeText(shape) {
  const paragraphs = allByLocalName(shape, 'p');
  if (!paragraphs.length) return allByLocalName(shape, 't').map((item) => item.textContent || '').join(' ');
  return paragraphs.map((paragraph) => {
    const parts = [];
    for (const child of Array.from(paragraph.getElementsByTagNameNS('*', 't') || [])) parts.push(child.textContent || '');
    return parts.join('');
  }).join('\n').trim();
}

function shapeStyle(shape) {
  const spPr = firstByLocalName(shape, 'spPr');
  const txBody = firstByLocalName(shape, 'txBody');
  const bodyPr = txBody && firstByLocalName(txBody, 'bodyPr');
  const firstRunProperties = firstByLocalName(txBody, 'rPr') || firstByLocalName(txBody, 'defRPr');
  const paragraphProperties = firstByLocalName(txBody, 'pPr');
  const presetGeometry = firstByLocalName(spPr, 'prstGeom')?.getAttribute('prst') || '';
  const fillNode = spPr && firstByLocalName(spPr, 'solidFill');
  const lineNode = spPr && firstByLocalName(firstByLocalName(spPr, 'ln'), 'solidFill');
  const fontSize = numericAttribute(firstRunProperties, 'sz', 1800) / 100;
  const fontFamily = firstByLocalName(firstRunProperties, 'latin')?.getAttribute('typeface') || 'Arial, sans-serif';
  const alignment = paragraphProperties?.getAttribute('algn') || 'l';
  const vertical = bodyPr?.getAttribute('anchor') || 't';
  const margins = {
    paddingLeft: `${numericAttribute(bodyPr, 'lIns', 91440) / 914400}in`,
    paddingRight: `${numericAttribute(bodyPr, 'rIns', 91440) / 914400}in`,
    paddingTop: `${numericAttribute(bodyPr, 'tIns', 45720) / 914400}in`,
    paddingBottom: `${numericAttribute(bodyPr, 'bIns', 45720) / 914400}in`,
  };
  return {
    background: colourFromNode(fillNode, 'transparent'),
    borderColor: colourFromNode(lineNode, 'transparent'),
    borderStyle: lineNode ? 'solid' : 'none',
    borderWidth: lineNode ? '1px' : 0,
    borderRadius: presetGeometry === 'ellipse' ? '50%' : presetGeometry.toLowerCase().includes('round') ? '12px' : '0',
    color: colourFromNode(firstRunProperties, '#17344e'),
    fontSize: `${Math.max(8, fontSize)}pt`,
    fontFamily,
    fontWeight: firstRunProperties?.getAttribute('b') === '1' ? 800 : 400,
    fontStyle: firstRunProperties?.getAttribute('i') === '1' ? 'italic' : 'normal',
    textAlign: alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : alignment === 'just' ? 'justify' : 'left',
    justifyContent: vertical === 'ctr' ? 'center' : vertical === 'b' ? 'flex-end' : 'flex-start',
    ...margins,
  };
}

async function relationshipMap(zip, relsPath, basePath) {
  const entry = zip.file(relsPath);
  if (!entry) return new Map();
  const xml = parseXml(await entry.async('text'));
  return new Map(allByLocalName(xml, 'Relationship').map((relationship) => [
    relationship.getAttribute('Id'),
    normaliseZipPath(basePath, relationship.getAttribute('Target')),
  ]));
}

function mimeForPath(path) {
  const extension = String(path || '').split('.').pop()?.toLowerCase() || '';
  return IMAGE_MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

async function parsePptx(arrayBuffer) {
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default || JSZipModule;
  const zip = await JSZip.loadAsync(arrayBuffer);
  const presentationEntry = zip.file('ppt/presentation.xml');
  if (!presentationEntry) throw new Error('File PPTX không có cấu trúc presentation.xml hợp lệ.');
  const presentationXml = parseXml(await presentationEntry.async('text'));
  const sizeNode = firstByLocalName(presentationXml, 'sldSz');
  const slideWidth = numericAttribute(sizeNode, 'cx', 12192000);
  const slideHeight = numericAttribute(sizeNode, 'cy', 6858000);
  const presentationRelationships = await relationshipMap(zip, 'ppt/_rels/presentation.xml.rels', 'ppt/presentation.xml');
  const slideIdList = allByLocalName(presentationXml, 'sldId');
  const slidePaths = slideIdList
    .map((slideId) => presentationRelationships.get(slideId.getAttribute('r:id') || slideId.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')))
    .filter(Boolean);
  if (!slidePaths.length) {
    slidePaths.push(...Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/i.test(path)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0])));
  }

  const objectUrls = [];
  const slides = [];
  for (let index = 0; index < slidePaths.length; index += 1) {
    const slidePath = slidePaths[index];
    const slideEntry = zip.file(slidePath);
    if (!slideEntry) continue;
    const slideXml = parseXml(await slideEntry.async('text'));
    const fileName = slidePath.split('/').pop();
    const relsPath = `ppt/slides/_rels/${fileName}.rels`;
    const relationships = await relationshipMap(zip, relsPath, slidePath);
    const backgroundNode = firstByLocalName(slideXml, 'bg');
    const background = colourFromNode(backgroundNode, '#ffffff');
    const spTree = firstByLocalName(slideXml, 'spTree');
    const elements = [];
    for (const child of Array.from(spTree?.children || [])) {
      const type = child.localName;
      if (type === 'sp' || type === 'cxnSp') {
        const text = shapeText(child);
        const spPr = firstByLocalName(child, 'spPr');
        const fill = colourFromNode(firstByLocalName(spPr, 'solidFill'), 'transparent');
        if (!text && fill === 'transparent' && type !== 'cxnSp') continue;
        elements.push({
          type: 'shape',
          text,
          box: elementBox(child, slideWidth, slideHeight),
          style: shapeStyle(child),
        });
      } else if (type === 'pic') {
        const blip = firstByLocalName(child, 'blip');
        const relationshipId = blip?.getAttribute('r:embed') || blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed');
        const mediaPath = relationships.get(relationshipId);
        const mediaEntry = mediaPath && zip.file(mediaPath);
        if (!mediaEntry) continue;
        const blob = await mediaEntry.async('blob');
        const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeForPath(mediaPath) });
        const url = URL.createObjectURL(typedBlob);
        objectUrls.push(url);
        const description = firstByLocalName(child, 'cNvPr')?.getAttribute('descr') || firstByLocalName(child, 'cNvPr')?.getAttribute('name') || '';
        elements.push({ type: 'image', url, alt: description, box: elementBox(child, slideWidth, slideHeight) });
      } else if (type === 'graphicFrame') {
        const text = allByLocalName(child, 't').map((node) => node.textContent || '').join(' ').trim();
        if (text) elements.push({ type: 'shape', text, box: elementBox(child, slideWidth, slideHeight), style: { background: '#f4f8fb', color: '#17344e', fontSize: '14pt', padding: '10px', border: '1px solid #b9cede', justifyContent: 'center' } });
      }
    }
    const textFallback = allByLocalName(slideXml, 't').map((node) => node.textContent || '').filter(Boolean).join(' · ');
    slides.push({ index: index + 1, background, elements, textFallback });
  }
  return { slides, objectUrls, aspectRatio: `${slideWidth} / ${slideHeight}` };
}

function LoadingState({ kind }) {
  const label = kind === 'docx' ? 'Đang dựng trang Word…'
    : kind === 'xlsx' ? 'Đang đọc bảng tính Excel…'
      : kind === 'pptx' ? 'Đang dựng các slide PowerPoint…'
        : kind === 'video' ? 'Đang tải video từ Drive…'
          : kind === 'audio' ? 'Đang tải âm thanh từ Drive…'
            : 'Đang tải file an toàn từ Google Drive của admin…';
  return <div className="resource-viewer-state"><span className="resource-viewer-spinner"/><strong>{label}</strong><p>File chỉ được cấp cho tài khoản có quyền xem trong Kho học liệu.</p></div>;
}

function UnsupportedState({ item }) {
  return <div className="resource-viewer-state"><strong>Chưa hỗ trợ xem trực tiếp định dạng này.</strong><p>{item?.fileName || 'Tài liệu'} vẫn có thể được tải xuống hoặc mở bằng ứng dụng phù hợp.</p></div>;
}

function DocxViewer({ html, title }) {
  return <iframe className="resource-viewer-docx" title={`Xem Word: ${title}`} srcDoc={docxDocument(title, html)} sandbox="allow-popups"/>;
}

function WorkbookViewer({ workbook }) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const [page, setPage] = useState(1);
  const rowsPerPage = 100;
  const sheet = workbook?.sheets?.[sheetIndex] || { name: '', rows: [] };
  const columnCount = Math.min(60, Math.max(0, ...sheet.rows.map((row) => row.length)));
  const totalPages = Math.max(1, Math.ceil(sheet.rows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const visibleRows = sheet.rows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  useEffect(() => { setPage(1); }, [sheetIndex]);
  return <div className="resource-workbook-viewer">
    <div className="resource-workbook-tabs" role="tablist" aria-label="Trang tính Excel">
      {workbook.sheets.map((item, index) => <button type="button" role="tab" aria-selected={sheetIndex === index} className={sheetIndex === index ? 'active' : ''} key={`${item.name}-${index}`} onClick={() => setSheetIndex(index)}>{item.name || `Sheet ${index + 1}`}</button>)}
    </div>
    <div className="resource-workbook-info"><strong>{sheet.rows.length.toLocaleString('vi-VN')} dòng</strong><span>{columnCount} cột đang hiển thị</span>{sheet.rows.some((row) => row.length > 60) && <em>Bảng có thêm cột; trình xem giới hạn 60 cột để giữ hiệu năng.</em>}</div>
    <div className="resource-workbook-scroll">
      <table><tbody>{visibleRows.map((row, rowIndex) => <tr key={(safePage - 1) * rowsPerPage + rowIndex}><th>{(safePage - 1) * rowsPerPage + rowIndex + 1}</th>{Array.from({ length: columnCount }, (_, columnIndex) => <td key={columnIndex}>{String(row[columnIndex] ?? '')}</td>)}</tr>)}</tbody></table>
    </div>
    {totalPages > 1 && <div className="resource-workbook-pagination"><button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}>Đầu</button><button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button><span>Trang <strong>{safePage}</strong> / {totalPages}</span><button type="button" disabled={safePage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Sau</button><button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>Cuối</button></div>}
  </div>;
}

function PptxViewer({ presentation, title }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const slides = presentation?.slides || [];
  const current = slides[slideIndex];
  if (!current) return <div className="resource-viewer-state"><strong>Không tìm thấy slide để hiển thị.</strong></div>;
  return <div className="resource-pptx-viewer">
    <div className="resource-pptx-toolbar"><div><button type="button" disabled={slideIndex <= 0} onClick={() => setSlideIndex((value) => Math.max(0, value - 1))}>← Slide trước</button><strong>{slideIndex + 1} / {slides.length}</strong><button type="button" disabled={slideIndex >= slides.length - 1} onClick={() => setSlideIndex((value) => Math.min(slides.length - 1, value + 1))}>Slide sau →</button></div><div><button type="button" onClick={() => setZoom((value) => Math.max(.6, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + .1))}>＋</button></div></div>
    <div className="resource-pptx-layout">
      <nav className="resource-pptx-thumbnails" aria-label="Danh sách slide">{slides.map((slide, index) => <button type="button" key={slide.index} className={slideIndex === index ? 'active' : ''} onClick={() => setSlideIndex(index)}><span>{slide.index}</span><div style={{ aspectRatio: presentation.aspectRatio, background: slide.background }}>{slide.elements.filter((element) => element.type === 'image').slice(0, 1).map((element, imageIndex) => <img key={imageIndex} src={element.url} alt=""/>)}<small>{slide.textFallback.slice(0, 90)}</small></div></button>)}</nav>
      <div className="resource-pptx-stage-scroll"><div className="resource-pptx-stage-wrap" style={{ width: `${zoom * 100}%` }}><section className="resource-pptx-slide" aria-label={`${title}, slide ${slideIndex + 1}`} style={{ aspectRatio: presentation.aspectRatio, background: current.background }}>{current.elements.map((element, index) => element.type === 'image' ? <img key={index} className="resource-pptx-element resource-pptx-image" src={element.url} alt={element.alt || ''} style={element.box}/> : <div key={index} className="resource-pptx-element resource-pptx-shape" style={{ ...element.box, ...element.style }}>{element.text}</div>)}{!current.elements.length && <div className="resource-pptx-fallback">{current.textFallback || 'Slide không có nội dung văn bản hoặc hình ảnh có thể dựng trong trình duyệt.'}</div>}</section></div></div>
    </div>
    <p className="resource-pptx-note">Trình xem dựng trực tiếp chữ, hình ảnh và hình khối cơ bản. Animation, SmartArt, biểu đồ nhúng hoặc font đặc biệt có thể khác PowerPoint gốc.</p>
  </div>;
}

export default function ResourceFileViewer({ item, fetchBlob, getStreamUrl }) {
  const [viewer, setViewer] = useState({ status: 'idle', kind: previewKind(item), url: '', html: '', workbook: null, presentation: null, text: '', error: '' });
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    const cleanupUrls = () => {
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current = [];
    };
    cleanupUrls();
    const kind = previewKind(item);
    setViewer({ status: 'loading', kind, url: '', html: '', workbook: null, presentation: null, text: '', error: '' });

    const load = async () => {
      if (!item?.driveFileId) throw new Error('Tài liệu chưa có file trên Google Drive.');
      if (kind === 'unsupported') {
        setViewer((current) => ({ ...current, status: 'unsupported' }));
        return;
      }
      if (['pdf', 'video', 'audio', 'image'].includes(kind) && getStreamUrl) {
        try {
          const url = await getStreamUrl(item);
          if (!cancelled) setViewer({ status: 'ready', kind, url, html: '', workbook: null, presentation: null, text: '', error: '' });
          return;
        } catch {
          // Fall back to an authenticated Blob when a preview session cannot be created.
        }
      }
      const blob = await fetchBlob(item, 'inline');
      if (cancelled) return;
      if (kind === 'docx') {
        const mammoth = await loadMammoth();
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer }, {
          convertImage: mammoth.images.imgElement(async (image) => ({ src: `data:${image.contentType};base64,${await image.read('base64')}` })),
        });
        if (!cancelled) setViewer({ status: 'ready', kind, html: result.value || '<p>Tài liệu không có nội dung có thể hiển thị.</p>', url: '', workbook: null, presentation: null, text: '', error: '' });
        return;
      }
      if (kind === 'xlsx') {
        const XLSXModule = await import('xlsx');
        const XLSX = XLSXModule.default || XLSXModule;
        const workbookSource = XLSX.read(await blob.arrayBuffer(), { type: 'array', cellDates: true, cellNF: true, cellStyles: true });
        const workbook = {
          sheets: workbookSource.SheetNames.map((name) => ({
            name,
            rows: XLSX.utils.sheet_to_json(workbookSource.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false }),
          })),
        };
        if (!cancelled) setViewer({ status: 'ready', kind, workbook, url: '', html: '', presentation: null, text: '', error: '' });
        return;
      }
      if (kind === 'pptx') {
        const presentation = await parsePptx(await blob.arrayBuffer());
        if (cancelled) {
          presentation.objectUrls.forEach((url) => URL.revokeObjectURL(url));
          return;
        }
        objectUrlsRef.current = presentation.objectUrls;
        setViewer({ status: 'ready', kind, presentation, url: '', html: '', workbook: null, text: '', error: '' });
        return;
      }
      if (kind === 'text') {
        const text = await blob.text();
        if (!cancelled) setViewer({ status: 'ready', kind, text: text.slice(0, 500000), url: '', html: '', workbook: null, presentation: null, error: '' });
        return;
      }
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current = [url];
      setViewer({ status: 'ready', kind, url, html: '', workbook: null, presentation: null, text: '', error: '' });
    };

    load().catch((error) => {
      if (!cancelled) setViewer((current) => ({ ...current, status: 'error', error: error.message || 'Không thể mở file.' }));
    });
    return () => {
      cancelled = true;
      cleanupUrls();
    };
  }, [item?.id, item?.cloudId, item?.driveFileId, item?.updatedAt, fetchBlob, getStreamUrl]);

  const title = item?.title || item?.fileName || 'Tài liệu';
  const content = useMemo(() => {
    if (viewer.status === 'loading') return <LoadingState kind={viewer.kind}/>;
    if (viewer.status === 'error') return <div className="resource-viewer-state is-error"><strong>Không thể mở file trong ứng dụng.</strong><p>{viewer.error}</p></div>;
    if (viewer.status === 'unsupported') return <UnsupportedState item={item}/>;
    if (viewer.kind === 'docx') return <DocxViewer html={viewer.html} title={title}/>;
    if (viewer.kind === 'xlsx') return <WorkbookViewer workbook={viewer.workbook}/>;
    if (viewer.kind === 'pptx') return <PptxViewer presentation={viewer.presentation} title={title}/>;
    if (viewer.kind === 'pdf') return <iframe className="resource-viewer-pdf" src={viewer.url} title={`Xem PDF: ${title}`}/>;
    if (viewer.kind === 'video') return <div className="resource-media-viewer"><video controls playsInline preload="metadata" src={viewer.url}/><p>Video đang được phát trực tiếp trong Kho học liệu.</p></div>;
    if (viewer.kind === 'audio') return <div className="resource-media-viewer is-audio"><div className="resource-audio-art"><span>♫</span><strong>{title}</strong></div><audio controls preload="metadata" src={viewer.url}/></div>;
    if (viewer.kind === 'image') return <div className="resource-image-viewer"><img src={viewer.url} alt={title}/></div>;
    if (viewer.kind === 'text') return <pre className="resource-text-viewer">{viewer.text}</pre>;
    return <UnsupportedState item={item}/>;
  }, [viewer, item, title]);

  return <div className={`resource-file-viewer kind-${viewer.kind}`}>{content}</div>;
}
