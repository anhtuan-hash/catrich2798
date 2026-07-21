import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const departmentPath = path.join(root, 'src/pages/DepartmentWorkspace.jsx');
const parserPath = path.join(root, 'src/utils/offlineScheduleParser.js');

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(departmentPath)) fail('Thiếu src/pages/DepartmentWorkspace.jsx');
if (!fs.existsSync(parserPath)) fail('Thiếu src/utils/offlineScheduleParser.js');

if (!process.exitCode) {
  const department = fs.readFileSync(departmentPath, 'utf8');
  const parser = fs.readFileSync(parserPath, 'utf8');
  const analyzeBlock = department.match(/const analyzeWorkScheduleSource[\s\S]*?const updateScheduleImportItem/)?.[0] || '';
  const cardBlock = department.match(/function WorkScheduleImportCard[\s\S]*?function WorkSchedulePanel/)?.[0] || '';

  if (!department.includes("from '../utils/offlineScheduleParser.js'")) fail('DepartmentWorkspace chưa import offlineScheduleParser.');
  if (!analyzeBlock.includes('parseOfflineScheduleText')) fail('Phân tích lại chưa dùng bộ quy tắc ngoại tuyến.');
  if (analyzeBlock.includes('callAI(')) fail('Nhập lịch từ file vẫn gọi AI.');
  if (!department.includes('parseOfflineScheduleFile(file')) fail('Tải file chưa dùng parser ngoại tuyến.');
  if (!department.includes('makeOfflineScheduleCsvTemplate')) fail('Thiếu file mẫu CSV.');
  if (!cardBlock.includes('Không dùng AI') || !cardBlock.includes('Hoạt động ngoại tuyến')) fail('Giao diện chưa chuyển sang chế độ không AI.');
  if (cardBlock.includes('Chưa có API key') || cardBlock.includes('AI Provider setup required')) fail('Giao diện vẫn chặn theo API key.');
  if (!cardBlock.includes('.xlsx')) fail('Bộ chọn file chưa hỗ trợ XLSX.');
  if (!parser.includes('parseOfflineScheduleRows') || !parser.includes('parseOfflineScheduleText')) fail('Parser ngoại tuyến chưa đầy đủ.');
  if (!parser.includes("import('read-excel-file/browser')")) fail('Parser XLSX chưa dùng read-excel-file.');
}

if (!process.exitCode) console.log('✅ Offline schedule import audit passed. No AI/API key is required for file-to-schedule import.');
