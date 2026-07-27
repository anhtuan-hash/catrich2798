import React, { useRef, useState } from 'react';
import { exportAllDataAsJSON, importDataFromJSON } from '../../services/exportImport';
import { X, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface ExportImportProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ExportImportModal: React.FC<ExportImportProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      await exportAllDataAsJSON();
      setStatusMsg({ type: 'success', msg: 'Xuất file sao lưu .JSON thành công!' });
    } catch (err) {
      setStatusMsg({ type: 'error', msg: 'Không thể xuất dữ liệu sao lưu.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await importDataFromJSON(text);
      if (success) {
        setStatusMsg({ type: 'success', msg: 'Khôi phục dữ liệu thành công!' });
        onImportComplete();
      } else {
        setStatusMsg({ type: 'error', msg: 'Định dạng file sao lưu không hợp lệ.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', msg: 'Lỗi trong quá trình đọc file JSON.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <h2 className="font-extrabold text-base text-slate-800 dark:text-slate-100">
            Sao Lưu & Khôi Phục Dữ Liệu
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {statusMsg.msg}
          </div>
        )}

        <div className="space-y-4 text-xs">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Xuất bản sao lưu</h3>
            <p className="text-slate-500 mb-3">Tải toàn bộ bài giảng, màn hình, danh sách học sinh thành file JSON.</p>
            <button
              onClick={handleExport}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Tải File Sao Lưu (.JSON)
            </button>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Khôi phục từ file</h3>
            <p className="text-slate-500 mb-3">Tải file .JSON sao lưu lên để ghi đè và khôi phục bài giảng.</p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Nhập File Sao Lưu (.JSON)
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
