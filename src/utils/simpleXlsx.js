const encoder = new TextEncoder();

function u16(value) {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, true);
  return out;
}

function u32(value) {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value >>> 0, true);
  return out;
}

function concatBytes(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => { out.set(part, offset); offset += part.length; });
  return out;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | ((Math.floor(date.getSeconds() / 2)) & 31);
  const dosDate = (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31);
  return { dosTime, dosDate };
}

function zipStore(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  const stamp = dosDateTime();

  entries.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
    const crc = crc32(dataBytes);
    const local = concatBytes([
      u32(0x04034b50),
      u16(20), u16(0x0800), u16(0),
      u16(stamp.dosTime), u16(stamp.dosDate),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0), nameBytes, dataBytes,
    ]);
    locals.push(local);

    centrals.push(concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
      u16(stamp.dosTime), u16(stamp.dosDate),
      u32(crc), u32(dataBytes.length), u32(dataBytes.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes,
    ]));
    offset += local.length;
  });

  const central = concatBytes(centrals);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(offset), u16(0),
  ]);
  return concatBytes([...locals, central, end]);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function styleIndex(sheet, ref, rowNumber) {
  const direct = sheet.cellStyles?.[ref];
  if (Number.isInteger(direct)) return direct;
  const rowStyle = sheet.rowStyles?.[rowNumber];
  if (Number.isInteger(rowStyle)) return rowStyle;
  return Number.isInteger(sheet.defaultStyle) ? sheet.defaultStyle : 0;
}

function worksheetXml(sheet = {}) {
  const rows = Array.isArray(sheet.rows) ? sheet.rows : [];
  const freezeRows = Math.max(0, Number(sheet.freezeRows || 0));
  const pane = freezeRows
    ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : '';
  const widths = Array.isArray(sheet.columnWidths) ? sheet.columnWidths : [];
  const cols = widths.length ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(4, Number(width || 10))}" customWidth="1"/>`).join('')}</cols>` : '';

  const rowXml = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const height = Number(sheet.rowHeights?.[rowNumber]);
    const heightAttrs = Number.isFinite(height) && height > 0 ? ` ht="${height}" customHeight="1"` : '';
    const cells = (Array.isArray(row) ? row : []).map((value, colIndex) => {
      const ref = `${columnName(colIndex)}${rowNumber}`;
      const style = styleIndex(sheet, ref, rowNumber);
      const styleAttr = style ? ` s="${style}"` : '';
      if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${styleAttr} t="n"><v>${value}</v></c>`;
      return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowNumber}"${heightAttrs}>${cells}</row>`;
  }).join('');

  const merges = (Array.isArray(sheet.merges) ? sheet.merges : []).filter(Boolean);
  const mergeCells = merges.length ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${xmlEscape(ref)}"/>`).join('')}</mergeCells>` : '';
  const autoFilter = sheet.autoFilter ? `<autoFilter ref="${xmlEscape(sheet.autoFilter)}"/>` : '';

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${rowXml}</sheetData>${autoFilter}${mergeCells}</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <fonts count="4">
      <font><sz val="10"/><name val="Arial"/><family val="2"/></font>
      <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Arial"/><family val="2"/></font>
      <font><b/><color rgb="FF0B6B3A"/><sz val="11"/><name val="Arial"/><family val="2"/></font>
      <font><b/><color rgb="FF0B6B3A"/><sz val="16"/><name val="Arial"/><family val="2"/></font>
    </fonts>
    <fills count="5">
      <fill><patternFill patternType="none"/></fill>
      <fill><patternFill patternType="gray125"/></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FF0B6B3A"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFE5F4EB"/><bgColor indexed="64"/></patternFill></fill>
      <fill><patternFill patternType="solid"><fgColor rgb="FFF4F7F5"/><bgColor indexed="64"/></patternFill></fill>
    </fills>
    <borders count="2">
      <border/>
      <border><left style="thin"><color rgb="FFD5DED9"/></left><right style="thin"><color rgb="FFD5DED9"/></right><top style="thin"><color rgb="FFD5DED9"/></top><bottom style="thin"><color rgb="FFD5DED9"/></bottom><diagonal/></border>
    </borders>
    <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
    <cellXfs count="9">
      <xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="0"/>
      <xf xfId="0" numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
      <xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
      <xf xfId="0" numFmtId="10" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    </cellXfs>
    <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  </styleSheet>`;
}

export function createXlsxBlob(sheets = []) {
  const safeSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: String(sheet.name || `Sheet${index + 1}`).slice(0, 31).replace(/[\\/?*\[\]:]/g, '-'),
    rows: Array.isArray(sheet.rows) ? sheet.rows : [],
  }));
  if (!safeSheets.length) safeSheets.push({ name: 'Sheet1', rows: [] });

  const overrides = safeSheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookSheets = safeSheets.map((sheet, i) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safeSheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${safeSheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const entries = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'xl/workbook.xml', data: workbook },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels },
    { name: 'xl/styles.xml', data: stylesXml() },
    ...safeSheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: worksheetXml(sheet) })),
  ];

  return new Blob([zipStore(entries)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
