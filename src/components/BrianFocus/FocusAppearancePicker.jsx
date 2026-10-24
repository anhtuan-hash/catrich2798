import React, { useEffect, useRef } from 'react';
import { Check, Clock3, EyeOff, SlidersHorizontal, X } from 'lucide-react';

/** Personal, local-only display controls. No scene CMS or Supabase writes. */
export default function FocusAppearancePicker({ language = 'vi', appearance, onChange, onClose }) {
  const vi = language !== 'en';
  const closeRef = useRef(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  return (
    <section className="bfc-atelier-picker" role="region"
      aria-label={vi ? 'Tùy chỉnh giao diện Focus' : 'Customize Focus appearance'}>
      <header className="bfc-atelier-picker__head">
        <span><SlidersHorizontal size={18}/>{vi ? 'Không gian của bạn' : 'Your focus space'}</span>
        <button ref={closeRef} type="button" aria-label={vi ? 'Đóng tùy chỉnh' : 'Close appearance'} onClick={onClose}><X size={17}/></button>
      </header>
      <p>{vi ? 'Chọn phong cách đồng hồ phù hợp với tâm trạng.' : 'Pick a clock style that fits your mood.'}</p>
      <div className="bfc-atelier-picker__options" role="group" aria-label={vi ? 'Kiểu đồng hồ' : 'Clock style'}>
        <button type="button" className={appearance.clockMode === 'sense' ? 'is-selected' : ''} aria-pressed={appearance.clockMode === 'sense'}
          onClick={() => onChange({clockMode:'sense'})}>
          <span className="bfc-atelier-picker__sense-art" aria-hidden="true"><i>11</i><span>:</span><i>41</i></span>
          <strong>Classic HTC</strong>
          <small>{vi ? 'Đồng hồ lật kính khói thanh lịch' : 'Refined translucent flip clock'}</small>
          {appearance.clockMode === 'sense' && <Check className="bfc-atelier-picker__check" size={15}/>}
        </button>
        <button type="button" className={appearance.clockMode === 'minimal' ? 'is-selected' : ''} aria-pressed={appearance.clockMode === 'minimal'}
          onClick={() => onChange({clockMode:'minimal'})}>
          <span className="bfc-atelier-picker__minimal-art" aria-hidden="true">11:41</span>
          <strong>Minimal</strong>
          <small>{vi ? 'Thời gian thanh mảnh, không khung' : 'Pure typography, no cards'}</small>
          {appearance.clockMode === 'minimal' && <Check className="bfc-atelier-picker__check" size={15}/>}
        </button>
      </div>
      <label className="bfc-atelier-picker__switch-row">
        <span><EyeOff size={17}/><span><strong>{vi ? 'Tự ẩn công cụ' : 'Auto-hide controls'}</strong>
          <small>{vi ? 'Ẩn sau 5 giây không thao tác' : 'Hide after 5 seconds of inactivity'}</small>
        </span></span>
        <input type="checkbox" checked={appearance.autoHide}
          onChange={event=>onChange({autoHide:event.target.checked})}
          aria-label={vi ? 'Tự ẩn công cụ sau 5 giây' : 'Auto-hide tools after five seconds'}/>
        <span className="bfc-atelier-picker__toggle" aria-hidden="true"/>
      </label>
      <div className="bfc-atelier-picker__foot"><Clock3 size={14}/>{vi ? 'Lưu riêng cho tài khoản này trên trình duyệt hiện tại.' : 'Saved for this account on this browser only.'}</div>
    </section>
  );
}
