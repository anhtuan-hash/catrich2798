import React, { useMemo, useState } from 'react';
import { generateStrongPassword, invokeTeacherAccounts, normalizeUsername } from '../utils/usernameAccounts.js';
import './SettingsTeacherAccountCreator.css';

const emptyRow = () => ({ username: '', fullName: '', school: '', password: generateStrongPassword(), result: null });

export default function SettingsTeacherAccountCreator({ language = 'vi' }) {
  const vi = language === 'vi';
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState(() => [emptyRow()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const validRows = useMemo(() => rows
    .map((row) => ({ ...row, username: normalizeUsername(row.username), fullName: row.fullName.trim(), school: row.school.trim() }))
    .filter((row) => row.username && row.fullName && row.password.length >= 8), [rows]);

  const patch = (index, values) => setRows((current) => current.map((row, rowIndex) => (
    rowIndex === index ? { ...row, ...values, result: null } : row
  )));

  const createAccounts = async () => {
    if (!validRows.length || busy) return;
    setBusy(true);
    setMessage('');
    const response = await invokeTeacherAccounts({
      action: 'bulk_create',
      accounts: validRows.map(({ username, fullName, school, password }) => ({ username, fullName, school, password })),
    });
    const results = Array.isArray(response.results) ? response.results : [];
    setRows((current) => current.map((row, index) => ({
      ...row,
      result: results[index] || (response.ok ? { ok: true } : { ok: false, message: response.message || 'Không thể tạo tài khoản.' }),
    })));
    setMessage(response.message || (response.ok
      ? (vi ? 'Đã xử lý yêu cầu tạo tài khoản.' : 'Account creation request completed.')
      : (vi ? 'Không thể tạo tài khoản.' : 'Could not create accounts.')));
    if (response.ok) window.dispatchEvent(new CustomEvent('bes-auth-users-updated'));
    setBusy(false);
  };

  return (
    <section className="settings-teacher-account-creator" aria-label={vi ? 'Tạo tài khoản giáo viên' : 'Create teacher accounts'}>
      <div className="settings-teacher-account-creator__intro">
        <span aria-hidden="true" className="settings-teacher-account-creator__icon">＋</span>
        <div>
          <strong>{vi ? 'Tạo tài khoản giáo viên' : 'Create teacher accounts'}</strong>
          <p>{vi ? 'Tạo một hoặc nhiều tài khoản bằng tên đăng nhập và mật khẩu tạm.' : 'Create one or more accounts with a username and temporary password.'}</p>
        </div>
        <button type="button" className="settings-teacher-account-creator__open" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          {open ? (vi ? 'Thu gọn' : 'Collapse') : (vi ? 'Tạo tài khoản' : 'Create account')}
        </button>
      </div>

      {open ? (
        <div className="settings-teacher-account-creator__body">
          <div className="settings-teacher-account-creator__head">
            <span>#</span><span>{vi ? 'Tên đăng nhập' : 'Username'}</span><span>{vi ? 'Họ và tên' : 'Full name'}</span><span>{vi ? 'Mật khẩu tạm' : 'Temporary password'}</span><span>{vi ? 'Trường / đơn vị' : 'School / unit'}</span><span />
          </div>
          {rows.map((row, index) => (
            <div className={`settings-teacher-account-creator__row ${row.result ? (row.result.ok ? 'is-success' : 'is-error') : ''}`} key={index}>
              <b>{index + 1}</b>
              <input value={row.username} onChange={(event) => patch(index, { username: normalizeUsername(event.target.value) })} placeholder="gv001" />
              <input value={row.fullName} onChange={(event) => patch(index, { fullName: event.target.value })} placeholder={vi ? 'Nguyễn Văn An' : 'Teacher name'} />
              <div className="settings-teacher-account-creator__password"><input value={row.password} onChange={(event) => patch(index, { password: event.target.value })} /><button type="button" onClick={() => patch(index, { password: generateStrongPassword() })}>↻</button></div>
              <input value={row.school} onChange={(event) => patch(index, { school: event.target.value })} placeholder={vi ? 'Trường / đơn vị' : 'School / unit'} />
              <button type="button" className="settings-teacher-account-creator__remove" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} disabled={rows.length === 1}>×</button>
              {row.result && !row.result.ok ? <small>{row.result.message || (vi ? 'Tạo thất bại' : 'Failed')}</small> : null}
            </div>
          ))}
          <div className="settings-teacher-account-creator__actions">
            <button type="button" onClick={() => setRows((current) => [...current, emptyRow()].slice(0, 50))} disabled={rows.length >= 50}>{vi ? '＋ Thêm tài khoản' : '+ Add account'}</button>
            <span>{validRows.length}/{rows.length} {vi ? 'dòng hợp lệ' : 'valid rows'}</span>
            <button type="button" className="primary" onClick={createAccounts} disabled={!validRows.length || busy}>{busy ? (vi ? 'Đang tạo…' : 'Creating…') : (vi ? 'Tạo tài khoản' : 'Create accounts')}</button>
          </div>
          {message ? <div className="settings-teacher-account-creator__message" role="status">{message}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
