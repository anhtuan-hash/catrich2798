import React, { useEffect, useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { fetchBuildIdentity, isDeployBoundBuild, readCachedBuildIdentity } from '../buildIdentity.js';
import { ensureReleaseCandidateEvidenceScope, V2_RELEASE_CANDIDATE_ID } from '../releaseCandidate.js';
import { TOOL_BEHAVIOR_MANIFEST } from '../toolBehaviorManifest.js';
import { readToolBehaviorDetailLedger, resetToolBehaviorDetailLedger, setToolBehaviorEvidence, summarizeToolBehaviorDetail, TOOL_BEHAVIOR_DETAIL_EVENT, updateToolBehaviorEvidenceNote } from '../toolBehaviorEvidence.js';
import './B2BehaviorQA.css';

function formatTime(value) {
  if (!value) return 'Chưa ghi evidence';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function B2BehaviorQA() {
  const [build, setBuild] = useState(readCachedBuildIdentity);
  const [ledger, setLedger] = useState(readToolBehaviorDetailLedger);
  const [activeSlug, setActiveSlug] = useState(Object.keys(TOOL_BEHAVIOR_MANIFEST)[0] || '');
  const summary = useMemo(() => summarizeToolBehaviorDetail(ledger), [ledger]);
  const activeTool = summary.tools.find((tool) => tool.slug === activeSlug) || summary.tools[0];

  useEffect(() => {
    const controller = new AbortController();
    fetchBuildIdentity({ signal: controller.signal }).then((identity) => {
      setBuild(identity);
      const scope = ensureReleaseCandidateEvidenceScope({ buildIdentity: identity });
      if (scope.reset) setLedger(readToolBehaviorDetailLedger());
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const sync = () => setLedger(readToolBehaviorDetailLedger());
    window.addEventListener(TOOL_BEHAVIOR_DETAIL_EVENT, sync);
    return () => window.removeEventListener(TOOL_BEHAVIOR_DETAIL_EVENT, sync);
  }, []);

  const setStatus = (slug, check, status) => {
    const note = ledger?.[slug]?.[check.id]?.note || '';
    setLedger(setToolBehaviorEvidence(slug, check.id, status, note));
  };

  const setNote = (slug, check, note) => {
    setLedger(updateToolBehaviorEvidenceNote(slug, check.id, note));
  };

  const resetAll = () => {
    if (!window.confirm('Reset toàn bộ 42 behavior evidence của build hiện tại?')) return;
    resetToolBehaviorDetailLedger({ resetBooleanLedger: true });
    setLedger({});
  };

  return <main className="b2-behavior-qa-page">
    <B2PageHeader
      eyebrow={`PRIVATE · MANUAL BEHAVIOR QA · ${V2_RELEASE_CANDIDATE_ID.toUpperCase()}`}
      title="Metro Next Tool Behavior Evidence"
      description="42 kiểm tra hành vi được ghi rõ PASS / FAIL / PENDING, note và timestamp. Chỉ PASS mới được phản ánh sang behavior ledger mà Release Gate dùng."
      actions={<><B2Button variant="ghost" onClick={() => window.open('/preview-ui-v2.html#release-gate', '_blank', 'noopener,noreferrer')}>Release Gate ↗</B2Button><B2Button variant="ghost" onClick={() => window.open('/preview-ui-v2-rehearsal.html', '_blank', 'noopener,noreferrer')}>Boot Rehearsal ↗</B2Button><B2Button variant="danger" onClick={resetAll}>Reset evidence</B2Button></>}
      aside={<B2Badge tone={summary.complete ? 'green' : summary.failed ? 'red' : 'violet'}>{summary.complete ? '42/42 PASS' : summary.failed ? `${summary.failed} FAIL` : 'QA IN PROGRESS'}</B2Badge>}
    />

    <section className="b2-behavior-qa-stats">
      <B2StatCard label="Build" value={build.shortSha || 'UNBOUND'} meta={isDeployBoundBuild(build) ? `${build.environment} · exact SHA` : 'deployment identity pending'} tone={isDeployBoundBuild(build) ? 'green' : 'cyan'} icon="#" />
      <B2StatCard label="Passed" value={`${summary.passed}/${summary.required}`} meta="explicit PASS evidence" tone={summary.complete ? 'green' : 'violet'} icon="✓" />
      <B2StatCard label="Failed" value={String(summary.failed)} meta="must be fixed/retested" tone={summary.failed ? 'red' : 'green'} icon="×" />
      <B2StatCard label="Pending" value={String(summary.pending)} meta="not yet signed" tone="cyan" icon="○" />
    </section>

    {!isDeployBoundBuild(build) ? <p className="b2-behavior-qa-warning">Build chưa resolve được preview/production SHA. Không nên ký evidence cho đến khi build binding hiển thị chính xác.</p> : null}

    <section className="b2-behavior-qa-layout">
      <aside className="b2-behavior-qa-nav" aria-label="Tool behavior QA">
        {summary.tools.map((tool) => <button key={tool.slug} type="button" className={`${activeSlug === tool.slug ? 'is-active' : ''} ${tool.complete ? 'is-complete' : ''} ${tool.failed ? 'has-fail' : ''}`} onClick={() => setActiveSlug(tool.slug)}>
          <span>{tool.complete ? '✓' : tool.failed ? '×' : '○'}</span>
          <div><strong>{tool.label}</strong><small>{tool.passed}/3 pass{tool.failed ? ` · ${tool.failed} fail` : ''}</small></div>
        </button>)}
      </aside>

      <B2Surface>
        <B2SectionHeader eyebrow="WORKFLOW EVIDENCE" title={activeTool?.label || 'Tool'} description="Thực hiện hành vi trên Tool Shell của đúng build hiện tại, sau đó ghi PASS/FAIL và note ngắn. FAIL lập tức gỡ PASS tương ứng khỏi Release Gate." action={<B2Button variant="ghost" onClick={() => window.open(`/preview-ui-v2.html#tool/${encodeURIComponent(activeTool?.slug || '')}`, '_blank', 'noopener,noreferrer')}>Mở tool ↗</B2Button>} />
        <div className="b2-behavior-qa-checks">
          {(activeTool?.checks || []).map((check, index) => <article key={check.id} data-status={check.status}>
            <header><span>{index + 1}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div><B2Badge tone={check.status === 'pass' ? 'green' : check.status === 'fail' ? 'red' : 'neutral'}>{check.status.toUpperCase()}</B2Badge></header>
            <div className="b2-behavior-qa-actions">
              <B2Button variant={check.status === 'pass' ? 'primary' : 'secondary'} onClick={() => setStatus(activeTool.slug, check, 'pass')}>✓ PASS</B2Button>
              <B2Button variant={check.status === 'fail' ? 'danger' : 'secondary'} onClick={() => setStatus(activeTool.slug, check, 'fail')}>× FAIL</B2Button>
              <B2Button variant="ghost" onClick={() => setStatus(activeTool.slug, check, 'pending')}>○ PENDING</B2Button>
              <small>{formatTime(check.at)}</small>
            </div>
            <label>QA note<textarea rows={3} value={check.note || ''} placeholder="Ví dụ: Import JSON → reload → state còn đúng; export mở file thành công…" onChange={(event) => setNote(activeTool.slug, check, event.target.value)} /></label>
          </article>)}
        </div>
      </B2Surface>
    </section>
  </main>;
}
