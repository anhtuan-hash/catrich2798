// Same-origin transport for TTCM calendar uploads.
// A browser-side network failure after a POST has UNKNOWN commit status;
// never retry a write automatically. The API checks historical schedule rows.
export const SCHEDULE_IMPORT_BATCH_SIZE = 20;
const API_URL = '/api/work-hub-gateway?handler=schedule-import';

export async function submitScheduleImportBatch({
  accessToken,
  fileName,
  rows,
  eventCandidateFingerprints = [],
  request = globalThis.fetch,
}) {
  if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  if (!Array.isArray(rows) || !rows.length) throw new Error('Không có dòng lịch hợp lệ để nhập.');
  if (rows.length > SCHEDULE_IMPORT_BATCH_SIZE) throw new Error('Mỗi đợt nhập không được vượt quá 20 dòng.');
  if (typeof request !== 'function') throw new Error('Trình duyệt không hỗ trợ kết nối tải lịch.');

  let response;
  try {
    response = await request(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fileName,
        rows,
        source: 'ttcm-calendar',
        eventCandidateFingerprints,
      }),
      cache: 'no-store',
    });
  } catch (error) {
    const uncertain = new Error('Mất kết nối khi máy chủ đang lưu lịch. Dữ liệu có thể đã được ghi; hãy làm mới và kiểm tra lịch trước khi tải lại tệp.');
    uncertain.uncertainCommit = true;
    uncertain.cause = error;
    throw uncertain;
  }

  let data;
  try { data = await response.json(); }
  catch {
    const uncertain = new Error('Máy chủ không trả về kết quả hợp lệ. Hãy kiểm tra lịch đã lưu trước khi tải tệp lại.');
    uncertain.uncertainCommit = true;
    throw uncertain;
  }
  if (!response.ok || data?.ok !== true) {
    throw new Error(data?.message || `Không thể lưu lịch (HTTP ${response.status}).`);
  }
  if (!data.stats || !Array.isArray(data.items)) {
    const uncertain = new Error('Không xác minh được kết quả nhập lịch từ máy chủ. Hãy kiểm tra lịch trước khi tải lại.');
    uncertain.uncertainCommit = true;
    throw uncertain;
  }
  return data;
}
