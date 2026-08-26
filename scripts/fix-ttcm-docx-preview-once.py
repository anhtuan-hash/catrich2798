from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'src/components/GlobalTtcmNavigationTab.jsx'
text = PATH.read_text(encoding='utf-8')

old = r'''      if (ext === 'docx') {
        const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
        const arrayBuffer = await blob.arrayBuffer();
        const mammothModule = await import('mammoth');
        const mammothApi = mammothModule.default || mammothModule;
        const result = await mammothApi.convertToHtml({ arrayBuffer });
        setFileViewer({ ...base, loading: false, kind: 'html', html: sanitizePreviewHtml(result.value || '') });
        return;
      }
'''

new = r'''      if (ext === 'docx') {
        try {
          const blob = await fetchWorkHubAttachmentBlob(target, { itemId: item.id });
          const arrayBuffer = await blob.arrayBuffer();
          const jsZipModule = await import('jszip');
          const JSZip = jsZipModule.default || jsZipModule;
          const zip = await JSZip.loadAsync(arrayBuffer);
          const documentEntry = zip.file('word/document.xml');
          if (!documentEntry || typeof documentEntry.async !== 'function') {
            throw new Error('DOCX không có word/document.xml hợp lệ.');
          }
          const xmlText = await documentEntry.async('string');
          const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
          if (xml.getElementsByTagName('parsererror').length) {
            throw new Error('Không thể đọc cấu trúc XML của DOCX.');
          }

          const elementChildren = (node, localName) => Array.from(node?.childNodes || [])
            .filter((child) => child?.nodeType === 1 && (!localName || child.localName === localName));
          const firstChild = (node, localName) => elementChildren(node, localName)[0] || null;
          const descendants = (node, localName) => Array.from(node?.getElementsByTagNameNS?.('*', localName) || []);
          const wordValue = (node) => node?.getAttribute?.('w:val') || node?.getAttributeNS?.('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'val') || '';
          const escapePreviewText = (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          const renderRun = (run) => {
            let content = '';
            elementChildren(run).forEach((child) => {
              if (child.localName === 't' || child.localName === 'instrText') content += escapePreviewText(child.textContent || '');
              else if (child.localName === 'tab') content += '<span style="display:inline-block;width:2em"></span>';
              else if (child.localName === 'br' || child.localName === 'cr') content += '<br>';
              else if (child.localName === 'drawing' || child.localName === 'pict') content += '<span style="color:#5f6368">[Hình ảnh]</span>';
            });
            if (!content) {
              const fallbackText = descendants(run, 't').map((node) => node.textContent || '').join('');
              content = escapePreviewText(fallbackText);
            }
            const props = firstChild(run, 'rPr');
            if (props) {
              if (firstChild(props, 'b')) content = `<strong>${content}</strong>`;
              if (firstChild(props, 'i')) content = `<em>${content}</em>`;
              if (firstChild(props, 'u')) content = `<u>${content}</u>`;
              if (firstChild(props, 'strike')) content = `<s>${content}</s>`;
              const vertAlign = firstChild(props, 'vertAlign');
              const vertValue = wordValue(vertAlign);
              if (vertValue === 'superscript') content = `<sup>${content}</sup>`;
              if (vertValue === 'subscript') content = `<sub>${content}</sub>`;
            }
            return content;
          };

          const renderParagraph = (paragraph) => {
            const runs = descendants(paragraph, 'r');
            let content = runs.map(renderRun).join('');
            if (!content.trim()) content = '&nbsp;';
            const props = firstChild(paragraph, 'pPr');
            const align = wordValue(firstChild(props, 'jc'));
            const style = wordValue(firstChild(props, 'pStyle')).toLowerCase();
            const css = [];
            if (align === 'center') css.push('text-align:center');
            else if (align === 'right' || align === 'end') css.push('text-align:right');
            else if (align === 'both' || align === 'distribute') css.push('text-align:justify');
            if (firstChild(props, 'numPr')) content = `<span style="margin-right:.45em">•</span>${content}`;
            if (style.includes('title')) return `<h2 style="${css.join(';')}">${content}</h2>`;
            if (style.includes('heading') || style.includes('head')) return `<h3 style="${css.join(';')}">${content}</h3>`;
            return `<p style="margin:.35em 0;${css.join(';')}">${content}</p>`;
          };

          const renderTable = (table) => {
            const rows = elementChildren(table, 'tr').map((row) => {
              const cells = elementChildren(row, 'tc').map((cell) => {
                const props = firstChild(cell, 'tcPr');
                const span = Math.max(1, Number(wordValue(firstChild(props, 'gridSpan'))) || 1);
                const inner = elementChildren(cell)
                  .filter((child) => child.localName === 'p' || child.localName === 'tbl')
                  .map((child) => child.localName === 'tbl' ? renderTable(child) : renderParagraph(child))
                  .join('');
                return `<td${span > 1 ? ` colspan="${span}"` : ''}>${inner || '&nbsp;'}</td>`;
              }).join('');
              return `<tr>${cells}</tr>`;
            }).join('');
            return `<table style="width:100%;border-collapse:collapse;margin:.7em 0"><tbody>${rows}</tbody></table>`;
          };

          const body = descendants(xml, 'body')[0];
          if (!body) throw new Error('DOCX không có phần nội dung chính.');
          const html = elementChildren(body)
            .filter((child) => child.localName === 'p' || child.localName === 'tbl')
            .map((child) => child.localName === 'tbl' ? renderTable(child) : renderParagraph(child))
            .join('');
          if (!html.trim()) throw new Error('DOCX không có nội dung có thể hiển thị.');
          setFileViewer({ ...base, loading: false, kind: 'html', html: sanitizePreviewHtml(html), previewEngine: 'brian-docx' });
          return;
        } catch (docxError) {
          console.warn('[TTCM] Brian DOCX preview fallback', docxError);
          const signedUrl = await createWorkHubAttachmentUrl(target);
          if (signedUrl) {
            const absoluteUrl = new URL(signedUrl, window.location.origin).href;
            const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
            setFileViewer({ ...base, loading: false, kind: 'iframe', url: officeUrl, externalOffice: true, previewEngine: 'office' });
            return;
          }
          throw new Error('Chưa thể dựng bản xem trước DOCX. Bạn vẫn có thể dùng “Sửa trực tiếp” hoặc “Tải về”.');
        }
      }
'''

if old not in text:
    if "previewEngine: 'brian-docx'" in text:
        print('DOCX preview fix already applied.')
        raise SystemExit(0)
    raise SystemExit('Could not locate the current Mammoth DOCX preview block.')

text = text.replace(old, new, 1)
PATH.write_text(text, encoding='utf-8')
print('Patched TTCM DOCX preview to JSZip-based renderer with Office fallback.')
