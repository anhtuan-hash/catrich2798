import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button } from './B2UI.jsx';
import { REAL_DEVICE_EVIDENCE_GROUPS, resetRealDeviceEvidence, setRealDeviceEvidence, summarizeRealDeviceEvidence, updateRealDeviceEvidenceNote } from '../realDeviceEvidence.js';
import './B2RealDeviceEvidence.css';

const GROUP_ORDER = ['responsive', 'accessibility', 'performance'];

function tone(status) {
  if (status === 'pass') return 'green';
  if (status === 'fail') return 'red';
  return 'neutral';
}

export default function B2RealDeviceEvidence({ ledger = {}, onChange }) {
  const [groupId, setGroupId] = useState('responsive');
  const summary = useMemo(() => summarizeRealDeviceEvidence(ledger), [ledger]);
  const group = summary.groups[groupId] || summary.groups.responsive;

  const setStatus = (id, status) => {
    const next = setRealDeviceEvidence(id, status, ledger?.[id]?.note || '');
    onChange?.(next);
  };

  const setNote = (id, note) => {
    const next = updateRealDeviceEvidenceNote(id, note);
    onChange?.(next);
  };

  return (
    <div className="b2-real-evidence">
      <div className="b2-real-evidence__tabs" role="tablist" aria-label="Nhóm kiểm thử thiết bị thật">
        {GROUP_ORDER.map((id) => {
          const item = summary.groups[id];
          return <button key={id} type="button" role="tab" aria-selected={groupId === id} className={`${groupId === id ? 'is-active' : ''} ${item.complete ? 'is-complete' : ''}`} onClick={() => setGroupId(id)}><span>{item.complete ? '✓' : '○'}</span><strong>{item.label}</strong><small>{item.passed}/{item.required}</small></button>;
        })}
      </div>

      <div className="b2-real-evidence__summary">
        <p><span>Evidence tổng</span><strong>{summary.passed}/{summary.required}</strong></p>
        <p><span>FAIL hiện tại</span><strong>{summary.failed}</strong></p>
        <B2Button variant="ghost" onClick={() => onChange?.(resetRealDeviceEvidence())}>Reset evidence</B2Button>
      </div>

      <div className="b2-real-evidence__list">
        {group.items.map((item) => (
          <article key={item.id} className={`is-${item.status}`}>
            <div className="b2-real-evidence__head">
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
              <B2Badge tone={tone(item.status)}>{item.status.toUpperCase()}</B2Badge>
            </div>
            <div className="b2-real-evidence__controls">
              <div>
                <B2Button variant={item.status === 'pass' ? 'primary' : 'ghost'} onClick={() => setStatus(item.id, 'pass')}>✓ PASS</B2Button>
                <B2Button variant={item.status === 'fail' ? 'danger' : 'ghost'} onClick={() => setStatus(item.id, 'fail')}>× FAIL</B2Button>
                <B2Button variant="ghost" onClick={() => setStatus(item.id, 'pending')}>Reset</B2Button>
              </div>
              <input value={item.note || ''} onChange={(event) => setNote(item.id, event.target.value)} placeholder="Ghi chú thiết bị / browser / lỗi quan sát được…" aria-label={`Ghi chú kiểm thử ${item.label}`} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
