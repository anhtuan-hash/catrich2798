import React, { useEffect } from 'react';

export default function Games({ language = 'vi' }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash !== '#/apps') {
      window.location.hash = '#/apps';
    }
  }, []);

  return (
    <div className="windows-loader-wrap">
      <div className="windows-loader-card">
        {language === 'vi' ? 'Đang chuyển sang Ứng dụng…' : 'Opening Applications…'}
      </div>
    </div>
  );
}
