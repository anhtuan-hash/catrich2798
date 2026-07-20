#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
MAIN = ROOT / 'src/main.jsx'

if not MAIN.exists():
    raise SystemExit('❌ Không tìm thấy src/main.jsx')

for required in [
    ROOT / 'src/pages/WorkDashboard.jsx',
    ROOT / 'src/utils/dashboardAggregator.js',
    ROOT / 'src/styles/work-dashboard-v1167.css',
]:
    if not required.exists():
        raise SystemExit(f'❌ Thiếu file Dashboard: {required.relative_to(ROOT)}')

main = MAIN.read_text(encoding='utf-8')
if "currentRoute === 'dashboard'" not in main:
    raise SystemExit('❌ Chưa tìm thấy route Dashboard hiện tại. Hãy cài Dashboard Proposal 5 trước.')

# Hide unrelated global overlays only on Dashboard. Keep the navigation and Chatbot Drawer.
main = main.replace(
    "!['login', 'register', 'setup', 'homeroom-portal', 'classroom-join'].includes(currentRoute) ? <>",
    "!['login', 'register', 'setup', 'homeroom-portal', 'classroom-join', 'dashboard'].includes(currentRoute) ? <>",
    1,
)
main = main.replace(
    "!['login', 'register', 'setup', 'homeroom-portal', 'classroom-join'].includes(currentRoute) ? <Suspense fallback={null}><UnifiedUtilityRail",
    "!['login', 'register', 'setup', 'homeroom-portal', 'classroom-join', 'dashboard'].includes(currentRoute) ? <Suspense fallback={null}><UnifiedUtilityRail",
    1,
)
main = main.replace(
    "{currentRoute !== 'homeroom-portal' ? <>",
    "{!['homeroom-portal', 'dashboard'].includes(currentRoute) ? <>",
    1,
)

MAIN.write_text(main, encoding='utf-8')

page = (ROOT / 'src/pages/WorkDashboard.jsx').read_text(encoding='utf-8')
aggregator = (ROOT / 'src/utils/dashboardAggregator.js').read_text(encoding='utf-8')
css = (ROOT / 'src/styles/work-dashboard-v1167.css').read_text(encoding='utf-8')

markers = {
    'Dashboard shell': 'createEmptyDashboardSnapshot',
    'Skeleton loading': 'LoadingRows',
    'Partial error recovery': 'wd5-partial-error',
}
for label, marker in markers.items():
    if marker not in page:
        raise SystemExit(f'❌ Thiếu {label}: {marker}')

for marker in ['Promise.allSettled', 'withSourceTimeout', 'sourceErrors']:
    if marker not in aggregator:
        raise SystemExit(f'❌ Aggregator chưa có cơ chế phục hồi: {marker}')

for marker in ['Dashboard V2.6', 'max-width:none', 'wd5-skeleton-row']:
    if marker not in css:
        raise SystemExit(f'❌ CSS chưa đúng bản hiện đại: {marker}')

print('✅ Đã cô lập route Dashboard và kích hoạt giao diện V2.6.')
