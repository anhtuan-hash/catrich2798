#!/usr/bin/env python3
from pathlib import Path

root = Path.cwd()
jsx_path = root / "src/pages/THPTPracticeHub.jsx"
css_path = root / "src/pages/THPTPracticeHubLayoutV2.css"

if not jsx_path.exists():
    raise SystemExit("❌ Không tìm thấy src/pages/THPTPracticeHub.jsx")

text = jsx_path.read_text(encoding="utf-8")

required_markers = [
    "thptResourceBridge",
    'className="thpt-card-grid"',
    "THPT_RESOURCE_SOURCE",
]

missing = [marker for marker in required_markers if marker not in text]
if missing:
    raise SystemExit(
        "❌ Source hiện tại không phải bản ổn định Kho học liệu ↔ Luyện thi THPT. "
        f"Thiếu: {', '.join(missing)}"
    )

import_line = "import './THPTPracticeHubLayoutV2.css';"

if import_line not in text:
    base_import = "import './THPTPracticeHub.css';"
    if base_import not in text:
        raise SystemExit("❌ Không tìm thấy import THPTPracticeHub.css")
    text = text.replace(base_import, base_import + "\n" + import_line, 1)
    jsx_path.write_text(text, encoding="utf-8")

if not css_path.exists():
    raise SystemExit("❌ Thiếu THPTPracticeHubLayoutV2.css")

css = css_path.read_text(encoding="utf-8")
for marker in [
    ".thpt-card-grid",
    "overflow-y: auto",
    ".thpt-lesson-card",
    "grid-template-areas",
    "@media (max-width: 820px)",
]:
    if marker not in css:
        raise SystemExit(f"❌ CSS layout thiếu marker: {marker}")

print("✅ Đã kích hoạt THPT Practice Hub Layout V2 an toàn.")
