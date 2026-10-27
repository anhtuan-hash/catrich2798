import React, { useEffect, useRef } from 'react';
import { ArrowRight, Globe2, Youtube, X, RotateCcw, Layers3 } from 'lucide-react';

/** Per-open, local-only chooser. Shared scene settings are never overwritten. */
export default function FocusSourcePicker({
  language = 'vi', websites = 0, videos = 0, loading = false, error = '',
  allowOriginal = false, onSelect, onClose, onRetry,
}) {
  const vi = language !== 'en';
  const root = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const first = root.current?.querySelector('.bfc-source-choice__option:not(:disabled)') ||
      root.current?.querySelector('button:not(:disabled)');
    first?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(root.current?.querySelectorAll('button:not(:disabled)') || []);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      const next = (index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      // Keep keyboard focus inside the chooser, not on the controls behind it.
      event.preventDefault(); buttons[next].focus();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const unavailable = !websites && !videos;
  return <div className="bfc-source-choice" ref={root} role="dialog" aria-modal="true"
    aria-label={vi ? 'Chọn nội dung khi mở Focus' : 'Choose Focus source'}>
    <div className="bfc-source-choice__shade" aria-hidden="true"/>
    <section className="bfc-source-choice__card">
      <div className="bfc-source-choice__top">
        <div className="bfc-source-choice__eyebrow">BRIAN FOCUS / SCENE SELECTOR</div>
        <button className="bfc-source-choice__dismiss" type="button" onClick={onClose}
          aria-label={vi ? 'Đóng Focus' : 'Close Focus'}><X size={18}/></button>
      </div>
      <h2>{vi ? 'Bạn muốn mở nội dung nào?' : 'What would you like to open?'}</h2>
      <p>{vi ? 'Chọn nguồn hiển thị cho phiên Focus này. Danh sách dùng chung không thay đổi.' :
        'Choose a source for this Focus session. Shared playlists remain unchanged.'}</p>
      {loading && <p className="bfc-source-choice__status" role="status">
        {vi ? 'Đang tải danh sách từ Supabase…' : 'Loading shared playlists…'}</p>}
      {error && <div className="bfc-source-choice__error" role="alert">
        <span>{vi ? 'Không thể đồng bộ nền Focus. ' : 'Cannot sync Focus sources. '}{error}</span>
        <button type="button" onClick={onRetry}><RotateCcw size={15}/>
          {vi ? 'Thử lại' : 'Retry'}</button>
      </div>}
      <div className="bfc-source-choice__options">
        <button type="button" className="bfc-source-choice__option bfc-source-choice__option--web"
          disabled={!websites || loading || Boolean(error)} onClick={() => onSelect('website')}>
          <span className="bfc-source-choice__illustration"><Globe2 size={27}/></span>
          <strong>Web Scenes</strong>
          <small>{websites
            ? (vi ? websites + ' website tương tác' : websites + ' interactive websites')
            : (vi ? 'Chưa có website' : 'No websites configured')}</small>
          <span className="bfc-source-choice__go">{vi ? 'Mở website' : 'Open websites'} <ArrowRight size={17}/></span>
        </button>
        <button type="button" className="bfc-source-choice__option bfc-source-choice__option--youtube"
          disabled={!videos || loading || Boolean(error)} onClick={() => onSelect('youtube')}>
          <span className="bfc-source-choice__illustration"><Youtube size={29}/></span>
          <strong>YouTube</strong>
          <small>{videos
            ? (vi ? videos + ' video trong danh sách' : videos + ' videos in the playlist')
            : (vi ? 'Chưa có playlist YouTube' : 'No YouTube playlist')}</small>
          <span className="bfc-source-choice__go">{vi ? 'Mở YouTube' : 'Open YouTube'} <ArrowRight size={17}/></span>
        </button>
      </div>
      {(allowOriginal || (!loading && unavailable)) && <button
        type="button" className="bfc-source-choice__original" onClick={() => onSelect('original')}>
        <Layers3 size={17}/>{vi ? 'Tiếp tục với nền Focus thông thường' : 'Continue with the regular Focus scene'}
      </button>}
      <p className="bfc-source-choice__footnote">
        {vi ? 'Chỉ lựa chọn trong phiên này · Không thay đổi nền dùng chung' :
          'Session-only selection · Does not alter shared scenes'}
      </p>
    </section>
  </div>;
}
