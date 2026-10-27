// Narrative-only HTML transformation: headers, counts, tables and signatures are never sent or modified.
export function extractProofreadBlocks(html) {
  if (!html || typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(doc.body.querySelectorAll('ul > li')).map((node, i) => ({
    id: 'b' + i, text: node.textContent.trim(),
  })).filter((item) => item.text);
}
export function sameReportNumbers(before, after) {
  const tokens = (s) => String(s ?? '').match(/\d+(?:[.,:/-]\d+)*/g) || [];
  return JSON.stringify(tokens(before)) === JSON.stringify(tokens(after));
}
export function applyProofreadBlocks(html, revisions) {
  if (!html || typeof DOMParser === 'undefined') throw new Error('Không thể mở báo cáo để áp dụng hiệu đính.');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.body.querySelectorAll('ul > li'));
  if (!Array.isArray(revisions) || nodes.length !== revisions.length)
    throw new Error('Số đoạn không khớp bản gốc.');
  nodes.forEach((node, i) => {
    const item = revisions[i];
    if (!item || item.id !== 'b' + i || !item.text?.trim() ||
      !sameReportNumbers(node.textContent, item.text))
      throw new Error('Mục ' + (i + 1) + ' bị thay đổi số liệu hoặc thiếu nội dung.');
    // textContent prevents HTML injection by AI or a manually edited draft.
    node.textContent = item.text.trim();
  });
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
export function chunkProofreadBlocks(blocks, maxChars = 4900, maxCount = 12) {
  const groups = [];
  let current = [], length = 0;
  for (const block of blocks) {
    if (block.text.length > 1600) throw new Error('Có đoạn báo cáo quá dài, vượt 1.600 ký tự.');
    if (current.length && (current.length >= maxCount || length + block.text.length > maxChars)) {
      groups.push(current); current = []; length = 0;
    }
    current.push(block); length += block.text.length;
  }
  if (current.length) groups.push(current);
  return groups;
}
