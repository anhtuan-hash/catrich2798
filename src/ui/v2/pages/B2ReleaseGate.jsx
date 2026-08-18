import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2Status } from '../components/B2Data.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { TOOL_CONTRACT_EVENT, clearToolContractLedger, readToolContractLedger } from '../toolBehaviorContract.js';
import { getReleaseGateSnapshot, readReleaseChecklist, resetReleaseChecklist, setPrivateOptIn, setReleaseChecklistItem, setRollbackLatch } from '../releaseGate.js';
import { useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2ReleaseGate.css';

const LEVEL2_SLUGS = Object.entries(V2_TOOL_BRIDGE).filter(([, meta]) => Number(meta.level || 0) >= 2).map(([slug]) => slug);
const CHECKS = [
  { id: 'responsive', label: 'Responsive matrix', detail: 'Phone · iPad portrait/landscape · laptop · desktop · 65-inch TV' },
  { id: 'accessibility', label: 'Accessibility QA', detail: 'Keyboard order · focus-visible · aria · contrast · reduced motion' },
  { id: 'behavior', label: 'Behavior regression', detail: 'Persistence · import/export · saved state · workflow parity với V1' },
  { id: 'ci', label: 'CI / Preview build', detail: 'Vercel Preview phải build thành công trên milestone cuối' },
  { id: 'ownerApproval', label: 'Owner approval', detail: 'Phê duyệt private preview trước khi có bất kỳ boot path production nào' },
];

function formatTime(value) {
  if (!value) return 'Chưa chạy';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function B2ReleaseGate() {
  const data = useBrianV2Data();
  const [ledger, setLedger] = useState(readToolContractLedger);
  const [checklist, setChecklist] = useState(readReleaseChecklist);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setLedger(readToolContractLedger());
    window.addEventListener(TOOL_CONTRACT_EVENT, sync);
    return () => window.removeEventListener(TOOL_CONTRACT_EVENT, sync);
  }, []);

  const snapshot = useMemo(() => getReleaseGateSnapshot({
    user: data.user,
    contractLedger: ledger,
    level2Slugs: LEVEL2_SLUGS,
    dataErrors: data.errors,
  }), [data.user, data.errors, ledger, checklist, revision]);

  const setCheck = (key, value) => {
    setChecklist(setReleaseChecklistItem(key, value));
    setRevision((n) => n + 1);
  };

  const toggleOptIn = () => {
    setPrivateOptIn(data.user, !snapshot.optIn);
    setRevision((n) => n + 1);
  };

  const activateRollback = () => {
    setRollbackLatch(true, 'Manual Shadow UI release-gate test');
    setRevision((n) => n + 1);
  };

  const clearRollback = () => {
    setRollbackLatch(false);
    setRevision((n) => n + 1);
  };

  return <>
    <B2PageHeader
      eyebrow="PRIVATE · RELEASE ENGINEERING"
      title="Metro Next Release Gate"
      description="Cổng phát hành được thiết kế fail-closed: V2 không thể boot production chỉ vì UI preview trông hoàn chỉnh. Mode mặc định vẫn là Shadow; CI, behavior, responsive, accessibility và owner approval đều phải được xác nhận riêng."
      actions={<><B2Button variant="ghost" onClick={() => data.refresh()} disabled={data.refreshing}>{data.refreshing ? 'Đang đọc dữ liệu…' : '↻ Refresh diagnostics'}</B2Button><B2Button onClick={() => window.open('/#/', '_blank', 'noopener,noreferrer')}>Mở V1 ↗</B2Button></>}
      aside={<B2Badge tone={snapshot.bootV2 ? 'green' : 'violet'}>{snapshot.bootV2 ? 'V2 BOOT ELIGIBLE' : 'V1 SAFE DEFAULT'}</B2Badge>}
    />

    <section className="b2-release-stats">
      <B2StatCard label="Release mode" value={snapshot.mode.toUpperCase()} meta="VITE_BRIAN_UI_V2_MODE" tone="blue" icon="◇" />
      <B2StatCard label="Level 2 contracts" value={`${snapshot.level2Passed}/${snapshot.level2Required}`} meta="structural runtime checks" tone={snapshot.contractComplete ? 'green' : 'violet'} icon="✓" />
      <B2StatCard label="Data errors" value={String(snapshot.dataErrorCount).padStart(2, '0')} meta="current Data Bridge snapshot" tone={snapshot.dataErrorCount ? 'violet' : 'green'} icon="!" />
      <B2StatCard label="Boot decision" value={snapshot.bootV2 ? 'V2' : 'V1'} meta={snapshot.releaseApproved ? 'release checks complete' : 'gate remains closed'} tone={snapshot.bootV2 ? 'green' : 'cyan'} icon="↗" />
    </section>

    <section className="b2-release-grid">
      <div className="b2-release-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="FAIL-CLOSED SWITCH" title="Private opt-in & rollback" description="Các nút này chỉ ghi preference/latch cục bộ. Ở mode SHADOW hiện tại, opt-in vẫn không thể làm production boot V2." />
          <div className="b2-release-switches">
            <article><div><strong>Private opt-in</strong><small>{snapshot.optIn ? 'Preference đã được ghi cho tài khoản/browser hiện tại.' : 'Chưa opt-in.'}</small></div><B2Button variant={snapshot.optIn ? 'danger' : 'primary'} onClick={toggleOptIn}>{snapshot.optIn ? 'Gỡ opt-in' : 'Ghi opt-in'}</B2Button></article>
            <article><div><strong>Emergency rollback latch</strong><small>{snapshot.rollback.active ? `${snapshot.rollback.reason} · ${formatTime(snapshot.rollback.at)}` : 'Không có rollback latch.'}</small></div>{snapshot.rollback.active ? <B2Button variant="primary" onClick={clearRollback}>Clear rollback</B2Button> : <B2Button variant="danger" onClick={activateRollback}>Test rollback</B2Button>}</article>
          </div>
          <div className={`b2-release-decision ${snapshot.bootV2 ? 'is-open' : 'is-closed'}`}>
            <span aria-hidden="true">{snapshot.bootV2 ? '✓' : '◇'}</span>
            <div><strong>{snapshot.bootV2 ? 'V2 có thể được boot theo gate hiện tại' : 'Gate đang đóng — V1 tiếp tục là mặc định'}</strong><small>releaseApproved={String(snapshot.releaseApproved)} · safeDefault={String(snapshot.safeDefault)} · mode={snapshot.mode}</small></div>
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="MANUAL RELEASE CONTRACT" title="Checklist bắt buộc" description="Không tự đánh dấu pass. Chỉ bật sau khi đã kiểm thử thật trên milestone cuối." action={<B2Button variant="ghost" onClick={() => { setChecklist(resetReleaseChecklist()); setRevision((n) => n + 1); }}>Reset checklist</B2Button>} />
          <div className="b2-release-checklist">
            {CHECKS.map((item) => {
              const done = Boolean(checklist[item.id]);
              return <article key={item.id} className={done ? 'is-done' : ''}>
                <span>{done ? '✓' : '○'}</span>
                <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                <B2Button variant={done ? 'ghost' : 'secondary'} onClick={() => setCheck(item.id, !done)}>{done ? 'Đã xác nhận' : 'Chưa xác nhận'}</B2Button>
              </article>;
            })}
          </div>
        </B2Surface>
      </div>

      <aside className="b2-release-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="AUTOMATED CONTRACT" title="Level 2 tool ledger" description="Tool Shell ghi kết quả sau mỗi lần runtime load; không click hoặc mutate dữ liệu của tool." action={<B2Button variant="ghost" onClick={() => { clearToolContractLedger(); setLedger({}); }}>Clear</B2Button>} />
          <div className="b2-release-ledger">
            {LEVEL2_SLUGS.map((slug) => {
              const meta = V2_TOOL_BRIDGE[slug];
              const result = ledger[slug];
              const tone = result?.status === 'pass' ? 'green' : result?.status === 'fail' ? 'red' : result ? 'amber' : 'neutral';
              return <article key={slug}>
                <div><strong>{meta.label}</strong><small>{result ? `${result.passCount}/${result.totalCount} checks · ${formatTime(result.checkedAt)}` : 'Chưa chạy contract trong browser này'}</small></div>
                <B2Status tone={tone}>{result?.status ? result.status.toUpperCase() : 'NOT RUN'}</B2Status>
              </article>;
            })}
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="CURRENT DATA" title="Blocking diagnostics" />
          <div className="b2-release-blockers">
            <p><span>Contract Level 2</span><strong>{snapshot.contractComplete ? 'PASS' : `${snapshot.level2Passed}/${snapshot.level2Required}`}</strong></p>
            <p><span>Manual checklist</span><strong>{snapshot.manualComplete ? 'PASS' : `${Object.values(checklist).filter(Boolean).length}/${CHECKS.length}`}</strong></p>
            <p><span>Data Bridge errors</span><strong>{snapshot.dataErrorCount}</strong></p>
            <p><span>Rollback latch</span><strong>{snapshot.rollback.active ? 'ACTIVE' : 'CLEAR'}</strong></p>
          </div>
          {data.errors?.length ? <div className="b2-release-errors">{data.errors.slice(0, 5).map((error, index) => <p key={`${error.source}-${index}`}><strong>{error.source}</strong>{error.message}</p>)}</div> : <p className="b2-release-ok">✓ Snapshot hiện tại không báo lỗi Data Bridge.</p>}
        </B2Surface>
      </aside>
    </section>
  </>;
}
