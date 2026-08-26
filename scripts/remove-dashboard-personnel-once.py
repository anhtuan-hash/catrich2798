from pathlib import Path

path = Path('src/pages/WorkDashboard.jsx')
text = path.read_text(encoding='utf-8')

import_line = "import PersonnelLookup from '../components/PersonnelLookupGoogleV2.jsx';\n"
render_line = "      <PersonnelLookup currentUser={currentUser} language={language} />\n"

if import_line not in text:
    raise SystemExit('PersonnelLookup import marker not found in WorkDashboard.jsx')
if render_line not in text:
    raise SystemExit('PersonnelLookup render marker not found in WorkDashboard.jsx')

text = text.replace(import_line, '', 1)
text = text.replace(render_line, '', 1)
path.write_text(text, encoding='utf-8')
print('Removed PersonnelLookup from Dashboard. Personnel now lives in TTCM.')
