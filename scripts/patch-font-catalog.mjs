import fs from 'node:fs';

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing font catalog target: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function writeIfChanged(path, before, after) {
  if (before !== after) fs.writeFileSync(path, after);
}

function addOnce(source, anchor, addition, label) {
  if (source.includes(addition.trim())) return source;
  if (!source.includes(anchor)) throw new Error(`Unable to patch font catalog: ${label}`);
  return source.replace(anchor, `${anchor}${addition}`);
}

{
  const path = 'src/main.jsx';
  const before = read(path);
  let after = before;
  after = addOnce(
    after,
    "import { installStoredPersonalFont, waitForPersonalFontLoad } from './utils/personalFont.js';",
    "\nimport { installStoredSystemFont } from './utils/fontCatalog.js';",
    'main import',
  );
  after = addOnce(
    after,
    'installStoredPersonalFont();',
    '\ninstallStoredSystemFont();',
    'main install call',
  );
  writeIfChanged(path, before, after);
}

{
  const path = 'src/pages/Settings.jsx';
  const before = read(path);
  let after = before;

  after = addOnce(
    after,
    "import { changeCurrentPassword } from '../utils/auth.js';",
    "\nimport { FONT_OPTIONS, applySystemFont, getStoredSystemFont } from '../utils/fontCatalog.js';",
    'settings import',
  );

  after = addOnce(
    after,
    "  const [displayDensity, setDisplayDensity] = useState(() => localStorage.getItem('bes-display-density') || 'medium');",
    "\n  const [systemFont, setSystemFont] = useState(() => getStoredSystemFont());",
    'settings state',
  );

  after = addOnce(
    after,
    "  const setDensity = (value) => {\n    setDisplayDensity(value);\n    localStorage.setItem('bes-display-density', value);\n    document.documentElement.dataset.density = value;\n  };",
    "\n  const setSystemFontChoice = (value) => {\n    const applied = applySystemFont(value);\n    setSystemFont(applied);\n  };",
    'settings font handler',
  );

  after = after.replace(
    'interface: { language, theme, accentColor, displayDensity, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale },',
    'interface: { language, theme, accentColor, displayDensity, fontFamily: systemFont, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale },',
  );

  after = addOnce(
    after,
    '      if (ui.displayDensity) setDensity(ui.displayDensity);',
    '\n      if (ui.fontFamily) setSystemFontChoice(ui.fontFamily);',
    'settings import preference',
  );

  after = addOnce(
    after,
    "    setDensity('medium');",
    "\n    setSystemFontChoice('brian');",
    'settings reset preference',
  );

  const fontRow = `\n                <SettingRow\n                  title={vi ? 'Phông chữ hệ thống' : 'System font'}\n                  description={vi ? 'Áp dụng cho toàn bộ English Hub và được ghi nhớ trên thiết bị.' : 'Applied across English Hub and remembered on this device.'}\n                >\n                  <SelectControl\n                    value={systemFont}\n                    onChange={(event) => setSystemFontChoice(event.target.value)}\n                    ariaLabel={vi ? 'Chọn phông chữ hệ thống' : 'Choose system font'}\n                  >\n                    {FONT_OPTIONS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}\n                  </SelectControl>\n                </SettingRow>`;

  after = addOnce(
    after,
    "                <SettingRow title={vi ? 'Màu nhấn' : 'Accent color'}><div className=\"settings-m3-color-row\">{accents.map(([name,color]) => <button type=\"button\" key={name} className={accentColor === name ? 'is-active' : ''} style={{ '--swatch': color }} onClick={() => setAccent(name)} aria-label={name} />)}</div></SettingRow>",
    fontRow,
    'settings font selector',
  );

  writeIfChanged(path, before, after);
}

console.log('System font catalog patch applied.');
