#!/usr/bin/env python3
from pathlib import Path
import json, re

ROOT=Path.cwd()

def read(rel):
    p=ROOT/rel
    if not p.exists(): raise SystemExit(f"❌ Thiếu file {rel}")
    return p.read_text(encoding='utf-8')

def write(rel,text):
    (ROOT/rel).write_text(text,encoding='utf-8')

# Main: remove browser provider guard and legacy model defaults without replacing the latest app shell.
main=read('src/main.jsx')
main=main.replace("import { installProviderHubInputGuard } from './utils/providerHubInputGuard.js';\n",'')
main=main.replace('installProviderHubInputGuard();\n','')
main=main.replace("'gemini-flash-latest'", "'Admin quản lý trên máy chủ'")
write('src/main.jsx',main)

# Preserve every current npm script and add the new architecture audit.
pkg=json.loads(read('package.json'))
pkg.setdefault('scripts',{})['audit:openrouter-only']='node scripts/audit-openrouter-only-v11.6.7.mjs'
write('package.json',json.dumps(pkg,ensure_ascii=False,indent=2)+'\n')

# Update historical smoke contracts to the current single-gateway architecture.
smoke=read('scripts/smoke-test.mjs')
replacements={
'V10.68 explicit AI token budget applied globally': "add('V11.6.7 server AI token budget applied globally', geminiSource.includes('maxOutputTokens: normalizeMaxOutputTokens') && fs.readFileSync(new URL('../server/openrouterGateway.js', import.meta.url), 'utf8').includes('resolveOutputLimit'), 'browser requests and server profile caps are enforced');",
'V10.68 OpenRouter affordable-token retry present': "add('V11.6.7 OpenRouter affordable-token retry present', fs.readFileSync(new URL('../server/openrouterGateway.js', import.meta.url), 'utf8').includes('can only afford') && fs.readFileSync(new URL('../server/openrouterGateway.js', import.meta.url), 'utf8').includes('affordable - 24'), 'credit-limited requests retry server-side with a smaller cap');",
'V10.82.5 SmartID uses account Gemini settings': "add('V11.6.7 SmartID uses the authenticated server gateway', smartIdSource.includes('callAI') && smartIdSource.includes('OpenRouter Server Gateway') && !smartIdSource.includes('x-goog-api-key'), 'no browser provider key or direct provider call');",
'V10.82.5 SmartID uses current Gemini image models with fallback': "add('V11.6.7 SmartID vision analysis is gateway-only', smartIdSource.includes('attachments: [{ mimeType, dataUrl: imageData }]') && !smartIdSource.includes('generativelanguage.googleapis.com'), 'portrait analysis uses the common server gateway');",
'V10.83.1 multimodal payloads cover supported providers': "add('V11.6.7 multimodal payloads use the single gateway', geminiSource.includes('attachments: normalizeAttachments') && fs.readFileSync(new URL('../server/openrouterGateway.js', import.meta.url), 'utf8').includes(\"type: 'image_url'\"), 'images are normalized in the browser and sent to OpenRouter only on the server');",
'V10.86 AI Governance is enforced centrally': "add('V11.6.7 AI Governance is enforced server-side', geminiSource.includes(\"fetch('/api/ai'\") && fs.readFileSync(new URL('../api/ai.js', import.meta.url), 'utf8').includes('reserveServerAiQuota') && fs.readFileSync(new URL('../server/openrouterGateway.js', import.meta.url), 'utf8').includes('dailyTokenBudget'), 'all callAI consumers share authenticated server quotas and output caps');",
'V10.86 Governance Center exposes controls, profiles and audit report': "add('V11.6.7 Governance Center exposes shared model, quotas and server audit', aiGovernancePageSource.includes('dailyRequestLimit') && aiGovernancePageSource.includes('profiles') && aiGovernancePageSource.includes(\"fetch('/api/ai-governance'\") && aiGovernancePageSource.includes('audit'), 'Admin controls shared runtime settings and reads server logs');",
}
lines=smoke.splitlines()
for idx,line in enumerate(lines):
    for marker,newline in replacements.items():
        if marker in line:
            lines[idx]=newline
            break
write('scripts/smoke-test.mjs','\n'.join(lines)+'\n')

# Remove obsolete multi-provider deployment instructions from project docs.
readme=read('README.md')
start=readme.find('## AI phía server')
end=readme.find('## Kiến trúc tích hợp',start)
if start>=0 and end>=0:
    readme=readme[:start]+'''## AI phía server — OpenRouter only\n\nToàn bộ website gọi gateway xác thực `/api/ai`. API key không xuất hiện trong mã frontend hoặc trình duyệt.\n\n```env\nOPENROUTER_API_KEY=...\nSUPABASE_SERVICE_ROLE_KEY=...\n```\n\nModel và hạn mức dùng chung do Admin quản lý tại `/#/ai-governance`. Chạy migration `supabase/brian_v11_6_7_openrouter_gateway.sql`.\n\n'''+readme[end:]
write('README.md',readme)

doc_path=ROOT/'docs/V11_4_2_DEPLOYMENT.md'
if doc_path.exists():
    doc=doc_path.read_text(encoding='utf-8')
    start=doc.find('## 4. Configure Vercel environment')
    end=doc.find('## 5. Deploy',start)
    if start>=0 and end>=0:
        doc=doc[:start]+'''## 4. Configure Vercel environment\n\nAI uses OpenRouter only. Configure `OPENROUTER_API_KEY` and retain `SUPABASE_SERVICE_ROLE_KEY`. Run `supabase/brian_v11_6_7_openrouter_gateway.sql`. All apps call `/api/ai`; the browser never receives the key.\n\n'''+doc[end:]
    doc_path.write_text(doc,encoding='utf-8')

print('✅ Đã áp dụng kiến trúc OpenRouter-only vào source hiện tại.')
