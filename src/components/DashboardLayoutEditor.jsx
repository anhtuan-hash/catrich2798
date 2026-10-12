import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, EyeOff, Info, RotateCcw, GripVertical, PanelsTopLeft } from 'lucide-react';
import {
  defaultDashboardLayout, moveDashboardCard, setDashboardCardVisible,
  setDashboardSectionVisible, moveDashboardWidget, resizeDashboardWidget, applyDashboardLayoutPreset,
} from '../utils/dashboardLayoutPreferences.js';

const WORDS = {
  vi: {
    title: 'Cá nhân hóa Dashboard', description: 'Sắp xếp thẻ, ẩn mục không cần thiết và chọn khoảng cách hiển thị.',
    cards: 'Thẻ tổng quan', sections: 'Các khu vực trên trang', spacing: 'Mật độ hiển thị',
    presets: 'Bố cục theo vai trò', board: 'Bảng widget kéo thả', small: '1×1', wide: '2×1', tall: '2×2',
    dragHint: 'Kéo thả để đổi vị trí hoặc dùng mũi tên bên cạnh.',
    presetLabels: { default: 'Mặc định', teacher: 'Giáo viên', homeroom: 'Chủ nhiệm', leader: 'Tổ trưởng' },
    reset: 'Khôi phục mặc định', show: 'Hiện', hide: 'Ẩn', left: 'Chuyển sang trái', right: 'Chuyển sang phải',
    compact: 'Gọn', comfortable: 'Thoáng', saved: 'Tùy chỉnh được lưu riêng cho tài khoản trên trình duyệt này.',
    labels: { nextEvent: 'Sự kiện tiếp theo', priority: 'Công việc cần chú ý', continue: 'Tiếp tục công việc',
      homeroom: 'Lớp chủ nhiệm / Học liệu', calendar: 'Lịch làm việc', quickActions: 'Thao tác nhanh',
      dropZone: 'Thả và xử lý tài liệu', news: 'Tin tức giáo dục' },
  },
  en: {
    title: 'Personalize Dashboard', description: 'Arrange cards, hide sections and adjust information density.',
    cards: 'Overview cards', sections: 'Page sections', spacing: 'Layout density',
    presets: 'Role-based layouts', board: 'Drag-and-drop widget board', small: '1×1', wide: '2×1', tall: '2×2',
    dragHint: 'Drag to reorder, or use the neighboring arrow controls.',
    presetLabels: { default: 'Default', teacher: 'Teacher', homeroom: 'Homeroom', leader: 'Department lead' },
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
  const [draggedWidget, setDraggedWidget] = useState(null);
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
      <div className="gd-v3-preset-bar">
        <strong>{t.presets}</strong>
        <div role="group" aria-label={t.presets}>
          {Object.entries(t.presetLabels).map(([key,label])=><button key={key} type="button" className={layout.preset === key ? 'is-active' : ''} aria-pressed={layout.preset === key} onClick={()=>update(()=>applyDashboardLayoutPreset(key))}>{label}</button>)}
        </div>
      </div>
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
      <section className="gd-v3-editor-board">
        <h4><PanelsTopLeft size={17}/>{t.board}</h4>
        <p>{t.dragHint}</p>
        <div className="gd-v3-editor-widgets">
          {layout.boardOrder.map((id,index)=><div className="gd-v3-editor-widget" key={id} draggable
            onDragStart={(event)=>{setDraggedWidget(id);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id);}}
            onDragOver={(event)=>{event.preventDefault();event.dataTransfer.dropEffect='move';}}
            onDrop={(event)=>{event.preventDefault();const from=draggedWidget || event.dataTransfer.getData('text/plain');const i=layout.boardOrder.indexOf(from);const target=layout.boardOrder.indexOf(id);if(i>=0&&target>=0&&i!==target) update((current)=>{let updated=current;const step=i<target?1:-1;for(let j=i;j!==target;j+=step) updated=moveDashboardWidget(updated,from,step);return updated;});setDraggedWidget(null);}}
            onDragEnd={()=>setDraggedWidget(null)}>
            <GripVertical size={16} aria-hidden="true"/>
            <strong>{t.labels[id]}</strong>
            <button type="button" className="dcc-order-button" disabled={index===0} aria-label={t.left+': '+t.labels[id]} onClick={()=>update((current)=>moveDashboardWidget(current,id,-1))}><ArrowLeft size={15}/></button>
            <button type="button" className="dcc-order-button" disabled={index===layout.boardOrder.length-1} aria-label={t.right+': '+t.labels[id]} onClick={()=>update((current)=>moveDashboardWidget(current,id,1))}><ArrowRight size={15}/></button>
            <select value={layout.widgetSizes[id]} aria-label={t.labels[id]+' — '+t.board} onChange={(event)=>update((current)=>resizeDashboardWidget(current,id,event.target.value))}>
              <option value="small">{t.small}</option><option value="wide">{t.wide}</option><option value="tall">{t.tall}</option>
            </select>
          </div>)}
        </div>
      </section>
      <footer className="dcc-customizer-footnote"><Info size={14} aria-hidden="true" />{t.saved}</footer>
    </section>
  );
}
