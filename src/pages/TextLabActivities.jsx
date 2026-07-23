import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addBankItems, addHistoryEntry } from '../utils/library.js';
import { publishTextLabResource } from '../utils/textlabResourcePublisher.js';

const TEXTLAB_RELEASE = '20260724-google-large-v1';

export default function TextLabActivities({ language = 'vi', fontScale = 100, currentUser }) {
  const frameRef = useRef(null);
  const shellRef = useRef(null);
  const [frameHeight, setFrameHeight] = useState(1280);
  const [publishNotice, setPublishNotice] = useState('');

  const appUrl = useMemo(
    () => `${import.meta.env.BASE_URL || '/'}embedded/brian-textlab-activities/index.html?embedded=1&release=${TEXTLAB_RELEASE}`,
    []
  );

  const syncFramePreferences = () => {
    frameRef.current?.contentWindow?.postMessage({
      type: 'BTL_FONT_SCALE',
      scale: Number(fontScale) || 100,
    }, '*');
  };

  useEffect(() => {
    syncFramePreferences();
  }, [fontScale]);

  useEffect(() => {
    const sendToTextLab = (message) => {
      frameRef.current?.contentWindow?.postMessage(message, '*');
    };

    const handleMessage = async (event) => {
      if (event.source !== frameRef.current?.contentWindow) return;

      if (event.data?.type === 'BTL_RESIZE') {
        const nextHeight = Number(event.data?.height || 0);
        if (Number.isFinite(nextHeight) && nextHeight > 600) {
          setFrameHeight(Math.min(Math.max(nextHeight, 900), 4200));
        }
        return;
      }

      if (event.data?.type === 'BTL_SAVE_LIBRARY') {
        const item = event.data?.payload || {};
        addHistoryEntry({
          kind: 'textlab-activity',
          toolSlug: 'textlab-activities',
          toolTitle: 'Brian TextLab Activities',
          sourceApp: 'textlab-activities',
          sourceAppTitle: 'Brian TextLab Activities',
          title: item.title || 'TextLab Activity',
          content: item.content || '',
          templateId: item.templateId || '',
          itemCount: item.itemCount || 0,
          tags: ['textlab', 'interactive', item.templateId || 'activity'],
          activityData: {
            type: 'textlab-activity',
            templateId: item.templateId || 'quiz',
            sourceApp: 'textlab-activities',
            content: item.content || '',
            activity: item.activity || null,
            standaloneHtml: item.standaloneHtml || '',
          },
        });
        return;
      }

      if (event.data?.type === 'BTL_PUBLISH_RESOURCE') {
        const payload = event.data?.payload || {};
        setPublishNotice(language === 'vi' ? 'Đang đưa hoạt động vào Kho học liệu…' : 'Publishing to the resource library…');
        sendToTextLab({ type: 'BTL_RESOURCE_PUBLISH_STATE', state: 'uploading' });
        try {
          const result = await publishTextLabResource(payload, currentUser);
          setPublishNotice(result.message || 'Đã thêm hoạt động vào Kho học liệu.');
          sendToTextLab({
            type: 'BTL_RESOURCE_PUBLISH_RESULT',
            ok: true,
            status: result.status,
            resourceId: result.item?.cloudId || result.item?.id || '',
            message: result.message,
          });
        } catch (error) {
          const message = error?.message || 'Không thể thêm hoạt động vào Kho học liệu.';
          setPublishNotice(message);
          sendToTextLab({ type: 'BTL_RESOURCE_PUBLISH_RESULT', ok: false, message });
        }
        return;
      }

      if (event.data?.type === 'BTL_ADD_BANK') {
        addBankItems(event.data?.payload?.items || []);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentUser, language]);

  const startCreating = () => {
    shellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => frameRef.current?.focus(), 450);
  };

  const openGuide = () => {
    try {
      const frameDocument = frameRef.current?.contentDocument;
      const guide = frameDocument?.getElementById(language === 'vi' ? 'modalVi' : 'modalEn');
      if (guide?.showModal) guide.showModal();
      else startCreating();
    } catch {
      startCreating();
    }
  };

  return (
    <div className="page textlab-integrated-page textlab-frameless-page">
      <section className="textlab-material-hero" aria-labelledby="textlabHeroTitle">
        <div className="textlab-hero-copy">
          <div className="textlab-hero-title-row">
            <span className="textlab-hero-app-icon" aria-hidden="true">{'</>'}</span>
            <div>
              <span className="textlab-hero-eyebrow">ENGLISH HUB · INTERACTIVE ACTIVITY STUDIO</span>
              <h1 id="textlabHeroTitle">TextLab Activities</h1>
            </div>
          </div>

          <p className="textlab-hero-description">
            {language === 'vi'
              ? 'Tạo các hoạt động HTML tương tác một cách nhanh chóng, xem trước trực tiếp và chia sẻ lên Kho học liệu để đồng nghiệp cùng khai thác.'
              : 'Create interactive HTML activities quickly, preview them live, and share them through the Resource Library.'}
          </p>

          <div className="textlab-hero-features" aria-label={language === 'vi' ? 'Tính năng nổi bật' : 'Key features'}>
            <span><b aria-hidden="true">⚡</b>{language === 'vi' ? 'Tạo hoạt động nhanh' : 'Build activities fast'}</span>
            <span><b aria-hidden="true">◉</b>{language === 'vi' ? 'Xem trước trực tiếp' : 'Live preview'}</span>
            <span><b aria-hidden="true">↗</b>{language === 'vi' ? 'Chia sẻ qua Kho học liệu' : 'Share to the library'}</span>
          </div>

          <div className="textlab-hero-actions">
            <button className="textlab-hero-primary" type="button" onClick={startCreating}>
              <span aria-hidden="true">＋</span>
              {language === 'vi' ? 'Bắt đầu tạo hoạt động' : 'Start creating'}
            </button>
            <button className="textlab-hero-secondary" type="button" onClick={openGuide}>
              <span aria-hidden="true">▣</span>
              {language === 'vi' ? 'Xem hướng dẫn' : 'View guide'}
            </button>
          </div>

          {publishNotice ? <div className="textlab-hero-notice" role="status">{publishNotice}</div> : null}
        </div>

        <div className="textlab-hero-visual" aria-hidden="true">
          <span className="textlab-orbit textlab-orbit-people">●●</span>
          <span className="textlab-orbit textlab-orbit-code">{'</>'}</span>
          <span className="textlab-orbit textlab-orbit-share">↗</span>
          <div className="textlab-visual-browser">
            <div className="textlab-visual-browser-bar"><i /><i /><i /></div>
            <div className="textlab-visual-browser-body">
              <div className="textlab-visual-media"><span>◇</span></div>
              <div className="textlab-visual-lines"><i /><i /><i /></div>
              <div className="textlab-visual-option"><span>○</span><i /></div>
              <div className="textlab-visual-option is-correct"><span>✓</span><i /></div>
            </div>
          </div>
          <span className="textlab-spark textlab-spark-one">✦</span>
          <span className="textlab-spark textlab-spark-two">✦</span>
        </div>
      </section>

      <div className="textlab-direct-workspace" ref={shellRef}>
        <iframe
          ref={frameRef}
          className="textlab-integrated-frame textlab-direct-frame"
          title="Brian TextLab Activities"
          src={appUrl}
          style={{ height: `${frameHeight}px` }}
          scrolling="no"
          allow="fullscreen; clipboard-read; clipboard-write"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups"
          onLoad={syncFramePreferences}
        />
      </div>
    </div>
  );
}
