#!/usr/bin/env python3
from pathlib import Path

ROOT = Path.cwd()
HOST = ROOT / 'src/components/HomeroomPhase2Tabs.jsx'
if not HOST.exists():
    raise SystemExit('❌ Không tìm thấy HomeroomPhase2Tabs.jsx')

text = HOST.read_text(encoding='utf-8')
import_line = "import RegularAssessmentGradebook from './RegularAssessmentGradebook.jsx';"
if import_line not in text:
    anchors = [
        "import { readWorkbookSafe } from '../utils/safeSpreadsheet.js';",
        "import React, { useEffect, useMemo, useRef, useState } from 'react';",
    ]
    anchor = next((item for item in anchors if item in text), None)
    if not anchor:
        raise SystemExit('❌ Không tìm thấy khu vực import trong HomeroomPhase2Tabs.jsx')
    text = text.replace(anchor, anchor + '\n' + import_line, 1)

if '<RegularAssessmentGradebook workspace={workspace}' not in text:
    title = '<h2>Thêm kết quả đánh giá</h2>'
    title_index = text.find(title)
    if title_index < 0:
        raise SystemExit('❌ Không tìm thấy form nhập điểm cũ để thay thế.')
    start = text.rfind('    <section className="hr-panel">', 0, title_index)
    analytics_title = '<h2>Bản đồ nguy cơ và xu hướng</h2>'
    analytics_index = text.find(analytics_title, title_index)
    if start < 0 or analytics_index < 0:
        raise SystemExit('❌ Không xác định được ranh giới form điểm cũ.')
    end = text.rfind('    <section className="hr-panel">', title_index, analytics_index)
    if end < 0 or end <= start:
        raise SystemExit('❌ Không xác định được phần Phân tích nâng cao.')
    replacement = '    <RegularAssessmentGradebook workspace={workspace} onCommit={onCommit} currentUser={currentUser} />\n\n'
    text = text[:start] + replacement + text[end:]

HOST.write_text(text, encoding='utf-8')

required = [
    ROOT / 'src/components/RegularAssessmentGradebook.jsx',
    ROOT / 'src/utils/regularAssessment.js',
    ROOT / 'src/styles/homeroom-regular-gradebook-v1167.css',
]
missing = [str(path.relative_to(ROOT)) for path in required if not path.exists()]
if missing:
    raise SystemExit('❌ Thiếu file: ' + ', '.join(missing))

print('✅ Đã thay form nhập từng học sinh bằng sổ điểm thường xuyên 4 đợt.')
