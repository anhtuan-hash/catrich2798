import React, { useEffect, useMemo, useRef, useState } from 'react';
import { extractJson } from '../utils/openRouter.js';
import { runAITask } from '../utils/aiTaskRuntime.js';
import { addBankItems, addHistoryEntry } from '../utils/library.js';

function cleanAIContent(value = '') {
  return String(value)
    .replace(/^```(?:text|txt|json|markdown)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function buildTextLabAIPrompt({ request, level, itemCount, autoDetect, selectedTemplateId, templates, language }) {
  const templateList = (templates || []).map((item) => (
    `- ${item.id}: ${item.name} | ${item.desc} | REQUIRED FORMAT: ${item.hint}`
  )).join('\n');

  return `You are the AI engine inside Brian TextLab Activities, an English-teaching activity builder.

USER REQUEST:
${request}

LEVEL: ${level || 'B2'}
TARGET ITEM COUNT: ${itemCount || 10}
INTERFACE LANGUAGE: ${language === 'vi' ? 'Vietnamese' : 'English'}
MODE: ${autoDetect ? 'Automatically select the most suitable template.' : `Use the selected template only: ${selectedTemplateId}.`}

AVAILABLE TEMPLATES:
${templateList}

TASK:
1. Understand the teaching objective, content type, learner level, and requested interaction.
2. ${autoDetect ? 'Choose exactly one template ID from the list that best matches the request.' : `Use exactly this template ID: ${selectedTemplateId}.`}
3. Internally apply the required format of that template.
4. Generate classroom-ready content with approximately ${itemCount || 10} items, unless the request clearly specifies another quantity.
5. Keep English accurate and natural. Avoid duplicated questions, prompts, answers, vocabulary items, or sentence patterns.
6. The content must be directly parsable by TextLab. Do not include headings, markdown, numbering, commentary, or code fences inside the content field unless the template format itself requires them.
7. For MCQ, the correct answer must be the second field after the question, followed by distractors.
8. For blank/cloze templates, put every answer inside {curly brackets}.

Return STRICT JSON only:
{
  "templateId": "one exact template id",
  "reason": "one concise sentence explaining why this template fits",
  "promptUsed": "a concise reusable prompt pattern matching the selected template and its exact output format",
  "content": "the generated TextLab-ready lines with \\n between items"
}`;
}

export default function TextLabActivities({
  language = 'vi',
  apiKey = '',
  aiModel = '',
  hasApiKey = false,
  fontScale = 100,
}) {
  const frameRef = useRef(null);
  const shellRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
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

      if (event.data?.type === 'BTL_ADD_BANK') {
        addBankItems(event.data?.payload?.items || []);
        return;
      }

      if (event.data?.type !== 'BTL_AI_GENERATE') return;

      const payload = event.data?.payload || {};
      if (aiBusy) return;

      if (!hasApiKey) {
        frameRef.current?.contentWindow?.postMessage({
          type: 'BTL_AI_ERROR',
          message: language === 'vi'
            ? 'OpenRouter Gateway chưa sẵn sàng. Hãy kiểm tra OPENROUTER_API_KEY trên Vercel và thử lại.'
            : 'The OpenRouter Gateway is not ready. Check OPENROUTER_API_KEY on Vercel and try again.',
        }, '*');
        return;
      }

      setAiBusy(true);
      try {
        const prompt = buildTextLabAIPrompt({ ...payload, language });
        const raw = await runAITask('textlab.generateActivity', {
          apiKey,
          model: aiModel,
          prompt,
          systemInstruction: 'You are a precise instructional designer. Return valid JSON only. Respect the exact delimiter and line format requested by the selected TextLab template.',
          temperature: 0.55,
          responseMimeType: 'application/json',
          loadingLabel: language === 'vi'
            ? 'AI đang nhận diện template và tạo nội dung TextLab...'
            : 'AI is detecting the template and generating TextLab content...',
        });
        const result = extractJson(raw);
        const validIds = new Set((payload.templates || []).map((item) => item.id));
        const templateId = validIds.has(result.templateId)
          ? result.templateId
          : payload.selectedTemplateId;
        const content = cleanAIContent(result.content || '');
        if (!content) throw new Error(language === 'vi' ? 'AI không trả về nội dung hoạt động.' : 'AI did not return activity content.');

        frameRef.current?.contentWindow?.postMessage({
          type: 'BTL_AI_RESULT',
          payload: {
            templateId,
            reason: String(result.reason || '').trim(),
            promptUsed: String(result.promptUsed || '').trim(),
            content,
          },
        }, '*');
      } catch (error) {
        frameRef.current?.contentWindow?.postMessage({
          type: 'BTL_AI_ERROR',
          message: error?.message || (language === 'vi' ? 'Không thể tạo nội dung bằng AI.' : 'Could not generate AI content.'),
        }, '*');
      } finally {
        setAiBusy(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [aiBusy, apiKey, aiModel, hasApiKey, language]);

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
          <span className={hasApiKey ? 'ready' : 'pending'}>
            {hasApiKey ? (language === 'vi' ? 'AI sẵn sàng' : 'AI ready') : (language === 'vi' ? 'Chưa cấu hình AI' : 'AI not configured')}
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
