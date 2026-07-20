#!/usr/bin/env python3
from pathlib import Path
import re, shutil
ROOT=Path.cwd(); PACKAGE=Path(__file__).resolve().parent.parent
for rel in ['api/ai.js','api/ai-governance.js','src/pages/AIGovernanceCenter.jsx','scripts/audit-openrouter-only-v11.6.7.mjs']:
    if not (ROOT/rel).exists(): raise SystemExit(f'❌ Thiếu file: {rel}')
shutil.copy2(PACKAGE/'api-ai-merged.js',ROOT/'api/ai.js')
p=ROOT/'src/pages/AIGovernanceCenter.jsx'; t=p.read_text(); t=t.replace("fetch('/api/ai-governance'","fetch('/api/ai?scope=governance'"); p.write_text(t)
p=ROOT/'scripts/audit-openrouter-only-v11.6.7.mjs'; t=p.read_text(); t=re.sub(r"^const governanceApi = read\('api/ai-governance\.js'\);\n",'',t,flags=re.M); t=t.replace("add('Admin-only governance endpoint controls shared settings', governanceApi.includes(\"roles: ['admin']\") && governanceApi.includes('writeServerAiSettings'));","add('Admin-only governance shares the existing AI function', api.includes(\"scope === 'governance'\") && api.includes(\"roles: ['admin']\") && api.includes('writeServerAiSettings'));"); t=t.replace("add('Admin governance page uses authenticated server endpoint', governancePage.includes(\"fetch('/api/ai-governance'\") && governancePage.includes(\"currentUser?.role !== 'admin'\"));","add('Admin governance page uses the authenticated shared gateway', governancePage.includes(\"fetch('/api/ai?scope=governance'\") && governancePage.includes(\"currentUser?.role !== 'admin'\"));"); marker="add('Admin governance page uses the authenticated shared gateway'"; i=t.find(marker); e=t.find('\n',i); t=t[:e+1]+"add('Standalone governance function is removed for Vercel Hobby', !fs.existsSync('api/ai-governance.js'));\n"+t[e+1:] if i>=0 and 'Standalone governance function is removed' not in t else t; p.write_text(t)
for rel in ['scripts/smoke-test.mjs','scripts/patch-openrouter-only-v11.6.7.py']:
    p=ROOT/rel
    if p.exists(): p.write_text(p.read_text().replace("fetch('/api/ai-governance'","fetch('/api/ai?scope=governance'").replace('api/ai.js api/ai-governance.js','api/ai.js'))
(ROOT/'api/ai-governance.js').unlink()
assert "scope === 'governance'" in (ROOT/'api/ai.js').read_text()
assert "fetch('/api/ai?scope=governance'" in (ROOT/'src/pages/AIGovernanceCenter.jsx').read_text()
print('✅ Đã hợp nhất AI Governance vào api/ai.js và xoá function dư thừa.')
