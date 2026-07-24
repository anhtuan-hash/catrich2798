import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import { isAdminRole } from '../utils/roles.js';
import {
  generateStrongPassword,
  invokeTeacherAccounts,
  normalizeUsername,
} from '../utils/usernameAccounts.js';
import './BulkTeacherAccountsPanel.css';

const EMPTY_ROW = { username: '', fullName: '', school: '', password: '' };

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function padNumber(value, width = 3) {
  return String(value).padStart(width, '0');
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(rows) {
  const headers = ['username', 'full_name', 'password', 'school', 'status'];
  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push([
      row.username,
      row.fullName,
      row.password,
      row.school,
      row.result?.ok ? 'created' : (row.result?.message || 'pending'),
    ].map(csvEscape).join(','));
  });
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `tai-khoan-giao-vien-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseDelimited(text) {
  const lines = String(text || '').replace(/^\ufeff/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(current.trim());
        current = '';
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  };

  const header = parseLine(lines[0]).map((value) => value.toLowerCase().replace(/\s+/g, '_'));
  const hasHeader = header.some((value) => ['username', 'ten_dang_nhap', 'full_name', 'ho_va_ten', 'password', 'mat_khau'].includes(value));
  const start = hasHeader ? 1 : 0;
  return lines.slice(start).map((line) => {
    const cells = parseLine(line);
    const get = (...names) => {
      if (!hasHeader) return '';
      const index = header.findIndex((item) => names.includes(item));
      return index >= 0 ? cells[index] || '' : '';
    };
    return {
      username: normalizeUsername(hasHeader ? get('username', 'ten_dang_nhap') : cells[0]),
      fullName: hasHeader ? get('full_name', 'ho_va_ten', 'name') : cells[1] || '',
      password: hasHeader ? get('password', 'mat_khau') : cells[2] || '',
      school: hasHeader ? get('school', 'truong', 'don_vi') : cells[3] || '',
    };
  }).filter((row) => row.username || row.fullName || row.password || row.school).slice(0, 50);
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    username: normalizeUsername(row.username),
    fullName: String(row.fullName || '').trim(),
    school: String(row.school || '').trim(),
    password: String(row.password || ''),
    result: row.result || null,
  }));
}

export default function BulkTeacherAccountsPanel({ language = 'vi' }) {
  const vi = language === 'vi';
  const [route, setRoute] = useState(currentRoute);
  const [currentUser, setCurrentUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, () => ({ ...EMPTY_ROW, password: generateStrongPassword() })));
  const [generator, setGenerator] = useState({ prefix: 'gv', start: 1, count: 10, school: '' });
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [resetForm, setResetForm] = useState({ username: '', password: generateStrongPassword() });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => {
      const next = currentRoute();
      setRoute(next);
      if (next !== 'admin') setOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (route !== 'admin') return undefined;
    let active = true;
    initializeAuthSession().then((user) => active && setCurrentUser(user)).catch(() => null);
    const unsubscribe = subscribeToAuthChanges((user) => active && setCurrentUser(user));
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [route]);

  const canManage = route === 'admin' && isAdminRole(currentUser?.role);
  const validRows = useMemo(() => normalizeRows(rows).filter((row) => row.username || row.fullName || row.password || row.school), [rows]);
  const createdCount = rows.filter((row) => row.result?.ok).length;
  const failedCount = rows.filter((row) => row.result && !row.result.ok).length;

  const patchRow = (index, patch) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch, result: null } : row));
  const removeRow = (index) => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  const addRow = () => setRows((current) => [...current, { ...EMPTY_ROW, password: generateStrongPassword() }].slice(0, 50));

  const generateRows = () => {
    const count = Math.max(1, Math.min(50, Number(generator.count) || 1));
    const start = Math.max(0, Number(generator.start) || 0);
    const prefix = normalizeUsername(generator.prefix) || 'gv';
    const next = Array.from({ length: count }, (_, index) => ({
      username: normalizeUsername(`${prefix}${padNumber(start + index)}`),
      fullName: '',
      school: generator.school,
      password: generateStrongPassword(),
      result: null,
    }));
    setRows(next);
    setMessage(vi ? `Đã tạo nháp ${count} tài khoản. Có thể nhập họ tên trước khi lưu.` : `${count} draft accounts generated. Add names before saving.`);
  };

  const importText = () => {
    const parsed = parseDelimited(csvText);
    if (!parsed.length) {
      setMessage(vi ? 'Không đọc được dữ liệu CSV.' : 'No valid CSV rows were found.');
      return;
    }
    setRows(parsed.map((row) => ({ ...row, password: row.password || generateStrongPassword(), result: null })));
    setMessage(vi ? `Đã nhập ${parsed.length} tài khoản từ CSV.` : `${parsed.length} accounts imported from CSV.`);
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    const parsed = parseDelimited(text);
    if (!parsed.length) {
      setMessage(vi ? 'Tệp CSV không có dòng hợp lệ.' : 'The CSV file has no valid rows.');
      return;
    }
    setRows(parsed.map((row) => ({ ...row, password: row.password || generateStrongPassword(), result: null })));
    setMessage(vi ? `Đã nhập ${parsed.length} tài khoản từ ${file.name}.` : `${parsed.length} accounts imported from ${file.name}.`);
  };

  const createAccounts = async () => {
    if (!validRows.length || busy) return;
    setBusy('create');
    setMessage('');
    const response = await invokeTeacherAccounts({
      action: 'bulk_create',
      accounts: validRows.map(({ username, fullName, school, password }) => ({ username, fullName, school, password })),
    });
    if (!response.ok && !response.results) {
      setMessage(response.message || (vi ? 'Không thể tạo tài khoản.' : 'Could not create accounts.'));
      setBusy('');
      return;
    }
    const resultMap = new Map((response.results || []).map((item) => [Number(item.index), item]));
    let validIndex = 0;
    setRows((current) => current.map((row) => {
      const meaningful = row.username || row.fullName || row.password || row.school;
      if (!meaningful) return row;
      const result = resultMap.get(validIndex) || { ok: false, message: vi ? 'Không nhận được kết quả.' : 'No result returned.' };
      validIndex += 1;
      return { ...row, result };
    }));
    setMessage(response.message || (vi ? `Đã tạo ${response.createdCount || 0} tài khoản.` : `${response.createdCount || 0} accounts created.`));
    window.dispatchEvent(new CustomEvent('bes-auth-users-updated'));
    setBusy('');
  };

  const resetPassword = async () => {
    if (!resetForm.username || resetForm.password.length < 8 || busy) return;
    setBusy('reset');
    setMessage('');
    const response = await invokeTeacherAccounts({
      action: 'reset_password',
      username: resetForm.username,
      password: resetForm.password,
    });
    setMessage(response.ok
      ? (vi ? `Đã đặt lại mật khẩu cho ${normalizeUsername(resetForm.username)}.` : `Password reset for ${normalizeUsername(resetForm.username)}.`)
      : (response.message || (vi ? 'Không thể đặt lại mật khẩu.' : 'Could not reset password.')));
    if (response.ok) setResetForm({ username: '', password: generateStrongPassword() });
    setBusy('');
  };

  if (!canManage) return null;

  return (
    <div className={`bes-bulk-accounts ${open ? 'is-open' : ''}`}>
      <button type="button" className="bes-bulk-accounts__launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span aria-hidden="true">＋</span><b>{vi ? 'Tạo tài khoản GV' : 'Create teacher accounts'}</b>
      </button>

      {open ? (
        <section className="bes-bulk-accounts__panel" aria-label={vi ? 'Tạo hàng loạt tài khoản giáo viên' : 'Bulk teacher account creation'}>
          <header>
            <div><span>{vi ? 'QUẢN TRỊ TÀI KHOẢN' : 'ACCOUNT ADMINISTRATION'}</span><h2>{vi ? 'Tạo hàng loạt tài khoản giáo viên' : 'Bulk teacher accounts'}</h2><p>{vi ? 'Giáo viên đăng nhập bằng tên đăng nhập và mật khẩu; email được bổ sung sau.' : 'Teachers sign in with username and password, then add email later.'}</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </header>

          <div className="bes-bulk-accounts__generator">
            <label><span>{vi ? 'Tiền tố' : 'Prefix'}</span><input value={generator.prefix} onChange={(event) => setGenerator({ ...generator, prefix: event.target.value })} placeholder="gv" /></label>
            <label><span>{vi ? 'Số bắt đầu' : 'Start number'}</span><input type="number" min="0" value={generator.start} onChange={(event) => setGenerator({ ...generator, start: event.target.value })} /></label>
            <label><span>{vi ? 'Số lượng' : 'Count'}</span><input type="number" min="1" max="50" value={generator.count} onChange={(event) => setGenerator({ ...generator, count: event.target.value })} /></label>
            <label className="wide"><span>{vi ? 'Trường / đơn vị mặc định' : 'Default school / unit'}</span><input value={generator.school} onChange={(event) => setGenerator({ ...generator, school: event.target.value })} /></label>
            <button type="button" onClick={generateRows}>{vi ? 'Tạo danh sách nháp' : 'Generate drafts'}</button>
          </div>

          <details className="bes-bulk-accounts__csv">
            <summary>{vi ? 'Nhập từ CSV / Excel' : 'Import from CSV / Excel'}</summary>
            <p>{vi ? 'Thứ tự cột: username, full_name, password, school. Có thể dùng dấu phẩy, chấm phẩy hoặc tab.' : 'Columns: username, full_name, password, school. Comma, semicolon and tab are supported.'}</p>
            <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder={'username,full_name,password,school\ngv001,Nguyễn Văn An,Br@7Kp92,THPT Pétrus Ký'} />
            <div><button type="button" onClick={importText}>{vi ? 'Đọc dữ liệu đã dán' : 'Read pasted data'}</button><button type="button" onClick={() => fileInputRef.current?.click()}>{vi ? 'Chọn tệp CSV' : 'Choose CSV file'}</button></div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain" hidden onChange={importFile} />
          </details>

          <div className="bes-bulk-accounts__table-wrap">
            <table>
              <thead><tr><th>#</th><th>{vi ? 'Tên đăng nhập' : 'Username'}</th><th>{vi ? 'Họ và tên' : 'Full name'}</th><th>{vi ? 'Mật khẩu tạm' : 'Temporary password'}</th><th>{vi ? 'Trường / đơn vị' : 'School / unit'}</th><th>{vi ? 'Kết quả' : 'Result'}</th><th /></tr></thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className={row.result ? (row.result.ok ? 'is-success' : 'is-error') : ''}>
                    <td>{index + 1}</td>
                    <td><input value={row.username} onChange={(event) => patchRow(index, { username: normalizeUsername(event.target.value) })} placeholder="gv001" /></td>
                    <td><input value={row.fullName} onChange={(event) => patchRow(index, { fullName: event.target.value })} placeholder={vi ? 'Nguyễn Văn An' : 'Teacher name'} /></td>
                    <td><div className="password-cell"><input value={row.password} onChange={(event) => patchRow(index, { password: event.target.value })} /><button type="button" onClick={() => patchRow(index, { password: generateStrongPassword() })}>↻</button></div></td>
                    <td><input value={row.school} onChange={(event) => patchRow(index, { school: event.target.value })} /></td>
                    <td><small>{row.result ? (row.result.ok ? (vi ? 'Đã tạo' : 'Created') : row.result.message) : '—'}</small></td>
                    <td><button type="button" className="row-delete" onClick={() => removeRow(index)}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bes-bulk-accounts__main-actions">
            <button type="button" className="secondary" onClick={addRow} disabled={rows.length >= 50}>{vi ? 'Thêm dòng' : 'Add row'}</button>
            <button type="button" className="secondary" onClick={() => downloadCsv(rows)}>{vi ? 'Xuất CSV' : 'Export CSV'}</button>
            <span>{validRows.length}/50</span>
            <button type="button" className="primary" disabled={!validRows.length || Boolean(busy)} onClick={createAccounts}>{busy === 'create' ? (vi ? 'Đang tạo…' : 'Creating…') : (vi ? 'Tạo tài khoản' : 'Create accounts')}</button>
          </div>

          {(createdCount || failedCount) ? <div className="bes-bulk-accounts__summary"><b>{vi ? 'Thành công' : 'Created'}: {createdCount}</b><b>{vi ? 'Lỗi' : 'Failed'}: {failedCount}</b></div> : null}

          <details className="bes-bulk-accounts__reset">
            <summary>{vi ? 'Đặt lại mật khẩu cho giáo viên' : 'Reset a teacher password'}</summary>
            <div><input value={resetForm.username} onChange={(event) => setResetForm({ ...resetForm, username: normalizeUsername(event.target.value) })} placeholder={vi ? 'Tên đăng nhập' : 'Username'} /><input value={resetForm.password} onChange={(event) => setResetForm({ ...resetForm, password: event.target.value })} placeholder={vi ? 'Mật khẩu mới' : 'New password'} /><button type="button" onClick={() => setResetForm({ ...resetForm, password: generateStrongPassword() })}>↻</button><button type="button" disabled={Boolean(busy)} onClick={resetPassword}>{busy === 'reset' ? (vi ? 'Đang đặt lại…' : 'Resetting…') : (vi ? 'Đặt lại' : 'Reset')}</button></div>
          </details>

          {message ? <div className="bes-bulk-accounts__message" role="status">{message}</div> : null}
          <footer>{vi ? 'Mỗi tài khoản phải đổi mật khẩu ở lần đăng nhập đầu tiên. Mật khẩu chỉ hiển thị trong phiên tạo này.' : 'Every account must change its password at first sign-in. Passwords are only shown in this creation session.'}</footer>
        </section>
      ) : null}
    </div>
  );
}
