#!/usr/bin/env node
import fs from 'node:fs';

const read = (path) => fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const main = read('src/main.jsx');
const nav = read('src/components/GlobalFlatNavigation.jsx');
const drawer = read('src/components/SharedChatbotDrawer.jsx');
const store = read('src/utils/sharedChatbots.js');
const css = read('src/styles/shared-chatbot-drawer-v1167.css');
const sql = read('supabase/brian_shared_chatbot_settings.sql');

const checks = [];
const add = (name, pass) => checks.push({ name, pass: Boolean(pass) });

add('Drawer được lazy-load ngoài vùng route', main.includes("SharedChatbotDrawer = lazy") && main.includes('scope="shared-chatbot-drawer"'));
add('Nút Chatbot nằm trên điều hướng toàn cục', nav.includes('global-chatbot-trigger') && nav.includes('bes-chatbot-drawer-open'));
add('Drawer dùng React Portal dưới body', drawer.includes('createPortal') && drawer.includes('document.body'));
add('Đóng/mở không unmount iframe', drawer.includes('shared-chatbot-layer ${open ?') && !drawer.includes('{open ? <iframe'));
add('Iframe hỗ trợ đăng nhập, tệp, micro và popup', drawer.includes('allow-popups-to-escape-sandbox') && drawer.includes('microphone; camera') && drawer.includes('allowFullScreen'));
add('NoTrack AI là chatbot mặc định', store.includes("name: 'NoTrack AI'") && store.includes("url: 'https://notrack.ai/'"));
add('Giới hạn tối đa 20 chatbot', store.includes('SHARED_CHATBOT_MAX = 20'));
add('Chỉ TTCM/Admin được sửa cấu hình', store.includes('isDepartmentLeaderRole') && store.includes('approved === true'));
add('Tùy chọn drawer lưu riêng theo tài khoản', store.includes('bes-chatbot-drawer:${scope}'));
add('Cấu hình chung dùng bảng đã chốt', store.includes("independent_chatbot_settings"));
add('Realtime được bật', store.includes('postgres_changes') && sql.includes('supabase_realtime'));
add('RLS dựa trên profiles và approved', sql.includes('from public.profiles') && sql.includes('p.approved is true'));
add('Giáo viên chỉ có quyền đọc', sql.includes('for select') && sql.includes('to authenticated') && sql.includes('can_manage_shared_chatbots'));
add('Không lộ service-role key ở frontend', !drawer.includes('SERVICE_ROLE') && !store.includes('SERVICE_ROLE'));
add('Có dark mode và responsive', css.includes('html[data-theme="dark"]') && css.includes('@media(max-width:760px)'));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? '✓' : '✗'} ${item.name}`));

if (failed.length) {
  console.error(`\n❌ Audit FAILED (${checks.length - failed.length}/${checks.length})`);
  process.exit(1);
}

console.log(`\n✅ Shared Chatbot Drawer audit PASS (${checks.length}/${checks.length})`);
