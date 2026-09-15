import React, { useEffect, useMemo, useState } from 'react';
import './StudentSupportRules.css';
import { listSupportRules } from '../../studentSupport/studentSupportQueries.js';
import { loadStudent360Facts } from '../../studentSupport/studentSupportSources.js';
import { evaluateRule, makeAlertDedupeKey } from '../../studentSupport/studentSupportRules.js';
import { describeRuleConfig } from '../../studentSupport/studentSupportRulePresentation.js';
import { upsertEvaluatedAlert } from '../../studentSupport/studentSupportApi.js';

function resultLabel(result, language) {
  const vi = language === 'vi';
  if (result?.evidence?.reason === 'insufficient_data') return vi ? 'Chưa đủ dữ liệu' : 'Insufficient data';
  return result?.triggered ? (vi ? 'Đạt điều kiện' : 'Condition met') : (vi ? 'Chưa đạt điều kiện' : 'Condition not met');
}

export default function StudentSupportRulePanel({
  studentRef = '',
  workspaceId = '',
  currentUser = null,
  databasePending = false,
  language = 'vi',
  onAlertSaved,
}) {
  const vi = language === 'vi';
  const [rules, setRules] = useState([]);
  const [facts, setFacts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingRule, setSavingRule] = useState('');
  const [savedRule, setSavedRule] = useState('');

  useEffect(() => {
    if (databasePending) {
      setRules([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError('');
    listSupportRules({ enabledOnly: false })
      .then((rows) => { if (alive) setRules(rows); })
      .catch((nextError) => { if (alive) setError(nextError?.message || String(nextError)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [databasePending]);

  useEffect(() => {
    if (!studentRef || !workspaceId) {
      setFacts(null);
      return undefined;
    }
    let alive = true;
    loadStudent360Facts({ student: { studentRef }, workspaceId })
      .then((next) => { if (alive) setFacts(next); })
      .catch((nextError) => { if (alive) setError(nextError?.message || String(nextError)); });
    return () => { alive = false; };
  }, [studentRef, workspaceId]);

  const evaluations = useMemo(() => {
    if (!facts) return new Map();
    return new Map(rules.map((rule) => [rule.id, evaluateRule(rule, facts, new Date())]));
  }, [rules, facts]);

  async function saveAlert(rule) {
    const result = evaluations.get(rule.id);
    if (!result?.triggered || !facts?.student?.studentRef || databasePending || !currentUser?.id) return;
    setSavingRule(rule.id);
    setSavedRule('');
    setError('');
    try {
      const dedupeKey = makeAlertDedupeKey(rule, facts.student.studentRef, result.windowStart, result.windowEnd);
      const row = await upsertEvaluatedAlert({
        studentRef: facts.student.studentRef,
        workspaceId: facts.student.workspaceId,
        className: facts.student.className,
        schoolYear: facts.student.schoolYear,
        ruleId: rule.id,
        ruleVersion: rule.version,
        alertType: rule.rule_type,
        evidence: result.evidence,
        windowStart: result.windowStart || null,
        windowEnd: result.windowEnd || null,
        dedupeKey,
      }, currentUser);
      setSavedRule(rule.id);
      onAlertSaved?.(row);
    } catch (nextError) {
      setError(nextError?.message || (vi ? 'Không thể ghi cảnh báo.' : 'Unable to save alert.'));
    } finally {
      setSavingRule('');
    }
  }

  if (databasePending) {
    return (
      <section className="student-support-state-card is-pending">
        <strong>{vi ? 'Quy tắc sẽ hoạt động sau khi database Student Support được kích hoạt.' : 'Rules will activate after the Student Support database migration.'}</strong>
        <p>{vi ? 'Không có rule nào được chạy hoặc ghi cảnh báo vào production ở chế độ xem trước.' : 'No rule is evaluated or written to production in preview mode.'}</p>
      </section>
    );
  }

  return (
    <section className="student-support-rules-panel">
      <header className="student-support-rules-head">
        <div>
          <span>{vi ? 'Rule Engine xác định' : 'Deterministic rule engine'}</span>
          <h2>{vi ? 'Quy tắc cảnh báo' : 'Alert rules'}</h2>
          <p>{vi ? 'Hệ thống chỉ tính theo điều kiện cố định. Giáo viên phải bấm Ghi cảnh báo; hệ thống không tự mở hồ sơ hỗ trợ.' : 'Rules use fixed conditions only. A teacher must explicitly save an alert; support cases are never opened automatically.'}</p>
        </div>
      </header>

      {!studentRef ? <div className="student-support-inline-warning">{vi ? 'Chọn học sinh bằng ô tìm kiếm để xem kết quả từng quy tắc.' : 'Select a student to evaluate each rule.'}</div> : null}
      {loading ? <div className="student-support-state-card">{vi ? 'Đang tải quy tắc…' : 'Loading rules…'}</div> : null}
      {error ? <p className="student-support-form-message is-error">{error}</p> : null}

      <div className="student-support-rule-list">
        {rules.map((rule) => {
          const result = evaluations.get(rule.id);
          const disabled = rule.enabled === false;
          const insufficient = result?.evidence?.reason === 'insufficient_data';
          return (
            <article className={`student-support-rule-card${disabled ? ' is-disabled' : ''}`} key={rule.id}>
              <div className="student-support-rule-card-head">
                <div>
                  <span>{rule.rule_type}</span>
                  <h3>{rule.name || rule.code}</h3>
                  <p>{rule.description}</p>
                </div>
                <span className={`student-support-rule-state ${disabled ? 'is-off' : 'is-on'}`}>{disabled ? (vi ? 'Tắt' : 'Off') : (vi ? 'Bật' : 'On')}</span>
              </div>
              <div className="student-support-rule-config">{describeRuleConfig(rule, language)}</div>
              {result ? (
                <div className={`student-support-rule-result${result.triggered ? ' is-triggered' : ''}${insufficient ? ' is-insufficient' : ''}`}>
                  <div><small>{vi ? 'Kết quả' : 'Result'}</small><strong>{resultLabel(result, language)}</strong></div>
                  <div><small>{vi ? 'Giá trị đo' : 'Metric'}</small><strong>{result.metric ?? '—'}</strong></div>
                  <div><small>{vi ? 'Khoảng dữ liệu' : 'Window'}</small><strong>{[result.windowStart, result.windowEnd].filter(Boolean).join(' → ') || '—'}</strong></div>
                </div>
              ) : null}
              <div className="student-support-rule-actions">
                <button type="button" disabled={disabled || !result?.triggered || savingRule === rule.id || !currentUser?.id} onClick={() => saveAlert(rule)}>
                  {savingRule === rule.id ? (vi ? 'Đang ghi…' : 'Saving…') : (vi ? 'Ghi cảnh báo' : 'Save alert')}
                </button>
                {savedRule === rule.id ? <span>{vi ? 'Đã ghi/cập nhật cảnh báo, không tạo bản trùng.' : 'Alert saved/updated without duplication.'}</span> : null}
              </div>
            </article>
          );
        })}
        {!loading && !rules.length ? <div className="student-support-state-card">{vi ? 'Chưa có quy tắc khả dụng.' : 'No rules are available.'}</div> : null}
      </div>
    </section>
  );
}
