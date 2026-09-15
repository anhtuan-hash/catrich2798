import React, { useEffect, useState } from 'react';
import './StudentSupportForms.css';
import { isAdminRole } from '../../utils/roles.js';
import { listSupportRules } from '../../studentSupport/studentSupportQueries.js';
import { normalizeRuleConfig, updateStudentSupportRule } from '../../studentSupport/studentSupportRuleAdmin.js';

function configFields(rule) {
  const type = rule.rule_type || rule.ruleType;
  if (type === 'attendance_count') return [['threshold', 'Ngưỡng lần', 1, 100, 1], ['days', 'Số ngày', 1, 365, 1]];
  if (type === 'grade_window_drop') return [['sampleSize', 'Số điểm mỗi nhóm', 1, 10, 1], ['delta', 'Mức giảm điểm', 0.1, 10, 0.1]];
  if (type === 'consecutive_scores_below') return [['count', 'Số điểm liên tiếp', 1, 10, 1], ['threshold', 'Ngưỡng điểm', 0, 10, 0.1]];
  if (type === 'observation_count') return [['threshold', 'Ngưỡng ghi nhận', 1, 100, 1], ['days', 'Số ngày', 1, 365, 1]];
  return [];
}

export default function StudentSupportRuleSettings({ currentUser = null, databasePending = false, language = 'vi' }) {
  const vi = language === 'vi';
  const isAdmin = isAdminRole(currentUser?.role);
  const [rules, setRules] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (databasePending || !isAdmin) return undefined;
    let alive = true;
    setLoading(true);
    listSupportRules({ includeDisabled: true })
      .then((rows) => {
        if (!alive) return;
        setRules(rows);
        setDrafts(Object.fromEntries(rows.map((rule) => [rule.id, { enabled: rule.enabled, config: { ...(rule.config || {}) } }])));
      })
      .catch((nextError) => { if (alive) setError(nextError?.message || String(nextError)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [databasePending, isAdmin]);

  if (!isAdmin) return null;

  const patch = (ruleId, key, value) => setDrafts((current) => ({
    ...current,
    [ruleId]: {
      ...(current[ruleId] || {}),
      config: { ...(current[ruleId]?.config || {}), [key]: value },
    },
  }));

  async function save(rule) {
    if (databasePending) return;
    setBusy(rule.id); setError(''); setMessage('');
    try {
      const draft = drafts[rule.id] || { enabled: rule.enabled, config: rule.config || {} };
      const row = await updateStudentSupportRule(rule, {
        enabled: draft.enabled,
        config: normalizeRuleConfig(rule, draft.config),
      });
      setRules((items) => items.map((item) => item.id === row.id ? row : item));
      setDrafts((current) => ({ ...current, [row.id]: { enabled: row.enabled, config: { ...(row.config || {}) } } }));
      setMessage(vi ? 'Đã lưu cấu hình quy tắc.' : 'Rule settings saved.');
    } catch (nextError) {
      setError(nextError?.message || String(nextError));
    } finally { setBusy(''); }
  }

  return <section className="student-support-form-card">
    <header><span>Admin</span><h2>{vi ? 'Cấu hình quy tắc cảnh báo' : 'Alert rule settings'}</h2><p>{vi ? 'Chỉ chỉnh ngưỡng số và cửa sổ thời gian đã được định nghĩa sẵn.' : 'Only predefined numeric thresholds and time windows can be edited.'}</p></header>
    {databasePending ? <div className="student-support-inline-warning">{vi ? 'Database chưa kích hoạt nên chưa thể lưu cấu hình.' : 'Database is not active, so settings cannot be saved.'}</div> : null}
    {loading ? <p>{vi ? 'Đang tải quy tắc…' : 'Loading rules…'}</p> : null}
    <div className="student-support-rule-settings-list">
      {rules.map((rule) => {
        const draft = drafts[rule.id] || { enabled: rule.enabled, config: rule.config || {} };
        const fields = configFields(rule);
        return <article key={rule.id} className="student-support-rule-setting">
          <div><strong>{rule.name || rule.code}</strong><small>{rule.code} · {rule.rule_type}</small></div>
          <label className="student-support-check"><input type="checkbox" checked={Boolean(draft.enabled)} onChange={(e) => setDrafts((current) => ({ ...current, [rule.id]: { ...draft, enabled: e.target.checked } }))} /><span>{vi ? 'Bật quy tắc' : 'Enabled'}</span></label>
          {fields.map(([key, label, min, max, step]) => <label key={key}><span>{label}</span><input type="number" min={min} max={max} step={step} value={draft.config?.[key] ?? ''} onChange={(e) => patch(rule.id, key, e.target.value)} /></label>)}
          <button type="button" className="student-support-primary" disabled={databasePending || busy === rule.id} onClick={() => save(rule)}>{busy === rule.id ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu' : 'Save')}</button>
        </article>;
      })}
    </div>
    {message ? <p className="student-support-form-message is-success">{message}</p> : null}
    {error ? <p className="student-support-form-message is-error">{error}</p> : null}
  </section>;
}
