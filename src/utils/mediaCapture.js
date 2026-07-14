const AUDIO_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  return AUDIO_MIME_CANDIDATES.find((type) => {
    try { return MediaRecorder.isTypeSupported?.(type); } catch { return false; }
  }) || '';
}

export function isLocalhost() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

export function getMicrophoneSupport() {
  const secure = typeof window === 'undefined' ? false : (window.isSecureContext || isLocalhost());
  return {
    secure,
    mediaDevices: Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    speechRecognition: Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)),
    mimeType: getSupportedAudioMimeType(),
  };
}

export function describeMediaError(error, language = 'vi') {
  const vi = language !== 'en';
  const name = String(error?.name || '');
  const message = String(error?.message || '');
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return vi
      ? 'Quyền micro đang bị chặn. Nhấn biểu tượng ổ khóa cạnh thanh địa chỉ → Microphone → Allow, rồi tải lại trang.'
      : 'Microphone permission is blocked. Open the site permissions, allow Microphone, then reload.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return vi ? 'Không tìm thấy micro. Hãy kết nối hoặc chọn lại thiết bị đầu vào trong cài đặt hệ thống.' : 'No microphone was found. Connect or select an input device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return vi ? 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng gọi/ghi âm khác rồi thử lại.' : 'The microphone is being used by another app. Close the other recorder/call and retry.';
  }
  if (name === 'SecurityError' || (typeof window !== 'undefined' && !window.isSecureContext && !isLocalhost())) {
    return vi ? 'Ghi âm chỉ hoạt động trên HTTPS hoặc localhost.' : 'Recording requires HTTPS or localhost.';
  }
  if (name === 'AbortError') return vi ? 'Phiên mở micro đã bị hủy. Hãy thử lại.' : 'Microphone access was interrupted. Please retry.';
  return message || (vi ? 'Không thể khởi động micro.' : 'Could not start the microphone.');
}

export async function requestMicrophoneStream(overrides = {}) {
  const support = getMicrophoneSupport();
  if (!support.secure) throw new DOMException('Recording requires a secure context.', 'SecurityError');
  if (!support.mediaDevices) throw new DOMException('getUserMedia is unavailable.', 'NotSupportedError');
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      ...overrides,
    },
    video: false,
  });
}

export function createMediaRecorder(stream, handlers = {}) {
  if (typeof MediaRecorder === 'undefined') throw new DOMException('MediaRecorder is unavailable.', 'NotSupportedError');
  const mimeType = getSupportedAudioMimeType();
  const options = mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 };
  let recorder;
  try { recorder = new MediaRecorder(stream, options); }
  catch { recorder = new MediaRecorder(stream); }
  if (handlers.onData) recorder.addEventListener('dataavailable', handlers.onData);
  if (handlers.onStop) recorder.addEventListener('stop', handlers.onStop);
  if (handlers.onError) recorder.addEventListener('error', handlers.onError);
  return recorder;
}

export function stopStream(stream) {
  try { stream?.getTracks?.().forEach((track) => track.stop()); } catch { /* best effort */ }
}

export function extensionForMimeType(type = '') {
  const clean = String(type).toLowerCase();
  if (clean.includes('mp4') || clean.includes('m4a')) return 'm4a';
  if (clean.includes('ogg')) return 'ogg';
  return 'webm';
}

export function createSpeechRecognition({
  language = 'en-US',
  continuous = true,
  interimResults = true,
  onStart,
  onResult,
  onEnd,
  onError,
} = {}) {
  const Recognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = language;
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => onStart?.();
  recognition.onresult = (event) => onResult?.(event);
  recognition.onend = () => onEnd?.();
  recognition.onerror = (event) => {
    const code = String(event?.error || 'unknown');
    const recoverable = ['network', 'service-not-allowed', 'audio-capture', 'no-speech'].includes(code);
    onError?.({ code, recoverable, event });
  };
  return recognition;
}

export function speechRecognitionMessage(code, language = 'vi') {
  const vi = language !== 'en';
  const messages = {
    network: vi
      ? 'Dịch vụ nhận giọng nói của trình duyệt đang mất kết nối. Bản ghi âm vẫn được lưu; có thể nhập transcript thủ công hoặc thử lại bằng Chrome/Edge.'
      : 'The browser speech-recognition service is offline. Audio recording is still saved; type a transcript manually or retry in Chrome/Edge.',
    'not-allowed': vi ? 'Trình duyệt chưa được cấp quyền nhận giọng nói.' : 'Speech recognition permission was denied.',
    'service-not-allowed': vi ? 'Dịch vụ nhận giọng nói không khả dụng trên trình duyệt này.' : 'Speech recognition is unavailable in this browser.',
    'audio-capture': vi ? 'Không nhận được tín hiệu micro cho transcript.' : 'No microphone signal was available for transcription.',
    'no-speech': vi ? 'Chưa phát hiện lời nói. Bản ghi âm vẫn được giữ.' : 'No speech was detected. The audio recording is still kept.',
    aborted: '',
  };
  return messages[code] ?? (vi ? `Không thể nhận giọng nói (${code}). Bản ghi âm vẫn được lưu.` : `Speech recognition failed (${code}). Audio recording is still saved.`);
}
