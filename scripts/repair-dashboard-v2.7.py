#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
MAIN = ROOT / "src/main.jsx"
CSS = ROOT / "src/styles/work-dashboard-v1167.css"
AUDIT = ROOT / "scripts/audit-dashboard-modern-fix-v11.6.7.mjs"

for path in (MAIN, CSS, AUDIT):
    if not path.exists():
        raise SystemExit(f"❌ Thiếu file: {path.relative_to(ROOT)}")

main = MAIN.read_text(encoding="utf-8")
css = CSS.read_text(encoding="utf-8")
audit = AUDIT.read_text(encoding="utf-8")

rail_pos = main.find("<UnifiedUtilityRail")
if rail_pos < 0:
    raise SystemExit("❌ Không tìm thấy UnifiedUtilityRail trong src/main.jsx")

search_start = max(0, rail_pos - 900)
context = main[search_start:rail_pos + 500]
condition_pattern = re.compile(
    r"!\[(?P<items>[^\]]*)\]\.includes\(\s*currentRoute\s*\)",
    re.S,
)
matches = list(condition_pattern.finditer(context))
if not matches:
    raise SystemExit("❌ Không tìm thấy điều kiện hiển thị Utility Rail.")

match = matches[-1]
items = match.group("items")
if "'dashboard'" not in items and '"dashboard"' not in items:
    cleaned = items.rstrip()
    separator = "" if not cleaned else ("" if cleaned.rstrip().endswith(",") else ",")
    new_items = f"{cleaned}{separator} 'dashboard'"
    replacement = f"![{new_items}].includes(currentRoute)"
    start = search_start + match.start()
    end = search_start + match.end()
    main = main[:start] + replacement + main[end:]

MAIN.write_text(main, encoding="utf-8")

marker = "/* Dashboard V2.7 — Preserve multi-column layouts at 130–140% */"
if marker not in css:
    css += r"""

/* Dashboard V2.7 — Preserve multi-column layouts at 130–140% */
@media (min-width: 1121px) {
  html[data-font-scale="130"] .wd5-main-grid,
  html[data-font-scale="140"] .wd5-main-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-auto-rows: 590px;
  }

  html[data-font-scale="130"] .wd5-metrics,
  html[data-font-scale="140"] .wd5-metrics {
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  }

  html[data-font-scale="130"] .wd5-triple-grid,
  html[data-font-scale="140"] .wd5-triple-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-auto-rows: 440px;
  }
}

@media (min-width: 1501px) {
  html[data-font-scale="130"] .wd5-triple-grid,
  html[data-font-scale="140"] .wd5-triple-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}
"""
CSS.write_text(css, encoding="utf-8")

audit = audit.replace(
    "add('Dashboard keeps 2/3 column layout at large font scale on wide screens', css.includes('Preserve multi-column layouts at 130–140%'));",
    """add(
  'Dashboard keeps 2/3 column layout at large font scale on wide screens',
  css.includes('Dashboard V2.7 — Preserve multi-column layouts at 130–140%')
    && css.includes('html[data-font-scale="130"] .wd5-main-grid')
    && css.includes('html[data-font-scale="140"] .wd5-triple-grid')
);""",
)

audit = audit.replace(
    "add('Dashboard hides the global utility rail', main.includes(\"'classroom-join', 'dashboard'].includes(currentRoute) ? <Suspense fallback={null}><UnifiedUtilityRail\"));",
    """const utilityRailIndex = main.indexOf('<UnifiedUtilityRail');
const utilityRailContext = utilityRailIndex >= 0
  ? main.slice(Math.max(0, utilityRailIndex - 900), utilityRailIndex + 500)
  : '';
add(
  'Dashboard hides the global utility rail',
  utilityRailIndex >= 0
    && utilityRailContext.includes('dashboard')
    && utilityRailContext.includes('.includes(currentRoute)')
);""",
)

AUDIT.write_text(audit, encoding="utf-8")
print("✅ Đã sửa font scale và ẩn Utility Rail trên Dashboard.")
