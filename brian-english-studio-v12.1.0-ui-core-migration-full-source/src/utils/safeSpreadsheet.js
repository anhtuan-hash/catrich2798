const DEFAULT_LIMITS = Object.freeze({
  maxBytes: 8 * 1024 * 1024,
  maxSheets: 12,
  maxRows: 5000,
  maxColumns: 120,
  maxTextCharacters: 140000,
});

function assertBufferSize(arrayBuffer, maxBytes) {
  const size = Number(arrayBuffer?.byteLength || 0);
  if (!size) throw new Error('Spreadsheet file is empty.');
  if (size > maxBytes) throw new Error(`Spreadsheet exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB safety limit.`);
}

async function loadReader() {
  const module = await import('read-excel-file/browser');
  return module.default;
}

function normalizeCell(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return value;
}

function trimMatrix(rows, limits) {
  return (rows || [])
    .slice(0, limits.maxRows)
    .map((row) => (Array.isArray(row) ? row.slice(0, limits.maxColumns).map(normalizeCell) : []));
}

function rowsToObjects(matrix) {
  if (!matrix.length) return [];
  const headers = matrix[0].map((value, index) => String(value || `Column ${index + 1}`).trim() || `Column ${index + 1}`);
  return matrix.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function matrixToCsv(matrix, maxCharacters) {
  return matrix.map((row) => row.map(csvCell).join(',')).join('\n').slice(0, maxCharacters);
}

export async function readWorkbookSafe(arrayBuffer, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options };
  assertBufferSize(arrayBuffer, limits.maxBytes);
  const readExcelFile = await loadReader();
  const sheets = await readExcelFile(arrayBuffer);
  const selected = (sheets || []).slice(0, limits.maxSheets).map((sheet) => ({
    name: String(sheet.sheet || 'Sheet'),
    rows: trimMatrix(sheet.data, limits),
  }));
  const byName = new Map(selected.map((sheet) => [sheet.name, sheet.rows]));
  const names = selected.map((sheet) => sheet.name);
  return {
    names,
    toRows(name, rowOptions = {}) {
      const matrix = byName.get(name) || [];
      return rowOptions.header === 1 ? matrix : rowsToObjects(matrix);
    },
    toCsv(name) {
      return matrixToCsv(byName.get(name) || [], limits.maxTextCharacters);
    },
  };
}

export async function spreadsheetToTextSafe(arrayBuffer, options = {}) {
  const limits = { ...DEFAULT_LIMITS, ...options };
  const workbook = await readWorkbookSafe(arrayBuffer, limits);
  let total = 0;
  const chunks = [];
  for (const name of workbook.names) {
    const csv = workbook.toCsv(name);
    const chunk = `--- Sheet: ${name} ---\n${csv}`;
    total += chunk.length;
    if (total > limits.maxTextCharacters) break;
    chunks.push(chunk);
  }
  return chunks.join('\n\n');
}
