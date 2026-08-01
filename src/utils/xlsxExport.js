import JSZip from 'jszip';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const STYLE_IDS = Object.freeze({
  plain: 0,
  title: 1,
  subtitle: 2,
  metaLabel: 3,
  metaValue: 4,
  header: 5,
  text: 6,
  centered: 7,
  number: 8,
  score: 9,
  section: 10,
  note: 11,
});

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function xlsxColumnName(index) {
  let value = Math.max(1, Number(index) || 1);
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function safeSheetName(value, fallback = 'Sheet') {
  const cleaned = String(value || fallback).replace(/[\\/*?:\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
}

function safeFileName(value, fallback = 'bao-cao.xlsx') {
  const cleaned = String(value || fallback)
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned || fallback;
  return base.toLowerCase().endsWith('.xlsx') ? base : `${base}.xlsx`;
}

function normalizeCell(input) {
  if (input && typeof input === 'object' && !Array.isArray(input) && Object.prototype.hasOwnProperty.call(input, 'value')) {
    return {
      value: input.value,
      style: input.style || (typeof input.value === 'number' ? 'number' : 'text'),
      type: input.type,
    };
  }
  return {
    value: input,
    style: typeof input === 'number' ? 'number' : 'text',
    type: undefined,
  };
}

function cellXml(input, reference) {
  const cell = normalizeCell(input);
  const styleId = STYLE_IDS[cell.style] ?? STYLE_IDS.text;
  const value = cell.value;
  if (value === '' || value == null) return `<c r="${reference}" s="${styleId}"/>`;
  if (cell.type === 'number' || (cell.type !== 'text' && typeof value === 'number' && Number.isFinite(value))) {
    return `<c r="${reference}" s="${styleId}" t="n"><v>${value}</v></c>`;
  }
  if (cell.type === 'boolean' || typeof value === 'boolean') {
    return `<c r="${reference}" s="${styleId}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${reference}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(sheet) {
  const rows = Array.isArray(sheet.rows) && sheet.rows.length ? sheet.rows : [[]];
  const maxColumns = Math.max(1, ...rows.map((row) => Array.isArray(row) ? row.length : 0));
  const lastCell = `${xlsxColumnName(maxColumns)}${rows.length}`;
  const freezeRows = Math.max(0, Math.min(rows.length, Number(sheet.freezeRows) || 0));
  const columnWidths = Array.from({ length: maxColumns }, (_, index) => {
    const width = Math.max(4, Math.min(60, Number(sheet.columnWidths?.[index]) || 14));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');
  const rowXml = rows.map((row, rowIndex) => {
    const rowNumber = rowIndex + 1;
    const height = Number(sheet.rowHeights?.[rowIndex]);
    const heightAttribute = Number.isFinite(height) && height > 0 ? ` ht="${height}" customHeight="1"` : '';
    const cells = Array.from({ length: Math.max(maxColumns, row.length) }, (_, columnIndex) => (
      cellXml(row[columnIndex], `${xlsxColumnName(columnIndex + 1)}${rowNumber}`)
    )).join('');
    return `<row r="${rowNumber}"${heightAttribute}>${cells}</row>`;
  }).join('');
  const merges = (sheet.merges || []).filter(Boolean);
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((range) => `<mergeCell ref="${xmlEscape(range)}"/>`).join('')}</mergeCells>`
    : '';
  const paneXml = freezeRows
    ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRows + 1}" sqref="A${freezeRows + 1}"/>`
    : '<selection activeCell="A1" sqref="A1"/>';
  const autoFilter = sheet.autoFilter ? `<autoFilter ref="${xmlEscape(sheet.autoFilter)}"/>` : '';
  const orientation = sheet.landscape === false ? 'portrait' : 'landscape';

  // SpreadsheetML uses a strict child order: autoFilter must come before mergeCells.
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:${lastCell}"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0">${paneXml}</sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${columnWidths}</cols>
  <sheetData>${rowXml}</sheetData>
  ${autoFilter}
  ${mergeXml}
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="${orientation}" fitToWidth="1" fitToHeight="0" paperSize="9"/>
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="0.##"/></numFmts>
  <fonts count="5">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FF1F1F1F"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><i/><color rgb="FF5F6368"/><sz val="10"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B57D0"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FE"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FBFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFDDE3EC"/></left><right style="thin"><color rgb="FFDDE3EC"/></right><top style="thin"><color rgb="FFDDE3EC"/></top><bottom style="thin"><color rgb="FFDDE3EC"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function workbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <workbookPr defaultThemeVersion="164011"/>
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(safeSheetName(sheet.name, `Sheet ${index + 1}`))}" sheetId="${index + 1}" state="visible" r:id="rId${index + 1}"/>`).join('')}</sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`;
}

function workbookRelationshipsXml(sheetCount) {
  const worksheets = Array.from({ length: sheetCount }, (_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheets}
  <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function contentTypesXml(sheetCount) {
  const sheets = Array.from({ length: sheetCount }, (_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function corePropertiesXml(creator) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>${xmlEscape(creator || 'Brian English Studio')}</dc:creator>
  <cp:lastModifiedBy>${xmlEscape(creator || 'Brian English Studio')}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropertiesXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Brian English Studio</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map((sheet, index) => `<vt:lpstr>${xmlEscape(safeSheetName(sheet.name, `Sheet ${index + 1}`))}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts>
  <Company></Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0300</AppVersion>
</Properties>`;
}

export function xlsxCell(value, style = typeof value === 'number' ? 'number' : 'text', type) {
  return { value, style, type };
}

export async function createXlsxBlob({ sheets, creator = 'Brian English Studio' }) {
  const normalizedSheets = (Array.isArray(sheets) ? sheets : []).filter((sheet) => sheet && Array.isArray(sheet.rows));
  if (!normalizedSheets.length) throw new Error('Cần ít nhất một trang tính để xuất Excel.');

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml(normalizedSheets.length));
  zip.file('_rels/.rels', rootRelationshipsXml());
  zip.file('docProps/core.xml', corePropertiesXml(creator));
  zip.file('docProps/app.xml', appPropertiesXml(normalizedSheets));
  zip.file('xl/workbook.xml', workbookXml(normalizedSheets));
  zip.file('xl/_rels/workbook.xml.rels', workbookRelationshipsXml(normalizedSheets.length));
  zip.file('xl/styles.xml', stylesXml());
  normalizedSheets.forEach((sheet, index) => {
    zip.file(`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet));
  });
  return zip.generateAsync({
    type: 'blob',
    mimeType: XLSX_MIME,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export async function downloadXlsx({ fileName, sheets, creator }) {
  const blob = await createXlsxBlob({ sheets, creator });
  const finalName = safeFileName(fileName);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = finalName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { fileName: finalName, blob };
}
