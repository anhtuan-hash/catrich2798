#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path.cwd()

def read(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(f"❌ Thiếu file bắt buộc: {rel}")
    return path.read_text(encoding="utf-8")

def write(rel, text):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")

main = read("src/main.jsx")

lazy_line = "const SharedChatbotDrawer = lazy(() => import('./components/SharedChatbotDrawer.jsx'));"
if lazy_line not in main:
    candidates = [
        "const GlobalCommandPalette = lazy(() => import('./components/GlobalCommandPalette.jsx'));",
        "const GlobalAutosave = lazy(() => import('./components/GlobalAutosave.jsx'));",
    ]
    anchor = next((candidate for candidate in candidates if candidate in main), None)
    if not anchor:
        raise SystemExit("❌ Không tìm thấy khu vực lazy component trong src/main.jsx")
    main = main.replace(anchor, anchor + "\n" + lazy_line, 1)

if 'scope="shared-chatbot-drawer"' not in main:
    main_lines = main.splitlines()
    main_index = next(
        (
            index for index, line in enumerate(main_lines)
            if '<main id="bes-main-content"' in line
        ),
        None,
    )
    if main_index is None:
        raise SystemExit("❌ Không tìm thấy vùng nội dung chính trong src/main.jsx")

    mount = [
        "      {currentUser && !['homeroom-portal', 'classroom-join'].includes(currentRoute) ? (",
        "        <Suspense fallback={null}>",
        '          <AppErrorBoundary compact scope="shared-chatbot-drawer" label={language === \'vi\' ? \'chatbot dùng chung\' : \'shared chatbot\'}>',
        "            <SharedChatbotDrawer currentUser={currentUser} language={language} />",
        "          </AppErrorBoundary>",
        "        </Suspense>",
        "      ) : null}",
        "",
    ]
    main_lines[main_index:main_index] = mount
    main = "\n".join(main_lines) + "\n"

write("src/main.jsx", main)

nav = read("src/components/GlobalFlatNavigation.jsx")
nav = nav.replace(
    "search: 'Tìm nhanh', more: 'Thêm'",
    "search: 'Tìm nhanh', chatbot: 'Chatbot', more: 'Thêm'",
)
nav = nav.replace(
    "search: 'Quick search', more: 'More'",
    "search: 'Quick search', chatbot: 'Chatbot', more: 'More'",
)

if "bes-chatbot-drawer-open" not in nav:
    lines = nav.splitlines()
    theme_index = next(
        (
            index for index, line in enumerate(lines)
            if 'className="global-flat-mini icon-only"' in line
            and ('Toggle theme' in line or 'Đổi chế độ sáng tối' in line)
        ),
        None,
    )
    if theme_index is None:
        raise SystemExit("❌ Không tìm thấy nút sáng/tối trong GlobalFlatNavigation.jsx")

    trigger = [
        "        {currentUser ? (",
        "          <button",
        '            type="button"',
        '            className="global-flat-mini global-chatbot-trigger"',
        "            onClick={() => window.dispatchEvent(new CustomEvent('bes-chatbot-drawer-open'))}",
        "            aria-label={t.chatbot || 'Chatbot'}",
        "            title={language === 'vi' ? 'Mở chatbot dùng chung của tổ' : 'Open the department chatbot drawer'}",
        "          >",
        "            <span aria-hidden=\"true\">✦</span><b>{t.chatbot || 'Chatbot'}</b>",
        "          </button>",
        "        ) : null}",
    ]
    lines[theme_index + 1:theme_index + 1] = trigger
    nav = "\n".join(lines) + "\n"

write("src/components/GlobalFlatNavigation.jsx", nav)

package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package.setdefault("scripts", {})["audit:shared-chatbot-drawer"] = (
    "node scripts/audit-shared-chatbot-drawer-v11.6.7.mjs"
)
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("✅ Đã nối Chatbot Drawer vào Global Shell và thanh điều hướng.")
