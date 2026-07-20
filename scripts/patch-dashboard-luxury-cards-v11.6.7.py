#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path.cwd()
PAGE = ROOT / 'src/pages/WorkDashboard.jsx'
PACKAGE = ROOT / 'package.json'

if not PAGE.exists():
    raise SystemExit('❌ Không tìm thấy src/pages/WorkDashboard.jsx. Hãy cài Dashboard trước.')
if not PACKAGE.exists():
    raise SystemExit('❌ Không tìm thấy package.json.')

page = PAGE.read_text(encoding='utf-8')
base_import = "import '../styles/work-dashboard-v1167.css';"
luxury_import = "import '../styles/work-dashboard-luxury-v1167.css';"

if base_import not in page:
    raise SystemExit('❌ Dashboard hiện tại không có stylesheet nền work-dashboard-v1167.css.')

if luxury_import not in page:
    page = page.replace(base_import, base_import + '\n' + luxury_import, 1)
else:
    # Ensure the approved layer is imported after the base layer.
    page = page.replace(luxury_import + '\n', '')
    page = page.replace(base_import, base_import + '\n' + luxury_import, 1)

PAGE.write_text(page, encoding='utf-8')

package = json.loads(PACKAGE.read_text(encoding='utf-8'))
package.setdefault('scripts', {})['audit:dashboard-luxury-cards'] = (
    'node scripts/audit-dashboard-luxury-cards-v11.6.7.mjs'
)
PACKAGE.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

print('✅ Đã nối lớp giao diện Dashboard Luxury Cards V3 sau stylesheet nền.')
