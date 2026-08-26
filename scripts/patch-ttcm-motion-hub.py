from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        if new in text:
            return
        raise RuntimeError(f'Missing marker {label} in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# 1) TTCM opens on action-required content.
replace_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "  const [filter, setFilter] = useState('all');",
    "  const [filter, setFilter] = useState('action');",
    'TTCM filter default',
)
replace_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "      setWorkspaceView(nextView);\n      setOpen(true);\n      setComposeOpen(false);",
    "      setWorkspaceView(nextView);\n      if (nextView === 'feed') setFilter('action');\n      setOpen(true);\n      setComposeOpen(false);",
    'TTCM external open reset',
)
replace_once(
    'src/components/GlobalTtcmNavigationTab.jsx',
    "        if (!open) { setWorkspaceView('feed'); loadFeed(); }",
    "        if (!open) { setWorkspaceView('feed'); setFilter('action'); loadFeed(); }",
    'TTCM nav open reset',
)

# 2) Make badge count unambiguously visible above all later/global typography rules.
css_path = Path('src/components/GlobalTtcmPersonnel.css')
css = css_path.read_text(encoding='utf-8')
badge_fix = r'''

/* TTCM unread badge — numeric count must always remain visible. */
html body .brian-nav__primary .brian-nav__ttcm-tab > .brian-nav__ttcm-badge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  min-width: 21px !important;
  width: auto !important;
  height: 21px !important;
  padding: 0 5px !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 10px !important;
  font-style: normal !important;
  font-weight: 800 !important;
  line-height: 17px !important;
  letter-spacing: 0 !important;
  text-indent: 0 !important;
  font-variant-numeric: tabular-nums !important;
  opacity: 1 !important;
  visibility: visible !important;
  overflow: visible !important;
  z-index: 20 !important;
}
'''
if 'TTCM unread badge — numeric count must always remain visible.' not in css:
    css_path.write_text(css + badge_fix, encoding='utf-8')

# 3) Turn the existing Admin motion panel into a unified transition + indicator hub.
replace_once(
    'src/utils/globalMotionSystem.js',
    "    labelVi: 'Tinh tế',\n    label: 'Subtle',\n    descriptionVi: 'Chuyển cảnh rất nhẹ, ít dịch chuyển, phù hợp giao diện làm việc chuyên nghiệp.',\n    description: 'Very light transitions with minimal movement for a professional workspace.',\n    speedVi: '90–220 ms',",
    "    labelVi: 'Google Material',\n    label: 'Google Material',\n    descriptionVi: 'Fade + dịch chuyển ngắn kiểu Material, indicator gạch chân gọn và nhẹ.',\n    description: 'Material-style fade and short movement with a clean underline indicator.',\n    speedVi: '110–240 ms · Underline',",
    'Google motion preset copy',
)
replace_once(
    'src/utils/globalMotionSystem.js',
    "    labelVi: 'Cân bằng',\n    label: 'Balanced',\n    descriptionVi: 'Mượt, rõ trạng thái nhưng không gây rối mắt. Đây là chế độ khuyến nghị cho toàn site.',\n    description: 'Smooth and clear without being distracting. Recommended for the whole site.',\n    speedVi: '120–320 ms',",
    "    labelVi: 'Windows 11',\n    label: 'Windows 11',\n    descriptionVi: 'Mở trang bằng scale + lift mềm kiểu Windows 11, indicator pill nổi khối và chuyển trạng thái rõ.',\n    description: 'Windows 11-style soft scale/lift page entrance with a raised pill indicator.',\n    speedVi: '130–360 ms · Sliding pill',",
    'Windows motion preset copy',
)
replace_once(
    'src/utils/globalMotionSystem.js',
    "    labelVi: 'Sinh động',\n    label: 'Expressive',\n    descriptionVi: 'Hiệu ứng rõ hơn cho modal, drawer, menu, nút, tab và chuyển trang; vẫn giới hạn ở transform/opacity an toàn.',\n    description: 'More visible motion for dialogs, drawers, menus, buttons, tabs and page changes while staying GPU-friendly.',\n    speedVi: '150–420 ms',",
    "    labelVi: 'Fluent Dynamic',\n    label: 'Fluent Dynamic',\n    descriptionVi: 'Chuyển cảnh rõ hơn, có chiều sâu và indicator glow nhẹ; vẫn chỉ dùng transform/opacity để giữ hiệu năng.',\n    description: 'More expressive depth with a soft glow indicator while staying transform/opacity only.',\n    speedVi: '160–460 ms · Glow',",
    'Fluent motion preset copy',
)

replace_once(
    'src/components/admin/GlobalMotionAdminPanel.jsx',
    "            <span className=\"eyebrow\">MOTION SYSTEM</span>\n            <h2 id=\"admin-global-motion-title\">{vi ? 'Hiệu ứng chuyển động toàn site' : 'Site-wide motion effects'}</h2>\n            <p>{vi\n              ? 'Một cấu hình duy nhất điều khiển chuyển trang, nút, card, tab, menu, modal, drawer, thông báo và các trạng thái tương tác trên toàn Brian.'\n              : 'One setting controls page transitions, buttons, cards, tabs, menus, dialogs, drawers, notifications and interaction states across Brian.'}</p>",
    "            <span className=\"eyebrow\">MOTION & NAVIGATION HUB</span>\n            <h2 id=\"admin-global-motion-title\">{vi ? 'Chuyển động & điều hướng' : 'Motion & navigation'}</h2>\n            <p>{vi\n              ? 'Admin chọn một trải nghiệm thống nhất cho hiệu ứng mở trang, tab, modal và indicator điều hướng. Cấu hình được áp dụng cho toàn Brian và đồng bộ tới tài khoản giáo viên.'\n              : 'Choose one unified experience for page entrances, tabs, dialogs and navigation indicators, synchronized across Brian accounts.'}</p>",
    'Motion hub header',
)
replace_once(
    'src/components/admin/GlobalMotionAdminPanel.jsx',
    "      <div className=\"admin-global-motion-presets\" role=\"radiogroup\" aria-label={vi ? 'Chọn mức chuyển động' : 'Choose motion level'}>",
    "      <div className=\"admin-motion-hub-labels\"><span>{vi ? 'HIỆU ỨNG MỞ TRANG' : 'PAGE TRANSITION'}</span><span>{vi ? 'INDICATOR ĐIỀU HƯỚNG' : 'NAVIGATION INDICATOR'}</span></div>\n      <div className=\"admin-global-motion-presets\" role=\"radiogroup\" aria-label={vi ? 'Chọn trải nghiệm chuyển động' : 'Choose motion experience'}>",
    'Motion hub labels',
)
replace_once(
    'src/components/admin/GlobalMotionAdminPanel.jsx',
    "          <span>{vi\n            ? 'Áp dụng thống nhất bằng CSS variables + data-motion trên thẻ HTML; không cần cấu hình từng ứng dụng.'\n            : 'Applied consistently through CSS variables + data-motion on the HTML root; no per-app configuration needed.'}</span>",
    "          <span>{vi\n            ? 'Preset này điều khiển đồng thời chuyển trang và indicator, nên toàn hệ thống luôn đồng nhất thay vì mỗi trang một kiểu.'\n            : 'This preset controls page transitions and indicators together so the whole system stays visually consistent.'}</span>",
    'Motion summary',
)

# 4) Put the unified motion hub into Settings for Admin and retire the old standalone Windows indicator row.
replace_once(
    'src/pages/Settings.jsx',
    "import { changeCurrentPassword } from '../utils/auth.js';\nimport '../styles/SettingsGoogleM3.css';",
    "import { changeCurrentPassword } from '../utils/auth.js';\nimport GlobalMotionAdminPanel from '../components/admin/GlobalMotionAdminPanel.jsx';\nimport '../styles/SettingsGoogleM3.css';",
    'Settings motion import',
)
replace_once(
    'src/pages/Settings.jsx',
    "            {matches('hệ thống', 'system', 'hiệu năng', 'performance', 'cache', 'ngôn ngữ') ? (\n              <article id=\"settings-system\" className=\"settings-google-card tone-orange\">",
    "            {['admin', 'administrator'].includes(String(currentUser?.role || '').toLowerCase()) && matches('chuyển động', 'motion', 'hiệu ứng', 'indicator', 'điều hướng', 'hệ thống', 'system') ? (\n              <div className=\"settings-motion-admin-hub\"><GlobalMotionAdminPanel currentUser={currentUser} language={language} /></div>\n            ) : null}\n\n            {matches('hệ thống', 'system', 'hiệu năng', 'performance', 'cache', 'ngôn ngữ') ? (\n              <article id=\"settings-system\" className=\"settings-google-card tone-orange\">",
    'Settings motion hub render',
)
replace_once(
    'src/pages/Settings.jsx',
    "                <div className=\"settings-m3-reset-row\"><label><span>Windows indicator</span><SelectControl value={indicatorMode} onChange={(event) => setIndicatorMode?.(event.target.value)}><option value=\"on\">On</option><option value=\"off\">Off</option></SelectControl></label><button type=\"button\" onClick={resetSettings}>{vi ? 'Đặt lại mặc định' : 'Reset defaults'}</button></div>",
    "                <div className=\"settings-m3-reset-row\"><span>{vi ? 'Chuyển động và indicator được quản lý tại Hub phía trên.' : 'Motion and indicators are managed in the hub above.'}</span><button type=\"button\" onClick={resetSettings}>{vi ? 'Đặt lại mặc định' : 'Reset defaults'}</button></div>",
    'Retire old indicator selector',
)

# 5) Add distinct professional page transitions + nav indicators per synchronized preset.
motion_css_path = Path('src/styles/GlobalMotionSystem.css')
motion_css = motion_css_path.read_text(encoding='utf-8')
addition = r'''

/* ========================================================================== 
   Motion & Navigation experience profiles
   The synchronized motion preset now owns BOTH page entrance and active-nav
   indicator styling, so users never receive mismatched effects.
   ========================================================================== */

/* Google Material: calm vertical fade + underline indicator. */
html[data-motion-mode="subtle"][data-motion-enabled="true"] body #bes-main-content:not(#gm-profile-a#gm-profile-b#gm-profile-c),
html[data-motion-mode="subtle"][data-motion-enabled="true"] body [data-bes-main-content]:not(#gm-profile-a#gm-profile-b#gm-profile-c)[data-global-page-enter="true"] {
  animation-name: gm-page-material !important;
}
@keyframes gm-page-material {
  from { opacity: .01; translate: 0 7px; scale: .998; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

/* Windows 11: soft scale/lift with a confident ease-out. */
html[data-motion-mode="balanced"][data-motion-enabled="true"] body #bes-main-content:not(#gm-profile-a#gm-profile-b#gm-profile-c),
html[data-motion-mode="balanced"][data-motion-enabled="true"] body [data-bes-main-content]:not(#gm-profile-a#gm-profile-b#gm-profile-c)[data-global-page-enter="true"] {
  animation-name: gm-page-windows11 !important;
  animation-duration: 300ms !important;
  animation-timing-function: cubic-bezier(.16, 1, .3, 1) !important;
}
@keyframes gm-page-windows11 {
  from { opacity: .01; translate: 0 11px; scale: .982; }
  58% { opacity: 1; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

/* Fluent Dynamic: slightly stronger depth, still compositor-only. */
html[data-motion-mode="expressive"][data-motion-enabled="true"] body #bes-main-content:not(#gm-profile-a#gm-profile-b#gm-profile-c),
html[data-motion-mode="expressive"][data-motion-enabled="true"] body [data-bes-main-content]:not(#gm-profile-a#gm-profile-b#gm-profile-c)[data-global-page-enter="true"] {
  animation-name: gm-page-fluent !important;
}
@keyframes gm-page-fluent {
  from { opacity: .01; translate: 12px 10px; scale: .97; }
  to { opacity: 1; translate: 0 0; scale: 1; }
}

/* Shared active-route detection covers the current Brian nav implementations. */
html[data-motion-enabled="true"] body .brian-nav__primary :is(
  button.active, button.is-active, button[aria-current="page"],
  a.active, a.is-active, a[aria-current="page"]
) {
  position: relative !important;
  isolation: isolate !important;
}

/* Material underline. */
html[data-motion-mode="subtle"][data-motion-enabled="true"] body .brian-nav__primary :is(
  button.active, button.is-active, button[aria-current="page"],
  a.active, a.is-active, a[aria-current="page"]
)::after {
  content: "" !important;
  position: absolute !important;
  z-index: 4 !important;
  left: 24% !important;
  right: 24% !important;
  bottom: 3px !important;
  height: 3px !important;
  border-radius: 999px !important;
  background: #0b57d0 !important;
  opacity: 1 !important;
  scale: 1 1 !important;
  transform-origin: center !important;
  animation: gm-indicator-material 220ms cubic-bezier(.2,0,0,1) both !important;
}
@keyframes gm-indicator-material { from { opacity: .01; scale: .3 1; } to { opacity: 1; scale: 1 1; } }

/* Windows 11 active pill: restrained elevation + an animated inner accent. */
html[data-motion-mode="balanced"][data-motion-enabled="true"] body .brian-nav__primary :is(
  button.active, button.is-active, button[aria-current="page"],
  a.active, a.is-active, a[aria-current="page"]
) {
  box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 5px 14px rgba(11,87,208,.10) !important;
  transition: background-color 240ms cubic-bezier(.16,1,.3,1), color 240ms cubic-bezier(.16,1,.3,1), box-shadow 240ms cubic-bezier(.16,1,.3,1) !important;
}
html[data-motion-mode="balanced"][data-motion-enabled="true"] body .brian-nav__primary :is(
  button.active, button.is-active, button[aria-current="page"],
  a.active, a.is-active, a[aria-current="page"]
)::after {
  content: "" !important;
  position: absolute !important;
  z-index: 4 !important;
  left: 18% !important;
  right: 18% !important;
  bottom: 2px !important;
  height: 3px !important;
  border-radius: 999px !important;
  background: linear-gradient(90deg,#0b57d0,#5b73e8) !important;
  opacity: 1 !important;
  animation: gm-indicator-windows 280ms cubic-bezier(.16,1,.3,1) both !important;
}
@keyframes gm-indicator-windows { from { opacity: .01; translate: -12px 0; scale: .55 1; } to { opacity: 1; translate: 0 0; scale: 1 1; } }

/* Fluent Dynamic glow indicator. */
html[data-motion-mode="expressive"][data-motion-enabled="true"] body .brian-nav__primary :is(
  button.active, button.is-active, button[aria-current="page"],
  a.active, a.is-active, a[aria-current="page"]
)::after {
  content: "" !important;
  position: absolute !important;
  z-index: 4 !important;
  left: 16% !important;
  right: 16% !important;
  bottom: 2px !important;
  height: 4px !important;
  border-radius: 999px !important;
  background: linear-gradient(90deg,#0b57d0,#7c4dff,#0b57d0) !important;
  box-shadow: 0 0 10px rgba(91,115,232,.38) !important;
  opacity: 1 !important;
  animation: gm-indicator-fluent 360ms cubic-bezier(.16,1,.3,1) both !important;
}
@keyframes gm-indicator-fluent { from { opacity: .01; scale: .2 1; } to { opacity: 1; scale: 1 1; } }

@media (prefers-reduced-motion: reduce) {
  html[data-motion-enabled="true"] body .brian-nav__primary :is(button, a)::after { animation: none !important; }
}
'''
if 'Motion & Navigation experience profiles' not in motion_css:
    motion_css_path.write_text(motion_css + addition, encoding='utf-8')

# 6) Make the Settings-hosted admin motion panel align with Settings width.
settings_css_path = Path('src/styles/SettingsGoogleM3.css')
settings_css = settings_css_path.read_text(encoding='utf-8')
settings_add = r'''

/* Admin-only unified Motion & Navigation hub hosted directly in Settings. */
.settings-motion-admin-hub {
  grid-column: 1 / -1;
  min-width: 0;
}
.settings-motion-admin-hub .admin-global-motion {
  margin: 0 !important;
}
.admin-motion-hub-labels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 18px 0 8px;
}
.admin-motion-hub-labels span {
  padding: 0 4px;
  color: #5f6368;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .08em;
}
.admin-motion-hub-labels span:last-child { text-align: right; }
@media (max-width: 720px) {
  .admin-motion-hub-labels { grid-template-columns: 1fr; }
  .admin-motion-hub-labels span:last-child { text-align: left; }
}
'''
if 'Admin-only unified Motion & Navigation hub hosted directly in Settings.' not in settings_css:
    settings_css_path.write_text(settings_css + settings_add, encoding='utf-8')

print('Patched TTCM default/action badge and unified Motion & Navigation hub.')
