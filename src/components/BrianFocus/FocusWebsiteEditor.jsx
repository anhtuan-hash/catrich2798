import React, { useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Globe2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { FOCUS_WEB_MAX, normalizeFocusWebLayout,
  normalizeFocusWebScenes, parseFocusWebInput, validateFocusWebScenes } from './focusWebScenes.js';

export default function FocusWebsiteEditor({ draft, setDraft, setFile, busy, setNotice, language = 'vi' }) {
  const vi = language !== 'en';
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(false);
  const pages = Array.isArray(draft.webScenes) ? draft.webScenes : [];
  const choose = patch => {
    setFile(null); setNotice('');
    setDraft(old => ({ ...old, mediaType: 'website', mediaPath: '', ...patch }));
  };
  const add = () => {
    try {
      const added = parseFocusWebInput(input, window.location.origin);
      const merged = [...pages];
      for (const item of added) if (!merged.some(p => p.url === item.url)) merged.push(item);
      choose({ webScenes: validateFocusWebScenes(merged, window.location.origin) });
      setInput(''); setPreview(false);
    } catch (error) { setNotice(error?.message || String(error)); }
  };
  const order = (action, index) => {
    const list = [...pages];
    if (action === 'remove') list.splice(index, 1);
    else {
      const target = index + (action === 'up' ? -1 : 1);
      if (target < 0 || target >= list.length) return;
      [list[index], list[target]] = [list[target], list[index]];
    }
    choose({ webScenes: list }); setPreview(false);
  };
  const rename = (index, value) => choose({
    webScenes: pages.map((page, i) => i === index ? { ...page, title: value.slice(0, 80) } : page),
  });
  const firstUrl = draft.mediaType === 'website'
    ? normalizeFocusWebScenes(pages, typeof window === 'undefined' ? '' : window.location.origin)[0]?.url
    : '';

  return <div className="bfc-scene-editor__website-field">
    <label htmlFor="bfc-web-urls"><Globe2 size={18} aria-hidden="true"/>
      <strong>{vi ? 'Web Scenes · Website tương tác' : 'Web Scenes · Interactive websites'}</strong>
    </label>
    <div className="bfc-scene-editor__web-entry">
      <textarea id="bfc-web-urls" rows={3} spellCheck={false} disabled={busy}
        value={input} onChange={event => setInput(event.target.value)}
        placeholder={vi ? 'Dán URL HTTPS hoặc mã iframe, mỗi dòng một website' :
          'Paste HTTPS URLs or iframe snippets, one website per line'}/>
      <button type="button" disabled={busy || !input.trim()} onClick={add}>
        <Plus size={15}/>{vi ? 'Thêm website' : 'Add websites'}
      </button>
    </div>
    <small className="bfc-scene-editor__web-hint">
      {vi ? 'Tối đa ' + FOCUS_WEB_MAX + ' website. Một số trang chặn nhúng iframe. Danh sách được đồng bộ; thao tác trong website không đồng bộ.'
        : 'Up to ' + FOCUS_WEB_MAX + ' websites. Some sites disallow iframe embeds. Playlist syncs; site actions do not.'}
    </small>
    {pages.length > 0 && <>
      {draft.mediaType !== 'website' && <button type="button" className="bfc-scene-editor__web-use"
        onClick={() => choose({})} disabled={busy}><Globe2 size={15}/>
        {vi ? 'Sử dụng danh sách website đã lưu' : 'Use saved website playlist'}
      </button>}
      <ol className="bfc-scene-editor__web-list" aria-label={vi ? 'Danh sách website' : 'Website playlist'}>
        {pages.map((page, index) => <li className="bfc-scene-editor__web-item" key={page.url}>
          <span className="bfc-scene-editor__playlist-number">{index + 1}</span>
          <input value={page.title} disabled={busy} maxLength={80}
            aria-label={vi ? 'Tên website ' + (index+1) : 'Website title ' + (index+1)}
            onChange={event => rename(index, event.target.value)}/>
          <div className="bfc-scene-editor__web-actions">
            <a href={page.url} target="_blank" rel="noopener noreferrer"
              title={vi ? 'Mở website' : 'Open website'}><ExternalLink size={14}/></a>
            <button type="button" disabled={busy || index === 0}
              aria-label={vi ? 'Di chuyển lên' : 'Move up'} onClick={() => order('up',index)}>
              <ArrowUp size={14}/></button>
            <button type="button" disabled={busy || index === pages.length-1}
              aria-label={vi ? 'Di chuyển xuống' : 'Move down'} onClick={() => order('down',index)}>
              <ArrowDown size={14}/></button>
            <button type="button" disabled={busy}
              aria-label={vi ? 'Xóa website' : 'Delete website'} onClick={() => order('remove',index)}>
              <Trash2 size={14}/></button>
          </div>
        </li>)}
      </ol>
      <div className="bfc-scene-editor__web-options" role="group"
        aria-label={vi ? 'Bố cục mặc định' : 'Default layout'}>
        {['single','split','quad'].map((mode, i) =>
          <button type="button" key={mode} disabled={busy}
            aria-pressed={normalizeFocusWebLayout(draft.webLayout)===mode}
            onClick={() => choose({webLayout:mode})}>
            {vi ? ['1 trang','Chia đôi','Chia bốn'][i] : ['Single','Split','Four panels'][i]}
          </button>)}
      </div>
      {draft.mediaType === 'website' && <button type="button" className="bfc-scene-editor__web-use"
        onClick={() => setPreview(v => !v)}>
        {preview?<EyeOff size={15}/>:<Eye size={15}/>}
        {preview ? (vi ? 'Đóng xem thử' : 'Close preview') : (vi ? 'Xem thử website đầu tiên' : 'Preview first website')}
      </button>}
      {preview && firstUrl && <div className="bfc-scene-editor__preview">
        <iframe className="bfc-scene-editor__web-preview" title="Website preview" src={firstUrl}
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          referrerPolicy="no-referrer"/>
      </div>}
    </>}
  </div>;
}
