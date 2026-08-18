import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2Status } from '../components/B2Data.jsx';
import B2ToolContractRunner from '../components/B2ToolContractRunner.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { TOOL_CONTRACT_EVENT, clearToolContractLedger, readToolContractLedger } from '../toolBehaviorContract.js';
import { TOOL_BEHAVIOR_EVENT, TOOL_BEHAVIOR_MANIFEST, readToolBehaviorLedger, resetToolBehaviorLedger, setToolBehaviorCheck, summarizeToolBehavior } from '../toolBehaviorManifest.js';
import { getReleaseGateSnapshot, readReleaseChecklist, resetReleaseChecklist, setPrivateOptIn, setReleaseChecklistItem, setRollbackLatch } from '../releaseGate.js';
import { V2_FIRST_RELEASE_WRITE_POLICY, getWritePolicySummary } from '../writeActionPolicy.js';
import { useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2ReleaseGate.css';

const LEVEL2_SLUGS = Object.entries(V2_TOOL_BRIDGE).filter(([, meta]) => Number(meta.level || 0) >= 2).map(([slug]) => slug);
const CHECKS = [
  { id: 'responsive', label: 'Responsive matrix', detail: 'Phone · iPad portrait/landscape · laptop · desktop · 65-inch TV' },
  { id: 'accessibility', label: 'Accessibility QA', detail: 'Keyboard order · focus-visible · aria · contrast · reduced motion' },
  { id: 'behavior', label: 'Behavior regression', detail: 'Chỉ được xác nhận sau khi behavior matrix của 10 tool hoàn tất.' },
  { id: 'ci', label: 'CI / Preview build', detail: 'Vercel Preview phải build thành công trên milestone cuối' },
  { id: 'ownerApproval', label: 'Owner approval', detail: 'Chỉ xác nhận sau khi mọi gate kỹ thuật phía trên đã qua.' },
];

function formatTime(value) {
  if (!value) return 'Chưa chạy';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function B2ReleaseGate() {
  const data = useBrianV2Data();
  const [ledger, setLedger] = useState(readToolContractLedger);
  const [behaviorLedger, setBehaviorLedger] = useState(readToolBehaviorLedger);
  const [checklist, setChecklist] = useState(readReleaseChecklist);
  const [activeBehaviorTool, setActiveBehaviorTool] = useState(LEVEL2_SLUGS[0]);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () => setLedger(readToolContractLedger());
    window.addEventListener(TOOL_CONTRACT_EVENT, sync);
    return () => window.removeEventListener(TOOL_CONTRACT_EVENT, sync);
  }, []);

  useEffect(() => {
    const sync = () => setBehaviorLedger(readToolBehaviorLedger());
    window.addEventListener(TOOL_BEHAVIOR_EVENT, sync);
    return () => window.removeEventListener(TOOL_BEHAVIOR_EVENT, sync);
  }, []);

  const behaviorSummary = useMemo(() => summarizeToolBehavior(LEVEL2_SLUGS, behaviorLedger), [behaviorLedger]);
  const writeSummary = useMemo(() => getWritePolicySummary(), []);
  const snapshot = useMemo(() => getReleaseGateSnapshot({
    user: data.user,
    contractLedger: ledger,
    level2Slugs: LEVEL2_SLUGS,
    dataErrors: data.errors,
    behaviorSummary,
  }), [data.user, data.errors, ledger, behaviorSummary, checklist, revision]);

  const setCheck = (key, value) => {
    if (value && key === 'behavior' && !behaviorSummary.complete) return;
    if (value && key === 'ownerApproval') {
      const prereqs = ['responsive', 'accessibility', 'behavior', 'ci'].every((item) => checklist[item]);
      if (!prereqs || !snapshot.contractComplete || snapshot.dataErrorCount > 0 || !behaviorSummary.complete) return;
    }
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

  const activeManifest = TOOL_BEHAVIOR_MANIFEST[activeBehaviorTool];
  const activeBehaviorState = behaviorLedger?.[activeBehaviorTool] || {};

  return <>
    <B2PageHeader
      eyebrow="PRIVATE · RELEASE ENGINEERING"
      title="Metro Next Release Gate"
      description="Cổng phát hành fail-closed: structural contract có thể tự chạy, nhưng persistence/import-export/device/accessibility và owner approval vẫn phải được xác nhận bằng chứng thật trước khi production có boot path V2."
      actions={<><B2Button variant="ghost" onClick={() => data.refresh()} disabled={data.refreshing}>{data.refreshing ? 'Đang đọc dữ liệu…' : '↻ Refresh diagnostics'}</B2Button><B2Button onClick={() => window.open('/#/', '_blank', 'noopener,noreferrer')}>Mở V1 ↗</B2Button></>}
      aside={<B2Badge tone={snapshot.bootV2 ? 'green' : 'violet'}>{snapshot.bootV2 ? 'V2 BOOT ELIGIBLE' : 'V1 SAFE DEFAULT'}</B2Badge>}
    />

    <section className="b2-release-stats">
      <B2StatCard label="Release mode" value={snapshot.mode.toUpperCase()} meta="VITE_BRIAN_UI_V2_MODE" tone="blue" icon="◇" />
      <B2StatCard label="Structural contracts" value={`${snapshot.level2Passed}/${snapshot.level2Required}`} meta="automated, non-mutating" tone={snapshot.contractComplete ? 'green' : 'violet'} icon="✓" />
      <B2StatCard label="Behavior checks" value={`${snapshot.behaviorPassed}/${snapshot.behaviorRequired}`} meta="manual per-tool evidence" tone={snapshot.toolBehaviorComplete ? 'green' : 'violet'} icon="◎" />
      <B2StatCard label="Boot decision" value={snapshot.bootV2 ? 'V2' : 'V1'} meta={snapshot.releaseApproved ? 'release checks complete' : 'gate remains closed'} tone={snapshot.bootV2 ? 'green' : 'cyan'} icon="↗" />
    </section>

    <section className="b2-release-grid">
      <div className="b2-release-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="AUTOMATED STRUCTURAL QA" title="Run all Level 2 contracts" description="Runner mở tuần tự 10 runtime off-screen bằng đúng bridge/adapter của Tool Shell. Nó chỉ đọc DOM/runtime và không click hoặc ghi business data." action={<B2Button variant="ghost" onClick={() => { clearToolContractLedger(); setLedger({}); }}>Clear ledger</B2Button>} />
          <B2ToolContractRunner onResult={() => setLedger(readToolContractLedger())} onDone={() => setLedger(readToolContractLedger())} />
          <div className="b2-release-ledger b2-release-ledger--grid">
            {LEVEL2_SLUGS.map((slug) => {
              const meta = V2_TOOL_BRIDGE[slug];
              const result = ledger[slug];
              const tone = result?.status === 'pass' ? 'green' : result?.status === 'fail' ? 'red' : result ? 'amber' : 'neutral';
              return <article key={slug}><div><strong>{meta.label}</strong><small>{result ? `${result.passCount}/${result.totalCount} · ${formatTime(result.checkedAt)}` : 'NOT RUN'}</small></div><B2Status tone={tone}>{result?.status ? result.status.toUpperCase() : 'NOT RUN'}</B2Status></article>;
            })}
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="MANUAL TOOL BEHAVIOR" title="Persistence & workflow matrix" description="Structural PASS không đủ. Mỗi tool còn phải qua các hành vi mà DOM inspection không thể chứng minh." action={<B2Button variant="ghost" onClick={() => { resetToolBehaviorLedger(); setBehaviorLedger({}); }}>Reset matrix</B2Button>} />
          <div className="b2-behavior-tabs">
            {behaviorSummary.tools.map((tool) => <button key={tool.slug} type="button" className={`${activeBehaviorTool === tool.slug ? 'is-active' : ''} ${tool.complete ? 'is-complete' : ''}`} onClick={() => setActiveBehaviorTool(tool.slug)}><span>{tool.complete ? '✓' : '○'}</span><strong>{tool.label}</strong><small>{tool.checks.filter((item) => item.pass).length}/{tool.checks.length}</small></button>)}
          </div>
          <div className="b2-behavior-checks">
            {(activeManifest?.checks || []).map((item) => {
              const done = Boolean(activeBehaviorState[item.id]);
              return <article key={item.id} className={done ? 'is-done' : ''}><span>{done ? '✓' : '○'}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><B2Button variant={done ? 'ghost' : 'secondary'} onClick={() => { const next = setToolBehaviorCheck(activeBehaviorTool, item.id, !done); setBehaviorLedger(next); }}>{done ? 'Đã kiểm tra' : 'Chưa kiểm tra'}</B2Button></article>;
            })}
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="MANUAL RELEASE CONTRACT" title="Checklist bắt buộc" description="Behavior và Owner Approval có dependency; Release Gate không cho đánh dấu chúng trước khi prerequisite tương ứng hoàn tất." action={<B2Button variant="ghost" onClick={() => { setChecklist(resetReleaseChecklist()); setRevision((n) => n + 1); }}>Reset checklist</B2Button>} />
          <div className="b2-release-checklist">
            {CHECKS.map((item) => {
              const done = Boolean(checklist[item.id]);
              const blocked = !done && ((item.id === 'behavior' && !behaviorSummary.complete) || (item.id === 'ownerApproval' && (!snapshot.contractComplete || !behaviorSummary.complete || snapshot.dataErrorCount > 0 || !['responsive', 'accessibility', 'behavior', 'ci'].every((key) => checklist[key]))));
              return <article key={item.id} className={`${done ? 'is-done' : ''} ${blocked ? 'is-blocked' : ''}`}><span>{done ? '✓' : blocked ? '×' : '○'}</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><B2Button variant={done ? 'ghost' : 'secondary'} disabled={blocked} onClick={() => setCheck(item.id, !done)}>{done ? 'Đã xác nhận' : blocked ? 'Đang bị khóa' : 'Chưa xác nhận'}</B2Button></article>;
            })}
          </div>
        </B2Surface>
      </div>

      <aside className="b2-release-stack">
        <B2Surface>
          <B2SectionHeader eyebrow="FAIL-CLOSED SWITCH" title="Private opt-in & rollback" description="Ở mode SHADOW hiện tại, opt-in không thể làm production boot V2." />
          <div className="b2-release-switches">
            <article><div><strong>Private opt-in</strong><small>{snapshot.optIn ? 'Preference đã ghi cho browser/tài khoản hiện tại.' : 'Chưa opt-in.'}</small></div><B2Button variant={snapshot.optIn ? 'danger' : 'primary'} onClick={toggleOptIn}>{snapshot.optIn ? 'Gỡ opt-in' : 'Ghi opt-in'}</B2Button></article>
            <article><div><strong>Emergency rollback latch</strong><small>{snapshot.rollback.active ? `${snapshot.rollback.reason} · ${formatTime(snapshot.rollback.at)}` : 'Không có rollback latch.'}</small></div>{snapshot.rollback.active ? <B2Button variant="primary" onClick={clearRollback}>Clear rollback</B2Button> : <B2Button variant="danger" onClick={activateRollback}>Test rollback</B2Button>}</article>
          </div>
          <div className={`b2-release-decision ${snapshot.bootV2 ? 'is-open' : 'is-closed'}`}><span aria-hidden="true">{snapshot.bootV2 ? '✓' : '◇'}</span><div><strong>{snapshot.bootV2 ? 'V2 có thể được boot theo gate hiện tại' : 'Gate đang đóng — V1 tiếp tục là mặc định'}</strong><small>releaseApproved={String(snapshot.releaseApproved)} · mode={snapshot.mode}</small></div></div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="FIRST RELEASE WRITE POLICY" title="Không tạo mutation layer thứ hai" description="Bản V2 đầu tiên ưu tiên native read + delegation. Business write vẫn do engine/service V1 hiện hữu sở hữu." />
          <div className="b2-write-policy-summary"><p><span>Native production mutations</span><strong>{writeSummary.nativeProductionMutations}</strong></p><p><span>Delegated domains</span><strong>{writeSummary.delegated}</strong></p><p><span>V1 tool-engine owned</span><strong>{writeSummary.engineOwned}</strong></p></div>
          <div className="b2-write-policy-list">{V2_FIRST_RELEASE_WRITE_POLICY.map((item) => <article key={item.area}><strong>{item.area}</strong><small>{item.examples}</small><B2Badge tone={item.write === 'local-only' ? 'blue' : 'violet'}>{item.write.toUpperCase()}</B2Badge></article>)}</div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="CURRENT BLOCKERS" title="Release diagnostics" />
          <div className="b2-release-blockers">
            <p><span>Structural contracts</span><strong>{snapshot.contractComplete ? 'PASS' : `${snapshot.level2Passed}/${snapshot.level2Required}`}</strong></p>
            <p><span>Tool behavior matrix</span><strong>{snapshot.toolBehaviorComplete ? 'PASS' : `${snapshot.behaviorPassed}/${snapshot.behaviorRequired}`}</strong></p>
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
