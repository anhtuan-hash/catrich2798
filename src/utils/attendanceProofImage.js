export const ATTENDANCE_PROOF_BUCKET = 'attendance-session-proofs';
export const ATTENDANCE_PROOF_MAX_EDGE = 1600;
export const ATTENDANCE_PROOF_MAX_BYTES = 1_500_000;

function decodeImage(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc ảnh đã chọn.'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể nén ảnh minh chứng.'));
    }, 'image/jpeg', quality);
  });
}

export async function prepareAttendanceProofImage(file) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn một tệp hình ảnh.');
  }
  if (typeof document === 'undefined') throw new Error('Thiết bị hiện tại không hỗ trợ xử lý ảnh.');

  const source = await decodeImage(file);
  const sourceWidth = Number(source.width || source.naturalWidth || 0);
  const sourceHeight = Number(source.height || source.naturalHeight || 0);
  if (!sourceWidth || !sourceHeight) {
    if (typeof source.close === 'function') source.close();
    throw new Error('Ảnh minh chứng không có kích thước hợp lệ.');
  }

  const scale = Math.min(1, ATTENDANCE_PROOF_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    if (typeof source.close === 'function') source.close();
    throw new Error('Trình duyệt không thể chuẩn bị ảnh minh chứng.');
  }
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  if (typeof source.close === 'function') source.close();

  let quality = 0.86;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > ATTENDANCE_PROOF_MAX_BYTES && quality > 0.55) {
    quality = Math.max(0.55, quality - 0.08);
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > ATTENDANCE_PROOF_MAX_BYTES) {
    throw new Error('Ảnh vẫn quá lớn sau khi nén. Vui lòng chọn ảnh khác.');
  }
  return blob;
}

export function buildAttendanceProofPath(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) throw new Error('Không xác định được buổi điểm danh để lưu minh chứng.');
  return `${id}/${Date.now()}-attendance-proof.jpg`;
}
