import React from 'react';
import { ArrowLeft, ArrowRight, Check, EyeOff, Info, RotateCcw } from 'lucide-react';
import {
  defaultDashboardLayout, moveDashboardCard, setDashboardCardVisible,
  setDashboardSectionVisible,
} from '../utils/dashboardLayoutPreferences.js';

const WORDS = {
  vi: {
    title: 'Cá nhân hóa Dashboard', description: 'Sắp xếp thẻ, ẩn mục không cần thiết và chọn khoảng cách hiển thị.',
    cards: 'Thẻ tổng quan', sections: 'Các khu vực trên trang', spacing: 'Mật độ hiển thị',
    reset: 'Khôi phục mặc định', show: 'Hiện', hide: 'Ẩn', left: 'Chuyển sang trái', right: 'Chuyển sang phải',
    compact: 'Gọn', comfortable: 'Thoáng', saved: 'Tùy chỉnh được lưu riêng cho tài khoản trên trình duyệt này.',
    labels: { nextEvent: 'Sự kiện tiếp theo', priority: 'Công việc cần chú ý', continue: 'Tiếp tục công việc',
      homeroom: 'Lớp chủ nhiệm / Học liệu', calendar: 'Lịch làm việc', quickActions: 'Thao tác nhanh',
      dropZone: 'Thả và xử lý tài liệu', news: 'Tin tức giáo dục' },
  },
  en: {
    title: 'Personalize Dashboard', description: 'Arrange cards, hide sections and adjust information density.',
    cards: 'Overview cards', sections: 'Page sections', spacing: 'Layout density',
    reset: 'Restore defaults', show: 'Show', hide: 'Hide', left: 'Move left', right: 'Move right',
    compact: 'Compact', comfortable: 'Comfortable', saved: 'Settings are saved for this account in this browser.',
    labels: { nextEvent: 'Next event', priority: 'Important tasks', continue: 'Continue working',
      homeroom: 'Homeroom / Resources', calendar: 'Schedule', quickActions: 'Quick actions',
      dropZone: 'Document Drop Zone', news: 'Education news' },
  },
};
const SECTION_IDS = ['nextEvent', 'priority', 'continue', 'homeroom', 'calendar', 'quickActions', 'dropZone', 'news'];

export default function DashboardLayoutEditor({ cards, layout, language = 'vi', onChange }) {
  const t = WORDS[language] || WORDS.vi;
  const cardIds = cards.map((card) => card.id);
  const ordered = layout.cardOrder.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
  const countVisible = ordered.filter((card) => !layout.hiddenCards.includes(card.id)).length;
  const update = (transform) => onChange?.(transform);
  return (
    <section className="dcc-customizer" aria-label={t.title}>
      <header className="dcc-customizer-header">
        <div><h3>{t.title}</h3><p>{t.description}</p></div>
        <button type="button" className="dcc-reset-layout" onClick={() => update(() => defaultDashboardLayout())}>
          <RotateCcw size={15} />{t.reset}
        </button>
      </header>
      <div className="dcc-customizer-grid">
        <div className="dcc-customizer-col">
          <h4>{t.cards}</h4>
          <div className="dcc-card-options">
            {ordered.map((card, index) => {
              const shown = !layout.hiddenCards.includes(card.id);
              const Icon = card.Icon;
              return <div className="dcc-card-option" key={card.id}>
                <span className={'dcc-card-option-icon dcc-card-option-icon--' + card.tone}><Icon size={15} /></span>
                <span className="dcc-card-option-label">{card.label}</span>
                <button type="button" className="dcc-order-button" disabled={index === 0} aria-label={t.left + ': ' + card.label} onClick={() => update((current) => moveDashboardCard(current, card.id, -1, cardIds))}><ArrowLeft size={15}/></button>
                <button type="button" className="dcc-order-button" disabled={index === ordered.length - 1} aria-label={t.right + ': ' + card.label} onClick={() => update((current) => moveDashboardCard(current, card.id, 1, cardIds))}><ArrowRight size={15}/></button>
                <button type="button" className={'dcc-visibility-button' + (shown ? ' is-visible' : '')} aria-pressed={shown} disabled={shown && countVisible < 2} onClick={() => update((current) => setDashboardCardVisible(current, card.id, !shown, cardIds))}>
                  {shown ? <Check size={14}/> : <EyeOff size={14}/>} {shown ? t.show : t.hide}
                </button>
              </div>;
            })}
          </div>
        </div>
        <div className="dcc-customizer-col">
          <h4>{t.sections}</h4>
          <div className="dcc-section-options">
            {SECTION_IDS.map((id) => {
              const shown = !layout.hiddenSections.includes(id);
              return <button type="button" key={id} className={'dcc-section-option' + (shown ? ' is-visible' : '')} aria-pressed={shown} onClick={() => update((current) => setDashboardSectionVisible(current, id, !shown))}>
                <span className="dcc-section-icon">{shown ? <Check size={14}/> : <EyeOff size={14}/>}</span>{t.labels[id]}
              </button>;
            })}
          </div>
          <h4 className="dcc-density-label">{t.spacing}</h4>
          <div className="dcc-density-selector" role="group" aria-label={t.spacing}>
            {['comfortable', 'compact'].map((density) => <button type="button" key={density} className={layout.density === density ? 'is-active' : ''} aria-pressed={layout.density === density} onClick={() => update((current) => ({ ...current, density }))}>{t[density]}</button>)}
          </div>
        </div>
      </div>
      <footer className="dcc-customizer-footnote"><Info size={14} aria-hidden="true" />{t.saved}</footer>
    </section>
  );
}
