import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import TextCareDocxFixedStudio from './TextCareDocxFixedStudio.jsx';

function readWorkspaceSnapshot(page) {
  const statusItems = page?.querySelectorAll('.tcg-status-summary span');
  const autosave = page?.querySelector('.tcg-autosave')?.textContent?.trim();
  const score = statusItems?.[0]?.textContent?.trim() || '100% đầy đủ';
  const type = statusItems?.[1]?.textContent?.trim() || 'KẾ HOẠCH';
  const pages = statusItems?.[2]?.textContent?.trim() || '1 trang A4';
  return { score, type, pages, autosave: autosave || 'Tự lưu đang bật' };
}

function WorkspaceHero({ language, snapshot, onUpload, onPaste, onSample, onContinue }) {
  const vi = language !== 'en';
  const content = useMemo(() => ({
    eyebrow: vi ? 'GOOGLE WORKSPACE CHO VĂN BẢN HÀNH CHÍNH' : 'GOOGLE WORKSPACE FOR ADMINISTRATIVE DOCUMENTS',
    title: vi ? 'Chuẩn hoá văn bản, xem trước A4 và xuất bản trong một nơi' : 'Standardize, preview and publish documents in one workspace',
    description: vi
      ? 'Đưa DOCX, PDF hoặc văn bản thô vào TextCare; hệ thống hỗ trợ khai báo đúng thể thức Nghị định 30/2020, cập nhật preview tức thời và xuất DOCX sạch.'
      : 'Bring DOCX, PDF or plain text into TextCare, complete the required fields, review a live A4 preview and export a clean DOCX.',
    upload: vi ? 'Tải tài liệu lên' : 'Upload document',
    paste: vi ? 'Dán văn bản' : 'Paste text',
    sample: vi ? 'Mở bản mẫu' : 'Open sample',
    continue: vi ? 'Mở trình soạn thảo' : 'Open workspace',
    standards: vi ? 'Nghị định 30/2020' : 'Decree 30/2020',
    preview: vi ? 'Preview A4 trực tiếp' : 'Live A4 preview',
    formats: 'DOCX · PDF · TXT',
    autosave: vi ? 'Tự lưu liên tục' : 'Continuous autosave',
    document: vi ? 'Văn bản đang làm việc' : 'Current document',
    completion: vi ? 'Mức hoàn thiện' : 'Completion',
    page: vi ? 'Bản xem trước' : 'Preview',
  }), [vi]);

  return (
    <section className="tcg-workspace-hero" aria-labelledby="tcg-workspace-hero-title">
      <div className="tcg-workspace-hero-copy">
        <span className="tcg-workspace-eyebrow"><i aria-hidden="true" />{content.eyebrow}</span>
        <h1 id="tcg-workspace-hero-title">{content.title}</h1>
        <p>{content.description}</p>
        <div className="tcg-workspace-chips" aria-label={vi ? 'Khả năng của TextCare' : 'TextCare capabilities'}>
          <span>{content.standards}</span>
          <span>{content.preview}</span>
          <span>{content.formats}</span>
          <span>{content.autosave}</span>
        </div>
        <div className="tcg-workspace-actions">
          <button type="button" className="tcg-hero-primary" onClick={onUpload}>
            <span className="material-symbol" aria-hidden="true">↑</span>{content.upload}
          </button>
          <button type="button" className="tcg-hero-tonal" onClick={onPaste}>
            <span className="material-symbol" aria-hidden="true">▤</span>{content.paste}
          </button>
          <button type="button" className="tcg-hero-outlined" onClick={onSample}>{content.sample}</button>
          <button type="button" className="tcg-hero-text" onClick={onContinue}>{content.continue} →</button>
        </div>
      </div>

      <div className="tcg-workspace-visual" aria-hidden="true">
        <div className="tcg-visual-toolbar">
          <div className="tcg-google-dots"><i /><i /><i /><i /></div>
          <span>TextCare</span>
          <b>⋮</b>
        </div>
        <div className="tcg-mini-document">
          <div className="tcg-mini-document-head">
            <span />
            <span />
          </div>
          <strong>{snapshot.type}</strong>
          <i />
          <i />
          <i className="short" />
          <div className="tcg-mini-signature"><span /><span /></div>
        </div>
        <div className="tcg-visual-stat stat-completion">
          <small>{content.completion}</small>
          <strong>{snapshot.score}</strong>
        </div>
        <div className="tcg-visual-stat stat-page">
          <small>{content.page}</small>
          <strong>{snapshot.pages}</strong>
        </div>
        <div className="tcg-visual-save">✓ {snapshot.autosave}</div>
      </div>
    </section>
  );
}

export default function TextCareGoogleWorkspace(props) {
  const [heroHost, setHeroHost] = useState(null);
  const [snapshot, setSnapshot] = useState({ score: '100% đầy đủ', type: 'KẾ HOẠCH', pages: '1 trang A4', autosave: 'Tự lưu đang bật' });

  useEffect(() => {
    let observer;
    let slot;
    let frame;
    let page;

    const updateSnapshot = () => {
      if (page) setSnapshot(readWorkspaceSnapshot(page));
    };

    const attach = () => {
      page = document.querySelector('.textcare-google-page');
      const topbar = page?.querySelector('.tcg-topbar');
      if (!page || !topbar) {
        frame = window.requestAnimationFrame(attach);
        return;
      }
      slot = document.createElement('div');
      slot.className = 'tcg-workspace-hero-slot';
      topbar.insertAdjacentElement('afterend', slot);
      setHeroHost(slot);
      updateSnapshot();
      observer = new MutationObserver(updateSnapshot);
      observer.observe(page, { childList: true, subtree: true, characterData: true });
      page.addEventListener('input', updateSnapshot, true);
      page.addEventListener('change', updateSnapshot, true);
    };

    frame = window.requestAnimationFrame(attach);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      page?.removeEventListener('input', updateSnapshot, true);
      page?.removeEventListener('change', updateSnapshot, true);
      slot?.remove();
    };
  }, []);

  const getPage = () => document.querySelector('.textcare-google-page');
  const openStep = (index, focusSelector) => {
    const page = getPage();
    const step = page?.querySelectorAll('.tcg-stepper button')?.[index];
    step?.click();
    window.setTimeout(() => {
      const target = page?.querySelector(focusSelector || '.tcg-editor-card');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target instanceof HTMLElement && /textarea|input/i.test(target.tagName)) target.focus();
    }, 120);
  };

  const uploadDocument = () => {
    openStep(0, '.tcg-dropzone');
    window.setTimeout(() => getPage()?.querySelector('.tcg-dropzone input[type="file"]')?.click(), 180);
  };

  const pasteDocument = () => openStep(0, '.tcg-source-editor textarea');

  const openSample = () => {
    openStep(2, '.tcg-content-panel');
    window.setTimeout(() => getPage()?.querySelector('.tcg-content-panel .tcg-outlined-button')?.click(), 180);
  };

  const openWorkspace = () => {
    getPage()?.querySelector('.tcg-workbench')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <TextCareDocxFixedStudio {...props} />
      {heroHost ? createPortal(
        <WorkspaceHero
          language={props.language}
          snapshot={snapshot}
          onUpload={uploadDocument}
          onPaste={pasteDocument}
          onSample={openSample}
          onContinue={openWorkspace}
        />,
        heroHost,
      ) : null}
    </>
  );
}
