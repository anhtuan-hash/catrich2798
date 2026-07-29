import fs from 'node:fs';

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing font-library target: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Unable to patch font library: ${label}`);
  return source.replace(from, to);
}

{
  const path = 'src/main.jsx';
  const before = read(path);
  let after = before;
  after = replaceOnce(
    after,
    "import { installStoredPersonalFont, waitForPersonalFontLoad } from './utils/personalFont.js';\n",
    "import { installStoredPersonalFont, waitForPersonalFontLoad } from './utils/personalFont.js';\nimport { installFontLibrary } from './utils/fontLibrary.js';\n",
    'main import',
  );
  after = replaceOnce(
    after,
    "installStoredPersonalFont();\nwaitForPersonalFontLoad();\n",
    "installStoredPersonalFont();\ninstallFontLibrary();\nwaitForPersonalFontLoad();\n",
    'main install call',
  );
  if (after !== before) fs.writeFileSync(path, after);
}

{
  const path = 'src/pages/Settings.jsx';
  const before = read(path);
  let after = before;
  after = replaceOnce(
    after,
    "import { changeCurrentPassword } from '../utils/auth.js';\n",
    "import { changeCurrentPassword } from '../utils/auth.js';\nimport { FONT_LIBRARY_OPTIONS, getSelectedFontId, setSelectedFontId } from '../utils/fontLibrary.js';\n",
    'settings import',
  );
  after = replaceOnce(
    after,
    "  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('bes-accent-color') || 'blue');\n",
    "  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('bes-accent-color') || 'blue');\n  const [fontFamily, setFontFamily] = useState(getSelectedFontId);\n",
    'settings state',
  );
  after = replaceOnce(
    after,
    "  const setDensity = (value) => {\n    setDisplayDensity(value);\n    localStorage.setItem('bes-display-density', value);\n    document.documentElement.dataset.density = value;\n  };\n",
    "  const setDensity = (value) => {\n    setDisplayDensity(value);\n    localStorage.setItem('bes-display-density', value);\n    document.documentElement.dataset.density = value;\n  };\n  const setInterfaceFont = (value) => {\n    const selected = setSelectedFontId(value);\n    setFontFamily(selected);\n  };\n",
    'settings font setter',
  );
  after = replaceOnce(
    after,
    "    interface: { language, theme, accentColor, displayDensity, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale },\n",
    "    interface: { language, theme, accentColor, displayDensity, motionMode, performanceMode, themeIntensity, tileBorder, indicatorMode, fontScale, fontFamily },\n",
    'settings export',
  );
  after = replaceOnce(
    after,
    "      if (ui.fontScale) setFontScale?.(Number(ui.fontScale));\n",
    "      if (ui.fontScale) setFontScale?.(Number(ui.fontScale));\n      if (ui.fontFamily) setInterfaceFont(ui.fontFamily);\n",
    'settings import',
  );
  after = replaceOnce(
    after,
    "    setFontScale?.(100);\n",
    "    setFontScale?.(100);\n    setInterfaceFont('brian');\n",
    'settings reset',
  );
  after = replaceOnce(
    after,
    "                  <label><span>{vi ? 'Kích thước chữ' : 'Text size'}</span><SelectControl value={fontScale} onChange={(event) => setFontScale?.(Number(event.target.value))}><option value=\"100\">100%</option><option value=\"110\">110%</option><option value=\"120\">120%</option><option value=\"130\">130%</option></SelectControl></label>\n",
    "                  <label><span>{vi ? 'Kích thước chữ' : 'Text size'}</span><SelectControl value={fontScale} onChange={(event) => setFontScale?.(Number(event.target.value))}><option value=\"100\">100%</option><option value=\"110\">110%</option><option value=\"120\">120%</option><option value=\"130\">130%</option></SelectControl></label>\n                  <label><span>{vi ? 'Phông chữ hệ thống' : 'System font'}</span><SelectControl value={fontFamily} onChange={(event) => setInterfaceFont(event.target.value)} ariaLabel={vi ? 'Phông chữ hệ thống' : 'System font'}>{FONT_LIBRARY_OPTIONS.map((font) => <option key={font.id} value={font.id}>{vi ? font.labelVi : font.label}</option>)}</SelectControl></label>\n",
    'settings font selector',
  );
  if (after !== before) fs.writeFileSync(path, after);
}

console.log('Font library patch applied.');
