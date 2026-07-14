import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAiConfigs } from '../utils/aiProviders.js';
import './SmartIdStudio.css';

const PRINT_PAPER = { widthMm: 101.6, heightMm: 152.4 };
const MAX_INPUT_EDGE = 1800;

const copy = {
  vi: {
    appTitle: 'SmartID Identity',
    kicker: 'AI Portrait & Print Studio',
    author: 'Nguyễn Anh Tuấn',
    school: 'Trường TH, THCS, THPT Pétrus Ký',
    welcome: 'Tạo ảnh thẻ chuyên nghiệp trong một quy trình gọn',
    welcomeSub: 'Tải ảnh hoặc chụp trực tiếp, kiểm tra chất lượng khuôn mặt, đổi nền – trang phục bằng Gemini và xuất ảnh đúng kích thước.',
    upload: 'Tải ảnh lên',
    uploadHint: 'JPG, PNG, WEBP · tự tối ưu trước khi gửi AI',
    camera: 'Chụp ảnh mới',
    cameraHint: 'Dùng camera trước của máy tính hoặc điện thoại',
    recent: 'Phiên làm việc gần đây',
    noRecent: 'Chưa có ảnh nào trong phiên này.',
    save: 'Lưu ảnh',
    print: 'In ảnh',
    reset: 'Khôi phục',
    processing: 'AI đang xử lý ảnh...',
    edit: 'Bảng chỉnh sửa',
    editSub: 'Điều chỉnh ảnh thẻ, nền, trang phục và phong cách.',
    aiCommand: 'Lệnh AI thông minh',
    aiPlaceholder: 'Ví dụ: làm sáng khuôn mặt tự nhiên, nền trắng sạch, chỉnh cổ áo cân đối...',
    photoSize: 'Kích thước ảnh thẻ',
    outfit: 'Trang phục AI',
    background: 'Nền ảnh',
    aiAnalysis: 'Phân tích chất lượng ảnh',
    aiFeedbackDefault: 'Tải ảnh lên để AI kiểm tra ánh sáng, tư thế đầu và nền.',
    generate: 'Tạo ảnh bằng AI',
    printTitle: 'In ảnh & xuất khổ 10 × 15 cm',
    printSub: 'Sắp xếp tự động nhiều ảnh đúng kích thước vật lý.',
    dpiLabel: 'Độ phân giải',
    quantityLabel: 'Số lượng ảnh',
    cancel: 'Hủy',
    exportFile: 'Xuất tờ in PNG',
    errorApi: 'Không thể kết nối Gemini. Hãy kiểm tra khóa Gemini trong Cài đặt AI rồi thử lại.',
    analyzing: 'Đang phân tích ảnh...',
    style: 'Phong cách xử lý',
    settings: 'Mở cài đặt AI',
    keyRequired: 'SmartID cần khóa Gemini để phân tích và chỉnh sửa ảnh. Các chức năng crop, lưu và in vẫn dùng được khi chưa có khóa.',
    back: 'Quay lại ứng dụng',
    preview: 'Bản xem trước',
    source: 'Ảnh gốc',
    result: 'Ảnh đã xử lý',
    capture: 'Chụp ảnh',
    closeCamera: 'Đóng camera',
    cameraError: 'Không mở được camera. Hãy cấp quyền camera hoặc dùng nút tải ảnh.',
    identityNote: 'AI chỉ tạo ảnh chân dung rời; không tạo giấy tờ, con dấu, số hiệu hay huy hiệu chính thức.',
    ready: 'Sẵn sàng',
    aiReady: 'Gemini đã kết nối',
    aiMissing: 'Chưa có khóa Gemini',
    printCapacity: 'Số ảnh thực tế phụ thuộc kích thước đã chọn và diện tích tờ in.',
    backgroundWhite: 'Trắng tinh',
    backgroundBlue: 'Xanh ảnh thẻ',
    backgroundGray: 'Xám sáng',
    backgroundKeep: 'Giữ nền gốc',
    styleStudio: 'Studio truyền thống',
    styleKorean: 'Hàn Quốc mềm sáng',
    styleReal: 'Chân thực HD',
    styleEditorial: 'Tạp chí chuyên nghiệp',
    chooseAnother: 'Chọn ảnh khác',
    photoQuality: 'Ảnh đầu vào sẽ được giảm kích thước tối đa 1800px để xử lý ổn định.',
    downloadDone: 'Đã tạo file ảnh đúng tỉ lệ.',
    printDone: 'Đã tạo tờ in 10 × 15 cm.',
    cameraLive: 'Camera trực tiếp',
  },
  en: {
    appTitle: 'SmartID Identity',
    kicker: 'AI Portrait & Print Studio',
    author: 'Nguyen Anh Tuan',
    school: 'Pétrus Ký Primary, Secondary & High School',
    welcome: 'Create a professional ID portrait in one focused workflow',
    welcomeSub: 'Upload or capture a photo, check face quality, change the background or outfit with Gemini, and export exact-size images.',
    upload: 'Upload photo',
    uploadHint: 'JPG, PNG, WEBP · optimized before AI processing',
    camera: 'Take a new photo',
    cameraHint: 'Use the front camera on your computer or phone',
    recent: 'Recent session activity',
    noRecent: 'No photo has been created in this session.',
    save: 'Save photo',
    print: 'Print sheet',
    reset: 'Restore',
    processing: 'AI is processing the image...',
    edit: 'Editing panel',
    editSub: 'Adjust photo size, background, outfit and visual style.',
    aiCommand: 'Smart AI instruction',
    aiPlaceholder: 'Example: natural face lighting, clean white background, balanced collar...',
    photoSize: 'ID photo size',
    outfit: 'AI outfit',
    background: 'Background',
    aiAnalysis: 'Photo quality analysis',
    aiFeedbackDefault: 'Upload a photo for an AI check of lighting, head position and background.',
    generate: 'Generate with AI',
    printTitle: 'Print & export on 10 × 15 cm paper',
    printSub: 'Automatically arrange multiple photos at the exact physical size.',
    dpiLabel: 'Resolution',
    quantityLabel: 'Quantity',
    cancel: 'Cancel',
    exportFile: 'Export print sheet PNG',
    errorApi: 'Gemini could not be reached. Check the Gemini key in AI Settings and try again.',
    analyzing: 'Analyzing photo...',
    style: 'Processing style',
    settings: 'Open AI settings',
    keyRequired: 'SmartID needs a Gemini key for analysis and AI editing. Crop, download and print remain available without a key.',
    back: 'Back to apps',
    preview: 'Preview',
    source: 'Original',
    result: 'Processed',
    capture: 'Capture photo',
    closeCamera: 'Close camera',
    cameraError: 'The camera could not be opened. Grant camera permission or upload a photo instead.',
    identityNote: 'AI returns a standalone portrait only; it does not create documents, seals, numbers or official insignia.',
    ready: 'Ready',
    aiReady: 'Gemini connected',
    aiMissing: 'Gemini key missing',
    printCapacity: 'The actual number of photos depends on the selected size and available paper area.',
    backgroundWhite: 'Pure white',
    backgroundBlue: 'ID photo blue',
    backgroundGray: 'Light gray',
    backgroundKeep: 'Keep original',
    styleStudio: 'Classic studio',
    styleKorean: 'Korean soft light',
    styleReal: 'Realistic HD',
    styleEditorial: 'Professional editorial',
    chooseAnother: 'Choose another photo',
    photoQuality: 'Input images are resized to a maximum edge of 1800px for reliable processing.',
    downloadDone: 'Exact-ratio photo file created.',
    printDone: '10 × 15 cm print sheet created.',
    cameraLive: 'Live camera',
  },
};

const PHOTO_SIZES = [
  { id: 'id_2x3', vi: '2 × 3 cm (Việt Nam)', en: '2 × 3 cm (Vietnam)', widthMm: 20, heightMm: 30 },
  { id: 'id_3x4', vi: '3 × 4 cm (Việt Nam)', en: '3 × 4 cm (Vietnam)', widthMm: 30, heightMm: 40 },
  { id: 'id_4x6', vi: '4 × 6 cm (Việt Nam)', en: '4 × 6 cm (Vietnam)', widthMm: 40, heightMm: 60 },
  { id: 'passport_vn', vi: 'Hộ chiếu Việt Nam 4 × 6', en: 'Vietnam passport 4 × 6', widthMm: 40, heightMm: 60 },
  { id: 'cccd_vn', vi: 'Ảnh hồ sơ CCCD 3 × 4', en: 'Citizen ID portrait 3 × 4', widthMm: 30, heightMm: 40 },
  { id: 'us_visa', vi: 'Visa Hoa Kỳ 2 × 2 inch', en: 'US Visa 2 × 2 inch', widthMm: 51, heightMm: 51 },
  { id: 'jp_visa', vi: 'Visa Nhật Bản 4,5 × 4,5', en: 'Japan Visa 4.5 × 4.5', widthMm: 45, heightMm: 45 },
  { id: 'china_visa', vi: 'Visa Trung Quốc 33 × 48 mm', en: 'China Visa 33 × 48 mm', widthMm: 33, heightMm: 48 },
  { id: 'schengen_visa', vi: 'Visa Schengen 35 × 45 mm', en: 'Schengen Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'korea_visa', vi: 'Visa Hàn Quốc 35 × 45 mm', en: 'Korea Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'tw_visa', vi: 'Visa Đài Loan 35 × 45 mm', en: 'Taiwan Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'uk_passport', vi: 'Hộ chiếu Anh 35 × 45 mm', en: 'UK Passport 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'aus_visa', vi: 'Visa Úc 35 × 45 mm', en: 'Australia Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'driver_vn', vi: 'Bằng lái xe 3 × 4', en: 'Driver licence 3 × 4', widthMm: 30, heightMm: 40 },
  { id: 'student_vn', vi: 'Thẻ học sinh / sinh viên', en: 'Student card portrait', widthMm: 30, heightMm: 40 },
  { id: 'work_card', vi: 'Thẻ nhân viên', en: 'Employee card portrait', widthMm: 30, heightMm: 40 },
  { id: 'cv_portrait', vi: 'Ảnh CV 5 × 7', en: 'CV portrait 5 × 7', widthMm: 50, heightMm: 70 },
  { id: 'exam_card', vi: 'Thẻ dự thi 4 × 6', en: 'Exam card 4 × 6', widthMm: 40, heightMm: 60 },
  { id: 'canada_visa', vi: 'Visa Canada 35 × 45 mm', en: 'Canada Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'sing_visa', vi: 'Visa Singapore 35 × 45 mm', en: 'Singapore Visa 35 × 45 mm', widthMm: 35, heightMm: 45 },
  { id: 'india_visa', vi: 'Visa Ấn Độ 2 × 2 inch', en: 'India Visa 2 × 2 inch', widthMm: 51, heightMm: 51 },
  { id: 'eu_passport', vi: 'Hộ chiếu chuẩn EU 35 × 45', en: 'EU standard passport 35 × 45', widthMm: 35, heightMm: 45 },
];

const OUTFITS = [
  { id: 'original', vi: 'Giữ nguyên trang phục', en: 'Keep original outfit', prompt: 'keep the original clothing unchanged' },
  { id: 'formal_black_suit', vi: 'Vest đen công sở', en: 'Formal black suit', prompt: 'a clean formal black business suit with a plain white shirt, no badge or logo' },
  { id: 'formal_navy_suit', vi: 'Vest xanh navy', en: 'Formal navy suit', prompt: 'a formal navy business suit with a plain shirt, no badge or logo' },
  { id: 'formal_grey_suit', vi: 'Vest xám', en: 'Formal gray suit', prompt: 'a formal gray business suit with a plain shirt, no badge or logo' },
  { id: 'shirt_white', vi: 'Sơ mi trắng', en: 'White shirt', prompt: 'a neat plain white collared shirt' },
  { id: 'shirt_blue', vi: 'Sơ mi xanh nhạt', en: 'Light blue shirt', prompt: 'a neat plain light-blue collared shirt' },
  { id: 'shirt_black', vi: 'Sơ mi đen', en: 'Black shirt', prompt: 'a neat plain black collared shirt' },
  { id: 'polo_white', vi: 'Áo polo trắng', en: 'White polo shirt', prompt: 'a plain white polo shirt without logos' },
  { id: 'ao_dai_white', vi: 'Áo dài trắng', en: 'White áo dài', prompt: 'a refined plain white Vietnamese áo dài without logos' },
  { id: 'ao_dai_blue', vi: 'Áo dài xanh', en: 'Blue áo dài', prompt: 'a refined plain blue Vietnamese áo dài without logos' },
  { id: 'petrusky_uniform', vi: 'Đồng phục học sinh Pétrus Ký', en: 'Pétrus Ký student uniform', prompt: 'a clean school uniform in blue and white, with no readable logo or badge' },
  { id: 'doctor_coat', vi: 'Áo blouse trắng', en: 'White professional coat', prompt: 'a clean plain white professional coat, without name tag, logo or insignia' },
  { id: 'graduation_gown', vi: 'Áo tốt nghiệp', en: 'Graduation gown', prompt: 'a simple graduation gown without university logo or insignia' },
  { id: 'nurse_uniform', vi: 'Đồng phục y tế trung tính', en: 'Neutral medical uniform', prompt: 'a plain neutral medical uniform without badge, name tag or insignia' },
  { id: 'chef_coat', vi: 'Trang phục đầu bếp', en: 'Chef coat', prompt: 'a plain clean chef coat without logo or name' },
  { id: 'tshirt_plain', vi: 'Áo thun trơn', en: 'Plain T-shirt', prompt: 'a plain modest T-shirt without text or logos' },
  { id: 'blazer_casual', vi: 'Blazer hiện đại', en: 'Modern blazer', prompt: 'a modern professional blazer with a plain top, no logo' },
  { id: 'turtleneck_black', vi: 'Áo cổ lọ đen', en: 'Black turtleneck', prompt: 'a plain black turtleneck' },
  { id: 'office_blouse', vi: 'Sơ mi nữ công sở', en: 'Office blouse', prompt: 'a professional plain office blouse' },
];

const STYLES = [
  { id: 'studio', vi: 'Studio truyền thống', en: 'Classic studio', descVi: 'Sắc nét, cân bằng, trung tính', descEn: 'Sharp, balanced and neutral', prompt: 'classic professional ID photo studio lighting, neutral color, realistic skin texture' },
  { id: 'korean', vi: 'Hàn Quốc mềm sáng', en: 'Korean soft light', descVi: 'Mềm, sáng, tông da tự nhiên', descEn: 'Soft, bright and natural', prompt: 'soft bright Korean portrait studio lighting, natural skin tone, restrained retouching' },
  { id: 'real_hd', vi: 'Chân thực HD', en: 'Realistic HD', descVi: 'Giữ tối đa chi tiết khuôn mặt', descEn: 'Maximum natural facial detail', prompt: 'high-detail realistic studio portrait with minimal retouching and authentic facial texture' },
  { id: 'editorial', vi: 'Tạp chí chuyên nghiệp', en: 'Professional editorial', descVi: 'Có chiều sâu nhưng vẫn phù hợp hồ sơ', descEn: 'Refined depth while remaining suitable for a profile', prompt: 'professional editorial portrait lighting, clean restrained depth, still suitable for an identification portrait' },
];

const BACKGROUNDS = [
  { id: 'pure_white', vi: 'Trắng tinh', en: 'Pure white', prompt: 'a seamless pure white ID photo background' },
  { id: 'id_blue', vi: 'Xanh ảnh thẻ', en: 'ID photo blue', prompt: 'a seamless light blue ID photo background (#cfe8ff)' },
  { id: 'light_gray', vi: 'Xám sáng', en: 'Light gray', prompt: 'a seamless very light gray portrait background' },
  { id: 'original', vi: 'Giữ nền gốc', en: 'Keep original', prompt: 'keep the original background, only clean minor distractions' },
];

function emitAi(type, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

function dataUrlParts(dataUrl = '') {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { mimeType: 'image/jpeg', data: '' };
  return { mimeType: match[1], data: match[2] };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode the image.'));
    image.src = dataUrl;
  });
}

async function normalizeImage(dataUrl, maxEdge = MAX_INPUT_EDGE) {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.93);
}

async function fetchJsonWithRetry(url, options, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

function extractText(payload) {
  return String(payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || '').trim();
}

function extractGeneratedImage(payload) {
  const part = payload?.candidates?.[0]?.content?.parts?.find((item) => item.inlineData?.data || item.inline_data?.data);
  const inline = part?.inlineData || part?.inline_data;
  if (!inline?.data) return '';
  return `data:${inline.mimeType || inline.mime_type || 'image/png'};base64,${inline.data}`;
}

function selectedGeminiKey(fallbackKey = '') {
  const configs = getAiConfigs();
  return String(configs?.gemini?.apiKey || fallbackKey || '').trim();
}

function drawCover(context, image, x, y, width, height) {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sourceWidth = image.width;
  let sourceHeight = image.height;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio;
    sx = (image.width - sourceWidth) / 2;
  } else {
    sourceHeight = image.width / targetRatio;
    sy = (image.height - sourceHeight) / 2;
  }
  context.drawImage(image, sx, sy, sourceWidth, sourceHeight, x, y, width, height);
}

function triggerDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function Icon({ name, size = 20 }) {
  const paths = {
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
    camera: <><path d="M4 7h3l2-2h6l2 2h3v12H4Z"/><circle cx="12" cy="13" r="4"/></>,
    sparkle: <><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 21h16"/></>,
    printer: <><path d="M6 9V3h12v6"/><path d="M6 18H4V9h16v9h-2"/><path d="M7 14h10v7H7Z"/></>,
    undo: <><path d="m9 7-5 5 5 5"/><path d="M4 12h9a7 7 0 1 1 0 14"/></>,
    wand: <><path d="m4 20 11-11"/><path d="m14 4 1-2 1 2 2 1-2 1-1 2-1-2-2-1Z"/><path d="m18 12 .7-1.5.8 1.5 1.5.8-1.5.7-.8 1.5-.7-1.5-1.5-.7Z"/></>,
    brain: <><path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0 0 5 3 3 0 0 0 2 5 3 3 0 0 0 3 4Z"/><path d="M15 4a3 3 0 0 1 5 2 3 3 0 0 1 0 5 3 3 0 0 1-2 5 3 3 0 0 1-3 4Z"/><path d="M9 4v16M15 4v16M9 9H6M15 9h3M9 15H6M15 15h3"/></>,
    close: <><path d="m5 5 14 14M19 5 5 19"/></>,
    back: <><path d="m15 18-6-6 6-6"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.sparkle}
    </svg>
  );
}

export default function SmartIdStudio({ language = 'vi', apiKey = '', aiProvider = 'gemini' }) {
  const t = copy[language] || copy.vi;
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [sourceImage, setSourceImage] = useState('');
  const [processedImage, setProcessedImage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiFeedback, setAiFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [dpi, setDpi] = useState(300);
  const [printQuantity, setPrintQuantity] = useState(8);
  const [recent, setRecent] = useState([]);
  const [settings, setSettings] = useState({
    preset: 'id_3x4',
    background: 'pure_white',
    outfit: 'original',
    style: 'studio',
  });

  const currentSize = useMemo(() => PHOTO_SIZES.find((item) => item.id === settings.preset) || PHOTO_SIZES[1], [settings.preset]);
  const currentRatio = `${currentSize.widthMm} / ${currentSize.heightMm}`;
  const geminiKey = selectedGeminiKey(aiProvider === 'gemini' ? apiKey : '');

  useEffect(() => () => {
    cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!showCamera) return undefined;
    let active = true;
    setCameraError('');
    navigator.mediaDevices?.getUserMedia?.({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setCameraError(t.cameraError));
    return () => {
      active = false;
      cameraStreamRef.current?.getTracks?.().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [showCamera, t.cameraError]);

  const addRecent = (image, label) => {
    setRecent((items) => [{ id: `${Date.now()}-${Math.random()}`, image, label, time: new Date().toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' }) }, ...items].slice(0, 5));
  };

  const analyzeFaceQuality = async (imageData) => {
    if (!imageData) return;
    if (!geminiKey) {
      setAiFeedback(t.keyRequired);
      return;
    }
    setIsAnalyzing(true);
    const operation = { id: `smartid-analysis-${Date.now()}`, provider: 'Google Gemini', model: 'gemini-2.5-flash', label: t.analyzing };
    emitAi('bes-ai-operation-start', operation);
    try {
      const { mimeType, data } = dataUrlParts(imageData);
      const payload = await fetchJsonWithRetry('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: `Analyze this portrait only for ID-photo readiness. Comment briefly on lighting, head position, face visibility and background. Give practical advice in ${language === 'vi' ? 'Vietnamese' : 'English'}, maximum 3 short sentences. Do not identify the person.` },
            { inlineData: { mimeType, data } },
          ] }],
          generationConfig: { temperature: 0.25, maxOutputTokens: 260 },
        }),
      });
      setAiFeedback(extractText(payload) || t.aiFeedbackDefault);
    } catch {
      setAiFeedback(t.errorApi);
    } finally {
      setIsAnalyzing(false);
      emitAi('bes-ai-operation-end', operation);
    }
  };

  const acceptImage = async (dataUrl, label = t.source) => {
    setErrorMsg('');
    setStatusMsg('');
    const normalized = await normalizeImage(dataUrl);
    setSourceImage(normalized);
    setProcessedImage(normalized);
    setStep('editor');
    addRecent(normalized, label);
    analyzeFaceQuality(normalized);
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await acceptImage(dataUrl, file.name);
    } catch (error) {
      setErrorMsg(error.message || t.errorApi);
    }
  };

  const captureCamera = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setCameraError(t.cameraError);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShowCamera(false);
    await acceptImage(canvas.toDataURL('image/jpeg', 0.94), t.cameraLive);
  };

  const handleAiEdit = async () => {
    if (!sourceImage || isProcessing) return;
    if (!geminiKey) {
      setErrorMsg(t.keyRequired);
      return;
    }
    setIsProcessing(true);
    setErrorMsg('');
    setStatusMsg('');
    const style = STYLES.find((item) => item.id === settings.style) || STYLES[0];
    const outfit = OUTFITS.find((item) => item.id === settings.outfit) || OUTFITS[0];
    const background = BACKGROUNDS.find((item) => item.id === settings.background) || BACKGROUNDS[0];
    const customInstruction = aiPrompt.trim() || (language === 'vi' ? 'Làm sạch ảnh thẻ tự nhiên và chuyên nghiệp.' : 'Create a clean, natural professional ID portrait.');
    const finalPrompt = [
      'Edit the supplied portrait into a professional standalone ID-photo portrait.',
      `User instruction: ${customInstruction}`,
      `Visual style: ${style.prompt}.`,
      `Clothing: ${outfit.prompt}.`,
      `Background: ${background.prompt}.`,
      'Preserve the same person, facial geometry, age, skin tone and recognisable identity. Keep expression neutral and natural. Center the head and shoulders. Do not over-smooth skin.',
      'Do not add a document layout, card, passport, seal, watermark, badge, insignia, text, number, signature, QR code or official emblem. Return only the portrait photograph.',
    ].join('\n');
    const models = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];
    const operation = { id: `smartid-edit-${Date.now()}`, provider: 'Google Gemini', model: models[0], label: t.processing };
    emitAi('bes-ai-operation-start', operation);
    try {
      const { mimeType, data } = dataUrlParts(sourceImage);
      let generated = '';
      let lastError;
      for (const model of models) {
        try {
          emitAi('bes-ai-operation-update', { ...operation, model });
          const payload = await fetchJsonWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: finalPrompt }, { inlineData: { mimeType, data } }] }],
              generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
          }, 1);
          generated = extractGeneratedImage(payload);
          if (generated) break;
          throw new Error('No image was returned.');
        } catch (error) {
          lastError = error;
        }
      }
      if (!generated) throw lastError || new Error('No image was returned.');
      setProcessedImage(generated);
      addRecent(generated, language === 'vi' ? 'Ảnh AI đã xử lý' : 'AI processed photo');
      analyzeFaceQuality(generated);
    } catch (error) {
      setErrorMsg(`${t.errorApi}${error?.message ? ` (${error.message})` : ''}`);
    } finally {
      setIsProcessing(false);
      emitAi('bes-ai-operation-end', operation);
    }
  };

  const exportSinglePhoto = async () => {
    if (!processedImage) return;
    const image = await loadImage(processedImage);
    const exportDpi = 300;
    const width = Math.round((currentSize.widthMm / 25.4) * exportDpi);
    const height = Math.round((currentSize.heightMm / 25.4) * exportDpi);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    drawCover(context, image, 0, 0, width, height);
    triggerDownload(canvas.toDataURL('image/png', 1), `SmartID_${currentSize.id}_${exportDpi}dpi.png`);
    setStatusMsg(t.downloadDone);
  };

  const exportPrintSheet = async () => {
    if (!processedImage) return;
    const image = await loadImage(processedImage);
    const mmToPx = (mm) => Math.round((mm / 25.4) * dpi);
    const canvas = document.createElement('canvas');
    canvas.width = mmToPx(PRINT_PAPER.widthMm);
    canvas.height = mmToPx(PRINT_PAPER.heightMm);
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const photoWidth = mmToPx(currentSize.widthMm);
    const photoHeight = mmToPx(currentSize.heightMm);
    const gap = mmToPx(2);
    const margin = mmToPx(5);
    let x = margin;
    let y = margin;
    let drawn = 0;
    for (let index = 0; index < printQuantity; index += 1) {
      if (y + photoHeight > canvas.height - margin) break;
      drawCover(context, image, x, y, photoWidth, photoHeight);
      context.strokeStyle = '#d8d8d8';
      context.lineWidth = Math.max(1, Math.round(dpi / 300));
      context.strokeRect(x, y, photoWidth, photoHeight);
      drawn += 1;
      x += photoWidth + gap;
      if (x + photoWidth > canvas.width - margin) {
        x = margin;
        y += photoHeight + gap;
      }
    }
    triggerDownload(canvas.toDataURL('image/png', 1), `SmartID_${currentSize.id}_10x15_${dpi}dpi_${drawn}photos.png`);
    setShowPrintModal(false);
    setStatusMsg(`${t.printDone} (${drawn})`);
  };

  const resetEditor = () => {
    setProcessedImage(sourceImage);
    setErrorMsg('');
    setStatusMsg('');
  };

  return (
    <div className="smartid-page">
      <button className="smartid-back" type="button" onClick={() => { window.location.hash = '#/apps'; }}>
        <Icon name="back" size={18} /> {t.back}
      </button>

      {step === 'upload' ? (
        <div className="smartid-upload-shell">
          <section className="smartid-hero">
            <div className="smartid-hero-copy">
              <span className="smartid-kicker"><Icon name="sparkle" size={16} /> {t.kicker}</span>
              <h1>{t.appTitle}</h1>
              <p>{t.welcome}</p>
              <small>{t.welcomeSub}</small>
              <div className="smartid-author-row">
                <span>{t.author}</span><i /> <span>{t.school}</span>
              </div>
            </div>
            <div className="smartid-hero-art" aria-hidden="true">
              <div className="smartid-face-frame">
                <span className="smartid-head" />
                <span className="smartid-shoulders" />
                <i className="corner a" /><i className="corner b" /><i className="corner c" /><i className="corner d" />
              </div>
              <div className="smartid-ai-badge"><Icon name="sparkle" size={17} /> AI Portrait</div>
              <div className="smartid-size-badge">3 × 4</div>
            </div>
          </section>

          {!geminiKey ? (
            <section className="smartid-key-notice">
              <Icon name="info" size={21} />
              <div><strong>{t.aiMissing}</strong><p>{t.keyRequired}</p></div>
              <button type="button" onClick={() => { window.location.hash = '#/settings'; }}><Icon name="settings" size={17} /> {t.settings}</button>
            </section>
          ) : (
            <section className="smartid-key-notice is-ready">
              <Icon name="check" size={21} /><div><strong>{t.aiReady}</strong><p>{t.photoQuality}</p></div><span>{t.ready}</span>
            </section>
          )}

          <section className="smartid-start-grid">
            <button type="button" className="smartid-start-card upload" onClick={() => fileInputRef.current?.click()}>
              <span><Icon name="upload" size={31} /></span><strong>{t.upload}</strong><small>{t.uploadHint}</small>
            </button>
            <button type="button" className="smartid-start-card camera" onClick={() => setShowCamera(true)}>
              <span><Icon name="camera" size={31} /></span><strong>{t.camera}</strong><small>{t.cameraHint}</small>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} />
          </section>

          <section className="smartid-recent-panel">
            <header><div><span>{t.recent}</span><h2>{recent.length ? `${recent.length} ${language === 'vi' ? 'ảnh' : 'photos'}` : t.noRecent}</h2></div></header>
            {recent.length ? (
              <div className="smartid-recent-grid">
                {recent.map((item) => (
                  <button key={item.id} type="button" onClick={() => acceptImage(item.image, item.label)}>
                    <img src={item.image} alt="" /><span><strong>{item.label}</strong><small>{item.time}</small></span>
                  </button>
                ))}
              </div>
            ) : <div className="smartid-empty-recent"><Icon name="sparkle" size={24} /><span>{t.noRecent}</span></div>}
          </section>
        </div>
      ) : (
        <div className="smartid-editor-shell">
          <section className="smartid-preview-panel">
            <header className="smartid-panel-heading">
              <div><span>{t.preview}</span><h2>{currentSize[language] || currentSize.vi}</h2></div>
              <button type="button" onClick={() => fileInputRef.current?.click()}>{t.chooseAnother}</button>
            </header>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} />

            <div className="smartid-photo-stage">
              <div className="smartid-photo-frame" style={{ aspectRatio: currentRatio }}>
                <img src={processedImage || sourceImage} alt={t.preview} />
                <i className="guide top" /><i className="guide bottom" /><i className="guide left" /><i className="guide right" />
                {isProcessing ? <div className="smartid-processing"><span className="smartid-spinner"/><strong>{t.processing}</strong></div> : null}
              </div>
              <div className="smartid-photo-meta">
                <span>{currentSize.widthMm} × {currentSize.heightMm} mm</span>
                <span>300 DPI export</span>
              </div>
            </div>

            <div className="smartid-preview-actions">
              <button type="button" onClick={resetEditor}><Icon name="undo" /> {t.reset}</button>
              <button type="button" className="primary" onClick={exportSinglePhoto}><Icon name="download" /> {t.save}</button>
              <button type="button" onClick={() => setShowPrintModal(true)}><Icon name="printer" /> {t.print}</button>
            </div>

            {errorMsg ? <div className="smartid-message error">{errorMsg}</div> : null}
            {statusMsg ? <div className="smartid-message success"><Icon name="check" size={17}/>{statusMsg}</div> : null}

            <div className="smartid-identity-note"><Icon name="info" size={18}/><span>{t.identityNote}</span></div>
          </section>

          <aside className="smartid-editor-panel">
            <header className="smartid-panel-heading">
              <div><span>{t.edit}</span><h2>{t.editSub}</h2></div>
              <span className={`smartid-connection ${geminiKey ? 'ready' : ''}`}>{geminiKey ? t.aiReady : t.aiMissing}</span>
            </header>

            <div className="smartid-controls-scroll">
              {!geminiKey ? <button type="button" className="smartid-inline-settings" onClick={() => { window.location.hash = '#/settings'; }}><Icon name="settings" size={18}/>{t.settings}</button> : null}

              <label className="smartid-control-group">
                <span><Icon name="wand" size={16}/>{t.aiCommand}</span>
                <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder={t.aiPlaceholder} rows={4} />
              </label>

              <div className="smartid-two-column-controls">
                <label className="smartid-control-group">
                  <span>{t.photoSize}</span>
                  <select value={settings.preset} onChange={(event) => setSettings((current) => ({ ...current, preset: event.target.value }))}>
                    {PHOTO_SIZES.map((size) => <option key={size.id} value={size.id}>{size[language] || size.vi}</option>)}
                  </select>
                </label>
                <label className="smartid-control-group">
                  <span>{t.background}</span>
                  <select value={settings.background} onChange={(event) => setSettings((current) => ({ ...current, background: event.target.value }))}>
                    {BACKGROUNDS.map((item) => <option key={item.id} value={item.id}>{item[language] || item.vi}</option>)}
                  </select>
                </label>
              </div>

              <label className="smartid-control-group">
                <span>{t.outfit}</span>
                <select value={settings.outfit} onChange={(event) => setSettings((current) => ({ ...current, outfit: event.target.value }))}>
                  {OUTFITS.map((item) => <option key={item.id} value={item.id}>{item[language] || item.vi}</option>)}
                </select>
              </label>

              <div className="smartid-control-group">
                <span>{t.style}</span>
                <div className="smartid-style-grid">
                  {STYLES.map((item) => (
                    <button key={item.id} type="button" className={settings.style === item.id ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, style: item.id }))}>
                      <strong>{item[language] || item.vi}</strong><small>{language === 'vi' ? item.descVi : item.descEn}</small>
                    </button>
                  ))}
                </div>
              </div>

              <section className="smartid-analysis-card">
                <header><Icon name="brain" size={21}/><strong>{t.aiAnalysis}</strong>{isAnalyzing ? <span className="smartid-mini-spinner"/> : null}</header>
                <p>{isAnalyzing ? t.analyzing : (aiFeedback || t.aiFeedbackDefault)}</p>
              </section>
            </div>

            <footer className="smartid-editor-footer">
              <button type="button" disabled={isProcessing || !geminiKey} onClick={handleAiEdit}><Icon name="sparkle" size={22}/>{t.generate}</button>
            </footer>
          </aside>
        </div>
      )}

      {showCamera ? (
        <div className="smartid-modal-backdrop" role="dialog" aria-modal="true" aria-label={t.cameraLive}>
          <section className="smartid-camera-modal">
            <header><div><span>{t.cameraLive}</span><h2>{t.camera}</h2></div><button type="button" onClick={() => setShowCamera(false)}><Icon name="close" /></button></header>
            <div className="smartid-camera-view"><video ref={videoRef} playsInline muted />{cameraError ? <p>{cameraError}</p> : null}<div className="smartid-camera-guide" /></div>
            <footer><button type="button" onClick={() => setShowCamera(false)}>{t.closeCamera}</button><button type="button" className="primary" onClick={captureCamera}><Icon name="camera" />{t.capture}</button></footer>
          </section>
        </div>
      ) : null}

      {showPrintModal ? (
        <div className="smartid-modal-backdrop" role="dialog" aria-modal="true" aria-label={t.printTitle}>
          <section className="smartid-print-modal">
            <header><div><span>{t.printTitle}</span><h2>{currentSize[language] || currentSize.vi}</h2></div><button type="button" onClick={() => setShowPrintModal(false)}><Icon name="close" /></button></header>
            <div className="smartid-print-body">
              <div className="smartid-print-controls">
                <label><span>{t.dpiLabel}</span><div>{[300, 600].map((value) => <button type="button" key={value} className={dpi === value ? 'active' : ''} onClick={() => setDpi(value)}>{value} DPI</button>)}</div></label>
                <label><span>{t.quantityLabel}</span><div className="quantity">{[4, 8, 12, 16, 20, 24].map((value) => <button type="button" key={value} className={printQuantity === value ? 'active' : ''} onClick={() => setPrintQuantity(value)}>{value}</button>)}</div></label>
                <p>{t.printCapacity}</p>
              </div>
              <div className="smartid-paper-preview">
                <div className="smartid-paper-grid">
                  {Array.from({ length: Math.min(printQuantity, 12) }).map((_, index) => <span key={index} style={{ aspectRatio: currentRatio }}><img src={processedImage} alt="" /></span>)}
                </div>
                <small>10 × 15 cm · {dpi} DPI</small>
              </div>
            </div>
            <footer><button type="button" onClick={() => setShowPrintModal(false)}>{t.cancel}</button><button type="button" className="primary" onClick={exportPrintSheet}><Icon name="download" />{t.exportFile}</button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
