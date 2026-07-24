import fs from 'node:fs';

const MAIN_FILE = 'src/main.jsx';
const NAV_FILE = 'src/components/GlobalCompactNavigation.jsx';

function requireFile(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing theme integration target: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Unable to patch global theme system: ${label}`);
  return source.replace(from, to);
}

let main = requireFile(MAIN_FILE);

main = replaceOnce(
  main,
  "import { installAiRemovalGuard } from './utils/aiRemovalGuard.js';\n",
  "import { installAiRemovalGuard } from './utils/aiRemovalGuard.js';\nimport { applyThemeMode, getStoredThemeMode, installThemeSystem, resolveThemeMode } from './utils/themeSystem.js';\n",
  'main theme utility import',
);

main = replaceOnce(
  main,
  "  const [theme, setTheme] = useState(() => localStorage.getItem('bet-theme') || 'light');\n",
  "  const [themeMode, setThemeMode] = useState(getStoredThemeMode);\n  const [theme, setTheme] = useState(() => resolveThemeMode(getStoredThemeMode()));\n",
  'main theme state',
);

main = replaceOnce(
  main,
`  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bet-theme', theme);
  }, [theme]);
`,
`  useEffect(() => {
    const updateResolvedTheme = ({ mode, resolved }) => {
      if (mode && mode !== themeMode) setThemeMode(mode);
      setTheme((current) => current === resolved ? current : resolved);
    };

    updateResolvedTheme(applyThemeMode(themeMode, { source: 'react' }));
    return installThemeSystem(updateResolvedTheme);
  }, [themeMode]);
`,
  'main theme effect',
);

main = replaceOnce(
  main,
`    theme,
    setTheme,
    apiKey,
`,
`    theme,
    themeMode,
    setTheme: setThemeMode,
    setThemeMode,
    apiKey,
`,
  'main theme context',
);

fs.writeFileSync(MAIN_FILE, main);

let nav = requireFile(NAV_FILE);

nav = replaceOnce(
  nav,
`export default function GlobalCompactNavigation({
  route = 'home', language = 'vi', setLanguage, theme = 'light', setTheme,
  currentUser, onLogout, fontScale = 100, setFontScale,
}) {
`,
`export default function GlobalCompactNavigation({
  route = 'home', language = 'vi', setLanguage, theme = 'light', themeMode = 'system', setThemeMode, setTheme,
  currentUser, onLogout, fontScale = 100, setFontScale,
}) {
`,
  'navigation theme props',
);

nav = replaceOnce(
  nav,
  "  const [accountOpen, setAccountOpen] = useState(false);\n",
  "  const [accountOpen, setAccountOpen] = useState(false);\n  const [themeOpen, setThemeOpen] = useState(false);\n",
  'navigation theme menu state',
);

nav = replaceOnce(
  nav,
`        setAccountOpen(false);
        setNotificationOpen(false);
        setItemMenuId('');
`,
`        setAccountOpen(false);
        setNotificationOpen(false);
        setThemeOpen(false);
        setItemMenuId('');
`,
  'outside close behavior',
);

nav = replaceOnce(
  nav,
`          setAccountOpen(false);
          setNotificationOpen(false);
`,
`          setAccountOpen(false);
          setNotificationOpen(false);
          setThemeOpen(false);
`,
  'escape close behavior',
);

nav = replaceOnce(
  nav,
`    setAccountOpen(false);
    setNotificationOpen(false);
    setItemMenuId('');
`,
`    setAccountOpen(false);
    setNotificationOpen(false);
    setThemeOpen(false);
    setItemMenuId('');
`,
  'route close behavior',
);

const oldButton = `          <button type="button" className="brian-nav__icon" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')} aria-label={t.theme} title={t.theme}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
`;

const newMenu = `          <div className="brian-nav__theme-wrap">
            <button
              type="button"
              className={\`brian-nav__icon brian-nav__theme-button \${themeOpen ? 'is-open' : ''}\`}
              onClick={() => {
                setThemeOpen((value) => !value);
                setAccountOpen(false);
                setNotificationOpen(false);
                setSettingsOpen(false);
                setItemMenuId('');
              }}
              aria-label={language === 'vi' ? 'Chọn chế độ giao diện' : 'Choose appearance mode'}
              title={language === 'vi' ? 'Chế độ giao diện' : 'Appearance mode'}
              aria-expanded={themeOpen}
              aria-haspopup="menu"
            >
              <span aria-hidden="true">{themeMode === 'system' ? '◐' : theme === 'dark' ? '☾' : '☀'}</span>
            </button>

            {themeOpen ? (
              <section className="brian-theme-menu" role="menu" aria-label={language === 'vi' ? 'Chế độ giao diện' : 'Appearance mode'}>
                <header className="brian-theme-menu__header">
                  <strong>{language === 'vi' ? 'Chế độ giao diện' : 'Appearance mode'}</strong>
                  <small>{language === 'vi' ? 'Áp dụng đồng bộ cho toàn bộ English Hub.' : 'Apply consistently across English Hub.'}</small>
                </header>
                <div className="brian-theme-menu__options">
                  {[
                    ['system', '◐', language === 'vi' ? 'Theo hệ thống' : 'System', language === 'vi' ? 'Tự đổi theo thiết bị' : 'Follow your device'],
                    ['light', '☀', language === 'vi' ? 'Sáng' : 'Light', language === 'vi' ? 'Nền sáng, độ tương phản rõ' : 'Bright surfaces and clear contrast'],
                    ['dark', '☾', language === 'vi' ? 'Tối' : 'Dark', language === 'vi' ? 'Giảm chói trong môi trường tối' : 'Reduce glare in dark rooms'],
                  ].map(([mode, icon, label, description]) => (
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={themeMode === mode}
                      className={\`brian-theme-menu__option \${themeMode === mode ? 'is-selected' : ''}\`}
                      key={mode}
                      onClick={() => {
                        (setThemeMode || setTheme)?.(mode);
                        setThemeOpen(false);
                      }}
                    >
                      <i aria-hidden="true">{icon}</i>
                      <span><b>{label}</b><small>{description}</small></span>
                      <em aria-hidden="true">✓</em>
                    </button>
                  ))}
                </div>
                <footer className="brian-theme-menu__footer">
                  {themeMode === 'system'
                    ? (language === 'vi' ? \`Thiết bị hiện đang dùng chế độ \${theme === 'dark' ? 'tối' : 'sáng'}.\` : \`Your device is currently using \${theme}.\`)
                    : (language === 'vi' ? 'Lựa chọn được ghi nhớ và đồng bộ giữa các tab.' : 'Your choice is remembered and synced across tabs.')}
                </footer>
              </section>
            ) : null}
          </div>
`;

nav = replaceOnce(nav, oldButton, newMenu, 'navigation theme menu');

nav = replaceOnce(
  nav,
`                  setNotificationOpen((value) => !value);
                  setAccountOpen(false);
                  setSettingsOpen(false);
`,
`                  setNotificationOpen((value) => !value);
                  setAccountOpen(false);
                  setThemeOpen(false);
                  setSettingsOpen(false);
`,
  'notification closes theme menu',
);

nav = replaceOnce(
  nav,
`                onClick={() => { setAccountOpen((value) => !value); setNotificationOpen(false); }}
`,
`                onClick={() => { setAccountOpen((value) => !value); setNotificationOpen(false); setThemeOpen(false); }}
`,
  'account closes theme menu',
);

fs.writeFileSync(NAV_FILE, nav);
console.log('Global theme V3 patch applied.');
