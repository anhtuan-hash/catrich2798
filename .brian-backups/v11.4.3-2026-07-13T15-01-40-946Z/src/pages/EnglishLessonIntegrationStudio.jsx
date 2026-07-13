import React, { useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../config/version.js';
import { getSupabasePublicConfig, isSupabaseConfigured, supabase } from '../utils/supabase.js';

const MODULE_URL = '/bes-elis-v1142/elis.es.js';

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
}) {
  const hostRef = useRef(null);
  const unmountRef = useRef(null);
  const [state, setState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let active = true;
    const boot = async () => {
      setState({ status: 'loading', message: '' });
      try {
        const [{ mountEnglishLessonIntegrationStudio }, sessionResult] = await Promise.all([
          import(/* @vite-ignore */ MODULE_URL),
          supabase ? supabase.auth.getSession() : Promise.resolve({ data: { session: null } }),
        ]);
        if (!active || !hostRef.current) return;
        const session = sessionResult?.data?.session || null;
        const publicConfig = getSupabasePublicConfig();
        const resolvedProvider = ['openai', 'gemini'].includes(aiProvider) ? aiProvider : 'demo';
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
          ai: { provider: resolvedProvider, endpoint: '/api/lesson-ai' },
          integrationUrls: integrationUrls(),
          onEvent: (event) => window.dispatchEvent(new CustomEvent('bes-lesson-integration-event', { detail: event })),
        };

        unmountRef.current = mountEnglishLessonIntegrationStudio(hostRef.current, {
          useShadowDom: true,
          hostContext,
        });
        if (active) setState({ status: 'ready', message: '' });
      } catch (error) {
        console.error('[Brian V11.4.2] ELIS mount failed', error);
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
  }, [currentUser?.id, currentUser?.email, language, theme, aiProvider]);

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
