import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addBankItems, addHistoryEntry } from '../utils/library.js';

export default function TextLabActivities({ language = 'vi', fontScale = 100 }) {
  const frameRef = useRef(null);
  const shellRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [frameHeight, setFrameHeight] = useState(1280);

  const appUrl = useMemo(
    () => `${import.meta.env.BASE_URL || '/'}embedded/brian-textlab-activities/index.html?embedded=1`,
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
  }, [fontScale, frameKey]);

  useEffect(() => {
    const handleMessage = (event) => {
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

      if (event.data?.type === 'BTL_ADD_BANK') {
        addBankItems(event.data?.payload?.items || []);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const goFullscreen = async () => {
    const target = shellRef.current;
    if (!target) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await target.requestFullscreen();
    } catch {
      window.open(appUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="page textlab-integrated-page textlab-frameless-page">
      <div className="textlab-page-commandbar">
        <button className="back-btn" type="button" onClick={() => (window.location.hash = '#/apps')}>
          ← {language === 'vi' ? 'Quay lại Ứng dụng' : 'Back to Apps'}
        </button>

        <div className="textlab-page-status">
          <span className="textlab-status-title">Brian TextLab Activities</span>
          <span className="ready">
            {language === 'vi' ? 'HTML tương tác ngoại tuyến' : 'Offline interactive HTML'}
          </span>
        </div>

        <div className="textlab-integrated-actions">
          <button type="button" onClick={() => setFrameKey((value) => value + 1)}>
            ↻ {language === 'vi' ? 'Tải lại' : 'Reload'}
          </button>
          <button type="button" onClick={goFullscreen}>
            ⛶ {language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}
          </button>
          <button type="button" onClick={() => window.open(appUrl, '_blank', 'noopener,noreferrer')}>
            ↗ {language === 'vi' ? 'Mở riêng' : 'Open separately'}
          </button>
        </div>
      </div>

      <div className="textlab-direct-workspace" ref={shellRef}>
        <iframe
          key={frameKey}
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
