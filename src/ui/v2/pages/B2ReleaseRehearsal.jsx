import React, { useEffect, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { fetchBuildIdentity, isDeployBoundBuild, readCachedBuildIdentity } from '../buildIdentity.js';
import { V2_RELEASE_CANDIDATE_ID } from '../releaseCandidate.js';
import { readBootstrapRehearsalLedger, resetBootstrapRehearsalLedger, runBootstrapRehearsal, summarizeBootstrapRehearsal } from '../bootstrapRehearsal.js';
import { verifyReleaseEvidencePack } from '../releaseEvidenceIntegrity.js';
import './B2ReleaseRehearsal.css';

function short(value) {
  return String(value || '').slice(0, 10) || 'UNBOUND';
}

export default function B2ReleaseRehearsal() {
  const [build, setBuild] = useState(readCachedBuildIdentity);
  const [ledger, setLedger] = useState(readBootstrapRehearsalLedger);
  const [loading, setLoading] = useState(true);
  const [verifyState, setVerifyState] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchBuildIdentity({ signal: controller.signal }).then((identity) => {
      setBuild(identity);
      if (isDeployBoundBuild(identity)) setLedger(runBootstrapRehearsal(identity));
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const summary = summarizeBootstrapRehearsal(ledger, { candidate: V2_RELEASE_CANDIDATE_ID, buildSha: build.sha });

  const rerun = () => {
    if (!isDeployBoundBuild(build)) return;
    setLedger(runBootstrapRehearsal(build));
  };

  const reset = () => {
    resetBootstrapRehearsalLedger();
    setLedger(null);
  };

  const verifyFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const result = await verifyReleaseEvidencePack(parsed, { candidate: V2_RELEASE_CANDIDATE_ID, buildSha: build.sha });
      setVerifyState({ ...result, name: file.name });
    } catch (error) {
      setVerifyState({ valid: false, reason: error?.message || 'invalid-json', name: file.name });
    } finally {
      event.target.value = '';
    }
  };

  return <main className="b2-rehearsal-page">
    <B2PageHeader
      eyebrow="PRIVATE · BOOT REHEARSAL"
      title="Metro Next Production Boot Rehearsal"
      description="Ma trận fail-closed chạy trên exact preview SHA nhưng không chạm production bootstrap. Nó chứng minh decision engine xử lý đúng shadow, opt-in, global on, wrong candidate/build và emergency rollback."
      actions={<><B2Button variant="ghost" onClick={() => window.open('/preview-ui-v2.html#release-gate', '_blank', 'noopener,noreferrer')}>Mở Release Gate ↗</B2Button><B2Button onClick={rerun} disabled={!isDeployBoundBuild(build) || loading}>↻ Run rehearsal</B2Button></>}
      aside={<B2Badge tone={summary.passed ? 'green' : 'violet'}>{summary.passed ? 'REHEARSAL PASS' : 'GATE CLOSED'}</B2Badge>}
    />

    <section className="b2-rehearsal-stats">
      <B2StatCard label="Candidate" value={V2_RELEASE_CANDIDATE_ID.replace('rc-', 'RC ')} meta="release scope" tone="violet" icon="◇" />
      <B2StatCard label="Build" value={short(build.sha)} meta={`${build.environment || 'unknown'} · ${build.ref || 'no ref'}`} tone={isDeployBoundBuild(build) ? 'green' : 'cyan'} icon="#" />
      <B2StatCard label="Scenarios" value={`${summary.completed}/${summary.required || 9}`} meta={summary.status.toUpperCase()} tone={summary.passed ? 'green' : 'cyan'} icon="✓" />
    </section>

    <section className="b2-rehearsal-grid">
      <B2Surface>
        <B2SectionHeader eyebrow="DECISION MATRIX" title="Fail-closed boot scenarios" description="Synthetic policy inputs only; no release environment, opt-in state or rollback state is mutated." action={<B2Button variant="ghost" onClick={reset}>Reset evidence</B2Button>} />
        {loading ? <p className="b2-rehearsal-note">Đang resolve deployment identity…</p> : null}
        {!loading && !isDeployBoundBuild(build) ? <p className="b2-rehearsal-error">Không thể rehearsal: preview chưa resolve được deployment SHA.</p> : null}
        <div className="b2-rehearsal-scenarios">
          {(ledger?.scenarios || []).map((item) => <article key={item.id} className={item.pass ? 'is-pass' : 'is-fail'}>
            <span>{item.pass ? '✓' : '×'}</span>
            <div><strong>{item.label}</strong><small>Expected: {item.expected.eligible ? 'V2' : 'V1'} · {item.expected.reason}</small><small>Actual: {item.actual.eligible ? 'V2' : 'V1'} · {item.actual.reason}</small></div>
            <B2Badge tone={item.pass ? 'green' : 'red'}>{item.pass ? 'PASS' : 'FAIL'}</B2Badge>
          </article>)}
        </div>
      </B2Surface>

      <B2Surface>
        <B2SectionHeader eyebrow="EVIDENCE INTEGRITY" title="Verify exported Evidence Pack" description="Chọn JSON đã export từ Release Gate. Verifier kiểm tra SHA-256 digest và bắt buộc candidate/build SHA phải khớp preview đang chạy." />
        <label className="b2-rehearsal-file">
          <span>Chọn Evidence Pack JSON</span>
          <input type="file" accept="application/json,.json" onChange={verifyFile} />
        </label>
        {verifyState ? <div className={`b2-rehearsal-verdict ${verifyState.valid ? 'is-pass' : 'is-fail'}`}>
          <strong>{verifyState.valid ? '✓ Evidence Pack hợp lệ' : '× Evidence Pack không hợp lệ'}</strong>
          <small>{verifyState.name} · {verifyState.reason}</small>
          <small>Digest {verifyState.digestMatch === false ? 'mismatch' : verifyState.digestMatch ? 'match' : 'unverified'} · Candidate {verifyState.candidateMatch === false ? 'mismatch' : 'match'} · Build {verifyState.buildMatch === false ? 'mismatch' : 'match'}</small>
        </div> : <p className="b2-rehearsal-note">Evidence verifier không ghi dữ liệu và không tự cấp owner approval.</p>}
      </B2Surface>
    </section>
  </main>;
}
