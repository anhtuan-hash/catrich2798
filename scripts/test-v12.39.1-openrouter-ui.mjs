import fs from 'node:fs';
const s=fs.readFileSync('src/pages/Settings.jsx','utf8');
const checks=[
 ['single gateway title',s.includes('OpenRouter AI Gateway')],
 ['shared key field',s.includes('OpenRouter API key dùng chung')],
 ['text model',s.includes('Model văn bản / JSON')],
 ['vision model',s.includes('Model Vision')],
 ['image model',s.includes('Model tạo / chỉnh ảnh')],
 ['coverage panel',s.includes('Phạm vi sử dụng chung')],
 ['legacy card removed',!s.includes('settings-v125-provider-list')],
 ['legacy filters removed',!s.includes('providerFilter ===')],
];
for(const [name,ok] of checks){if(!ok) throw new Error(`Failed: ${name}`); console.log(`✓ ${name}`)}
