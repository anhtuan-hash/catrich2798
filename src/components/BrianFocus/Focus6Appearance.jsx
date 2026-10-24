import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Clock3, Image, SlidersHorizontal, WandSparkles, X } from 'lucide-react';
import { FOCUS6_ATMOSPHERES } from './useFocusAppearance.js';

const CLOCKS=[
  ['sense','Classic HTC','Đồng hồ lật nguyên bản','Original flip clock'],
  ['glass','HTC Glass','Kính khói tinh tế','Satin glass flip'],
  ['minimal','Minimal','Chữ thanh lịch','Clean typography'],
  ['floating','Floating Digital','Đồng hồ số nổi','Floating numerals'],
];
const BACKDROPS=[
  ['natural','Natural','Tự nhiên'],
  ['cinema','Cinema','Điện ảnh'],
  ['dreamy','Dreamy','Mộng mơ'],
  ['dark','Dark','Tối sâu'],
];
const DOCK=[
  ['timer','Hẹn giờ','Timer'],['notes','Ghi chú','Notes'],
  ['soundscape','Âm thanh','Audio'],['brightness','Hình nền','Background'],
];
function PickerOption({label,description,active,onClick}) {
  return <button type="button" className={'bfc6-option'+(active?' is-active':'')}
    aria-pressed={active} onClick={onClick}>
    <strong>{label}</strong><small>{description}</small>{active&&<Check size={14} aria-hidden="true"/>}
  </button>;
}
export default function Focus6Appearance({language='vi',appearance,onChange,onClose}) {
  const vi=language!=='en';
  const [tab,setTab]=useState('styles');
  const [presetName,setPresetName]=useState(appearance.customPreset?.name||'My Space');
  const change = patch => onChange({...patch,atmosphere:'custom'});
  const move=(i,direction)=>{
    const list=[...appearance.dock];
    const j=i+direction;
    if(j<0||j>=list.length)return;
    [list[i],list[j]]=[list[j],list[i]];
    change({dock:list});
  };
  return <section className="bfc6-picker" role="region" aria-label={vi?'Tùy chỉnh giao diện Focus':'Customize Focus appearance'}>
    <header className="bfc6-picker__head">
      <span><WandSparkles size={19}/><strong>{vi?'Giao diện Focus':'Focus appearance'}</strong><small>{vi?'Tùy chỉnh cá nhân':'Personal settings'}</small></span>
      <button type="button" onClick={onClose} aria-label={vi?'Đóng giao diện':'Close appearance'}><X size={18}/></button>
    </header>
    <nav className="bfc6-picker__tabs" aria-label={vi?'Mục cài đặt':'Sections'}>
      {[['styles',vi?'Đồng hồ':'Clock'],['scene',vi?'Hình nền':'Backdrop'],['atmosphere',vi?'Không gian':'Atmospheres'],['dock','Dock']].map(([id,label])=>
        <button type="button" key={id} className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}
    </nav>
    <div className="bfc6-picker__body">
      {tab==='styles'&&<div className="bfc6-picker__section">
        <label className="bfc6-picker__section-label"><Clock3 size={15}/>{vi?'Chọn kiểu đồng hồ':'Clock style'}</label>
        <div className="bfc6-picker__grid">
          {CLOCKS.map(([id,title,subVi,subEn])=><PickerOption key={id} active={appearance.clockMode===id}
            label={title} description={vi?subVi:subEn} onClick={()=>change({clockMode:id})}/>)}
        </div>
        <label className="bfc6-picker__range">{vi?'Kích thước':'Clock size'} <strong>{appearance.scale}%</strong>
          <input type="range" min="75" max="125" step="5" value={appearance.scale} onChange={e=>change({scale:Number(e.target.value)})}/>
        </label>
        <label className="bfc6-picker__check"><input type="checkbox" checked={appearance.hour12} onChange={e=>change({hour12:e.target.checked})}/>
          {vi?'Dùng định dạng 12 giờ':'Use 12-hour clock'}
        </label>
        <label className="bfc6-picker__check"><input type="checkbox" checked={appearance.showSeconds} onChange={e=>change({showSeconds:e.target.checked})}/>
          {vi?'Hiển thị giây':'Show seconds'}
        </label>
        <label className="bfc6-picker__check"><input type="checkbox" checked={appearance.autoHide} onChange={e=>change({autoHide:e.target.checked})}/>
          {vi?'Tự ẩn thanh công cụ sau 5 giây':'Auto-hide controls after five seconds'}
        </label>
      </div>}
      {tab==='scene'&&<div className="bfc6-picker__section">
        <label className="bfc6-picker__section-label"><Image size={15}/>{vi?'Bộ lọc hình nền cá nhân':'Personal cinema filter'}</label>
        <div className="bfc6-picker__grid">
          {BACKDROPS.map(([id,en,name])=><PickerOption key={id} label={vi?name:en}
            description={vi?'Chỉ áp dụng trên thiết bị này':'This device only'} active={appearance.backdrop===id}
            onClick={()=>change({backdrop:id})}/>)}
        </div>
        {[['dim',vi?'Độ tối':'Dimming',0,85,'%'],['saturation',vi?'Độ bão hòa':'Saturation',60,160,'%'],
          ['contrast',vi?'Độ tương phản':'Contrast',75,135,'%'],['blur',vi?'Làm mờ':'Blur',0,8,'px']].map(([key,label,min,max,suffix])=>
          <label key={key} className="bfc6-picker__range">{label}<strong>{appearance[key]}{suffix}</strong>
            <input type="range" min={min} max={max} step="1" value={appearance[key]} onChange={e=>change({[key]:Number(e.target.value)})}/>
          </label>)}
        <button type="button" className="bfc6-picker__reset" onClick={()=>change({backdrop:'natural',dim:24,saturation:100,contrast:100,blur:0})}>
          {vi?'Đặt lại bộ lọc':'Reset filter'}
        </button>
        <p className="bfc6-picker__hint">{vi?'Không thay đổi ảnh hoặc video gốc của admin.':'The administrator’s shared image or video is never modified.'}</p>
      </div>}
      {tab==='atmosphere'&&<div className="bfc6-picker__section">
        <div className="bfc6-picker__grid">
          {FOCUS6_ATMOSPHERES.map(p=><PickerOption key={p.id} label={vi?p.vi:p.en}
            description={p.clockMode+' · '+p.backdrop} active={appearance.atmosphere===p.id}
            onClick={()=>onChange({clockMode:p.clockMode,backdrop:p.backdrop,scale:p.scale,autoHide:p.autoHide,atmosphere:p.id})}/>)}
        </div>
        <div className="bfc6-picker__custom">
          <strong>{vi?'Không gian cá nhân':'My custom space'}</strong>
          <input type="text" maxLength={30} aria-label={vi?'Tên không gian':'Preset name'}
            value={presetName} onChange={e=>setPresetName(e.target.value)}/>
          <div>
            <button type="button" onClick={()=>onChange({customPreset:{
              name:presetName.trim()||'My Space',
              clockMode:appearance.clockMode,backdrop:appearance.backdrop,scale:appearance.scale,
              dim:appearance.dim,saturation:appearance.saturation,contrast:appearance.contrast,
              blur:appearance.blur,autoHide:appearance.autoHide
            },atmosphere:'custom'})}>{vi?'Lưu thiết lập hiện tại':'Save current settings'}</button>
            <button type="button" disabled={!appearance.customPreset} onClick={()=>{
              if(appearance.customPreset) onChange({...appearance.customPreset,atmosphere:'custom'});
            }}>{vi?'Áp dụng đã lưu':'Apply saved space'}</button>
          </div>
        </div>
        <label className="bfc6-picker__section-label">{vi?'Mục tiêu đang tập trung':'Current intention'}</label>
        <input type="text" maxLength={100} value={appearance.intention}
          placeholder={vi?'Ví dụ: Hoàn thành kế hoạch bài dạy':'e.g. Finish the lesson plan'}
          onChange={e=>change({intention:e.target.value})}/>
        <p className="bfc6-picker__hint">{vi?'Preset chỉ đổi giao diện cá nhân; không phát âm thanh hoặc thay cảnh của admin.':'Presets change personal appearance only — no audio starts or shared scene is modified.'}</p>
      </div>}
      {tab==='dock'&&<div className="bfc6-picker__section">
        <p className="bfc6-picker__hint">{vi?'Sắp xếp bốn công cụ yêu thích theo vị trí trên Dock.':'Reorder your four quick tools using the arrows.'}</p>
        <div className="bfc6-picker__dock-order">
          {appearance.dock.map((key,i)=>{const item=DOCK.find(x=>x[0]===key);if(!item)return null;return <div key={key}>
            <strong>{vi?item[1]:item[2]}</strong>
            <button type="button" disabled={i===0} onClick={()=>move(i,-1)} aria-label={vi?'Đưa lên trước':'Move up'}><ChevronUp size={18}/></button>
            <button type="button" disabled={i===appearance.dock.length-1} onClick={()=>move(i,1)} aria-label={vi?'Đưa xuống sau':'Move down'}><ChevronDown size={18}/></button>
          </div>})}
        </div>
        <label className="bfc6-picker__check"><input type="checkbox" checked={appearance.autoHide} onChange={e=>change({autoHide:e.target.checked})}/>
          {vi?'Tự ẩn Dock khi không thao tác':'Hide dock when inactive'}
        </label>
      </div>}
    </div>
    <footer className="bfc6-picker__foot">{vi?'Lưu riêng cho tài khoản này trên trình duyệt hiện tại.':'Saved for this account on this browser only.'}</footer>
  </section>;
}
