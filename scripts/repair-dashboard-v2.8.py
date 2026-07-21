#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
MAIN = ROOT / 'src/main.jsx'
AUDIT = ROOT / 'scripts/audit-dashboard-modern-fix-v11.6.7.mjs'

for path in (MAIN, AUDIT):
    if not path.exists():
        raise SystemExit(f'❌ Thiếu file: {path.relative_to(ROOT)}')

main = MAIN.read_text(encoding='utf-8')
audit = AUDIT.read_text(encoding='utf-8')


def ensure_dashboard_excluded_before(component_marker: str, label: str) -> None:
    global main
    component_index = main.find(component_marker)
    if component_index < 0:
        raise SystemExit(f'❌ Không tìm thấy {label} trong src/main.jsx')

    start = max(0, component_index - 1200)
    context = main[start:component_index + 500]
    pattern = re.compile(r"!\[(?P<items>[^\]]*)\]\.includes\(\s*currentRoute\s*\)", re.S)
    matches = list(pattern.finditer(context))
    if not matches:
        raise SystemExit(f'❌ Không tìm thấy điều kiện route của {label}')

    match = matches[-1]
    items = match.group('items')
    if "'dashboard'" not in items and '"dashboard"' not in items:
        cleaned = items.rstrip()
        separator = '' if not cleaned else ('' if cleaned.rstrip().endswith(',') else ',')
        replacement = f"![{cleaned}{separator} 'dashboard'].includes(currentRoute)"
        absolute_start = start + match.start()
        absolute_end = start + match.end()
        main = main[:absolute_start] + replacement + main[absolute_end:]


ensure_dashboard_excluded_before('<ContentTransferHub', 'Content Transfer')
ensure_dashboard_excluded_before('<UnifiedUtilityRail', 'Utility Rail')
MAIN.write_text(main, encoding='utf-8')

semantic_content_check = """const contentTransferIndex = main.indexOf('<ContentTransferHub');
const contentTransferContext = contentTransferIndex >= 0
  ? main.slice(Math.max(0, contentTransferIndex - 1200), contentTransferIndex + 500)
  : '';
add(
  'Dashboard hides unrelated content-transfer overlay',
  contentTransferIndex >= 0
    && contentTransferContext.includes('dashboard')
    && contentTransferContext.includes('.includes(currentRoute)')
);"""

audit, count = re.subn(
    r"add\('Dashboard hides unrelated content-transfer overlay',[\s\S]*?\);",
    semantic_content_check,
    audit,
    count=1,
)
if count != 1 and 'const contentTransferIndex' not in audit:
    raise SystemExit('❌ Không thể cập nhật kiểm tra Content Transfer trong audit')

if "add('Dashboard hides the global utility rail', main.includes" in audit:
    semantic_rail_check = """const utilityRailIndex = main.indexOf('<UnifiedUtilityRail');
const utilityRailContext = utilityRailIndex >= 0
  ? main.slice(Math.max(0, utilityRailIndex - 1200), utilityRailIndex + 500)
  : '';
add(
  'Dashboard hides the global utility rail',
  utilityRailIndex >= 0
    && utilityRailContext.includes('dashboard')
    && utilityRailContext.includes('.includes(currentRoute)')
);"""
    audit = re.sub(
        r"add\('Dashboard hides the global utility rail',[\s\S]*?\);",
        semantic_rail_check,
        audit,
        count=1,
    )

AUDIT.write_text(audit, encoding='utf-8')
print('✅ Đã gia cố Content Transfer và audit V2.8.')
