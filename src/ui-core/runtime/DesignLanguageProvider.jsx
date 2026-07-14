import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DESIGN_LANGUAGES,
  applyDesignLanguage,
  normalizeDesignLanguage,
  readStoredDesignLanguage,
  subscribeDesignLanguage,
  hydrateDesignLanguageFromAccount,
  saveAccountDesignLanguage,
} from './designLanguage.js';

const DesignLanguageContext = createContext({
  designLanguage: DESIGN_LANGUAGES.BRIAN,
  setDesignLanguage: () => {},
  uiCoreVersion: 'v12',
});

export function DesignLanguageProvider({ children }) {
  const [designLanguage, setDesignLanguageState] = useState(readStoredDesignLanguage);

  useEffect(() => {
    applyDesignLanguage(designLanguage, { broadcast: false });
  }, [designLanguage]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const remote = await hydrateDesignLanguageFromAccount();
      if (active && remote) setDesignLanguageState(remote);
    };
    hydrate();
    window.addEventListener('bes-auth-session-updated', hydrate);
    window.addEventListener('bes-runtime-core-updated', hydrate);
    return () => {
      active = false;
      window.removeEventListener('bes-auth-session-updated', hydrate);
      window.removeEventListener('bes-runtime-core-updated', hydrate);
    };
  }, []);

  useEffect(() => subscribeDesignLanguage((next) => {
    const normalized = normalizeDesignLanguage(next);
    setDesignLanguageState((current) => current === normalized ? current : normalized);
    applyDesignLanguage(normalized, { broadcast: false });
  }), []);

  const value = useMemo(() => ({
    designLanguage,
    uiCoreVersion: 'v12',
    setDesignLanguage(next) {
      const normalized = applyDesignLanguage(next);
      setDesignLanguageState(normalized);
      void saveAccountDesignLanguage(normalized);
    },
  }), [designLanguage]);

  return <DesignLanguageContext.Provider value={value}>{children}</DesignLanguageContext.Provider>;
}

export function useDesignLanguage() {
  return useContext(DesignLanguageContext);
}
