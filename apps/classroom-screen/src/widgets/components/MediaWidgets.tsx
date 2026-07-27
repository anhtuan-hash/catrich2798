import React, { useState, useRef, useEffect } from 'react';
import { ClassroomWidget } from '../../types';
import {
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Camera,
  Globe,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Sparkles,
} from 'lucide-react';

interface WidgetProps {
  widget: ClassroomWidget;
  onUpdate: (partial: Partial<ClassroomWidget>) => void;
}

// 1. IMAGE WIDGET
export const ImageWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const imageUrl = widget.settings.url || '';
  const fit = widget.settings.fit || 'contain';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onUpdate({ settings: { ...widget.settings, url: evt.target.result as string } });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 relative group select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {imageUrl ? (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl">
          <img
            src={imageUrl}
            alt="Uploaded content"
            className="w-full h-full transition-all"
            style={{ objectFit: fit as any }}
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-slate-900/80 p-1 rounded-lg flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-white hover:text-blue-400"
              title="Đổi ảnh khác"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-[#1A73E8] rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition text-gray-500 hover:text-[#1A73E8]"
        >
          <Upload className="w-8 h-8 mb-2" />
          <span className="text-xs font-semibold text-center">Tải ảnh lên từ máy tính</span>
          <span className="text-[10px] text-gray-400 mt-1">Hỗ trợ PNG, JPG, SVG, WebP</span>
        </div>
      )}
    </div>
  );
};

// 2. PDF WIDGET
export const PdfWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const pdfUrl = widget.settings.url || '';
  const currentPage = widget.settings.currentPage || 1;
  const totalPages = widget.settings.totalPages || 1;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          onUpdate({
            settings: {
              ...widget.settings,
              url: evt.target.result as string,
              fileName: file.name,
              currentPage: 1,
              totalPages: 5, // Default page count estimate
            },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const changePage = (delta: number) => {
    const nextPage = Math.max(1, Math.min(totalPages, currentPage + delta));
    onUpdate({ settings: { ...widget.settings, currentPage: nextPage } });
  };

  return (
    <div className="w-full h-full flex flex-col p-2 select-none">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="application/pdf"
        className="hidden"
      />

      {pdfUrl ? (
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center justify-between pb-1 mb-1 border-b text-xs font-semibold text-gray-600 dark:text-slate-300">
            <span className="truncate max-w-[180px] font-medium">
              📄 {widget.settings.fileName || 'Tài liệu.pdf'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => changePage(-1)}
                disabled={currentPage <= 1}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => changePage(1)}
                disabled={currentPage >= totalPages}
                className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 bg-gray-100 dark:bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-center border">
            <FileText className="w-12 h-12 text-[#1A73E8] mb-2" />
            <p className="text-xs font-bold text-gray-800 dark:text-slate-200">
              Trang {currentPage} của PDF
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Đang xem file PDF trực quan
            </p>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-[#1A73E8] rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition text-gray-500 hover:text-[#1A73E8]"
        >
          <FileText className="w-8 h-8 mb-2" />
          <span className="text-xs font-semibold text-center">Tải file PDF bài giảng</span>
          <span className="text-[10px] text-gray-400 mt-1">Trình chiếu slide & tài liệu PDF</span>
        </div>
      )}
    </div>
  );
};

// 3. VIDEO WIDGET
export const VideoWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const videoUrl = widget.settings.videoUrl || '';
  const [inputUrl, setInputUrl] = useState('');
  const [showInput, setShowInput] = useState(!videoUrl);

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const ytEmbed = getYouTubeEmbedUrl(videoUrl);

  const handleSaveUrl = () => {
    if (inputUrl) {
      onUpdate({ settings: { ...widget.settings, videoUrl: inputUrl } });
      setShowInput(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2 select-none relative group">
      {videoUrl && !showInput ? (
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          {ytEmbed ? (
            <iframe
              src={ytEmbed}
              title="YouTube video"
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={videoUrl} controls className="w-full h-full object-contain" />
          )}
          <button
            onClick={() => setShowInput(true)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-slate-900/80 p-1.5 rounded-lg text-white text-xs flex items-center gap-1 z-20"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Đổi video
          </button>
        </div>
      ) : (
        <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-4">
          <Video className="w-8 h-8 text-[#1A73E8] mb-2" />
          <p className="text-xs font-bold text-gray-800 dark:text-slate-200 mb-2">
            Nhập liên kết YouTube / Video
          </p>
          <div className="flex gap-1.5 w-full max-w-xs">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-lg"
            >
              Lưu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 4. AUDIO WIDGET
export const AudioWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const title = widget.settings.title || 'Âm thanh bài học';
  const preset = widget.settings.preset || 'lofi';

  const presets = [
    { id: 'lofi', name: 'Nhạc Lofi học tập', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' },
    { id: 'rain', name: 'Tiếng mưa thư giãn', url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_884439c28e.mp3' },
    { id: 'nature', name: 'Tiếng chim rừng', url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio-[#1A73E8].mp3' },
  ];

  const currentPreset = presets.find((p) => p.id === preset) || presets[0];

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <audio ref={audioRef} src={currentPreset.url} loop />

      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-xs font-bold text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
          <Music className="w-4 h-4 text-[#1A73E8]" /> {title}
        </span>
        <span className="text-[10px] font-medium text-gray-400">{currentPreset.name}</span>
      </div>

      <div className="my-auto flex items-center justify-center gap-3">
        <button
          onClick={togglePlay}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition transform hover:scale-105 ${
            isPlaying ? 'bg-amber-500' : 'bg-[#1A73E8]'
          }`}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>

        {isPlaying && (
          <div className="flex items-center gap-1">
            <span className="w-1 h-4 bg-[#1A73E8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-6 bg-[#1A73E8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-3 bg-[#1A73E8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-1 h-5 bg-[#1A73E8] rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setIsPlaying(false);
              onUpdate({ settings: { ...widget.settings, preset: p.id } });
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
              preset === p.id
                ? 'bg-[#E8F0FE] text-[#1A73E8] font-bold'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600'
            }`}
          >
            {p.name.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
};

// 5. WEBCAM WIDGET
export const WebcamWidget: React.FC<WidgetProps> = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      setError('Không thể mở Camera. Kiểm tra quyền truy cập.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-2 select-none">
      <div className="relative w-full h-full bg-black rounded-xl overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          autoPlay
          playsInline
          muted
        />

        {!isStreaming && (
          <div className="flex flex-col items-center text-gray-400 p-4 text-center">
            <Camera className="w-10 h-10 mb-2 text-gray-500" />
            <p className="text-xs font-semibold mb-2">{error || 'Bật camera giáo viên'}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-xl shadow-md"
            >
              Mở Camera
            </button>
          </div>
        )}

        {isStreaming && (
          <button
            onClick={stopCamera}
            className="absolute bottom-2 right-2 px-3 py-1 bg-red-600/80 text-white text-[10px] font-bold rounded-lg shadow-md hover:bg-red-700"
          >
            Tắt Camera
          </button>
        )}
      </div>
    </div>
  );
};

// 6. EMBED WIDGET
export const EmbedWidget: React.FC<WidgetProps> = ({ widget, onUpdate }) => {
  const embedUrl = widget.settings.embedUrl || '';
  const [inputUrl, setInputUrl] = useState('');

  const handleSaveUrl = () => {
    if (inputUrl) {
      onUpdate({ settings: { ...widget.settings, embedUrl: inputUrl } });
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-2 select-none">
      {embedUrl ? (
        <div className="w-full h-full rounded-xl overflow-hidden border relative">
          <iframe
            src={embedUrl}
            title="Embedded content"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-4">
          <Globe className="w-8 h-8 text-[#1A73E8] mb-2" />
          <p className="text-xs font-bold text-gray-800 dark:text-slate-200 mb-1">
            Nhúng Google Slides, Padlet, Canva, Iframe
          </p>
          <div className="flex gap-1.5 w-full max-w-xs mt-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://docs.google.com/presentation/..."
              className="flex-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-800 rounded-lg border-none focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
            />
            <button
              onClick={handleSaveUrl}
              className="px-3 py-1.5 bg-[#1A73E8] text-white text-xs font-bold rounded-lg"
            >
              Nhúng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 7. BROWSER CARD WIDGET
export const BrowserCardWidget: React.FC<WidgetProps> = ({ widget }) => {
  const url = widget.settings.url || 'https://wikipedia.org';
  const title = widget.settings.title || 'Tài nguyên bài giảng';

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 select-none">
      <div className="flex items-center gap-2 border-b pb-2">
        <Globe className="w-5 h-5 text-[#1A73E8]" />
        <div className="truncate">
          <p className="text-xs font-bold text-gray-800 dark:text-slate-100 truncate">{title}</p>
          <p className="text-[10px] text-gray-400 font-mono truncate">{url}</p>
        </div>
      </div>

      <div className="my-auto p-3 bg-[#F1F3F4] dark:bg-slate-800 rounded-xl flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-slate-300">
          Mở trang web trong tab mới
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
        >
          Truy cập <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
