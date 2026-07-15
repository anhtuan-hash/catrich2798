import React, { useEffect, useRef, useState } from 'react';
import { mountEnglishLessonIntegrationStudio } from '../vendor/englishLessonIntegration/elis.es.js';
import { APP_VERSION } from '../config/version.js';
import { getSupabasePublicConfig, isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { callAIWithMeta } from '../utils/gemini.js';
import { getActiveAiConfig, getProviderInfo } from '../utils/aiProviders.js';

function clipLessonAi(value, max = 56000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
  return text.length > max ? `${text.slice(0, max)}\n[Đã rút gọn để bảo vệ giới hạn AI.]` : text;
}

function buildNativeLessonPrompt(payload = {}) {
  const task = String(payload.task || 'lesson-assistant');
  const common = `Bạn là Brian AI Copilot, chuyên gia thiết kế giáo án Tiếng Anh THPT Việt Nam (lớp 10–12, CTGDPT 2018).\n- Trả lời bằng tiếng Việt rõ ràng; giữ mục tiêu, ví dụ, nhiệm vụ học sinh và ngôn ngữ lớp học bằng tiếng Anh khi phù hợp.\n- Bảo toàn kiến thức cốt lõi của giáo án.\n- Mọi tích hợp số/AI phải có sản phẩm quan sát được, minh chứng đánh giá, bước kiểm chứng, quy tắc an toàn dữ liệu và phương án không dùng mạng/AI.\n- Không bịa thông tin chương trình; không đưa dữ liệu cá nhân học sinh vào kết quả.\n- Xuất nội dung hoàn chỉnh có thể dùng ngay, không mô tả chung chung.`;
  if (task === 'health') return `${common}\n\nChỉ trả lời: AI Gateway của Brian đã sẵn sàng.`;
  if (task === 'rewrite') return `${common}\n\nNHIỆM VỤ: Viết lại đề xuất tích hợp đang chọn. Trả về toàn bộ nội dung thay thế, bắt đầu bằng phần gốc rồi bổ sung phần cải tiến.\n\nYêu cầu giáo viên:\n${clipLessonAi(payload.instruction, 4000)}\n\nThông tin bài học:\n${clipLessonAi(payload.lesson, 10000)}\n\nMục giáo án:\n${clipLessonAi(payload.section, 18000)}\n\nĐề xuất hiện tại:\n${clipLessonAi(payload.proposal, 18000)}\n\nRàng buộc:\n${clipLessonAi(payload.constraints, 8000)}`;
  if (task === 'generate-resource') return `${common}\n\nNHIỆM VỤ: Tạo học liệu ${String(payload.resourceType || 'worksheet')} bám trực tiếp giáo án. Có đáp án/rubric khi phù hợp, không trùng câu hỏi.\n\nTùy chọn:\n${clipLessonAi(payload.options, 8000)}\n\nThông tin bài học:\n${clipLessonAi(payload.lesson, 10000)}\n\nGiáo án tích hợp:\n${clipLessonAi(payload.sections, 52000)}\n\nCác tích hợp đã duyệt:\n${clipLessonAi(payload.acceptedIntegrations, 22000)}\n\nBản nháp hiện tại:\n${clipLessonAi(payload.currentDraft, 28000)}`;
  return `${common}\n\nNHIỆM VỤ: AI Copilot cho giáo án. Loại tác vụ: ${String(payload.action || 'analyze')}.\nƯu tiên đề xuất đang chọn nếu có. Trình bày bằng các đề mục rõ ràng và đưa ra nội dung có thể áp dụng ngay trong lớp.\n\nYêu cầu giáo viên:\n${clipLessonAi(payload.instruction, 6000)}\n\nThông tin bài học:\n${clipLessonAi(payload.lesson, 10000)}\n\nToàn bộ giáo án:\n${clipLessonAi(payload.sections, 56000)}\n\nCác đề xuất hiện tại:\n${clipLessonAi(payload.proposals, 34000)}\n\nĐề xuất đang chọn:\n${clipLessonAi(payload.selectedProposal, 14000)}\n\nKết quả kiểm định:\n${clipLessonAi(payload.audit, 12000)}\n\nRàng buộc:\n${clipLessonAi(payload.constraints, 8000)}`;
}


function normalizeRole(role) {
  const value = String(role || '').toLowerCase();
  if (value === 'admin' || value === 'administrator') return 'admin';
  if (['ttcm', 'department_head', 'department-head', 'leader', 'head'].includes(value)) return 'ttcm';
  return 'teacher';
}

function integrationUrls() {
  const root = window.location.origin;
  return {
    lesson: `${root}/#/tool/lesson-plan-ai`,
    worksheet: `${root}/#/tool/worksheet-factory`,
    exam: `${root}/#/tool/exam-studio`,
    activity: `${root}/#/tool/textlab-activities`,
    speaking: `${root}/#/tool/speaking-studio`,
    reading: `${root}/#/tool/reading-studio`,
    wordgraph: `${root}/#/tool/word2graph`,
  };
}

export default function EnglishLessonIntegrationStudio({
  currentUser,
  language = 'vi',
  theme = 'light',
  aiProvider = 'gemini',
  apiKey = '',
  aiModel = '',
}) {
  const hostRef = useRef(null);
  const unmountRef = useRef(null);
  const [state, setState] = useState({ status: 'loading', message: '' });
  const [aiSettingsRevision, setAiSettingsRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setAiSettingsRevision((value) => value + 1);
    window.addEventListener('bes-ai-settings-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bes-ai-settings-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const boot = async () => {
      setState({ status: 'loading', message: '' });
      try {
        const sessionResult = await (
          supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } })
        );
        if (!active || !hostRef.current) return;
        const session = sessionResult?.data?.session || null;
        const publicConfig = getSupabasePublicConfig();
        const activeAI = getActiveAiConfig();
        const providerInfo = getProviderInfo(activeAI.provider || aiProvider);
        const nativeAiConfigured = Boolean(String(activeAI.apiKey || apiKey || '').trim());
        const resolvedProvider = ['openai', 'gemini'].includes(activeAI.provider) ? activeAI.provider : 'openai';
        const userId = currentUser?.id || currentUser?.authId || session?.user?.id || currentUser?.email;
        if (!userId) throw new Error(language === 'vi' ? 'Phiên đăng nhập Brian chưa sẵn sàng.' : 'The Brian sign-in session is not ready.');

        const hostContext = {
          embedded: true,
          managedAuth: true,
          managedSettings: true,
          appVersion: APP_VERSION,
          language,
          theme: theme === 'dark' ? 'dark' : 'light',
          user: {
            id: userId,
            email: currentUser?.email || session?.user?.email || '',
            displayName: currentUser?.name || currentUser?.full_name || session?.user?.user_metadata?.full_name || currentUser?.email || 'Teacher',
            role: normalizeRole(currentUser?.role),
          },
          auth: session?.access_token ? {
            accessToken: session.access_token,
            refreshToken: session.refresh_token || '',
            expiresAt: Number(session.expires_at || 0) * 1000 || Date.now() + 55 * 60 * 1000,
            getSession: supabase ? async () => {
              const { data } = await supabase.auth.getSession();
              const fresh = data?.session;
              return fresh?.access_token ? {
                accessToken: fresh.access_token,
                refreshToken: fresh.refresh_token || '',
                expiresAt: Number(fresh.expires_at || 0) * 1000 || Date.now() + 55 * 60 * 1000,
              } : null;
            } : undefined,
          } : undefined,
          supabase: isSupabaseConfigured && session?.access_token ? {
            url: publicConfig.url,
            anonKey: publicConfig.anonKey,
            autoSync: true,
          } : undefined,
          ai: {
            provider: activeAI.provider || resolvedProvider,
            providerLabel: providerInfo.label || activeAI.provider || resolvedProvider,
            model: activeAI.model || aiModel || providerInfo.defaultModel,
            configured: nativeAiConfigured,
            endpoint: '/api/ai',
            request: nativeAiConfigured ? async (payload) => {
              if (String(payload?.task || '') === 'health') return {
                configured: true,
                provider: activeAI.provider,
                model: activeAI.model || providerInfo.defaultModel,
                authMode: 'brian-native',
              };
              const response = await callAIWithMeta({
                provider: activeAI.provider,
                apiKey: activeAI.apiKey || apiKey,
                model: activeAI.model || aiModel || providerInfo.defaultModel,
                baseUrl: activeAI.baseUrl || providerInfo.baseUrl,
                prompt: buildNativeLessonPrompt(payload),
                systemInstruction: 'You are Brian AI Copilot for Vietnamese upper-secondary English lesson planning. Return classroom-ready content only.',
                temperature: 0.28,
                maxOutputTokens: String(payload?.task || '') === 'generate-resource' ? 7000 : 5200,
                governanceProfile: 'teaching-content',
                loadingLabel: language === 'vi' ? 'AI Copilot đang phân tích giáo án…' : 'AI Copilot is analyzing the lesson…',
              });
              return {
                text: response.text,
                provider: response.meta.provider,
                model: response.meta.model,
                transport: 'browser-unified',
                requestId: response.meta.operationId,
                durationMs: response.meta.durationMs,
              };
            } : undefined,
          },
          integrationUrls: integrationUrls(),
          onEvent: (event) => window.dispatchEvent(new CustomEvent('bes-lesson-integration-event', { detail: event })),
        };

        unmountRef.current = mountEnglishLessonIntegrationStudio(hostRef.current, {
          useShadowDom: true,
          hostContext,
        });
        if (active) setState({ status: 'ready', message: '' });
      } catch (error) {
        console.error('[Brian V11.4.6] ELIS mount failed', error);
        if (active) setState({
          status: 'error',
          message: error instanceof Error ? error.message : (language === 'vi' ? 'Không thể tải ứng dụng.' : 'Unable to load the app.'),
        });
      }
    };
    boot();
    return () => {
      active = false;
      try { unmountRef.current?.(); } catch { /* safe cleanup */ }
      unmountRef.current = null;
      if (hostRef.current) hostRef.current.replaceChildren();
    };
  }, [currentUser?.id, currentUser?.email, language, theme, aiProvider, apiKey, aiModel, aiSettingsRevision]);

  return (
    <div className="page english-lesson-integration-page" data-brian-module="english-lesson-integration" data-version={APP_VERSION}>
      <section className="elis-host-shell panel">
        {state.status !== 'ready' ? (
          <div className={`elis-host-state ${state.status === 'error' ? 'error' : ''}`} role={state.status === 'error' ? 'alert' : 'status'}>
            {state.status === 'loading' ? <span className="elis-host-spinner" aria-hidden="true" /> : null}
            <div>
              <strong>{state.status === 'error' ? (language === 'vi' ? 'Không thể mở ứng dụng' : 'Unable to open the app') : 'AI Lesson Integration Studio'}</strong>
              <small>{state.status === 'error' ? state.message : (language === 'vi' ? 'Đang tải bộ xử lý giáo án chuyên biệt…' : 'Loading the specialist lesson-plan engine…')}</small>
            </div>
            {state.status === 'error' ? <button type="button" className="primary" onClick={() => window.location.reload()}>{language === 'vi' ? 'Tải lại' : 'Reload'}</button> : null}
          </div>
        ) : null}
        <div ref={hostRef} className="elis-native-host" aria-hidden={state.status !== 'ready'} />
      </section>
    </div>
  );
}
